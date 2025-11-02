from django.contrib import admin

from .models import Conversation, ConversationParticipant, Message


class ConversationParticipantInline(admin.TabularInline):
    model = ConversationParticipant
    extra = 1
    autocomplete_fields = ("user",)


@admin.register(Conversation)
class ConversationAdmin(admin.ModelAdmin):
    list_display = ("id", "title", "is_group", "created_at", "updated_at")
    search_fields = ("title",)
    list_filter = ("is_group",)
    inlines = (ConversationParticipantInline,)


@admin.register(Message)
class MessageAdmin(admin.ModelAdmin):
    list_display = ("id", "conversation", "sender", "created_at", "is_edited")
    search_fields = ("body",)
    list_filter = ("is_edited", "created_at")
    autocomplete_fields = ("conversation", "sender")
