"""
Duplicate matching service -- two-stage approach for speed at scale:

Stage 1 (fast filter): Postgres trigram similarity on title/student_name/
college_name narrows down thousands of proposals to a small candidate set
(uses the GinIndex trigram indexes on the model -- runs in milliseconds).

Stage 2 (precise scoring): TF-IDF + cosine similarity runs ONLY on that
small candidate set, giving an accurate content-level similarity score
without ever vectorizing the entire proposal corpus per request.
"""
from django.contrib.postgres.search import TrigramSimilarity
from django.db.models import Q
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

from ..models import ResearchProposal

CANDIDATE_TITLE_THRESHOLD = 0.15
CANDIDATE_STUDENT_THRESHOLD = 0.4
CANDIDATE_LIMIT = 50

# Weighted scoring: content match matters most (catches reworded/copied text),
# title next, student/college are supporting signals only.
WEIGHT_CONTENT = 0.6
WEIGHT_TITLE = 0.25
WEIGHT_STUDENT = 0.1
WEIGHT_COLLEGE = 0.05

STORE_THRESHOLD = 40  # don't persist noise below this overall score


def get_candidates(proposal, limit=CANDIDATE_LIMIT):
    return ResearchProposal.objects.exclude(id=proposal.id).annotate(
        title_sim=TrigramSimilarity('title', proposal.title),
        student_sim=TrigramSimilarity('student_name', proposal.student_name),
        college_sim=TrigramSimilarity('college_name', proposal.college_name),
    ).filter(
        Q(title_sim__gt=CANDIDATE_TITLE_THRESHOLD) | Q(student_sim__gt=CANDIDATE_STUDENT_THRESHOLD)
    ).order_by('-title_sim')[:limit]


def compute_content_scores(new_text, candidate_texts):
    """Returns (scores array, fitted vectorizer, tfidf_matrix) for reuse in get_common_terms."""
    corpus = [new_text] + [t or "" for t in candidate_texts]
    vectorizer = TfidfVectorizer(stop_words='english', max_features=5000)
    tfidf_matrix = vectorizer.fit_transform(corpus)
    scores = cosine_similarity(tfidf_matrix[0:1], tfidf_matrix[1:])[0]
    return scores, vectorizer, tfidf_matrix


def get_common_terms(vectorizer, tfidf_matrix, target_idx, top_n=10):
    """target_idx is 1-based position in the corpus (0 is always the new proposal)."""
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
    """Same idea as get_candidates(), but for an ad-hoc upload that has no saved proposal row yet."""
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