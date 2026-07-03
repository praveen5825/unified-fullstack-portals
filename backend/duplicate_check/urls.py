from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import (
    ProposalViewSet, pending_queue, run_check, bulk_run_check,
    review_results, proposal_review_detail, update_review_status,
    scheme_stats,check_synopsis,
)
router = DefaultRouter()
router.register('proposals', ProposalViewSet, basename='proposal')

urlpatterns = [
    path('', include(router.urls)),
    path('pending/', pending_queue, name='pending-queue'),
    path('bulk-run/', bulk_run_check, name='bulk-run-check'),
    path('review/', review_results, name='review-results'),
    path('review/<int:proposal_id>/', proposal_review_detail, name='proposal-review-detail'),
    path('review/<int:proposal_id>/status/', update_review_status, name='update-review-status'),
    path('<int:proposal_id>/run/', run_check, name='run-check'),
    path('proposals/stats/', scheme_stats, name='scheme-stats'), 
    path('check/', check_synopsis, name='check-synopsis'),
]