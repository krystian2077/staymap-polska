from django.contrib import admin

from apps.location_intelligence.models import AreaSummaryCache, NearbyPlaceCache


@admin.register(NearbyPlaceCache)
class NearbyPlaceCacheAdmin(admin.ModelAdmin):
    list_display = ("listing", "radius_m", "fetched_at", "updated_at")
    raw_id_fields = ("listing",)
    readonly_fields = ("fetched_at", "created_at", "updated_at")


@admin.register(AreaSummaryCache)
class AreaSummaryCacheAdmin(admin.ModelAdmin):
    list_display = ("listing", "fetched_at", "updated_at")
    raw_id_fields = ("listing",)
    readonly_fields = ("fetched_at", "created_at", "updated_at")
