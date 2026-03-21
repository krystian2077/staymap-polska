from django.db import models

from apps.listings.models import Listing


class NearbyPlaceCache(models.Model):
    """Cache wyniku zapytania Overpass (POI) dla oferty — TTL logiczny w serwisie (24h)."""

    listing = models.OneToOneField(
        Listing,
        on_delete=models.CASCADE,
        related_name="nearby_places_cache",
    )
    radius_m = models.PositiveIntegerField(default=8000)
    payload = models.JSONField(default=dict)
    fetched_at = models.DateTimeField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Cache POI w pobliżu"
        verbose_name_plural = "Cache POI w pobliżu"

    def __str__(self):
        return f"POI cache — {self.listing.slug} ({self.radius_m}m)"


class AreaSummaryCache(models.Model):
    """Krótki tekst o okolicy (szablon + ewentualnie dane POI) — TTL logiczny w serwisie (7 dni)."""

    listing = models.OneToOneField(
        Listing,
        on_delete=models.CASCADE,
        related_name="area_summary_cache",
    )
    body = models.TextField()
    meta = models.JSONField(default=dict, blank=True)
    fetched_at = models.DateTimeField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Opis okolicy (cache)"
        verbose_name_plural = "Opisy okolicy (cache)"

    def __str__(self):
        return f"Area summary — {self.listing.slug}"
