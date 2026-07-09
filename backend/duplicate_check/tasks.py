from celery import shared_task
from django.db import transaction

from .models import ResearchProposal, DocumentSimilarityResult, ExtractionStatus, ProposalEmbedding
from .services.extraction import extract_proposal_text
from .services.hashing import compute_text_hash
from .services.embeddings import compute_proposal_embeddings, serialize_embedding
from .services.matching import (
    get_candidates, compute_content_scores, get_common_terms,
    compute_overall_score, determine_match_type, STORE_THRESHOLD,
)


def generate_and_save_embedding(proposal, text):
    if not text:
        return
    doc_emb, para_emb, paragraphs = compute_proposal_embeddings(text)
    ProposalEmbedding.objects.update_or_create(
        proposal=proposal,
        defaults={
            'doc_embedding': serialize_embedding(doc_emb),
            'para_embeddings': serialize_embedding(para_emb),
            'paragraphs': paragraphs
        }
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
        proposal.text_hash = compute_text_hash(text)
        proposal.extraction_status = ExtractionStatus.DONE
        proposal.save(update_fields=['extracted_text', 'extraction_status', 'text_hash'])
        
        # Generate semantic embeddings for duplicate matching
        generate_and_save_embedding(proposal, text)

        semantic_results = get_semantic_candidates(proposal)
        if semantic_results:
            with transaction.atomic():
                for result in semantic_results:
                    candidate = result['candidate']
                    content_pct = round(result['content_score'] * 100, 2)
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
                            'matched_paragraphs': result['matched_paragraphs'],
                            'matching_terms': [], # Deprecated in favor of matched_paragraphs
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



@shared_task
def extract_text_only(proposal_id):
    """
    Runs automatically right after every proposal is saved (any path --
    New Proposal form, admin, future bulk import). Only extracts text,
    never runs matching -- matching stays manual via the Duplicate Check
    upload tool, exactly as designed.
    """
    try:
        proposal = ResearchProposal.objects.get(id=proposal_id)
    except ResearchProposal.DoesNotExist:
        return
    try:
        text = extract_proposal_text(proposal.document.path)
        proposal.extracted_text = text
        proposal.text_hash = compute_text_hash(text)
        proposal.extraction_status = ExtractionStatus.DONE
        proposal.save(update_fields=['extracted_text', 'extraction_status', 'text_hash'])
        
        generate_and_save_embedding(proposal, text)
    except Exception:
        proposal.extraction_status = ExtractionStatus.FAILED
        proposal.save(update_fields=['extraction_status'])