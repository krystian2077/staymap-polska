from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import transaction
from django.db.models import Max
from rest_framework import serializers

from apps.listings.image_service import ImageService
from apps.listings.models import Listing, ListingImage
from apps.listings.services import ListingService


class ListingLocationWriteSerializer(serializers.Serializer):
    lat = serializers.FloatField()
    lng = serializers.FloatField()
    city = serializers.CharField(required=False, allow_blank=True, default="")
    region = serializers.CharField(required=False, allow_blank=True, default="")
    country = serializers.CharField(required=False, default="PL", max_length=2)


class ListingImageSerializer(serializers.ModelSerializer):
    url = serializers.SerializerMethodField()

    class Meta:
        model = ListingImage
        fields = ("id", "url", "is_cover", "sort_order", "created_at")
        read_only_fields = fields

    def get_url(self, obj):
        if not obj.image:
            return None
        request = self.context.get("request")
        url = obj.image.url
        if request:
            return request.build_absolute_uri(url)
        return url


class ListingListSerializer(serializers.ModelSerializer):
    location = serializers.SerializerMethodField()
    cover_image = serializers.SerializerMethodField()

    class Meta:
        model = Listing
        fields = (
            "id",
            "title",
            "slug",
            "base_price",
            "currency",
            "status",
            "max_guests",
            "booking_mode",
            "location",
            "cover_image",
            "created_at",
        )
        read_only_fields = fields

    def get_location(self, obj):
        if not hasattr(obj, "location") or obj.location is None:
            return None
        p = obj.location.point
        return {
            "lat": p.y,
            "lng": p.x,
            "city": obj.location.city,
            "region": obj.location.region,
            "country": obj.location.country,
        }

    def get_cover_image(self, obj):
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
        request = self.context.get("request")
        url = target.image.url
        if request:
            return request.build_absolute_uri(url)
        return url


class ListingDetailSerializer(ListingListSerializer):
    description = serializers.CharField()
    images = ListingImageSerializer(many=True, read_only=True)

    class Meta(ListingListSerializer.Meta):
        fields = ListingListSerializer.Meta.fields + ("description", "images")


class ListingWriteSerializer(serializers.ModelSerializer):
    location = ListingLocationWriteSerializer()

    class Meta:
        model = Listing
        fields = (
            "title",
            "description",
            "base_price",
            "currency",
            "booking_mode",
            "status",
            "max_guests",
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
