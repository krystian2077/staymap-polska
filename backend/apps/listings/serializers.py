from django.conf import settings
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import transaction
from django.db.models import Max
from rest_framework import serializers

from apps.listings.image_service import ImageService
from decimal import Decimal

from apps.host.models import HostProfile
from apps.listings.location_tags import location_tag_dict
from apps.listings.models import Listing, ListingImage
from apps.listings.services import ListingService
from apps.location_intelligence.area_summary import get_or_build_area_summary


def listing_cover_image_absolute_url(obj: Listing, request) -> str | None:
    """Zwraca relatywny URL do okładki (obsługiwany przez proxy Next.js)."""
    imgs = getattr(obj, "_prefetched_objects_cache", {}).get("images")
    if imgs is not None:
        ordered = sorted(
            imgs,
            key=lambda i: (not i.is_cover, i.sort_order, str(i.id)),
        )
        target = next((i for i in ordered if i.image), None)
    else:
        target = (
            obj.images.filter(deleted_at__isnull=True)
            .order_by("-is_cover", "sort_order", "id")
            .first()
        )
    if not target or not target.image:
        return None
    url = target.image.url
    if url.startswith("http"):
        from urllib.parse import urlparse
        url = urlparse(url).path
    
    if not url.startswith("/"):
        url = f"/{url}"
    
    if not url.startswith("/media/"):
        url = f"/media{url}"
        
    return url


class ListingLocationWriteSerializer(serializers.Serializer):
    lat = serializers.FloatField()
    lng = serializers.FloatField()
    city = serializers.CharField(required=False, allow_blank=True, default="")
    region = serializers.CharField(required=False, allow_blank=True, default="")
    country = serializers.CharField(required=False, default="PL", max_length=2)
    address_line = serializers.CharField(required=False, allow_blank=True, default="")
    postal_code = serializers.CharField(required=False, allow_blank=True, default="")
    near_lake = serializers.BooleanField(required=False)
    near_mountains = serializers.BooleanField(required=False)
    near_forest = serializers.BooleanField(required=False)
    near_sea = serializers.BooleanField(required=False)
    near_river = serializers.BooleanField(required=False)
    near_protected_area = serializers.BooleanField(required=False)
    beach_access = serializers.BooleanField(required=False)
    ski_slopes_nearby = serializers.BooleanField(required=False)
    quiet_rural = serializers.BooleanField(required=False)
    historic_center_nearby = serializers.BooleanField(required=False)
    cycling_routes_nearby = serializers.BooleanField(required=False)


class ListingImageSerializer(serializers.ModelSerializer):
    url = serializers.SerializerMethodField()
    display_url = serializers.SerializerMethodField()

    class Meta:
        model = ListingImage
        fields = (
            "id",
            "url",
            "display_url",
            "is_cover",
            "sort_order",
            "alt_text",
            "created_at",
        )
        read_only_fields = fields

    def _abs_url(self, obj):
        if not obj.image:
            return None
        url = obj.image.url
        if url.startswith("http"):
            from urllib.parse import urlparse
            url = urlparse(url).path
        
        if not url.startswith("/"):
            url = f"/{url}"
            
        if not url.startswith("/media/"):
            url = f"/media{url}"
            
        return url

    def get_url(self, obj):
        return self._abs_url(obj)

    def get_display_url(self, obj):
        return self._abs_url(obj)


class ListingListSerializer(serializers.ModelSerializer):
    location = serializers.SerializerMethodField()
    cover_image = serializers.SerializerMethodField()
    listing_type = serializers.SerializerMethodField()
    is_pet_friendly = serializers.BooleanField(read_only=True)
    bedrooms = serializers.SerializerMethodField()
    beds = serializers.SerializerMethodField()
    bathrooms = serializers.SerializerMethodField()
    images = ListingImageSerializer(many=True, read_only=True)
    amenities = serializers.SerializerMethodField()
    cancellation_policy = serializers.CharField(read_only=True)
    check_in_time = serializers.CharField(read_only=True)
    check_out_time = serializers.CharField(read_only=True)
    destination_score_cache = serializers.JSONField(read_only=True, allow_null=True)
    average_subscores = serializers.JSONField(read_only=True, allow_null=True)
    area_summary = serializers.SerializerMethodField()
    base_price = serializers.FloatField(read_only=True)
    cleaning_fee = serializers.FloatField(read_only=True, allow_null=True)
    average_rating = serializers.FloatField(read_only=True, allow_null=True)

    class Meta:
        model = Listing
        fields = (
            "id",
            "title",
            "slug",
            "short_description",
            "base_price",
            "cleaning_fee",
            "currency",
            "status",
            "max_guests",
            "guests_included",
            "extra_guest_fee",
            "booking_mode",
            "average_rating",
            "review_count",
            "location",
            "cover_image",
            "listing_type",
            "is_pet_friendly",
            "bedrooms",
            "beds",
            "bathrooms",
            "images",
            "amenities",
            "cancellation_policy",
            "check_in_time",
            "check_out_time",
            "destination_score_cache",
            "average_subscores",
            "area_summary",
            "created_at",
        )
        read_only_fields = fields

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
        return get_or_build_area_summary(obj)

    def get_location(self, obj):
        if not hasattr(obj, "location") or obj.location is None:
            return None
        p = obj.location.point
        loc = obj.location
        return {
            "lat": p.y,
            "lng": p.x,
            "city": loc.city,
            "region": loc.region,
            "country": loc.country,
        }

    def get_cover_image(self, obj):
        return listing_cover_image_absolute_url(obj, self.context.get("request"))

    def get_amenities(self, obj):
        raw = obj.amenities if isinstance(obj.amenities, list) else []
        out = []
        for item in raw:
            if isinstance(item, str):
                out.append(
                    {
                        "id": item,
                        "name": item.replace("_", " ").capitalize(),
                        "icon": item,
                        "category": "other",
                    }
                )
                continue
            if isinstance(item, dict):
                aid = str(item.get("id") or item.get("name") or "")
                if not aid:
                    continue
                out.append(
                    {
                        "id": aid,
                        "name": str(item.get("name") or aid.replace("_", " ").capitalize()),
                        "icon": str(item.get("icon") or aid),
                        "category": str(item.get("category") or "other"),
                    }
                )
        return out


class HostProfileSerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(source="pk", read_only=True)
    display_name = serializers.SerializerMethodField()
    average_rating = serializers.SerializerMethodField()
    review_count = serializers.SerializerMethodField()
    member_since = serializers.DateTimeField(source="user.created_at", read_only=True)

    class Meta:
        model = HostProfile
        fields = (
            "id",
            "display_name",
            "bio",
            "avatar_url",
            "is_verified",
            "response_rate",
            "average_rating",
            "review_count",
            "member_since",
        )
        read_only_fields = fields

    def get_display_name(self, obj):
        u = obj.user
        name = f"{u.first_name} {u.last_name}".strip()
        return name or u.email.split("@")[0]

    def get_average_rating(self, obj):
        vals = list(
            Listing.objects.filter(
                host=obj, deleted_at__isnull=True, status=Listing.Status.APPROVED
            ).exclude(average_rating__isnull=True).values_list("average_rating", flat=True)
        )
        if not vals:
            return None
        return float(sum(vals, Decimal("0")) / len(vals))

    def get_review_count(self, obj):
        return sum(
            Listing.objects.filter(host=obj, deleted_at__isnull=True).values_list(
                "review_count", flat=True
            )
        )

    def to_representation(self, instance):
        data = super().to_representation(instance)
        if instance.response_rate is not None:
            data["response_rate"] = float(instance.response_rate)
        return data


class ListingDetailSerializer(ListingListSerializer):
    description = serializers.CharField()
    host = serializers.SerializerMethodField()
    service_fee_percent = serializers.SerializerMethodField()

    class Meta(ListingListSerializer.Meta):
        fields = ListingListSerializer.Meta.fields + (
            "description",
            "host",
            "service_fee_percent",
        )

    def get_service_fee_percent(self, obj):
        return float(getattr(settings, "PLATFORM_SERVICE_FEE_PERCENT", 15))

    def get_area_summary(self, obj):
        return get_or_build_area_summary(obj)

    def get_host(self, obj):
        return HostProfileSerializer(obj.host, context=self.context).data

    def get_location(self, obj):
        if not hasattr(obj, "location") or obj.location is None:
            return None
        p = obj.location.point
        loc = obj.location
        base = {
            "country": loc.country or "PL",
            "region": loc.region or "",
            "city": loc.city or "",
            "address_line": loc.address_line or "",
            "postal_code": loc.postal_code or "",
            "latitude": p.y,
            "longitude": p.x,
        }
        base.update(location_tag_dict(loc))
        return base


class ListingWriteSerializer(serializers.ModelSerializer):
    location = ListingLocationWriteSerializer()
    amenities = serializers.ListField(
        child=serializers.CharField(max_length=64),
        required=False,
        allow_empty=True,
    )

    class Meta:
        model = Listing
        fields = (
            "title",
            "description",
            "base_price",
            "cleaning_fee",
            "currency",
            "booking_mode",
            "status",
            "max_guests",
            "bedrooms",
            "beds",
            "bathrooms",
            "amenities",
            "location",
        )
        extra_kwargs = {
            "status": {"required": False},
            "currency": {"required": False},
            "description": {"required": False, "allow_blank": True},
        }

    def create(self, validated_data):
        loc = validated_data.pop("location")
        user = self.context["request"].user
        return ListingService.create_listing(user, listing_data=validated_data, location_data=loc)

    def update(self, instance, validated_data):
        loc = validated_data.pop("location", None)
        return ListingService.update_listing(
            instance,
            listing_data=validated_data if validated_data else None,
            location_data=loc,
        )


class ListingImageUploadSerializer(serializers.Serializer):
    image = serializers.ImageField()
    is_cover = serializers.BooleanField(required=False, default=False)

    def add_to_listing(self, listing, request):
        data = self.validated_data
        upload = data["image"]
        want_cover = data.get("is_cover", False)

        with transaction.atomic():
            count = ListingImage.objects.filter(listing=listing).count()
            if count >= ImageService.max_images():
                raise serializers.ValidationError(
                    {"image": [f"Maksymalnie {ImageService.max_images()} zdjęć na ofertę."]}
                )

            try:
                content = ImageService.validate_and_process(upload)
            except DjangoValidationError as e:
                raise serializers.ValidationError({"image": list(e.messages)}) from e
            max_so = (
                ListingImage.objects.filter(listing=listing).aggregate(m=Max("sort_order"))["m"]
                or 0
            )
            is_first = count == 0
            is_cover = bool(want_cover or is_first)

            img = ListingImage(
                listing=listing,
                is_cover=is_cover,
                sort_order=max_so + 1,
            )
            img.image.save(content.name, content, save=False)
            img.save()

            if is_cover:
                ListingImage.objects.filter(listing=listing).exclude(pk=img.pk).update(
                    is_cover=False
                )

        return ListingImageSerializer(img, context={"request": request}).data
