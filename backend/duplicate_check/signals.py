from django.db.models.signals import post_save
from django.dispatch import receiver
from django.contrib.postgres.search import SearchVector

from .models import ResearchProposal
from .tasks import extract_text_only


@receiver(post_save, sender=ResearchProposal)
def trigger_extraction_on_create(sender, instance, created, **kwargs):
    if created and instance.document:
        extract_text_only.delay(instance.id)


@receiver(post_save, sender=ResearchProposal)
def update_search_vector(sender, instance, **kwargs):
    """
    Auto-rebuild the tsvector column after every proposal save so boolean
    full-text search is always up to date.

    Weights:
      A (highest) — title, student_name, spark_id
      B           — research_area, college_name, state
      C           — extracted_text (full synopsis body)

    Using update() avoids triggering another post_save signal (preventing
    infinite recursion) while still writing directly to the DB column.
    """
    ResearchProposal.objects.filter(pk=instance.pk).update(
        search_vector=(
            SearchVector('title', weight='A', config='english')
            + SearchVector('student_name', weight='A', config='english')
            + SearchVector('spark_id', weight='A', config='english')
            + SearchVector('research_area', weight='B', config='english')
            + SearchVector('college_name', weight='B', config='english')
            + SearchVector('state', weight='B', config='english')
            + SearchVector('extracted_text', weight='C', config='english')
        )
    )