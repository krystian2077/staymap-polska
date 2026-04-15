from django.urls import path
from rest_framework.routers import DefaultRouter

from apps.search.geocode_views import GeocodeView
from apps.search.views import RegionDetailView, SearchViewSet

router = DefaultRouter()
router.register(r"search", SearchViewSet, basename="search")

urlpatterns = [
    path("geocode/", GeocodeView.as_view(), name="geocode"),
    path(
        "search/regions/<str:region_slug>/",
        RegionDetailView.as_view(),
        name="region-detail",
    ),
] + router.urls
