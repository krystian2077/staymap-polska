from django.contrib import admin

from apps.discovery.models import CollectionListing, CompareSession, DiscoveryCollection


class CollectionListingInline(admin.TabularInline):
    model = CollectionListing
    extra = 0
    raw_id_fields = ("listing",)


@admin.register(DiscoveryCollection)
class DiscoveryCollectionAdmin(admin.ModelAdmin):
    list_display = ("title", "slug", "sort_order", "is_active", "travel_mode")
    list_filter = ("is_active",)
    search_fields = ("title", "slug", "description")
    prepopulated_fields = {"slug": ("title",)}
    inlines = [CollectionListingInline]


@admin.register(CompareSession)
class CompareSessionAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "session_key", "expires_at", "created_at")
    filter_horizontal = ("listings",)
    readonly_fields = ("created_at", "updated_at")
