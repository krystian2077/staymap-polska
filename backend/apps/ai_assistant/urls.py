from django.urls import path

from apps.ai_assistant.views import AiSearchViewSet, AiSessionHistoryView

urlpatterns = [
    path(
        "ai/search/",
        AiSearchViewSet.as_view({"post": "create"}),
        name="ai-search-create",
    ),
    path(
        "ai/search/<uuid:pk>/",
        AiSearchViewSet.as_view({"get": "retrieve"}),
        name="ai-search-detail",
    ),
    path(
        "ai/sessions/history/",
        AiSessionHistoryView.as_view(),
        name="ai-session-history",
    ),
]
