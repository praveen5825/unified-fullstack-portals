from celery import shared_task
from django.db import transaction

from .models import ResearchProposal, DocumentSimilarityResult, ExtractionStatus
from .services.extraction import extract_proposal_text
from .services.matching import (
    get_candidates, compute_content_scores, get_common_terms,
    compute_overall_score, determine_match_type, STORE_THRESHOLD,
)


@shared_task(bind=True, max_retries=2)
def process_proposal_check(self, proposal_id):
    """
    Full pipeline for ONE proposal:
    1. Extract text (PyMuPDF -> Tesseract fallback)
    2. Find candidates via trigram similarity
    3. Score candidates via TF-IDF cosine similarity
    4. Persist DocumentSimilarityResult rows above STORE_THRESHOLD

    This is only ever triggered manually from the Duplicate Check screen --
    never from the normal "New Proposal" create flow.
    """
    try:
        proposal = ResearchProposal.objects.get(id=proposal_id)
    except ResearchProposal.DoesNotExist:
        return

    proposal.extraction_status = ExtractionStatus.PROCESSING
    proposal.save(update_fields=['extraction_status'])

    try:
        text = extract_proposal_text(proposal.document.path)
        proposal.extracted_text = text
        proposal.extraction_status = ExtractionStatus.DONE
        proposal.save(update_fields=['extracted_text', 'extraction_status'])

        candidates = list(get_candidates(proposal))
        if candidates and text:
            candidate_texts = [c.extracted_text for c in candidates]
            content_scores, vectorizer, tfidf_matrix = compute_content_scores(text, candidate_texts)

            with transaction.atomic():
                for idx, candidate in enumerate(candidates):
                    content_pct = round(content_scores[idx] * 100, 2)
                    title_pct = round(getattr(candidate, 'title_sim', 0) * 100, 2)
                    student_pct = round(getattr(candidate, 'student_sim', 0) * 100, 2)
                    college_pct = round(getattr(candidate, 'college_sim', 0) * 100, 2)

                    overall = compute_overall_score(content_pct, title_pct, student_pct, college_pct)
                    if overall < STORE_THRESHOLD:
                        continue

                    DocumentSimilarityResult.objects.update_or_create(
                        source_proposal=proposal,
                        matched_proposal=candidate,
                        defaults={
                            'overall_score': overall,
                            'content_score': content_pct,
                            'title_score': title_pct,
                            'student_name_score': student_pct,
                            'college_score': college_pct,
                            'match_type': determine_match_type(content_pct, student_pct),
                            'matching_terms': get_common_terms(vectorizer, tfidf_matrix, idx + 1),
                        }
                    )
    except Exception as exc:
        proposal.extraction_status = ExtractionStatus.FAILED
        proposal.save(update_fields=['extraction_status'])
        raise self.retry(exc=exc, countdown=30)


@shared_task
def process_bulk_check(proposal_ids):
    for pid in proposal_ids:
        process_proposal_check.delay(pid)
