"""
Management command: cleanup_synopsis_checks
Deletes temporary synopsis PDF and text files older than --max-age-hours (default: 24h).

Usage:
    python manage.py cleanup_synopsis_checks
    python manage.py cleanup_synopsis_checks --max-age-hours 48
    python manage.py cleanup_synopsis_checks --max-age-hours 0   # delete all

Schedule this via cron or Windows Task Scheduler; when Redis becomes available
it can be converted to a Celery beat task instead.
"""
import os
import time
import argparse

from django.core.management.base import BaseCommand
from django.conf import settings


class Command(BaseCommand):
    help = (
        'Delete temporary synopsis check files (PDF + TXT pairs) from '
        'media/synopsis_checks/ that are older than --max-age-hours hours.'
    )

    def add_arguments(self, parser: argparse.ArgumentParser) -> None:
        parser.add_argument(
            '--max-age-hours',
            type=float,
            default=24.0,
            help='Delete files older than this many hours (default: 24). Pass 0 to delete all.',
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            default=False,
            help='Show what would be deleted without actually deleting anything.',
        )

    def handle(self, *args, **options) -> None:
        max_age_hours: float = options['max_age_hours']
        dry_run: bool = options['dry_run']
        max_age_seconds = max_age_hours * 3600
        now = time.time()

        synopsis_dir = os.path.join(settings.MEDIA_ROOT, 'synopsis_checks')
        if not os.path.isdir(synopsis_dir):
            self.stdout.write(
                self.style.WARNING(f'Directory does not exist: {synopsis_dir}')
            )
            return

        all_files = os.listdir(synopsis_dir)

        # Collect unique UUIDs present in the directory
        uuids_seen: set[str] = set()
        for fname in all_files:
            if fname.endswith('.pdf') or fname.endswith('.txt'):
                stem = fname.rsplit('.', 1)[0]
                uuids_seen.add(stem)

        deleted_pairs = 0
        deleted_files = 0
        skipped = 0

        for uid in uuids_seen:
            pdf_path = os.path.join(synopsis_dir, f'{uid}.pdf')
            txt_path = os.path.join(synopsis_dir, f'{uid}.txt')

            # Use the PDF's mtime as the reference; fall back to txt if PDF missing
            ref_path = pdf_path if os.path.exists(pdf_path) else txt_path
            if not os.path.exists(ref_path):
                continue

            age_seconds = now - os.path.getmtime(ref_path)
            if age_seconds < max_age_seconds and max_age_seconds > 0:
                skipped += 1
                continue

            pair_deleted = 0
            for path in (pdf_path, txt_path):
                if os.path.exists(path):
                    if dry_run:
                        self.stdout.write(f'  [DRY RUN] Would delete: {path}')
                    else:
                        os.remove(path)
                        self.stdout.write(f'  Deleted: {path}')
                    pair_deleted += 1
                    deleted_files += 1

            if pair_deleted:
                deleted_pairs += 1

        mode_prefix = '[DRY RUN] ' if dry_run else ''
        self.stdout.write(
            self.style.SUCCESS(
                f'{mode_prefix}Done. '
                f'{deleted_pairs} check pair(s) ({deleted_files} file(s)) deleted; '
                f'{skipped} pair(s) skipped (too recent).'
            )
        )
