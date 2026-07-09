import numpy as np
import difflib
from django.contrib.postgres.search import TrigramSimilarity
from django.db.models import Q
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

from ..models import ResearchProposal, ProposalEmbedding
from .embeddings import deserialize_embedding

CANDIDATE_TITLE_THRESHOLD = 0.15
CANDIDATE_STUDENT_THRESHOLD = 0.4
CANDIDATE_LIMIT = 50

WEIGHT_CONTENT = 0.6
WEIGHT_TITLE = 0.25
WEIGHT_STUDENT = 0.1
WEIGHT_COLLEGE = 0.05

STORE_THRESHOLD = 40  # don't persist noise below this overall score
SEMANTIC_MATCH_THRESHOLD = 0.75  # threshold to consider a paragraph match


def get_candidates(proposal, limit=CANDIDATE_LIMIT):
    """Fallback legacy fast filter."""
    return ResearchProposal.objects.exclude(id=proposal.id).annotate(
        title_sim=TrigramSimilarity('title', proposal.title),
        student_sim=TrigramSimilarity('student_name', proposal.student_name),
        college_sim=TrigramSimilarity('college_name', proposal.college_name),
    ).filter(
        Q(title_sim__gt=CANDIDATE_TITLE_THRESHOLD) | Q(student_sim__gt=CANDIDATE_STUDENT_THRESHOLD)
    ).order_by('-title_sim')[:limit]


def get_semantic_candidates(proposal, limit=CANDIDATE_LIMIT):
    """
    Intelligent Semantic Search over all documents.
    Loads all document embeddings into memory (very fast for 10s of thousands of docs)
    and computes cosine similarity.
    Returns: list of dicts with keys:
      - candidate (ResearchProposal)
      - content_score (float, 0-1)
      - matched_paragraphs (list of dicts)
    """
    try:
        source_emb_record = proposal.embedding
        source_doc_emb = deserialize_embedding(source_emb_record.doc_embedding)
        source_para_emb = deserialize_embedding(source_emb_record.para_embeddings, shape=(-1, 384))
        source_paragraphs = source_emb_record.paragraphs
    except ProposalEmbedding.DoesNotExist:
        return []

    if source_doc_emb.size == 0:
        return []

    # Fetch all other embeddings
    other_embs = ProposalEmbedding.objects.exclude(proposal_id=proposal.id).select_related('proposal')
    
    if not other_embs.exists():
        return []
        
    candidates_list = list(other_embs)
    
    # Build matrix of all other document embeddings
    # Shape: (N, 384)
    doc_matrix = np.array([
        deserialize_embedding(c.doc_embedding) if c.doc_embedding else np.zeros(384, dtype=np.float32)
        for c in candidates_list
    ])
    
    # Compute cosine similarity for all documents in one go
    # Since embeddings are normalized, dot product == cosine similarity
    similarities = np.dot(doc_matrix, source_doc_emb)
    
    # Get top indices
    top_indices = np.argsort(similarities)[::-1][:limit]
    
    results = []
    for idx in top_indices:
        sim_score = similarities[idx]
        # Ignore completely unrelated documents early
        if sim_score < 0.2:
            continue
            
        candidate_record = candidates_list[idx]
        candidate_proposal = candidate_record.proposal
        
        # Check for exact duplicate via text hash
        is_exact = bool(proposal.text_hash and candidate_proposal.text_hash and proposal.text_hash == candidate_proposal.text_hash)
        
        final_content_score = 1.0 if is_exact else float(sim_score)
        
        # Identify matched sections
        matched_paragraphs = []
        if final_content_score > 0.4 and candidate_record.para_embeddings and source_para_emb.size > 0:
            target_para_emb = deserialize_embedding(candidate_record.para_embeddings, shape=(-1, 384))
            target_paragraphs = candidate_record.paragraphs
            
            # paragraph similarities: shape (len(source_paras), len(target_paras))
            para_sims = np.dot(source_para_emb, target_para_emb.T)
            
            # Find highly similar paragraph pairs
            for src_i in range(para_sims.shape[0]):
                best_tgt_i = np.argmax(para_sims[src_i])
                best_score = para_sims[src_i, best_tgt_i]
                
                if best_score >= SEMANTIC_MATCH_THRESHOLD:
                    matched_paragraphs.append({
                        'source_idx': src_i,
                        'source_text': source_paragraphs[src_i],
                        'target_idx': int(best_tgt_i),
                        'target_text': target_paragraphs[best_tgt_i],
                        'similarity': round(float(best_score) * 100, 2)
                    })
                    
        def sim_ratio(s1, s2):
            if not s1 and not s2: return 0.0
            if not s1 or not s2: return 0.0
            return difflib.SequenceMatcher(None, str(s1).lower(), str(s2).lower()).ratio()
            
        candidate_proposal.title_sim = sim_ratio(proposal.title, candidate_proposal.title)
        candidate_proposal.student_sim = sim_ratio(proposal.student_name, candidate_proposal.student_name)
        candidate_proposal.college_sim = sim_ratio(proposal.college_name, candidate_proposal.college_name)
        
        results.append({
            'candidate': candidate_proposal,
            'content_score': final_content_score,
            'matched_paragraphs': matched_paragraphs,
        })
        
    return results


def compute_content_scores(new_text, candidate_texts):
    """Legacy TF-IDF method (fallback)."""
    corpus = [new_text] + [t or "" for t in candidate_texts]
    vectorizer = TfidfVectorizer(stop_words='english', max_features=5000)
    tfidf_matrix = vectorizer.fit_transform(corpus)
    scores = cosine_similarity(tfidf_matrix[0:1], tfidf_matrix[1:])[0]
    return scores, vectorizer, tfidf_matrix


def get_common_terms(vectorizer, tfidf_matrix, target_idx, top_n=10):
    """Legacy term extraction."""
    if not vectorizer:
        return []
    feature_names = vectorizer.get_feature_names_out()
    vec_new, vec_target = tfidf_matrix[0], tfidf_matrix[target_idx]
    common = set(vec_new.nonzero()[1]) & set(vec_target.nonzero()[1])
    top = sorted(common, key=lambda i: vec_new[0, i] + vec_target[0, i], reverse=True)[:top_n]
    return [feature_names[i] for i in top]


def compute_overall_score(content, title, student, college):
    return round(
        (content * WEIGHT_CONTENT) + (title * WEIGHT_TITLE) +
        (student * WEIGHT_STUDENT) + (college * WEIGHT_COLLEGE),
        2
    )


def determine_match_type(content_score, student_score, threshold=60):
    is_content_match = content_score >= threshold
    is_student_match = student_score >= threshold
    if is_content_match and is_student_match:
        return 'both'
    if is_student_match:
        return 'student'
    return 'content'


def get_candidates_raw(title='', student_name='', college_name='', limit=CANDIDATE_LIMIT):
    """Legacy exact metadata match."""
    qs = ResearchProposal.objects.exclude(extracted_text='')
    if title or student_name:
        qs = qs.annotate(
            title_sim=TrigramSimilarity('title', title or ''),
            student_sim=TrigramSimilarity('student_name', student_name or ''),
            college_sim=TrigramSimilarity('college_name', college_name or ''),
        ).filter(
            Q(title_sim__gt=CANDIDATE_TITLE_THRESHOLD) | Q(student_sim__gt=CANDIDATE_STUDENT_THRESHOLD)
        ).order_by('-title_sim')
    return list(qs[:limit])