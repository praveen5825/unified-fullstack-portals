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


class ResearchProposal(models.Model):
    spark_id = models.CharField(max_length=50, db_index=True)
    scheme = models.CharField(max_length=10, choices=Scheme.choices, db_index=True)
    state = models.CharField(max_length=100, db_index=True)
    college_name = models.CharField(max_length=255)
    guide_name = models.CharField(max_length=255)
    student_name = models.CharField(max_length=255, db_index=True)
    year = models.CharField(max_length=20, db_index=True)
    title = models.TextField()
    research_area = models.CharField(max_length=255, db_index=True)
    status = models.CharField(max_length=20, choices=ProposalStatus.choices, db_index=True)

    document = models.FileField(upload_to='proposals/%Y/%m/')
    extracted_text = models.TextField(blank=True, default='')
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
            GinIndex(fields=['title'], name='title_trgm_idx', opclasses=['gin_trgm_ops']),
            GinIndex(fields=['student_name'], name='student_trgm_idx', opclasses=['gin_trgm_ops']),
        ]
        constraints = [
            models.UniqueConstraint(fields=['spark_id', 'scheme'], name='unique_spark_id_per_scheme')
        ]
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.spark_id} - {self.student_name} ({self.scheme})"


class DocumentSimilarityResult(models.Model):
    class MatchType(models.TextChoices):
        CONTENT = 'content', 'Content Match'
        STUDENT = 'student', 'Same Student'
        BOTH = 'both', 'Both'

    source_proposal = models.ForeignKey(
        ResearchProposal, related_name='similarity_as_source', on_delete=models.CASCADE
    )
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
