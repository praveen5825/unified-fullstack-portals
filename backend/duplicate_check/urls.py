from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import (
    ProposalViewSet, pending_queue, run_check, bulk_run_check,
    review_results, proposal_review_detail, update_review_status,
    scheme_stats, check_synopsis, compare_documents, download_compare_report,
    # Analytics
    analytics_overview, analytics_yearly, analytics_statewise,
    analytics_research_area, analytics_session, analytics_duplicate_stats,
    # Search
    global_search, boolean_search, bulk_import_proposals,
)

router = DefaultRouter()
router.register('proposals', ProposalViewSet, basename='proposal')

urlpatterns = [
    path('proposals/bulk-import/', bulk_import_proposals, name='bulk-import'),
    path('', include(router.urls)),
    path('pending/', pending_queue, name='pending-queue'),
    path('bulk-run/', bulk_run_check, name='bulk-run-check'),
    path('review/', review_results, name='review-results'),
    path('review/<int:proposal_id>/', proposal_review_detail, name='proposal-review-detail'),
    path('review/<int:proposal_id>/status/', update_review_status, name='update-review-status'),
    path('<int:proposal_id>/run/', run_check, name='run-check'),
    path('proposals/stats/', scheme_stats, name='scheme-stats'),
    path('check/', check_synopsis, name='check-synopsis'),
    path('compare/<int:matched_proposal_id>/', compare_documents, name='compare-documents'),
    path('compare/<int:matched_proposal_id>/report/', download_compare_report, name='download-compare-report'),

    # ── Analytics ────────────────────────────────────────────────────────────
    path('analytics/overview/',        analytics_overview,        name='analytics-overview'),
    path('analytics/yearly/',          analytics_yearly,          name='analytics-yearly'),
    path('analytics/statewise/',       analytics_statewise,       name='analytics-statewise'),
    path('analytics/research-area/',   analytics_research_area,   name='analytics-research-area'),
    path('analytics/session/',         analytics_session,         name='analytics-session'),
    path('analytics/duplicate-stats/', analytics_duplicate_stats, name='analytics-duplicate-stats'),

    # ── Search ───────────────────────────────────────────────────────────────
    path('search/',          global_search,  name='global-search'),
    path('boolean-search/',  boolean_search, name='boolean-search'),
]