from rest_framework import serializers

from .models import Conversation, Message


class MessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = Message
        fields = ("id", "sender_id", "body", "read_at", "created_at")
        read_only_fields = fields


class ConversationSerializer(serializers.ModelSerializer):
    listing_title = serializers.CharField(source="listing.title", read_only=True)
    listing_slug = serializers.CharField(source="listing.slug", read_only=True)
    guest_first_name = serializers.CharField(source="guest.first_name", read_only=True)
    guest_last_name = serializers.CharField(source="guest.last_name", read_only=True)
    guest_avatar_url = serializers.SerializerMethodField()
    host_id = serializers.UUIDField(source="listing.host.user_id", read_only=True)
    host_display_name = serializers.SerializerMethodField()
    host_avatar_url = serializers.SerializerMethodField()
    last_message = serializers.SerializerMethodField()
    unread_count = serializers.IntegerField(read_only=True)

    def get_host_display_name(self, obj):
        user = getattr(obj.listing.host, "user", None)
        if not user:
            return "Gospodarz"
        full = f"{user.first_name} {user.last_name}".strip()
        return full or user.email.split("@")[0]

    def get_host_avatar_url(self, obj):
        user = getattr(obj.listing.host, "user", None)
        return getattr(user, "avatar_url", None) if user else None

    def get_guest_avatar_url(self, obj):
        return getattr(obj.guest, "avatar_url", None)

    def get_last_message(self, obj):
        prefetched = getattr(obj, "prefetched_messages", None)
        if prefetched is not None:
            last = prefetched[0] if prefetched else None
        else:
            last = (
                Message.objects.filter(conversation=obj, deleted_at__isnull=True)
                .order_by("-created_at")
                .first()
            )
        if not last:
            return None
        return MessageSerializer(last).data

    class Meta:
        model = Conversation
        fields = (
            "id",
            "listing_id",
            "listing_title",
            "listing_slug",
            "guest_id",
            "guest_first_name",
            "guest_last_name",
            "guest_avatar_url",
            "host_id",
            "host_display_name",
            "host_avatar_url",
            "last_message",
            "unread_count",
            "created_at",
            "updated_at",
        )
        read_only_fields = fields


class ConversationCreateSerializer(serializers.Serializer):
    listing_id = serializers.UUIDField()
    guest_id = serializers.UUIDField(required=False, allow_null=True)


class MessageCreateSerializer(serializers.Serializer):
    body = serializers.CharField(max_length=8000)
