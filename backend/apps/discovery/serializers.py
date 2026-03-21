from __future__ import annotations

from rest_framework import serializers

from apps.listings.models import Listing


class SimilarListingCardSerializer(serializers.ModelSerializer):
    """Kształt zgodny z frontend `SimilarListing`."""

    location = serializers.SerializerMethodField()
    images = serializers.SerializerMethodField()
    listing_type = serializers.JSONField(read_only=True)
    destination_score_cache = serializers.JSONField(read_only=True)
    top_badge = serializers.SerializerMethodField()
    distance_km = serializers.SerializerMethodField()
    base_price = serializers.SerializerMethodField()
    average_rating = serializers.SerializerMethodField()
    review_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Listing
        fields = (
            "id",
            "slug",
            "title",
            "base_price",
            "currency",
            "average_rating",
            "review_count",
            "distance_km",
            "listing_type",
            "location",
            "images",
            "destination_score_cache",
            "top_badge",
        )

    def get_location(self, obj):
        loc = getattr(obj, "location", None)
        if not loc:
            return {"city": "", "region": ""}
        return {"city": loc.city or "", "region": loc.region or ""}

    def get_images(self, obj):
        imgs = getattr(obj, "_prefetched_objects_cache", {}).get("images")
        if imgs is None:
            imgs = obj.images.order_by("-is_cover", "sort_order", "id")[:5]
        request = self.context.get("request")
        out = []
        for im in imgs:
            url = None
            if im.image:
                u = im.image.url
                url = request.build_absolute_uri(u) if request else u
            out.append({"display_url": url, "is_cover": im.is_cover})
        return out

    def get_top_badge(self, obj):
        return None

    def get_distance_km(self, obj):
        v = getattr(obj, "distance_km", None)
        if v is None:
            return 0
        try:
            return float(v)
        except (TypeError, ValueError):
            return 0

    def get_base_price(self, obj):
        return float(obj.base_price)

    def get_average_rating(self, obj):
        if obj.average_rating is None:
            return None
        return float(obj.average_rating)

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data["id"] = str(data["id"])
        if "available_from" in self.context:
            data["available_from"] = self.context["available_from"]
        return data
