from __future__ import annotations

import logging
from datetime import timedelta
from typing import Any

from django.db import transaction
from django.utils import timezone

from apps.listings.models import Listing
from apps.location_intelligence.destination_scores import compute_destination_scores
from apps.location_intelligence.models import NearbyPlaceCache
from apps.location_intelligence.overpass import fetch_overpass_elements
from apps.location_intelligence.poi_groups import build_nearby_payload

logger = logging.getLogger(__name__)

CACHE_TTL = timedelta(hours=24)
SCORE_TTL = timedelta(days=7)

EMPTY_GROUP_KEYS = (
    "eat_drink",
    "nature_leisure",
    "family",
    "culture",
    "transport",
    "nightlife",
    "outdoor",
    "services",
)


def _score_needs_refresh(listing: Listing) -> bool:
    cache = listing.destination_score_cache
    if not cache or not isinstance(cache, dict):
        return True
    raw = cache.get("calculated_at")
    if not raw:
        return True
    try:
        from django.utils.dateparse import parse_datetime

        dt = parse_datetime(str(raw))
        if dt is None:
            return True
        if timezone.is_naive(dt):
            dt = timezone.make_aware(dt, timezone.get_current_timezone())
    except (TypeError, ValueError):
        return True
    return timezone.now() - dt > SCORE_TTL


def _cache_fresh(row: NearbyPlaceCache | None, radius_m: int) -> bool:
    if row is None or row.radius_m != radius_m:
        return False
    return timezone.now() - row.fetched_at < CACHE_TTL


def ensure_destination_scores(listing: Listing, *, fetch_poi: bool = False) -> bool:
    """
    Uzupełnia `destination_score_cache` gdy brak lub przeterminowany (7 dni).
    Bez fetch_poi: używa statystyk z ewentualnego świeżego NearbyPlaceCache.
    Zwraca True, gdy zapisano listing.
    """
    if not hasattr(listing, "location") or listing.location is None:
        return False
    if not _score_needs_refresh(listing):
        return False

    poi_stats: dict[str, Any] | None = None
    try:
        row = listing.nearby_places_cache
    except NearbyPlaceCache.DoesNotExist:
        row = None
    if row and _cache_fresh(row, row.radius_m):
        payload = row.payload or {}
        poi_stats = payload.get("stats")

    if fetch_poi:
        try:
            row = listing.nearby_places_cache
        except NearbyPlaceCache.DoesNotExist:
            row = None
        if row:
            poi_stats = (row.payload or {}).get("stats")

    scores = compute_destination_scores(listing, poi_stats)
    listing.destination_score_cache = scores
    listing.save(update_fields=["destination_score_cache", "updated_at"])
    return True


def get_nearby_places(
    listing: Listing,
    *,
    radius_m: int = 8000,
    force_refresh: bool = False,
) -> tuple[dict[str, Any], str]:
    """
    Zwraca (payload, source) gdzie source ∈ {'cache','live','error'}.
    Przy błędzie Overpass — stary cache jeśli istnieje, inaczej pusty obiekt + error.
    """
    if not hasattr(listing, "location") or listing.location is None:
        return {
            "center": None,
            "radius_m": radius_m,
            "groups": {k: [] for k in EMPTY_GROUP_KEYS},
            "stats": {},
            "error": "no_location",
        }, "error"

    p = listing.location.point
    lat, lng = p.y, p.x
    radius_m = max(1000, min(int(radius_m), 15_000))

    row: NearbyPlaceCache | None
    try:
        row = NearbyPlaceCache.objects.get(listing=listing)
    except NearbyPlaceCache.DoesNotExist:
        row = None

    if not force_refresh and _cache_fresh(row, radius_m):
        payload = dict(row.payload)
        payload.setdefault("center", {"lat": lat, "lng": lng})
        payload["radius_m"] = radius_m
        payload["fetched_at"] = row.fetched_at.isoformat()
        return payload, "cache"

    elements, err = fetch_overpass_elements(lat, lng, radius_m)
    if err:
        if row and row.payload:
            payload = dict(row.payload)
            payload.setdefault("center", {"lat": lat, "lng": lng})
            payload["radius_m"] = radius_m
            payload["fetched_at"] = row.fetched_at.isoformat()
            payload["overpass_error"] = err
            return payload, "error"
        return {
            "center": {"lat": lat, "lng": lng},
            "radius_m": radius_m,
            "groups": {k: [] for k in EMPTY_GROUP_KEYS},
            "stats": {},
            "overpass_error": err,
        }, "error"

    payload = build_nearby_payload(elements, lat, lng, radius_m)
    payload["fetched_at"] = timezone.now().isoformat()

    try:
        with transaction.atomic():
            NearbyPlaceCache.objects.update_or_create(
                listing=listing,
                defaults={
                    "radius_m": radius_m,
                    "payload": payload,
                    "fetched_at": timezone.now(),
                },
            )
    except Exception as e:
        logger.exception("NearbyPlaceCache save failed: %s", e)

    scores = compute_destination_scores(listing, payload.get("stats"))
    listing.destination_score_cache = scores
    listing.save(update_fields=["destination_score_cache", "updated_at"])

    from apps.location_intelligence.area_summary import ensure_area_summary

    ensure_area_summary(listing, force=True)

    return payload, "live"
