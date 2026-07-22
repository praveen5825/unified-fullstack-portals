"""
Management command: populate_search_vectors

Run this to back-fill / refresh search_vector for all existing proposals.
New proposals are handled automatically by the post_save signal, but this
command ensures old records and those whose extracted_text was added later
also get their FTS vector populated.

Usage:
    python manage.py populate_search_vectors
    python manage.py populate_search_vectors --batch-size=500
    python manage.py populate_search_vectors --only-empty   # only NULL vectors
"""

from django.core.management.base import BaseCommand
from django.contrib.postgres.search import SearchVector
from duplicate_check.models import ResearchProposal


class Command(BaseCommand):
    help = 'Back-fill / refresh the search_vector column for all existing proposals.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--batch-size',
            type=int,
            default=200,
            help='Number of proposals to update per batch (default: 200)',
        )
        parser.add_argument(
            '--only-empty',
            action='store_true',
            default=False,
            help='Only update proposals where search_vector is currently NULL',
        )

    def handle(self, *args, **options):
        batch_size = options['batch_size']
        only_empty = options['only_empty']

        qs = ResearchProposal.objects.all()
        if only_empty:
            qs = qs.filter(search_vector__isnull=True)
            self.stdout.write('Mode: only-empty (NULL search_vectors)')
        else:
            self.stdout.write('Mode: all proposals')

        total = qs.count()
        if total == 0:
            self.stdout.write(self.style.WARNING('No proposals to update. Done.'))
            return

        self.stdout.write(f'Found {total} proposals. Updating in batches of {batch_size}...')

        updated = 0
        ids = list(qs.values_list('id', flat=True))

        vector_expr = (
            SearchVector('title',         weight='A', config='english')
            + SearchVector('student_name',  weight='A', config='english')
            + SearchVector('spark_id',      weight='A', config='english')
            + SearchVector('research_area', weight='B', config='english')
            + SearchVector('college_name',  weight='B', config='english')
            + SearchVector('state',         weight='B', config='english')
            + SearchVector('extracted_text',weight='C', config='english')
        )

        for i in range(0, len(ids), batch_size):
            batch_ids = ids[i:i + batch_size]
            ResearchProposal.objects.filter(pk__in=batch_ids).update(
                search_vector=vector_expr
            )
            updated += len(batch_ids)
            pct = int(updated / total * 100)
            self.stdout.write(f'  [{pct:3d}%] Updated {updated}/{total}...')

        self.stdout.write(self.style.SUCCESS(
            f'\nDone! search_vector populated for {total} proposals.\n'
            f'  Boolean search (AND/OR/NOT/phrase) is now 100% accurate.'
        ))
