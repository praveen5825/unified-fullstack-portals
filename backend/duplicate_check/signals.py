from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import ResearchProposal
from .tasks import extract_text_only


@receiver(post_save, sender=ResearchProposal)
def trigger_extraction_on_create(sender, instance, created, **kwargs):
    if created and instance.document:
        extract_text_only.delay(instance.id)