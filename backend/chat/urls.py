from django.urls import path

from .views import (
    ConversationDetailView,
    ConversationListCreateView,
    MessageDetailView,
    MessageListCreateView,
)

app_name = "chat"

urlpatterns = [
    path("conversations/", ConversationListCreateView.as_view(), name="conversation_list"),
    path("conversations/<int:conversation_id>/", ConversationDetailView.as_view(), name="conversation_detail"),
    path(
        "conversations/<int:conversation_id>/messages/",
        MessageListCreateView.as_view(),
        name="message_list",
    ),
    path(
        "conversations/<int:conversation_id>/messages/<int:message_id>/",
        MessageDetailView.as_view(),
        name="message_detail",
    ),
]
