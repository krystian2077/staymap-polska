from rest_framework import serializers

from .models import Conversation, Message


class MessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = Message
        fields = ("id", "sender_id", "body", "read_at", "created_at")
        read_only_fields = fields


class ConversationSerializer(serializers.ModelSerializer):
    listing_title = serializers.CharField(source="listing.title", read_only=True)

    class Meta:
        model = Conversation
        fields = ("id", "listing_id", "listing_title", "guest_id", "created_at", "updated_at")
        read_only_fields = fields


class ConversationCreateSerializer(serializers.Serializer):
    listing_id = serializers.UUIDField()
    guest_id = serializers.UUIDField(required=False, allow_null=True)


class MessageCreateSerializer(serializers.Serializer):
    body = serializers.CharField(max_length=8000)
