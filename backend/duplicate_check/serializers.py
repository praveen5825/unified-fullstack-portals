from rest_framework import serializers
from .models import ResearchProposal, DocumentSimilarityResult


class ProposalSerializer(serializers.ModelSerializer):
    """
    Used for BOTH manual create and list/detail.
    extraction_status & review_status are read-only here on purpose --
    the create flow must stay a plain save, the system controls these
    two fields later via the duplicate-check pipeline, never the form.
    """
    class Meta:
        model = ResearchProposal
        fields = [
            'id', 'spark_id', 'scheme', 'state', 'college_name', 'guide_name',
            'student_name', 'year', 'session', 'title', 'research_area', 'status',
            'document', 'final_report', 'extraction_status', 'review_status',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['extraction_status', 'review_status', 'created_at', 'updated_at']


class ProposalMiniSerializer(serializers.ModelSerializer):
    """Lightweight version, used when embedding inside similarity results."""
    class Meta:
        model = ResearchProposal
        fields = ['id', 'spark_id', 'scheme', 'student_name', 'college_name', 'status', 'title']


class SimilarityResultSerializer(serializers.ModelSerializer):
    matched_proposal = ProposalMiniSerializer(read_only=True)

    class Meta:
        model = DocumentSimilarityResult
        fields = [
            'id', 'matched_proposal', 'overall_score', 'content_score',
            'title_score', 'student_name_score', 'college_score',
            'match_type', 'matching_terms', 'created_at',
        ]


class ProposalReviewSerializer(serializers.ModelSerializer):
    """Full detail view for the Review Results screen: proposal + its matches."""
    matches = serializers.SerializerMethodField()

    class Meta:
        model = ResearchProposal
        fields = [
            'id', 'spark_id', 'scheme', 'student_name', 'college_name',
            'title', 'extraction_status', 'review_status', 'matches',
        ]

    def get_matches(self, obj):
        qs = obj.similarity_as_source.select_related('matched_proposal').order_by('-overall_score')
        return SimilarityResultSerializer(qs, many=True).data
