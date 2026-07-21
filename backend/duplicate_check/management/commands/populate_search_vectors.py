"""
Management command: populate_search_vectors

Run this ONCE after the migration to back-fill search_vector for all existing
proposals. New proposals are handled automatically by the post_save signal.

Usage:
    python manage.py populate_search_vectors
    python manage.py populate_search_vectors --batch-size=500
"""

from django.core.management.base import BaseCommand
from django.contrib.postgres.search import SearchVector
from duplicate_check.models import ResearchProposal


class Command(BaseCommand):
    help = 'Back-fill the search_vector column for all existing proposals.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--batch-size',
            type=int,
            default=200,
            help='Number of proposals to update per batch (default: 200)',
        )

    def handle(self, *args, **options):
        batch_size = options['batch_size']
        total = ResearchProposal.objects.count()
        self.stdout.write(f'Found {total} proposals. Updating in batches of {batch_size}...')

        updated = 0
        ids = list(ResearchProposal.objects.values_list('id', flat=True))

        for i in range(0, len(ids), batch_size):
            batch_ids = ids[i:i + batch_size]
            ResearchProposal.objects.filter(pk__in=batch_ids).update(
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
            updated += len(batch_ids)
            self.stdout.write(f'  Updated {updated}/{total}...')

        self.stdout.write(self.style.SUCCESS(
            f'\nDone! search_vector populated for {total} proposals.'
        ))
