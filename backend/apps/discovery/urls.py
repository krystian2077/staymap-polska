from django.urls import path

from apps.discovery.views import CompareViewSet, DiscoveryHomepageView

urlpatterns = [
    path(
        "discovery/homepage/",
        DiscoveryHomepageView.as_view({"get": "list"}),
        name="discovery-homepage",
    ),
    path("compare/", CompareViewSet.as_view({"get": "list"}), name="compare-list"),
    path(
        "compare/bootstrap/",
        CompareViewSet.as_view({"post": "bootstrap"}),
        name="compare-bootstrap",
    ),
    path(
        "compare/listings/",
        CompareViewSet.as_view({"post": "add_listing"}),
        name="compare-add-listing",
    ),
    path(
        "compare/listings/<uuid:listing_id>/",
        CompareViewSet.as_view({"delete": "remove_listing"}),
        name="compare-remove-listing",
    ),
]
