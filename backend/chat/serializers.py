from django.contrib.auth import get_user_model
from django.db import transaction
from django.utils import timezone
from rest_framework import serializers

from users.serializers import UserSerializer

from .models import Conversation, ConversationParticipant, Message

User = get_user_model()


class ConversationSerializer(serializers.ModelSerializer):
    participants = UserSerializer(many=True, read_only=True)
    participant_ids = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(), many=True, write_only=True
    )

    class Meta:
        model = Conversation
        fields = (
            "id",
            "title",
            "is_group",
            "created_at",
            "updated_at",
            "participants",
            "participant_ids",
        )
        read_only_fields = ("id", "created_at", "updated_at", "participants")

    def validate(self, attrs):
        participant_ids = attrs.get("participant_ids") or []
        if not self.instance and not participant_ids:
            raise serializers.ValidationError({"participant_ids": "Select at least one participant."})
        return attrs

    @transaction.atomic
    def create(self, validated_data):
        participant_ids = validated_data.pop("participant_ids", [])
        conversation = Conversation.objects.create(**validated_data)
        self._sync_participants(conversation, participant_ids)
        return conversation

    @transaction.atomic
    def update(self, instance, validated_data):
        participant_ids = validated_data.pop("participant_ids", None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        if participant_ids is not None:
            self._sync_participants(instance, participant_ids)
        return instance

    def _sync_participants(self, conversation, participant_users):
        existing_ids = set(
            conversation.conversation_participants.values_list("user_id", flat=True)
        )
        incoming_ids = {user.id for user in participant_users}

        # Add or update
        for user in participant_users:
            ConversationParticipant.objects.update_or_create(
                conversation=conversation,
                user=user,
                defaults={"role": "member"},
            )

        # Remove stale
        to_remove = existing_ids - incoming_ids
        if to_remove:
            ConversationParticipant.objects.filter(
                conversation=conversation, user_id__in=to_remove
            ).delete()


class MessageSerializer(serializers.ModelSerializer):
    sender = UserSerializer(read_only=True)

    class Meta:
        model = Message
        fields = (
            "id",
            "conversation",
            "sender",
            "body",
            "attachment_url",
            "created_at",
            "updated_at",
            "is_edited",
        )
        read_only_fields = ("id", "sender", "created_at", "updated_at", "is_edited")

    def create(self, validated_data):
        request = self.context["request"]
        validated_data["sender"] = request.user
        return super().create(validated_data)

    def update(self, instance, validated_data):
        if "body" in validated_data and validated_data["body"] != instance.body:
            validated_data["is_edited"] = True
            validated_data["updated_at"] = timezone.now()
        return super().update(instance, validated_data)
