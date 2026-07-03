from django.contrib import admin
from .models import ResearchProposal, DocumentSimilarityResult


@admin.register(ResearchProposal)
class ResearchProposalAdmin(admin.ModelAdmin):
    list_display = (
        'spark_id', 'student_name', 'scheme', 'status',
        'state', 'year', 'extraction_status', 'review_status', 'created_at',
    )
    list_filter = ('scheme', 'status', 'state', 'year', 'extraction_status', 'review_status')
    search_fields = ('spark_id', 'student_name', 'title', 'college_name', 'guide_name')
    readonly_fields = ('extracted_text', 'created_at', 'updated_at')
    list_per_page = 50


@admin.register(DocumentSimilarityResult)
class DocumentSimilarityResultAdmin(admin.ModelAdmin):
    list_display = ('source_proposal', 'matched_proposal', 'overall_score', 'match_type', 'created_at')
    list_filter = ('match_type',)
    autocomplete_fields = ()
    list_per_page = 50
