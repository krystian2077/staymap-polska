from django.contrib import admin

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
    list_display = ("title", "slug", "host", "status", "base_price", "currency", "created_at")
    list_filter = ("status", "booking_mode", "currency")
    search_fields = ("title", "slug", "host__user__email")
    inlines = [ListingLocationInline, ListingImageInline]
    raw_id_fields = ("host",)
