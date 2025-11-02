from django.conf import settings
from django.db import models
from django.utils import timezone

User = settings.AUTH_USER_MODEL


class Conversation(models.Model):
    """Represents a direct or group chat."""

    title = models.CharField(max_length=255, blank=True)
    is_group = models.BooleanField(default=False)
    participants = models.ManyToManyField(User, through="ConversationParticipant", related_name="conversations")
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("-updated_at",)

    def __str__(self):
        return self.title or f"Conversation {self.pk}"


class ConversationParticipant(models.Model):
    """Link table to track participant metadata (roles, timestamps)."""

    conversation = models.ForeignKey(Conversation, on_delete=models.CASCADE, related_name="conversation_participants")
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="conversation_memberships")
    role = models.CharField(max_length=50, default="member")
    joined_at = models.DateTimeField(default=timezone.now)
    last_seen_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        unique_together = ("conversation", "user")

    def __str__(self):
        return f"{self.user} in {self.conversation}"


class Message(models.Model):
    """Messages persisted for history and offline delivery."""

    conversation = models.ForeignKey(Conversation, on_delete=models.CASCADE, related_name="messages")
    sender = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name="messages_sent")
    body = models.TextField(blank=True)
    attachment_url = models.URLField(blank=True)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)
    is_edited = models.BooleanField(default=False)

    class Meta:
        ordering = ("created_at",)

    def __str__(self):
        return f"{self.sender} -> {self.conversation} ({self.created_at:%Y-%m-%d %H:%M})"
