from __future__ import annotations

from rest_framework import serializers

from apps.listings.models import Listing
from apps.listings.serializers import listing_cover_image_absolute_url


class SimilarListingCardSerializer(serializers.ModelSerializer):
    """Kształt zgodny z frontend `SimilarListing` oraz wystarczający dla `Listing` w porównywarce."""

    location = serializers.SerializerMethodField()
    images = serializers.SerializerMethodField()
    cover_image = serializers.SerializerMethodField()
    listing_type = serializers.SerializerMethodField()
    destination_score_cache = serializers.JSONField(read_only=True)
    top_badge = serializers.SerializerMethodField()
    distance_km = serializers.SerializerMethodField()
    base_price = serializers.SerializerMethodField()
    average_rating = serializers.SerializerMethodField()
    review_count = serializers.IntegerField(read_only=True)

    # Pola dodane dla pełnego porównania (zbieżność z ListingListSerializer)
    amenities = serializers.JSONField(read_only=True)
    bedrooms = serializers.SerializerMethodField()
    beds = serializers.SerializerMethodField()
    bathrooms = serializers.SerializerMethodField()
    max_guests = serializers.IntegerField(read_only=True)
    is_pet_friendly = serializers.BooleanField(read_only=True)
    cancellation_policy = serializers.CharField(read_only=True)
    check_in_time = serializers.CharField(read_only=True)
    check_out_time = serializers.CharField(read_only=True)
    booking_mode = serializers.CharField(read_only=True)
    cleaning_fee = serializers.FloatField(read_only=True, allow_null=True)
    area_summary = serializers.SerializerMethodField()

    class Meta:
        model = Listing
        fields = (
            "id",
            "slug",
            "title",
            "short_description",
            "base_price",
            "cleaning_fee",
            "currency",
            "average_rating",
            "review_count",
            "distance_km",
            "listing_type",
            "location",
            "images",
            "cover_image",
            "destination_score_cache",
            "top_badge",
            "amenities",
            "bedrooms",
            "beds",
            "bathrooms",
            "max_guests",
            "is_pet_friendly",
            "cancellation_policy",
            "check_in_time",
            "check_out_time",
            "booking_mode",
            "area_summary",
        )

    def get_listing_type(self, obj):
        lt = obj.listing_type
        if isinstance(lt, dict) and lt.get("name"):
            return lt
        return {"name": "Obiekt", "icon": "🏠", "slug": "obiekt"}

    def get_bedrooms(self, obj):
        try:
            val = obj.bedrooms
            return int(val) if val is not None else 1
        except (AttributeError, TypeError, ValueError):
            return 1

    def get_beds(self, obj):
        try:
            val = obj.beds
            return int(val) if val is not None else 1
        except (AttributeError, TypeError, ValueError):
            return 1

    def get_bathrooms(self, obj):
        try:
            val = obj.bathrooms
            return int(val) if val is not None else 1
        except (AttributeError, TypeError, ValueError):
            return 1

    def get_area_summary(self, obj):
        from apps.listings.serializers import get_or_build_area_summary
        return get_or_build_area_summary(obj)

    def get_location(self, obj):
        loc = getattr(obj, "location", None)
        if not loc:
            return {"city": "", "region": ""}
        return {"city": loc.city or "", "region": loc.region or ""}

    def get_cover_image(self, obj):
        return listing_cover_image_absolute_url(obj, self.context.get("request"))

    def get_images(self, obj):
        imgs = getattr(obj, "_prefetched_objects_cache", {}).get("images")
        if imgs is None:
            img_list = list(
                obj.images.order_by("-is_cover", "sort_order", "id")[:5]
            )
        else:
            img_list = sorted(
                imgs,
                key=lambda i: (not i.is_cover, i.sort_order, str(i.id)),
            )[:5]
        request = self.context.get("request")
        out = []
        for im in img_list:
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
