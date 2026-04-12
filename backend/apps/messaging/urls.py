from django.urls import path

from .views import ConversationListCreateView, ConversationMessageListCreateView, ConversationSummaryView

urlpatterns = [
    path("conversations/", ConversationListCreateView.as_view(), name="conversations"),
    path("conversations/summary/", ConversationSummaryView.as_view(), name="conversations-summary"),
    path(
        "conversations/<uuid:conversation_id>/messages/",
        ConversationMessageListCreateView.as_view(),
        name="conversation-messages",
    ),
]
