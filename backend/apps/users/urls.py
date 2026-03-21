from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from apps.common.views import health_live, health_ready
from apps.users.views import EmailTokenObtainPairView, MeView, RegisterView
from apps.users.views_etap5 import SavedSearchViewSet, WishlistViewSet

urlpatterns = [
    path("health/live/", health_live),
    path("health/ready/", health_ready),
    path("auth/register/", RegisterView.as_view(), name="auth-register"),
    path("auth/login/", EmailTokenObtainPairView.as_view(), name="auth-login"),
    path("auth/refresh/", TokenRefreshView.as_view(), name="auth-refresh"),
    path("auth/me/", MeView.as_view(), name="auth-me"),
    path("profile/", MeView.as_view(), name="profile"),
    path(
        "wishlist/",
        WishlistViewSet.as_view({"get": "list", "post": "create"}),
        name="wishlist-list",
    ),
    path(
        "wishlist/<uuid:listing_id>/",
        WishlistViewSet.as_view({"delete": "destroy"}),
        name="wishlist-destroy",
    ),
    path(
        "saved-searches/",
        SavedSearchViewSet.as_view({"get": "list", "post": "create"}),
        name="saved-search-list",
    ),
    path(
        "saved-searches/<uuid:pk>/",
        SavedSearchViewSet.as_view({"delete": "destroy"}),
        name="saved-search-destroy",
    ),
]
