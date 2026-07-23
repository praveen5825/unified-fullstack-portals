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


@api_view(['POST'])
def bulk_import_proposals(request):
    import pandas as pd
    from io import BytesIO

    scheme = request.query_params.get('scheme')
    if not scheme:
        return Response({'detail': 'Scheme is required as a query parameter'}, status=status.HTTP_400_BAD_REQUEST)

    if 'file' not in request.FILES:
        return Response({'detail': 'No file provided'}, status=status.HTTP_400_BAD_REQUEST)

    file_obj = request.FILES['file']
    filename = file_obj.name.lower()
    
    try:
        if filename.endswith('.csv'):
            df = pd.read_csv(file_obj)
        elif filename.endswith('.xlsx'):
            df = pd.read_excel(file_obj, engine='openpyxl')
        else:
            return Response({'detail': 'Unsupported file format. Please upload .csv or .xlsx'}, status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:
        return Response({'detail': f'Error reading file: {str(e)}'}, status=status.HTTP_400_BAD_REQUEST)

    # Expected headers mapped to our model fields based on the format guide provided
    header_mapping = {
        'Spark ID': 'spark_id',
        'Student Name': 'student_name',
        'Title': 'title',
        'State': 'state',
        'College Name': 'college_name',
        'Guide Name': 'guide_name',
        'Year': 'year',
        'Session': 'session',
        'Research Area': 'research_area',
        'Status': 'status',
        'Synopsis Text': 'extracted_text'
    }

    # Normalize df columns (strip spaces, match to mapping if possible, otherwise use exact strings)
    df.columns = df.columns.str.strip()
    
    # Identify which columns we have from the expected set
    valid_cols = {}
    for excel_col, model_col in header_mapping.items():
        if excel_col in df.columns:
            valid_cols[excel_col] = model_col

    if 'Spark ID' not in valid_cols or 'Student Name' not in valid_cols or 'Title' not in valid_cols:
        return Response({'detail': 'Missing required columns. Spark ID, Student Name, and Title are required.'}, status=status.HTTP_400_BAD_REQUEST)

    imported_count = 0
    skipped_count = 0
    failed_count = 0
    errors = []

    # Process rows
    for index, row in df.iterrows():
        try:
            spark_id = str(row['Spark ID']).strip()
            if not spark_id or str(spark_id) == 'nan':
                failed_count += 1
                continue

            # Duplicate Check: spark_id + scheme combination
            if ResearchProposal.objects.filter(spark_id=spark_id, scheme=scheme).exists():
                skipped_count += 1
                continue

            # Prepare data
            data = {
                'scheme': scheme,
                'spark_id': spark_id,
            }
            for excel_col, model_col in valid_cols.items():
                val = row[excel_col]
                if pd.notna(val):
                    # Status validation: default to 'received' if invalid or missing
                    if excel_col == 'Status':
                        val_str = str(val).lower().strip()
                        if val_str in ['received', 'selected', 'awarded']:
                            data[model_col] = val_str
                        else:
                            data[model_col] = 'received'
                    else:
                        data[model_col] = str(val).strip()

            # If synopsis is provided, mark extraction as done
            if 'extracted_text' in data and data['extracted_text']:
                data['extraction_status'] = ExtractionStatus.DONE

            ResearchProposal.objects.create(**data)
            imported_count += 1
        except Exception as e:
            failed_count += 1
            errors.append(f'Row {index + 1}: {str(e)}')

    return Response({
        'detail': f'Bulk import complete.',
        'imported': imported_count,
        'skipped': skipped_count,
        'failed': failed_count,
        'errors': errors[:5] # Send only first 5 errors to avoid massive response
    })



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
        
    # paragraph_scores is always re-computed on-demand from the saved .txt file so that:
    #   1. paragraph_scores is never empty (it is not stored in the model).
    #   2. source_text/target_text fields are always present for highlighting.
    paragraph_scores = []

    txt_path = os.path.join(settings.MEDIA_ROOT, 'synopsis_checks', f"{check_id}.txt")
    if os.path.exists(txt_path):
        with open(txt_path, 'r', encoding='utf-8') as f:
            source_text = f.read()

        # Re-run diff if:
        #  a) sentences not yet cached, or
        #  b) cached paragraphs lack the new source_text/target_text keys (old format).
        cached_paras = doc_sim.matched_paragraphs or []
        needs_refresh = (
            not doc_sim.matched_sentences
            or doc_sim.total_words == 0
            or (cached_paras and 'source_text' not in cached_paras[0])
        )

        if needs_refresh:
            diff_res = compute_text_diff(source_text, matched_prop.extracted_text)
            doc_sim.matched_paragraphs = diff_res['matched_paragraphs']
            doc_sim.matched_sentences = diff_res['matched_sentences']
            doc_sim.matched_words = diff_res['matched_words']
            doc_sim.total_words = diff_res['total_words']
            doc_sim.save()
            paragraph_scores = diff_res.get('paragraph_scores', [])
        else:
            # Re-compute paragraph_scores without persisting (not stored in model)
            diff_res = compute_text_diff(source_text, matched_prop.extracted_text)
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


# ══════════════════════════════════════════════════════════════════════════════
# ── ANALYTICS VIEWS ───────────────────────────────────────────────────────────
# ══════════════════════════════════════════════════════════════════════════════

from django.db.models import Count, Q


def _filter_by_scheme(request, qs):
    """Apply ?scheme=SPARK optional filter to a queryset."""
    scheme = request.query_params.get('scheme')
    if scheme:
        qs = qs.filter(scheme=scheme)
    return qs, scheme


@api_view(['GET'])
def analytics_overview(request):
    """
    GET /api/duplicate-check/analytics/overview/
    High-level KPIs: totals by scheme, status, and duplicate review state.
    """
    qs = ResearchProposal.objects.all()
    qs, _ = _filter_by_scheme(request, qs)

    total = qs.count()
    by_scheme = {
        'SPARK':    qs.filter(scheme='SPARK').count(),
        'PG-STAR':  qs.filter(scheme='PG-STAR').count(),
        'PDF-STAR': qs.filter(scheme='PDF-STAR').count(),
    }
    by_status = {
        'received': qs.filter(status='received').count(),
        'selected': qs.filter(status='selected').count(),
        'awarded':  qs.filter(status='awarded').count(),
    }
    by_extraction = {
        'pending':    qs.filter(extraction_status='pending').count(),
        'processing': qs.filter(extraction_status='processing').count(),
        'done':       qs.filter(extraction_status='done').count(),
        'failed':     qs.filter(extraction_status='failed').count(),
    }
    by_review = {
        'unreviewed': qs.filter(review_status='unreviewed').count(),
        'cleared':    qs.filter(review_status='cleared').count(),
        'flagged':    qs.filter(review_status='flagged').count(),
    }
    return Response({
        'total': total,
        'by_scheme': by_scheme,
        'by_status': by_status,
        'by_extraction': by_extraction,
        'by_review': by_review,
    })


@api_view(['GET'])
def analytics_yearly(request):
    """
    GET /api/duplicate-check/analytics/yearly/?scheme=SPARK
    Proposals grouped by year (+ per-scheme breakdown for stacked charts).
    """
    qs = ResearchProposal.objects.exclude(year='')
    qs, _ = _filter_by_scheme(request, qs)

    rows = (
        qs.values('year')
        .annotate(
            total=Count('id'),
            spark=Count('id', filter=Q(scheme='SPARK')),
            pgstar=Count('id', filter=Q(scheme='PG-STAR')),
            pdfstar=Count('id', filter=Q(scheme='PDF-STAR')),
            received=Count('id', filter=Q(status='received')),
            selected=Count('id', filter=Q(status='selected')),
            awarded=Count('id', filter=Q(status='awarded')),
        )
        .order_by('year')
    )
    return Response({'results': list(rows)})


@api_view(['GET'])
def analytics_statewise(request):
    """
    GET /api/duplicate-check/analytics/statewise/?scheme=SPARK
    Top 20 states by submission count.
    """
    qs = ResearchProposal.objects.exclude(state='')
    qs, _ = _filter_by_scheme(request, qs)

    rows = (
        qs.values('state')
        .annotate(
            total=Count('id'),
            spark=Count('id', filter=Q(scheme='SPARK')),
            pgstar=Count('id', filter=Q(scheme='PG-STAR')),
            pdfstar=Count('id', filter=Q(scheme='PDF-STAR')),
        )
        .order_by('-total')[:20]
    )
    return Response({'results': list(rows)})


@api_view(['GET'])
def analytics_research_area(request):
    """
    GET /api/duplicate-check/analytics/research-area/
    Count by research_area field (donut/pie chart).
    """
    qs = ResearchProposal.objects.exclude(research_area='')
    qs, _ = _filter_by_scheme(request, qs)

    rows = (
        qs.values('research_area')
        .annotate(total=Count('id'))
        .order_by('-total')
    )
    return Response({'results': list(rows)})


@api_view(['GET'])
def analytics_session(request):
    """
    GET /api/duplicate-check/analytics/session/
    Count by academic session (e.g. '2022-23').
    """
    qs = ResearchProposal.objects.exclude(session='')
    qs, _ = _filter_by_scheme(request, qs)

    rows = (
        qs.values('session')
        .annotate(
            total=Count('id'),
            spark=Count('id', filter=Q(scheme='SPARK')),
            pgstar=Count('id', filter=Q(scheme='PG-STAR')),
            pdfstar=Count('id', filter=Q(scheme='PDF-STAR')),
        )
        .order_by('session')
    )
    return Response({'results': list(rows)})


@api_view(['GET'])
def analytics_duplicate_stats(request):
    """
    GET /api/duplicate-check/analytics/duplicate-stats/
    Duplicate review breakdown by year — for the 'duplicate funnel' chart.
    """
    qs = ResearchProposal.objects.filter(extraction_status='done').exclude(year='')
    qs, _ = _filter_by_scheme(request, qs)

    rows = (
        qs.values('year')
        .annotate(
            checked=Count('id'),
            flagged=Count('id', filter=Q(review_status='flagged')),
            cleared=Count('id', filter=Q(review_status='cleared')),
            unreviewed=Count('id', filter=Q(review_status='unreviewed')),
        )
        .order_by('year')
    )
    return Response({'results': list(rows)})


# ══════════════════════════════════════════════════════════════════════════════
# ── GLOBAL SEARCH & BOOLEAN SEARCH ───────────────────────────────────────────
# ══════════════════════════════════════════════════════════════════════════════

import re as _re
from django.contrib.postgres.search import SearchQuery, SearchRank, SearchVector as SV


# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────

def _build_snippet(text, query_words, max_len=300):
    """
    Return a short snippet from `text` centred around the BEST (earliest)
    occurrence of any query word.  Falls back to the first `max_len` chars.
    Handles None/empty text gracefully.
    """
    if not text:
        return ''
    text = text.strip()
    if not text:
        return ''
    lower = text.lower()
    best_pos = len(text)  # sentinel
    for w in (query_words or []):
        if not w:
            continue
        pos = lower.find(w.lower())
        if 0 <= pos < best_pos:
            best_pos = pos
    if best_pos == len(text):
        # No word found — return beginning
        return text[:max_len] + ('…' if len(text) > max_len else '')
    start = max(0, best_pos - 80)
    end   = min(len(text), start + max_len)
    snippet = text[start:end]
    if start > 0:
        snippet = '…' + snippet
    if end < len(text):
        snippet = snippet + '…'
    return snippet


def _extract_query_words(raw_query):
    """
    Strip boolean operators and quotes; return plain content words for
    snippet highlighting.  Works for both websearch and raw boolean queries.
    """
    return _re.findall(
        r'\b(?!AND\b|OR\b|NOT\b|and\b|or\b|not\b)[a-zA-Z0-9\u0900-\u097F]{2,}\b',
        raw_query,
    )


def _normalize_boolean_query(raw):
    """
    Convert user-typed uppercase operators (AND / OR / NOT) to PostgreSQL
    websearch_to_tsquery-compatible lowercase equivalents.

    PostgreSQL websearch_to_tsquery treats:
      &  →  AND  (but only lowercase 'and' in websearch mode)
      |  →  OR
      -  →  NOT (prefix '-')
      "" →  phrase

    We rewrite the query so PostgreSQL interprets it correctly:
      word AND word  →  word & word    (via websearch 'and')
      word OR  word  →  word | word
      word NOT word  →  word -word
      "phrase"       →  kept as-is

    Strategy: use 'raw' search_type which directly accepts tsquery syntax,
    but build the tsquery string ourselves from user input.
    """
    # Tokenize respecting quoted phrases
    tokens = _re.findall(r'"[^"]+"|AND|OR|NOT|[^\s]+', raw, flags=_re.IGNORECASE)
    tsq_parts = []
    i = 0
    while i < len(tokens):
        tok = tokens[i]
        upper = tok.upper()
        if upper == 'AND':
            tsq_parts.append('&')
            i += 1
        elif upper == 'OR':
            tsq_parts.append('|')
            i += 1
        elif upper == 'NOT':
            # NOT <next_word> → !next_word
            i += 1
            if i < len(tokens):
                next_tok = tokens[i]
                if next_tok.startswith('"'):
                    # phrase NOT — wrap in phraseto_tsquery via raw
                    phrase = next_tok.strip('"')
                    tsq_parts.append(f"!phraseto_tsquery('english', '{phrase}')")
                else:
                    clean = _re.sub(r"[^a-zA-Z0-9\u0900-\u097F]", '', next_tok)
                    if clean:
                        tsq_parts.append(f'!{clean}')
                i += 1
            else:
                tsq_parts.append('!')
        elif tok.startswith('"') and tok.endswith('"') and len(tok) > 2:
            # Quoted phrase — use <-> operator (sequential)
            phrase_words = tok.strip('"').split()
            tsq_parts.append(' <-> '.join(
                _re.sub(r"[^a-zA-Z0-9\u0900-\u097F]", '', w) for w in phrase_words if w
            ))
            i += 1
        else:
            clean = _re.sub(r"[^a-zA-Z0-9\u0900-\u097F]", '', tok)
            if clean:
                tsq_parts.append(clean)
            i += 1

    # Auto-insert & between consecutive word tokens (no explicit operator)
    result_parts = []
    for j, part in enumerate(tsq_parts):
        result_parts.append(part)
        if j < len(tsq_parts) - 1:
            next_part = tsq_parts[j + 1]
            # If neither current nor next is an operator, add &
            if part not in ('&', '|') and not part.startswith('!') and \
               next_part not in ('&', '|') and not next_part.startswith('!'):
                result_parts.append('&')
    return ' '.join(result_parts)


def _make_search_query(raw_query):
    """
    Build a robust SearchQuery from raw user input.
    Normalizes uppercase AND/OR/NOT to lowercase so PostgreSQL websearch
    understands them correctly.
    """
    # Normalize: lowercase AND/OR/NOT so websearch understands them
    normalized = _re.sub(
        r'\b(AND|OR|NOT)\b',
        lambda m: m.group(1).lower(),
        raw_query,
    )
    return SearchQuery(normalized, search_type='websearch', config='english')


def _icontains_fallback(qs, words, search_in='both'):
    """
    Build an icontains OR-filter across chosen fields for each word,
    so multi-word queries like 'ayurveda cancer' still hit relevant rows.
    Every word must appear in AT LEAST ONE of the chosen fields (OR across fields).
    Returns filtered queryset.
    """
    from django.db.models import Q
    combined = Q()
    for word in words:
        word_q = Q()
        if search_in in ('both', 'title'):
            word_q |= Q(title__icontains=word)
            word_q |= Q(student_name__icontains=word)
            word_q |= Q(college_name__icontains=word)
            word_q |= Q(research_area__icontains=word)
            word_q |= Q(spark_id__icontains=word)
        if search_in in ('both', 'synopsis'):
            word_q |= Q(extracted_text__icontains=word)
        combined &= word_q  # ALL words must match (AND semantics across words)
    return qs.filter(combined) if combined else qs


@api_view(['GET'])
def global_search(request):
    """
    GET /api/duplicate-check/search/
      ?q=<query>
      &search_in=both|title|synopsis
      &scheme=SPARK|PG-STAR|PDF-STAR
      &status=received|selected|awarded
      &year=2022
      &page=1
      &page_size=20

    Full-text search ranked by PostgreSQL SearchRank.
    Cascade strategy:
      1. GIN-indexed search_vector (instant, stemmed)
      2. On-the-fly SearchVector (no GIN but correct results)
      3. icontains fallback per-word (guaranteed results)
    """
    from django.db.models import Q

    q         = request.query_params.get('q', '').strip()
    search_in = request.query_params.get('search_in', 'both')   # both | title | synopsis
    scheme    = request.query_params.get('scheme')
    st        = request.query_params.get('status')
    year      = request.query_params.get('year')
    page      = max(1, int(request.query_params.get('page', 1)))
    page_size = min(50, int(request.query_params.get('page_size', 20)))

    if not q:
        return Response({'count': 0, 'results': []})

    # Base queryset with filters
    base_qs = ResearchProposal.objects.all()
    if scheme:
        base_qs = base_qs.filter(scheme=scheme)
    if st:
        base_qs = base_qs.filter(status=st)
    if year:
        base_qs = base_qs.filter(year=year)

    # Normalise query for websearch
    ws_query = _make_search_query(q)
    query_words = _extract_query_words(q)

    qs_final  = None
    search_type = 'fts'

    # ── Strategy 1: GIN-indexed search_vector ────────────────────────────────
    try:
        if search_in == 'title':
            # search_vector includes title at weight A — filter by it but only
            # include rows where title matches by re-annotating rank on title only
            qs_try = (
                base_qs
                .filter(search_vector=ws_query)
                .annotate(rank=SearchRank(SV('title', weight='A', config='english'), ws_query))
                .filter(rank__gt=0)
                .order_by('-rank')
            )
        elif search_in == 'synopsis':
            qs_try = (
                base_qs
                .filter(search_vector=ws_query)
                .annotate(rank=SearchRank(SV('extracted_text', weight='A', config='english'), ws_query))
                .filter(rank__gt=0)
                .order_by('-rank')
            )
        else:  # both
            qs_try = (
                base_qs
                .filter(search_vector=ws_query)
                .annotate(rank=SearchRank('search_vector', ws_query))
                .order_by('-rank')
            )

        if qs_try.exists():
            qs_final = qs_try
            search_type = 'fts'
    except Exception:
        pass

    # ── Strategy 2: On-the-fly SearchVector (no GIN needed) ──────────────────
    if qs_final is None:
        try:
            if search_in == 'title':
                fly_vec = SV('title', weight='A', config='english')
            elif search_in == 'synopsis':
                fly_vec = SV('extracted_text', weight='A', config='english')
            else:
                fly_vec = (
                    SV('title',        weight='A', config='english')
                    + SV('student_name', weight='A', config='english')
                    + SV('college_name', weight='B', config='english')
                    + SV('research_area',weight='B', config='english')
                    + SV('extracted_text',weight='C', config='english')
                )
            qs_try = (
                base_qs
                .annotate(rank=SearchRank(fly_vec, ws_query))
                .filter(rank__gt=0)
                .order_by('-rank')
            )
            if qs_try.exists():
                qs_final = qs_try
                search_type = 'fts'
        except Exception:
            pass

    # ── Strategy 3: icontains fallback — guaranteed results ──────────────────
    if qs_final is None or not qs_final.exists():
        qs_final    = _icontains_fallback(base_qs, query_words or q.split(), search_in)
        search_type = 'text'

    total  = qs_final.count()
    offset = (page - 1) * page_size
    page_qs = qs_final[offset: offset + page_size]

    results = []
    for p in page_qs:
        # Choose snippet source based on search_in
        if search_in == 'title':
            snip_src = p.title
            matched_in = 'title'
        elif search_in == 'synopsis':
            snip_src = p.extracted_text or ''
            matched_in = 'synopsis'
        else:
            snip_src = p.extracted_text or p.title
            matched_in = 'both'

        results.append({
            'id':               p.id,
            'spark_id':         p.spark_id,
            'scheme':           p.scheme,
            'title':            p.title,
            'student_name':     p.student_name,
            'college_name':     p.college_name,
            'state':            p.state,
            'year':             p.year,
            'session':          p.session,
            'status':           p.status,
            'research_area':    p.research_area,
            'extraction_status':p.extraction_status,
            'review_status':    p.review_status,
            'rank':             round(getattr(p, 'rank', 0) * 100, 2),
            'matched_in':       matched_in,
            'snippet':          _build_snippet(snip_src, query_words),
        })

    return Response({
        'count':       total,
        'page':        page,
        'page_size':   page_size,
        'total_pages': max(1, (total + page_size - 1) // page_size),
        'search_type': search_type,
        'results':     results,
    })


@api_view(['POST'])
def boolean_search(request):
    """
    POST /api/duplicate-check/boolean-search/
    Body:
      {
        "query":      "ayurveda AND cancer NOT clinical",
        "search_in":  "both" | "title" | "synopsis",
        "scheme":     "SPARK",    # optional
        "status":     "received", # optional
        "year":       "2022",     # optional
        "page":       1,
        "page_size":  20
      }

    Boolean operators (user types uppercase — we normalise for PostgreSQL):
      AND  → both words must appear          e.g.  ayurveda AND cancer
      OR   → either word                     e.g.  cancer OR diabetes
      NOT  → exclude word                    e.g.  ayurveda NOT synthetic
      "phrase" → exact phrase match          e.g.  "clinical trial"

    search_in choices:
      "title"    → FTS on title only   (fast; GIN-indexed)
      "synopsis" → FTS on extracted_text (requires extraction_status=done OR text present)
      "both"     → GIN search_vector (title weight-A, synopsis weight-C)

    Cascade fallback:
      FTS (GIN / on-the-fly) → icontains per-word fallback
    """
    from django.db.models import Q

    raw_query  = request.data.get('query', '').strip()
    search_in  = request.data.get('search_in', 'both')   # title | synopsis | both
    scheme     = request.data.get('scheme')
    st         = request.data.get('status')
    year       = request.data.get('year')
    page       = max(1, int(request.data.get('page', 1)))
    page_size  = min(50, int(request.data.get('page_size', 20)))

    if not raw_query:
        return Response(
            {'detail': 'query is required'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Build robust SearchQuery (handles AND/OR/NOT/phrase)
    try:
        search_query = _make_search_query(raw_query)
    except Exception as exc:
        return Response(
            {'detail': f'Invalid search query: {exc}'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Extract plain words for snippet highlighting
    query_words = _extract_query_words(raw_query)

    # ── Base queryset ─────────────────────────────────────────────────────────
    base_qs = ResearchProposal.objects.all()
    if scheme:
        base_qs = base_qs.filter(scheme=scheme)
    if st:
        base_qs = base_qs.filter(status=st)
    if year:
        base_qs = base_qs.filter(year=year)

    qs_final        = None
    matched_in_label = search_in if search_in != 'both' else 'both'
    search_type      = 'fts'

    # ═════════════════════════════════════════════════════════════════════════
    # TITLE mode
    # ═════════════════════════════════════════════════════════════════════════
    if search_in == 'title':
        matched_in_label = 'title'

        # Strategy 1: on-the-fly FTS on title (no GIN needed, always correct)
        try:
            title_vec = SV('title', config='english')
            qs_try = (
                base_qs
                .annotate(
                    _tv=title_vec,
                    rank=SearchRank(SV('title', config='english'), search_query),
                )
                .filter(_tv=search_query)
                .order_by('-rank')
            )
            if qs_try.exists():
                qs_final = qs_try
        except Exception:
            pass

        # Strategy 2: icontains fallback on title words
        if qs_final is None or not qs_final.exists():
            qs_final    = _icontains_fallback(base_qs, query_words or raw_query.split(), 'title')
            search_type = 'text'

    # ═════════════════════════════════════════════════════════════════════════
    # SYNOPSIS mode
    # ═════════════════════════════════════════════════════════════════════════
    elif search_in == 'synopsis':
        matched_in_label = 'synopsis'

        # Strategy 1: FTS on extracted_text for any proposal with text
        try:
            syn_vec = SV('extracted_text', config='english')
            # Include all proposals that have extracted_text — not just done
            qs_with_text = base_qs.exclude(
                Q(extracted_text__isnull=True) | Q(extracted_text='')
            )
            qs_try = (
                qs_with_text
                .annotate(
                    _sv=syn_vec,
                    rank=SearchRank(SV('extracted_text', config='english'), search_query),
                )
                .filter(_sv=search_query)
                .order_by('-rank')
            )
            if qs_try.exists():
                qs_final = qs_try
        except Exception:
            pass

        # Strategy 2: icontains fallback on extracted_text
        if qs_final is None or not qs_final.exists():
            qs_fall = base_qs.exclude(
                Q(extracted_text__isnull=True) | Q(extracted_text='')
            )
            qs_final    = _icontains_fallback(qs_fall, query_words or raw_query.split(), 'synopsis')
            search_type = 'text'

    # ═════════════════════════════════════════════════════════════════════════
    # BOTH mode — use pre-built GIN search_vector, fallback to on-the-fly
    # ═════════════════════════════════════════════════════════════════════════
    else:
        matched_in_label = 'both'

        # Strategy 1: GIN search_vector (fastest)
        try:
            qs_try = (
                base_qs
                .filter(search_vector=search_query)
                .annotate(rank=SearchRank('search_vector', search_query))
                .order_by('-rank')
            )
            if qs_try.exists():
                qs_final = qs_try
        except Exception:
            pass

        # Strategy 2: On-the-fly combined vector
        if qs_final is None or not qs_final.exists():
            try:
                fly_vec = (
                    SV('title',          weight='A', config='english')
                    + SV('student_name',  weight='A', config='english')
                    + SV('college_name',  weight='B', config='english')
                    + SV('research_area', weight='B', config='english')
                    + SV('extracted_text',weight='C', config='english')
                )
                qs_try = (
                    base_qs
                    .annotate(rank=SearchRank(fly_vec, search_query))
                    .filter(rank__gt=0)
                    .order_by('-rank')
                )
                if qs_try.exists():
                    qs_final = qs_try
            except Exception:
                pass

        # Strategy 3: icontains fallback
        if qs_final is None or not qs_final.exists():
            qs_final    = _icontains_fallback(base_qs, query_words or raw_query.split(), 'both')
            search_type = 'text'

    # ── Paginate ──────────────────────────────────────────────────────────────
    total   = qs_final.count() if qs_final is not None else 0
    offset  = (page - 1) * page_size
    page_qs = (qs_final[offset: offset + page_size]) if qs_final is not None else []

    results = []
    for p in page_qs:
        # Choose snippet source
        if search_in == 'title':
            snippet_src = p.title
        elif search_in == 'synopsis':
            snippet_src = p.extracted_text or ''
        else:
            snippet_src = p.extracted_text or p.title

        results.append({
            'id':                p.id,
            'spark_id':          p.spark_id,
            'scheme':            p.scheme,
            'title':             p.title,
            'student_name':      p.student_name,
            'college_name':      p.college_name,
            'state':             p.state,
            'year':              p.year,
            'session':           p.session,
            'status':            p.status,
            'research_area':     p.research_area,
            'extraction_status': p.extraction_status,
            'review_status':     p.review_status,
            'rank':              round(getattr(p, 'rank', 0) * 100, 2),
            'matched_in':        matched_in_label,
            'snippet':           _build_snippet(snippet_src, query_words),
        })

    return Response({
        'count':       total,
        'page':        page,
        'page_size':   page_size,
        'total_pages': max(1, (total + page_size - 1) // page_size),
        'query':       raw_query,
        'search_in':   matched_in_label,
        'search_type': search_type,
        'results':     results,
    })