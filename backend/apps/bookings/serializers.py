from rest_framework import serializers

from apps.listings.models import Listing
from apps.listings.serializers import ListingDetailSerializer

from .models import Booking, BookingStatusHistory


class BookingQuoteSerializer(serializers.Serializer):
    listing_id = serializers.UUIDField()
    check_in = serializers.DateField()
    check_out = serializers.DateField()
    guests = serializers.IntegerField(min_value=1, default=1)
    adults = serializers.IntegerField(min_value=1, required=False)

    def validate(self, attrs):
        if attrs["check_out"] <= attrs["check_in"]:
            raise serializers.ValidationError("Data wyjazdu musi być po dacie przyjazdu.")
        if attrs.get("adults") is None:
            attrs["adults"] = attrs["guests"]
        if attrs["adults"] > attrs["guests"]:
            raise serializers.ValidationError({"adults": ["Liczba dorosłych nie może przekraczać gości."]})
        return attrs


class BookingCreateSerializer(serializers.Serializer):
    listing_id = serializers.UUIDField()
    check_in = serializers.DateField()
    check_out = serializers.DateField()
    guests_count = serializers.IntegerField(min_value=1, default=1)
    adults = serializers.IntegerField(min_value=1, required=False)
    children = serializers.IntegerField(min_value=0, default=0)
    special_requests = serializers.CharField(required=False, allow_blank=True, default="")

    def validate(self, attrs):
        if attrs["check_out"] <= attrs["check_in"]:
            raise serializers.ValidationError("Data wyjazdu musi być po dacie przyjazdu.")
        lid = attrs["listing_id"]
        if not Listing.objects.filter(pk=lid, deleted_at__isnull=True).exists():
            raise serializers.ValidationError({"listing_id": ["Nieprawidłowa oferta."]})
        adults = attrs.get("adults")
        if adults is None:
            adults = attrs["guests_count"]
        children = attrs.get("children", 0) or 0
        attrs["adults"] = adults
        attrs["children"] = children
        if adults + children != attrs["guests_count"]:
            raise serializers.ValidationError(
                {"guests_count": ["guests_count musi być równe adults + children."]}
            )
        return attrs


class BookingStatusHistorySerializer(serializers.ModelSerializer):
    changed_by_email = serializers.SerializerMethodField()

    class Meta:
        model = BookingStatusHistory
        fields = (
            "id",
            "old_status",
            "new_status",
            "changed_by_email",
            "note",
            "created_at",
        )
        read_only_fields = fields

    def get_changed_by_email(self, obj):
        return obj.changed_by.email if obj.changed_by else None


class BookingDetailSerializer(serializers.ModelSerializer):
    listing = ListingDetailSerializer(read_only=True)
    listing_title = serializers.CharField(source="listing.title", read_only=True)
    listing_slug = serializers.CharField(source="listing.slug", read_only=True)
    status_history = BookingStatusHistorySerializer(many=True, read_only=True)
    guest = serializers.SerializerMethodField()
    conversation_id = serializers.SerializerMethodField()
    has_guest_review = serializers.SerializerMethodField()

    class Meta:
        model = Booking
        fields = (
            "id",
            "listing",
            "listing_title",
            "listing_slug",
            "conversation_id",
            "guest",
            "check_in",
            "check_out",
            "guests_count",
            "adults",
            "children",
            "special_requests",
            "cancellation_policy_snapshot",
            "status",
            "pricing_breakdown",
            "final_amount",
            "currency",
            "stripe_checkout_session_id",
            "confirmation_email_sent",
            "created_at",
            "updated_at",
            "status_history",
            "has_guest_review",
        )
        read_only_fields = fields

    def get_guest(self, obj):
        g = obj.guest
        return {
            "id": str(g.id),
            "first_name": g.first_name,
            "last_name": g.last_name,
            "avatar_url": None,
        }

    def get_conversation_id(self, obj):
        from apps.messaging.models import Conversation

        cid = (
            Conversation.objects.filter(
                listing_id=obj.listing_id,
                guest_id=obj.guest_id,
                deleted_at__isnull=True,
            )
            .values_list("id", flat=True)
            .first()
        )
        return str(cid) if cid else None

    def get_has_guest_review(self, obj):
        from apps.reviews.models import Review

        return Review.objects.filter(
            booking=obj,
            reviewer_role=Review.ReviewerRole.GUEST,
            deleted_at__isnull=True,
        ).exists()
