from django.urls import path

from .views import ModerationListingApproveView, ModerationListingQueueView, ModerationListingRejectView

urlpatterns = [
    path(
        "admin/moderation/listings/",
        ModerationListingQueueView.as_view(),
        name="moderation-listings-queue",
    ),
    path(
        "admin/moderation/listings/<uuid:listing_id>/approve/",
        ModerationListingApproveView.as_view(),
        name="moderation-listing-approve",
    ),
    path(
        "admin/moderation/listings/<uuid:listing_id>/reject/",
        ModerationListingRejectView.as_view(),
        name="moderation-listing-reject",
    ),
]
