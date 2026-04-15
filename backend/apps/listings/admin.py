from django.contrib import admin
from django.db.models import Count

from apps.listings.models import Listing, ListingImage, ListingLocation


class ListingLocationInline(admin.StackedInline):
    model = ListingLocation
    can_delete = False
    extra = 0


class ListingImageInline(admin.TabularInline):
    model = ListingImage
    extra = 0
    readonly_fields = ("created_at",)


@admin.register(Listing)
class ListingAdmin(admin.ModelAdmin):
    list_display = (
        "title",
        "slug",
        "host",
        "location_short",
        "status",
        "base_price",
        "currency",
        "image_count",
        "created_at",
    )
    list_filter = ("status", "booking_mode", "currency", "apply_pl_travel_peak_extras")
    search_fields = ("title", "slug", "host__user__email")
    inlines = [ListingLocationInline, ListingImageInline]
    raw_id_fields = ("host",)

    def get_queryset(self, request):
        qs = super().get_queryset(request)
        return qs.select_related("host__user").annotate(_image_count=Count("images"))

    @admin.display(description="Miasto", ordering="location__city")
    def location_short(self, obj: Listing) -> str:
        try:
            return obj.location.city or "—"
        except ListingLocation.DoesNotExist:
            return "—"

    @admin.display(description="Zdjęcia", ordering="_image_count")
    def image_count(self, obj: Listing) -> int:
        return int(getattr(obj, "_image_count", 0))
