"""
Celery — odświeżanie cache POI i opisów okolicy (harmonogram w config/celery.py).
"""

from __future__ import annotations

import logging
import time
from datetime import timedelta

from celery import shared_task
from django.db.models import Exists, OuterRef
from django.utils import timezone

from apps.listings.models import Listing, ListingLocation
from apps.location_intelligence.area_summary import ensure_area_summary
from apps.location_intelligence.models import NearbyPlaceCache
from apps.location_intelligence.services import get_nearby_places

logger = logging.getLogger(__name__)

# Limit na jedno uruchomienie — szacunek czasu i grzeczność wobec publicznego Overpass
MAX_POI_REFRESH_PER_RUN = 80
POI_SLEEP_SECONDS = 1.1


@shared_task
def refresh_stale_poi_caches():
    """
    Oferty zatwierdzone: brak cache POI albo starszy niż ~24h → GET Overpass + score + area summary.
    """
    cutoff = timezone.now() - timedelta(hours=23)
    has_location = Exists(ListingLocation.objects.filter(listing_id=OuterRef("pk")))
    qs = (
        Listing.objects.filter(
            deleted_at__isnull=True,
            status=Listing.Status.APPROVED,
        )
        .filter(has_location)
        .select_related("location")
        .order_by("updated_at")
    )

    done = 0
    for listing in qs.iterator(chunk_size=50):
        try:
            row = listing.nearby_places_cache
            fresh = row.fetched_at >= cutoff
        except NearbyPlaceCache.DoesNotExist:
            fresh = False

        if fresh:
            continue

        try:
            get_nearby_places(listing, radius_m=8000, force_refresh=True)
            done += 1
        except Exception:
            logger.exception("refresh_stale_poi_caches failed listing=%s", listing.pk)

        if done >= MAX_POI_REFRESH_PER_RUN:
            break

        time.sleep(POI_SLEEP_SECONDS)

    logger.info("refresh_stale_poi_caches: refreshed %s listings", done)
    return done


@shared_task
def refresh_stale_area_summaries():
    """Wymusza przebudowę tekstu okolicy (7-dniowy cache w ensure_area_summary)."""
    has_location = Exists(ListingLocation.objects.filter(listing_id=OuterRef("pk")))
    qs = (
        Listing.objects.filter(
            deleted_at__isnull=True,
            status=Listing.Status.APPROVED,
        )
        .filter(has_location)
        .select_related("location")
        .order_by("id")
    )

    n = 0
    for listing in qs.iterator(chunk_size=100):
        try:
            ensure_area_summary(listing, force=True)
            n += 1
        except Exception:
            logger.exception("refresh_stale_area_summaries failed listing=%s", listing.pk)

    logger.info("refresh_stale_area_summaries: rebuilt %s summaries", n)
    return n
