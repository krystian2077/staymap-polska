from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import (
    HostBookingListView,
    HostBookingStatusView,
    HostListingViewSet,
    HostOnboardingStartView,
    HostReviewsListView,
    HostStatsView,
)

router = DefaultRouter()
router.register(r"host/listings", HostListingViewSet, basename="host-listing")

urlpatterns = [
    path("host/stats/", HostStatsView.as_view(), name="host-stats"),
    path("host/reviews/", HostReviewsListView.as_view(), name="host-reviews"),
    path("host/onboarding/start/", HostOnboardingStartView.as_view(), name="host-onboarding-start"),
    path("host/bookings/", HostBookingListView.as_view(), name="host-bookings"),
    path(
        "host/bookings/<uuid:booking_id>/status/",
        HostBookingStatusView.as_view(),
        name="host-booking-status",
    ),
    *router.urls,
]
