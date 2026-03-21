from django.urls import path
from rest_framework.routers import DefaultRouter

from apps.search.geocode_views import GeocodeView
from apps.search.views import SearchViewSet

router = DefaultRouter()
router.register(r"search", SearchViewSet, basename="search")

urlpatterns = [
    path("geocode/", GeocodeView.as_view(), name="geocode"),
] + router.urls
