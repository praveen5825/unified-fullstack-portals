from django.db import models
from django.contrib.postgres.indexes import GinIndex


class Scheme(models.TextChoices):
    SPARK = 'SPARK', 'SPARK'
    PG_STAR = 'PG-STAR', 'PG-STAR'
    PDF_STAR = 'PDF-STAR', 'PDF-STAR'


class ProposalStatus(models.TextChoices):
    RECEIVED = 'received', 'Received'
    SELECTED = 'selected', 'Selected'
    AWARDED = 'awarded', 'Awarded'


class ExtractionStatus(models.TextChoices):
    PENDING = 'pending', 'Pending'
    PROCESSING = 'processing', 'Processing'
    DONE = 'done', 'Done'
    FAILED = 'failed', 'Failed'


class ReviewStatus(models.TextChoices):
    UNREVIEWED = 'unreviewed', 'Unreviewed'
    CLEARED = 'cleared', 'Cleared'
    FLAGGED = 'flagged', 'Flagged Duplicate'


class ResearchType(models.TextChoices):
    CLINICAL = 'Clinical Research', 'Clinical Research'
    FUNDAMENTAL = 'Fundamental Research', 'Fundamental Research'
    PHARMACEUTICAL = 'Pharmaceutical Research / Drug Standardization / Techno Innovation', 'Pharmaceutical Research / Drug Standardization / Techno Innovation'
    LITERARY = 'Literary Research', 'Literary Research'
    PHARMACOLOGICAL = 'Pharmacological Research', 'Pharmacological Research'


class ResearchProposal(models.Model):
    spark_id = models.CharField(max_length=50, db_index=True)
    scheme = models.CharField(max_length=10, choices=Scheme.choices, db_index=True, blank=True, default='')
    state = models.CharField(max_length=100, db_index=True, blank=True, default='')
    college_name = models.CharField(max_length=255, blank=True, default='')
    guide_name = models.CharField(max_length=255, blank=True, default='')
    student_name = models.CharField(max_length=255, db_index=True, blank=True, default='')
    year = models.CharField(max_length=20, db_index=True, blank=True, default='')
    session = models.CharField(max_length=20, db_index=True, blank=True, default='')
    title = models.TextField(blank=True, default='')
    research_area = models.CharField(max_length=255, db_index=True, blank=True, default='')
    status = models.CharField(max_length=20, choices=ProposalStatus.choices, db_index=True, blank=True, default='received')

    document = models.FileField(upload_to='proposals/%Y/%m/', blank=True, null=True)
    final_report = models.FileField(upload_to='final_reports/%Y/%m/', blank=True, null=True)
    extracted_text = models.TextField(blank=True, default='')
    text_hash = models.CharField(max_length=64, db_index=True, blank=True)
    extraction_status = models.CharField(
        max_length=20, choices=ExtractionStatus.choices, default=ExtractionStatus.PENDING, db_index=True
    )
    review_status = models.CharField(
        max_length=20, choices=ReviewStatus.choices, default=ReviewStatus.UNREVIEWED, db_index=True
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            models.Index(fields=['scheme', 'status']),
            models.Index(fields=['state', 'year']),
            models.Index(fields=['research_area', 'status']),
            models.Index(fields=['session']),
            GinIndex(fields=['title'], name='title_trgm_idx', opclasses=['gin_trgm_ops']),
            GinIndex(fields=['student_name'], name='student_trgm_idx', opclasses=['gin_trgm_ops']),
        ]
        # Removed unique constraint to allow duplicate spark_id + scheme combinations
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.spark_id} - {self.student_name} ({self.scheme})"


class DocumentSimilarityResult(models.Model):
    class MatchType(models.TextChoices):
        CONTENT = 'content', 'Content Match'
        STUDENT = 'student', 'Same Student'
        BOTH = 'both', 'Both'

    source_proposal = models.ForeignKey(
        ResearchProposal, related_name='similarity_as_source', on_delete=models.CASCADE, null=True, blank=True
    )
    check_id = models.CharField(max_length=100, null=True, blank=True, db_index=True)
    matched_proposal = models.ForeignKey(
        ResearchProposal, related_name='similarity_as_match', on_delete=models.CASCADE
    )

    overall_score = models.FloatField()
    content_score = models.FloatField(default=0)
    title_score = models.FloatField(default=0)
    student_name_score = models.FloatField(default=0)
    college_score = models.FloatField(default=0)
    match_type = models.CharField(max_length=10, choices=MatchType.choices, default=MatchType.CONTENT)
    matching_terms = models.JSONField(default=list, blank=True)
    
    matched_paragraphs = models.JSONField(default=list, blank=True)
    matched_sentences = models.JSONField(default=list, blank=True)
    matched_words = models.IntegerField(default=0)
    total_words = models.IntegerField(default=0)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [models.Index(fields=['source_proposal', '-overall_score'])]
        ordering = ['-overall_score']
        constraints = [
            models.UniqueConstraint(
                fields=['source_proposal', 'matched_proposal'], name='unique_similarity_pair'
            )
        ]

    def __str__(self):
        return f"{self.source_proposal.spark_id} <-> {self.matched_proposal.spark_id}: {self.overall_score}%"

class ProposalEmbedding(models.Model):
    """
    Stores serialized NumPy embeddings for ResearchProposals.
    Kept separate to avoid bloating the core ResearchProposal model and to allow
    fast in-memory deserialization of all document vectors.
    """
    proposal = models.OneToOneField(
        ResearchProposal, on_delete=models.CASCADE, related_name='embedding'
    )
    # 1D numpy array (float32) for the document-level embedding (mean pooled)
    doc_embedding = models.BinaryField(null=True, blank=True)
    # 2D numpy array (float32) for paragraph-level embeddings (N x embedding_dim)
    para_embeddings = models.BinaryField(null=True, blank=True)
    # The actual text of the paragraphs corresponding to para_embeddings
    paragraphs = models.JSONField(default=list, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"Embedding for {self.proposal.spark_id}"
