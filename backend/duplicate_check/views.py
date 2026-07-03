from rest_framework import viewsets, filters, status
from rest_framework.decorators import api_view, action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend

from .models import ResearchProposal, ExtractionStatus, ReviewStatus
from .serializers import ProposalSerializer, ProposalReviewSerializer
from .tasks import process_proposal_check, process_bulk_check


import tempfile, os
from .services.extraction import extract_proposal_text
from .services.matching import compute_content_scores, get_common_terms, get_candidates_raw, compute_overall_score


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
    finally:
        os.remove(tmp_path)

    if not text.strip():
        return Response({'detail': 'Could not extract text from this document.', 'matches': []})

    candidates = get_candidates_raw(title, student_name, college_name)
    if not candidates:
        return Response({'matches': [], 'extracted_chars': len(text)})

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

        results.append({
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

    results.sort(key=lambda r: r['overall_score'], reverse=True)
    return Response({'matches': results[:20], 'extracted_chars': len(text)})