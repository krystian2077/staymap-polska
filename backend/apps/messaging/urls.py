from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    ConversationListCreateView,
    ConversationMessageListCreateView,
    ConversationSummaryView,
    MessageTemplateViewSet,
)

router = DefaultRouter()
router.register(r"host/message-templates", MessageTemplateViewSet, basename="message-template")

urlpatterns = [
    path("conversations/", ConversationListCreateView.as_view(), name="conversations"),
    path("conversations/summary/", ConversationSummaryView.as_view(), name="conversations-summary"),
    path(
        "conversations/<uuid:conversation_id>/messages/",
        ConversationMessageListCreateView.as_view(),
        name="conversation-messages",
    ),
    path("", include(router.urls)),
]
