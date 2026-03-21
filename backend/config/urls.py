from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path
from django.views.generic import RedirectView
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView

urlpatterns = [
    path(
        "",
        RedirectView.as_view(pattern_name="swagger-ui", permanent=False),
        name="api-root",
    ),
    path("admin/", admin.site.urls),
    path("api/v1/", include("apps.users.urls")),
    path("api/v1/", include("apps.listings.urls")),
    path("api/v1/", include("apps.search.urls")),
    path("api/v1/", include("apps.bookings.urls")),
    path("api/v1/", include("apps.ai_assistant.urls")),
    path("api/v1/", include("apps.discovery.urls")),
    path("api/v1/", include("apps.host.urls")),
    path("api/v1/", include("apps.moderation.urls")),
    path("api/v1/", include("apps.reviews.urls")),
    path("api/v1/", include("apps.messaging.urls")),
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path(
        "api/schema/swagger-ui/",
        SpectacularSwaggerView.as_view(url_name="schema"),
        name="swagger-ui",
    ),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns.insert(0, path("__debug__/", include("debug_toolbar.urls")))
