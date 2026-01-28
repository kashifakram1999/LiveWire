from datetime import timedelta

from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.db.models import Q
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import generics, permissions
from rest_framework.exceptions import PermissionDenied
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Conversation, ConversationParticipant, Message
from .serializers import ConversationSerializer, MessageSerializer


def _broadcast_read_receipt(conversation_id, user_id, last_seen_at):
    channel_layer = get_channel_layer()
    if channel_layer is None:
        return
    async_to_sync(channel_layer.group_send)(
        f"conversation_{conversation_id}",
        {
            "type": "chat.message",
            "payload": {
                "kind": "read_receipt",
                "conversation": conversation_id,
                "data": {
                    "user_id": user_id,
                    "last_seen_at": last_seen_at.isoformat(),
                },
            },
        },
    )


def _mark_conversation_seen(conversation, user):
    participant = conversation.conversation_participants.filter(user=user).first()
    if not participant:
        return
    now = timezone.now()
    if participant.last_seen_at and now - participant.last_seen_at < timedelta(seconds=1):
        return
    participant.last_seen_at = now
    participant.save(update_fields=["last_seen_at"])
    _broadcast_read_receipt(conversation.id, user.id, now)


def _conversation_prefetch():
    return ("participants", "conversation_participants")


class ConversationListCreateView(generics.ListCreateAPIView):
    serializer_class = ConversationSerializer
    permission_classes = (permissions.IsAuthenticated,)

    def get_queryset(self):
        user = self.request.user
        return (
            Conversation.objects.filter(participants=user)
            .prefetch_related(*_conversation_prefetch())
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
        return Conversation.objects.filter(participants=self.request.user).prefetch_related(
            *_conversation_prefetch()
        )

    def perform_destroy(self, instance):
        if not instance.participants.filter(id=self.request.user.id).exists():
            raise PermissionDenied("You are not a member of this conversation.")
        instance.delete()


class MessageListCreateView(generics.ListCreateAPIView):
    serializer_class = MessageSerializer
    permission_classes = (permissions.IsAuthenticated,)
    parser_classes = (MultiPartParser, FormParser, JSONParser)

    def get_queryset(self):
        conversation = self._get_conversation()
        _mark_conversation_seen(conversation, self.request.user)
        return conversation.messages.select_related("sender").order_by("created_at")

    def perform_create(self, serializer):
        conversation = self._get_conversation()
        if not conversation.participants.filter(id=self.request.user.id).exists():
            raise PermissionDenied("You are not a member of this conversation.")

        serializer.save(conversation=conversation)
        conversation.updated_at = serializer.instance.created_at
        conversation.save(update_fields=["updated_at"])
        channel_layer = get_channel_layer()
        if channel_layer is not None:
            message_data = MessageSerializer(
                serializer.instance, context=self.get_serializer_context()
            ).data
            async_to_sync(channel_layer.group_send)(
                f"conversation_{conversation.id}",
                {
                    "type": "chat.message",
                    "payload": {
                        "kind": "message",
                        "conversation": conversation.id,
                        "data": message_data,
                    },
                },
            )

    def _get_conversation(self):
        return Conversation.objects.get(
            id=self.kwargs["conversation_id"],
            participants=self.request.user,
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


class ConversationMarkReadView(APIView):
    permission_classes = (permissions.IsAuthenticated,)

    def post(self, request, conversation_id):
        conversation = get_object_or_404(
            Conversation.objects.prefetch_related(*_conversation_prefetch()),
            id=conversation_id,
            participants=request.user,
        )
        _mark_conversation_seen(conversation, request.user)
        serializer = ConversationSerializer(conversation, context={"request": request})
        return Response(serializer.data)
