from decimal import Decimal

from rest_framework import serializers

from .models import Review


class ReviewSerializer(serializers.ModelSerializer):
    author = serializers.SerializerMethodField()

    class Meta:
        model = Review
        fields = (
            "id",
            "author",
            "reviewer_role",
            "overall_rating",
            "title",
            "content",
            "created_at",
            "subscores",
            "host_response",
        )
        read_only_fields = fields

    def get_author(self, obj):
        if obj.author_id:
            u = obj.author
            return {
                "first_name": u.first_name,
                "last_name": u.last_name,
                "avatar_url": None,
            }
        return {
            "first_name": obj.author_display_first or "Gość",
            "last_name": obj.author_display_last or "StayMap",
            "avatar_url": None,
        }


class HostReviewItemSerializer(serializers.ModelSerializer):
    """Lista recenzji dla panelu gospodarza (goście o pobytach)."""

    listing_id = serializers.UUIDField(read_only=True)
    booking_id = serializers.SerializerMethodField()
    author = serializers.SerializerMethodField()
    blind_release_at = serializers.DateTimeField(allow_null=True)
    host_response_at = serializers.SerializerMethodField()

    class Meta:
        model = Review
        fields = (
            "id",
            "listing_id",
            "booking_id",
            "author",
            "overall_rating",
            "content",
            "is_public",
            "is_blind_review_released",
            "blind_release_at",
            "host_response",
            "host_response_at",
            "created_at",
            "subscores",
        )
        read_only_fields = fields

    def get_booking_id(self, obj):
        return str(obj.booking_id) if obj.booking_id else ""

    def get_author(self, obj):
        if obj.author_id:
            u = obj.author
            return {
                "id": str(u.id),
                "first_name": u.first_name,
                "last_name": u.last_name,
                "avatar_url": None,
            }
        return {
            "id": "",
            "first_name": obj.author_display_first or "Gość",
            "last_name": obj.author_display_last or "",
            "avatar_url": None,
        }

    def get_host_response_at(self, obj):
        if not obj.host_response:
            return None
        return obj.updated_at.isoformat() if obj.updated_at else None


class ReviewCreateSerializer(serializers.Serializer):
    booking_id = serializers.UUIDField()
    reviewer_role = serializers.ChoiceField(
        choices=Review.ReviewerRole.choices,
        default=Review.ReviewerRole.GUEST,
    )
    overall_rating = serializers.DecimalField(
        max_digits=2,
        decimal_places=1,
        min_value=Decimal("1"),
        max_value=Decimal("5"),
    )
    title = serializers.CharField(required=False, allow_blank=True, max_length=200, default="")
    content = serializers.CharField(max_length=4000, required=False, allow_blank=True, default="")
    subscores = serializers.JSONField(required=False, allow_null=True)


class HostResponseSerializer(serializers.Serializer):
    host_response = serializers.CharField(max_length=2000, min_length=20)
