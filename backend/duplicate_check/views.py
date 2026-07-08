from rest_framework import viewsets, filters, status
from rest_framework.decorators import api_view, action
from rest_framework.response import Response
from django.http import HttpResponse
from django_filters.rest_framework import DjangoFilterBackend
from django.conf import settings

import tempfile, os, uuid, shutil

from .models import ResearchProposal, ExtractionStatus, ReviewStatus, DocumentSimilarityResult
from .serializers import ProposalSerializer, ProposalReviewSerializer
from .tasks import process_proposal_check, process_bulk_check

from .services.extraction import extract_proposal_text
from .services.matching import compute_content_scores, get_common_terms, get_candidates_raw, compute_overall_score
from .services.hashing import compute_text_hash
from .services.text_diff import compute_text_diff


class ProposalViewSet(viewsets.ModelViewSet):
    """
    Plain CRUD for proposals. create() is intentionally NOT overridden --
    "New Proposal" must stay a normal DB save, no extraction/matching
    logic runs here. extraction_status defaults to 'pending' via the model.
    """
    queryset = ResearchProposal.objects.all()
    serializer_class = ProposalSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['scheme', 'status', 'state', 'year', 'research_area']
    search_fields = ['spark_id', 'student_name', 'title', 'college_name']


@api_view(['GET'])
def pending_queue(request):
    """Proposals whose extraction/duplicate-check hasn't been run yet."""
    qs = ResearchProposal.objects.filter(extraction_status=ExtractionStatus.PENDING)
    serializer = ProposalSerializer(qs, many=True)
    return Response({'count': qs.count(), 'results': serializer.data})


@api_view(['POST'])
def run_check(request, proposal_id):
    """Manually trigger the duplicate-check pipeline for one proposal."""
    if not ResearchProposal.objects.filter(id=proposal_id).exists():
        return Response({'detail': 'Proposal not found'}, status=status.HTTP_404_NOT_FOUND)
    process_proposal_check.delay(proposal_id)
    return Response({'detail': 'Check started', 'proposal_id': proposal_id}, status=status.HTTP_202_ACCEPTED)


@api_view(['POST'])
def bulk_run_check(request):
    """Trigger checks for multiple proposals at once ('Run All')."""
    proposal_ids = request.data.get('proposal_ids')
    if not proposal_ids:
        proposal_ids = list(
            ResearchProposal.objects.filter(extraction_status=ExtractionStatus.PENDING)
            .values_list('id', flat=True)
        )
    process_bulk_check.delay(proposal_ids)
    return Response({'detail': 'Bulk check started', 'count': len(proposal_ids)}, status=status.HTTP_202_ACCEPTED)


@api_view(['GET'])
def review_results(request):
    """Proposals whose extraction is done, with their similarity matches attached."""
    qs = ResearchProposal.objects.filter(
        extraction_status=ExtractionStatus.DONE
    ).prefetch_related('similarity_as_source__matched_proposal')
    serializer = ProposalReviewSerializer(qs, many=True)
    return Response({'count': qs.count(), 'results': serializer.data})


@api_view(['GET'])
def proposal_review_detail(request, proposal_id):
    try:
        proposal = ResearchProposal.objects.prefetch_related(
            'similarity_as_source__matched_proposal'
        ).get(id=proposal_id)
    except ResearchProposal.DoesNotExist:
        return Response({'detail': 'Not found'}, status=status.HTTP_404_NOT_FOUND)
    return Response(ProposalReviewSerializer(proposal).data)


@api_view(['PATCH'])
def update_review_status(request, proposal_id):
    """Reviewer marks a proposal as Cleared or Flagged after inspecting matches."""
    new_status = request.data.get('review_status')
    if new_status not in ReviewStatus.values:
        return Response({'detail': f'Invalid review_status. Must be one of {ReviewStatus.values}'},
                         status=status.HTTP_400_BAD_REQUEST)
    try:
        proposal = ResearchProposal.objects.get(id=proposal_id)
    except ResearchProposal.DoesNotExist:
        return Response({'detail': 'Not found'}, status=status.HTTP_404_NOT_FOUND)
    proposal.review_status = new_status
    proposal.save(update_fields=['review_status'])
    return Response({'detail': 'Updated', 'review_status': proposal.review_status})


@api_view(['GET'])
def scheme_stats(request):
    """GET /api/duplicate-check/proposals/stats/?scheme=SPARK"""
    scheme = request.query_params.get('scheme')
    qs = ResearchProposal.objects.all()
    if scheme:
        qs = qs.filter(scheme=scheme)
    return Response({
        'total': qs.count(),
        'received': qs.filter(status='received').count(),
        'selected': qs.filter(status='selected').count(),
        'awarded': qs.filter(status='awarded').count(),
    })


@api_view(['POST'])
def check_synopsis(request):
    """
    POST /api/duplicate-check/check/
    Ad-hoc check: upload a PDF (+ optional title/student_name/college_name
    for better precision), get similarity matches back immediately.
    Nothing gets saved as a proposal here -- this is a standalone tool.
    """
    file = request.FILES.get('document')
    if not file:
        return Response({'detail': 'document file is required'}, status=status.HTTP_400_BAD_REQUEST)

    title = request.data.get('title', '')
    student_name = request.data.get('student_name', '')
    college_name = request.data.get('college_name', '')

    with tempfile.NamedTemporaryFile(suffix='.pdf', delete=False) as tmp:
        for chunk in file.chunks():
            tmp.write(chunk)
        tmp_path = tmp.name

    try:
        text = extract_proposal_text(tmp_path)
    except Exception:
        os.remove(tmp_path)
        return Response({'detail': 'Could not extract text.', 'matches': []})

    if not text.strip():
        os.remove(tmp_path)
        return Response({'detail': 'Could not extract text from this document.', 'matches': []})

    # Store for comparison caching
    check_id = str(uuid.uuid4())
    save_dir = os.path.join(settings.MEDIA_ROOT, 'synopsis_checks')
    os.makedirs(save_dir, exist_ok=True)
    
    pdf_path = os.path.join(save_dir, f"{check_id}.pdf")
    shutil.move(tmp_path, pdf_path)
    
    txt_path = os.path.join(save_dir, f"{check_id}.txt")
    with open(txt_path, 'w', encoding='utf-8') as f:
        f.write(text)

    # Exact match short-circuit
    # Exact match short-circuit — get ALL proposals sharing this hash, not just one.
    # Multiple students can legitimately submit the exact same (copied) text,
    # and the reviewer needs to see every one of them, not just the first found.
    t_hash = compute_text_hash(text)
    exact_matches = list(ResearchProposal.objects.filter(text_hash=t_hash))

    if exact_matches:
        exact_results = []
        for exact in exact_matches:
            DocumentSimilarityResult.objects.update_or_create(
                check_id=check_id,
                matched_proposal=exact,
                defaults={
                    'overall_score': 100.0,
                    'content_score': 100.0,
                    'title_score': 100.0,
                    'student_name_score': 100.0,
                    'college_score': 100.0,
                    'matching_terms': [],
                }
            )
            exact_results.append({
                'matched_proposal': {
                    'id': exact.id, 'spark_id': exact.spark_id, 'scheme': exact.scheme,
                    'student_name': exact.student_name, 'college_name': exact.college_name,
                    'status': exact.status, 'title': exact.title,
                },
                'overall_score': 100.0,
                'content_score': 100.0,
                'title_score': 100.0,
                'student_name_score': 100.0,
                'college_score': 100.0,
                'matching_terms': [],
                'exact_duplicate': True,
            })

        # Still check for additional NEAR-duplicates beyond the exact ones,
        # so a partial-rewrite by a third student isn't silently missed.
        exact_ids = [e.id for e in exact_matches]
        candidates = [c for c in get_candidates_raw(title, student_name, college_name) if c.id not in exact_ids]

        near_results = []
        if candidates:
            candidate_texts = [c.extracted_text for c in candidates]
            scores, vectorizer, tfidf_matrix = compute_content_scores(text, candidate_texts)
            for idx, cand in enumerate(candidates):
                content_pct = round(scores[idx] * 100, 2)
                if content_pct < 30:
                    continue
                title_pct = round(getattr(cand, 'title_sim', 0) * 100, 2)
                student_pct = round(getattr(cand, 'student_sim', 0) * 100, 2)
                college_pct = round(getattr(cand, 'college_sim', 0) * 100, 2)
                overall = compute_overall_score(content_pct, title_pct, student_pct, college_pct) if (title or student_name) else content_pct
                near_results.append({
                    'matched_proposal': {
                        'id': cand.id, 'spark_id': cand.spark_id, 'scheme': cand.scheme,
                        'student_name': cand.student_name, 'college_name': cand.college_name,
                        'status': cand.status, 'title': cand.title,
                    },
                    'overall_score': overall,
                    'content_score': content_pct,
                    'title_score': title_pct,
                    'student_name_score': student_pct,
                    'college_score': college_pct,
                    'matching_terms': get_common_terms(vectorizer, tfidf_matrix, idx + 1),
                })

        all_results = exact_results + sorted(near_results, key=lambda r: r['overall_score'], reverse=True)
        return Response({
            'matches': all_results[:20],
            'extracted_chars': len(text),
            'check_id': check_id,
        })

    candidates = get_candidates_raw(title, student_name, college_name)
    if not candidates:
        return Response({'matches': [], 'extracted_chars': len(text), 'check_id': check_id})

    candidate_texts = [c.extracted_text for c in candidates]
    scores, vectorizer, tfidf_matrix = compute_content_scores(text, candidate_texts)

    results = []
    for idx, cand in enumerate(candidates):
        content_pct = round(scores[idx] * 100, 2)
        if content_pct < 30:
            continue
        title_pct = round(getattr(cand, 'title_sim', 0) * 100, 2)
        student_pct = round(getattr(cand, 'student_sim', 0) * 100, 2)
        college_pct = round(getattr(cand, 'college_sim', 0) * 100, 2)
        overall = compute_overall_score(content_pct, title_pct, student_pct, college_pct) if (title or student_name) else content_pct

        match_data = {
            'matched_proposal': {
                'id': cand.id, 'spark_id': cand.spark_id, 'scheme': cand.scheme,
                'student_name': cand.student_name, 'college_name': cand.college_name,
                'status': cand.status, 'title': cand.title,
            },
            'overall_score': overall,
            'content_score': content_pct,
            'title_score': title_pct,
            'student_name_score': student_pct,
            'college_score': college_pct,
            'matching_terms': get_common_terms(vectorizer, tfidf_matrix, idx + 1),
        }
        results.append(match_data)
        
        # Cache basic similarity result — use update_or_create so re-submissions
        # (same check_id + matched_proposal) don't violate any uniqueness constraints.
        DocumentSimilarityResult.objects.update_or_create(
            check_id=check_id,
            matched_proposal=cand,
            defaults={
                'overall_score': overall,
                'content_score': content_pct,
                'title_score': title_pct,
                'student_name_score': student_pct,
                'college_score': college_pct,
                'matching_terms': match_data['matching_terms'],
            }
        )

    results.sort(key=lambda r: r['overall_score'], reverse=True)
    return Response({'matches': results[:20], 'extracted_chars': len(text), 'check_id': check_id})


@api_view(['GET'])
def compare_documents(request, matched_proposal_id):
    check_id = request.query_params.get('check_id')
    if not check_id:
        return Response({'detail': 'check_id is required'}, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        matched_prop = ResearchProposal.objects.get(id=matched_proposal_id)
    except ResearchProposal.DoesNotExist:
        return Response({'detail': 'Matched proposal not found'}, status=status.HTTP_404_NOT_FOUND)
        
    doc_sim = DocumentSimilarityResult.objects.filter(check_id=check_id, matched_proposal=matched_prop).first()
    if not doc_sim:
        return Response({'detail': 'Comparison result not found for this check_id'}, status=status.HTTP_404_NOT_FOUND)
        
    # paragraph_scores is not stored in the model (computed on-demand each call);
    # we keep it in a local variable so both the lazy-compute and already-cached
    # branches can include it in the response.
    paragraph_scores = []

    # Check if we already did paragraph diff caching
    if not doc_sim.matched_sentences and doc_sim.total_words == 0:
        txt_path = os.path.join(settings.MEDIA_ROOT, 'synopsis_checks', f"{check_id}.txt")
        if os.path.exists(txt_path):
            with open(txt_path, 'r', encoding='utf-8') as f:
                source_text = f.read()
            diff_res = compute_text_diff(source_text, matched_prop.extracted_text)
            doc_sim.matched_paragraphs = diff_res['matched_paragraphs']
            doc_sim.matched_sentences = diff_res['matched_sentences']
            doc_sim.matched_words = diff_res['matched_words']
            doc_sim.total_words = diff_res['total_words']
            doc_sim.save()
            paragraph_scores = diff_res.get('paragraph_scores', [])

    return Response({
        'check_id': check_id,
        'matched_proposal': {
            'id': matched_prop.id, 'spark_id': matched_prop.spark_id, 'scheme': matched_prop.scheme,
            'student_name': matched_prop.student_name, 'college_name': matched_prop.college_name,
            'status': matched_prop.status, 'title': matched_prop.title,
            'document_url': matched_prop.document.url if matched_prop.document else None,
        },
        'overall_score': doc_sim.overall_score,
        'content_score': doc_sim.content_score,
        'title_score': doc_sim.title_score,
        'student_name_score': doc_sim.student_name_score,
        'college_score': doc_sim.college_score,
        'matching_terms': doc_sim.matching_terms,
        'matched_paragraphs': doc_sim.matched_paragraphs,
        'paragraph_scores': paragraph_scores,
        'matched_sentences': doc_sim.matched_sentences,
        'matched_words': doc_sim.matched_words,
        'total_words': doc_sim.total_words,
    })


@api_view(['GET'])
def download_compare_report(request, matched_proposal_id):
    """
    GET /api/duplicate-check/compare/<matched_proposal_id>/report/?check_id=<uuid>
    Downloads a full plagiarism comparison report as a PDF.
    """
    check_id = request.query_params.get('check_id')
    if not check_id:
        return Response({'detail': 'check_id is required'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        from reportlab.pdfgen import canvas
        from reportlab.lib.pagesizes import A4
        from reportlab.lib import colors
        from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, HRFlowable
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.lib.units import cm
        import io
    except ImportError:
        return Response({'detail': 'reportlab not installed'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    try:
        matched_prop = ResearchProposal.objects.get(id=matched_proposal_id)
    except ResearchProposal.DoesNotExist:
        return Response({'detail': 'Matched proposal not found'}, status=status.HTTP_404_NOT_FOUND)

    doc_sim = DocumentSimilarityResult.objects.filter(
        check_id=check_id, matched_proposal_id=matched_proposal_id
    ).first()

    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf, pagesize=A4,
        topMargin=2 * cm, bottomMargin=2 * cm,
        leftMargin=2 * cm, rightMargin=2 * cm,
    )

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        'ReportTitle', parent=styles['Title'],
        fontSize=18, textColor=colors.HexColor('#7c3aed'), spaceAfter=6,
    )
    heading_style = ParagraphStyle(
        'SectionHeading', parent=styles['Heading2'],
        fontSize=12, textColor=colors.HexColor('#1e1b4b'), spaceBefore=14, spaceAfter=4,
    )
    body_style = ParagraphStyle(
        'Body', parent=styles['Normal'],
        fontSize=9, textColor=colors.HexColor('#374151'), leading=14,
    )
    small_style = ParagraphStyle(
        'Small', parent=styles['Normal'],
        fontSize=8, textColor=colors.HexColor('#6b7280'), leading=12,
    )

    def score_color(score):
        if score >= 70:
            return colors.HexColor('#ef4444')  # danger
        if score >= 40:
            return colors.HexColor('#f59e0b')  # warning
        return colors.HexColor('#10b981')       # success

    def confidence_label(score):
        if score >= 70:
            return 'High Risk'
        if score >= 40:
            return 'Medium Risk'
        return 'Low Risk'

    elements = []

    # ── Title & Meta ────────────────────────────────────────────────────────
    elements.append(Paragraph('CCRAS Plagiarism Comparison Report', title_style))
    elements.append(HRFlowable(width='100%', thickness=1, color=colors.HexColor('#7c3aed'), spaceAfter=8))

    meta_data = [
        ['Check ID:', check_id],
        ['Matched Proposal:', f"{matched_prop.spark_id} ({matched_prop.scheme})"],
        ['Student:', matched_prop.student_name],
        ['College:', matched_prop.college_name],
        ['Title:', matched_prop.title[:80] + ('…' if len(matched_prop.title) > 80 else '')],
        ['Status:', matched_prop.status.title()],
        ['Generated At:', str(os.popen('date /t').read().strip()) if os.name == 'nt' else ''],
    ]
    import datetime
    meta_data[-1][1] = datetime.datetime.now().strftime('%Y-%m-%d %H:%M UTC')

    meta_table = Table(meta_data, colWidths=[4 * cm, 13 * cm])
    meta_table.setStyle(TableStyle([
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTNAME', (1, 0), (1, -1), 'Helvetica'),
        ('TEXTCOLOR', (0, 0), (0, -1), colors.HexColor('#374151')),
        ('TEXTCOLOR', (1, 0), (1, -1), colors.HexColor('#6b7280')),
        ('ROWBACKGROUNDS', (0, 0), (-1, -1), [colors.HexColor('#f9fafb'), colors.white]),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('GRID', (0, 0), (-1, -1), 0.25, colors.HexColor('#e5e7eb')),
    ]))
    elements.append(meta_table)
    elements.append(Spacer(1, 0.5 * cm))

    if doc_sim:
        overall = doc_sim.overall_score
        # ── Overall Score ────────────────────────────────────────────────────
        elements.append(Paragraph('Similarity Scores', heading_style))

        score_rows = [
            ['Metric', 'Score', 'Risk Level'],
            ['Overall Similarity', f"{overall:.1f}%", confidence_label(overall)],
            ['Content (Text) Similarity', f"{doc_sim.content_score:.1f}%", confidence_label(doc_sim.content_score)],
            ['Title Similarity', f"{doc_sim.title_score:.1f}%", confidence_label(doc_sim.title_score)],
            ['Student Name Match', f"{doc_sim.student_name_score:.1f}%", confidence_label(doc_sim.student_name_score)],
            ['College Match', f"{doc_sim.college_score:.1f}%", confidence_label(doc_sim.college_score)],
        ]
        score_table = Table(score_rows, colWidths=[8 * cm, 3.5 * cm, 5.5 * cm])
        score_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#7c3aed')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('ALIGN', (1, 0), (2, -1), 'CENTER'),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.HexColor('#f5f3ff'), colors.white]),
            ('TOPPADDING', (0, 0), (-1, -1), 5),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
            ('LEFTPADDING', (0, 0), (-1, -1), 8),
            ('GRID', (0, 0), (-1, -1), 0.25, colors.HexColor('#e5e7eb')),
            # Colour the risk column cells
            *[('TEXTCOLOR', (2, r + 1), (2, r + 1), score_color([
                overall, doc_sim.content_score, doc_sim.title_score,
                doc_sim.student_name_score, doc_sim.college_score
            ][r])) for r in range(5)],
            *[('FONTNAME', (2, r + 1), (2, r + 1), 'Helvetica-Bold') for r in range(5)],
        ]))
        elements.append(score_table)
        elements.append(Spacer(1, 0.4 * cm))

        # ── Word / Sentence Statistics ────────────────────────────────────
        elements.append(Paragraph('Matching Statistics', heading_style))
        total_w = doc_sim.total_words or 1
        pct_w = round((doc_sim.matched_words / total_w) * 100, 1)
        stats_rows = [
            ['Statistic', 'Value'],
            ['Total Words (uploaded)', str(doc_sim.total_words)],
            ['Matched Words', f"{doc_sim.matched_words}  ({pct_w}%)"],
            ['Matched Sentences', str(len(doc_sim.matched_sentences or []))],
            ['Matched Paragraphs', str(len(doc_sim.matched_paragraphs or []))],
        ]
        stats_table = Table(stats_rows, colWidths=[8 * cm, 9 * cm])
        stats_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1e1b4b')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.HexColor('#f0f9ff'), colors.white]),
            ('TOPPADDING', (0, 0), (-1, -1), 5),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
            ('LEFTPADDING', (0, 0), (-1, -1), 8),
            ('GRID', (0, 0), (-1, -1), 0.25, colors.HexColor('#e5e7eb')),
        ]))
        elements.append(stats_table)
        elements.append(Spacer(1, 0.4 * cm))

        # ── Matching Terms ────────────────────────────────────────────────
        if doc_sim.matching_terms:
            elements.append(Paragraph('Top Matching Terms', heading_style))
            terms_text = ',  '.join(doc_sim.matching_terms)
            elements.append(Paragraph(terms_text, body_style))
            elements.append(Spacer(1, 0.3 * cm))

        # ── Matched Sentences Sample (top 10) ────────────────────────────
        sents = (doc_sim.matched_sentences or [])[:10]
        if sents:
            elements.append(Paragraph('Sample Matched Sentences (top 10)', heading_style))
            for idx, s in enumerate(sents, 1):
                ratio = s.get('similarity_ratio', 1.0)
                label = 'Exact' if ratio >= 1.0 else f'Near ({ratio:.0%})'
                excerpt = s.get('text', '')[:200]
                elements.append(Paragraph(
                    f"<b>{idx}. [{label}]</b>  {excerpt}", body_style
                ))
                elements.append(Spacer(1, 0.15 * cm))

    else:
        elements.append(Paragraph('No cached comparison data found for this check.', body_style))

    # ── Footer note ──────────────────────────────────────────────────────────
    elements.append(Spacer(1, 1 * cm))
    elements.append(HRFlowable(width='100%', thickness=0.5, color=colors.HexColor('#d1d5db')))
    elements.append(Paragraph(
        'This report was generated automatically by the CCRAS Duplicate Check system. '
        'Similarity scores are computed using TF-IDF cosine similarity and SequenceMatcher text diffing. '
        'A high score indicates potential overlap and should be reviewed by a qualified assessor.',
        small_style
    ))

    doc.build(elements)
    buf.seek(0)
    response = HttpResponse(buf.read(), content_type='application/pdf')
    response['Content-Disposition'] = f'attachment; filename="plagiarism_report_{check_id[:8]}.pdf"'
    return response