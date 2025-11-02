from django.db.models import Q
from rest_framework import generics, permissions
from rest_framework.exceptions import PermissionDenied

from .models import Conversation, Message
from .serializers import ConversationSerializer, MessageSerializer


class ConversationListCreateView(generics.ListCreateAPIView):
    serializer_class = ConversationSerializer
    permission_classes = (permissions.IsAuthenticated,)

    def get_queryset(self):
        user = self.request.user
        return (
            Conversation.objects.filter(participants=user)
            .prefetch_related("participants")
            .order_by("-updated_at")
        )

    def perform_create(self, serializer):
        participants = list(serializer.validated_data.get("participant_ids", []))
        if self.request.user not in participants:
            participants.append(self.request.user)
        unique_participants = {user.id: user for user in participants}
        serializer.save(participant_ids=list(unique_participants.values()))


class ConversationDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = ConversationSerializer
    permission_classes = (permissions.IsAuthenticated,)
    lookup_url_kwarg = "conversation_id"

    def get_queryset(self):
        return Conversation.objects.filter(participants=self.request.user)

    def perform_destroy(self, instance):
        if not instance.participants.filter(id=self.request.user.id).exists():
            raise PermissionDenied("You are not a member of this conversation.")
        instance.delete()


class MessageListCreateView(generics.ListCreateAPIView):
    serializer_class = MessageSerializer
    permission_classes = (permissions.IsAuthenticated,)

    def get_queryset(self):
        conversation = self._get_conversation()
        return conversation.messages.select_related("sender").order_by("created_at")

    def perform_create(self, serializer):
        conversation = self._get_conversation()
        if not conversation.participants.filter(id=self.request.user.id).exists():
            raise PermissionDenied("You are not a member of this conversation.")

        serializer.save(conversation=conversation)
        conversation.updated_at = serializer.instance.created_at
        conversation.save(update_fields=["updated_at"])

    def _get_conversation(self):
        return Conversation.objects.get(
            id=self.kwargs["conversation_id"], participants=self.request.user
        )


class MessageDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = MessageSerializer
    permission_classes = (permissions.IsAuthenticated,)
    lookup_url_kwarg = "message_id"

    def get_queryset(self):
        return Message.objects.filter(
            Q(conversation__participants=self.request.user)
        ).select_related("sender", "conversation")

    def perform_update(self, serializer):
        message = self.get_object()
        if message.sender != self.request.user:
            raise PermissionDenied("You can only edit your own messages.")
        serializer.save()

    def perform_destroy(self, instance):
        if instance.sender != self.request.user:
            raise PermissionDenied("You can only delete your own messages.")
        instance.delete()
