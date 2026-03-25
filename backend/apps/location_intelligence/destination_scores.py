"""
Heurystyki 0–10 zgodnie z dokumentacją (sekcja 18) — uproszczone, deterministyczne.
`poi_stats` pochodzi z payloadu POI (pola parks, nightlife, outdoor_score_nodes, ...).
"""

from __future__ import annotations

from typing import Any

from django.utils import timezone

from apps.listings.models import Listing


def _clamp(x: float, lo: float = 0.0, hi: float = 10.0) -> float:
    return max(lo, min(hi, x))


def _amenity_ids(listing: Listing) -> set[str]:
    raw = listing.amenities or []
    if not isinstance(raw, list):
        return set()
    out: set[str] = set()
    for a in raw:
        if isinstance(a, dict) and a.get("id"):
            out.add(str(a["id"]).lower())
    return out


def _has(a: set[str], *keys: str) -> bool:
    return any(k in a for k in keys)


def compute_destination_scores(
    listing: Listing,
    poi_stats: dict[str, Any] | None = None,
) -> dict[str, Any]:
    ids = _amenity_ids(listing)
    loc = getattr(listing, "location", None)

    nature = 0.0
    if loc:
        if getattr(loc, "near_forest", False):
            nature += 3.3
        if getattr(loc, "near_lake", False):
            nature += 3.3
        if getattr(loc, "near_mountains", False):
            nature += 3.3
        if getattr(loc, "near_sea", False):
            nature += 2.5
        if getattr(loc, "near_river", False):
            nature += 2.4
        if getattr(loc, "near_protected_area", False):
            nature += 2.6
        if getattr(loc, "beach_access", False):
            nature += 2.2
    nature = _clamp(nature)

    romantic = 0.0
    if _has(ids, "sauna"):
        romantic += 3.0
    if _has(ids, "fireplace"):
        romantic += 2.0
    if _has(ids, "jacuzzi", "hot_tub"):
        romantic += 2.0
    if nature >= 7:
        romantic += 1.5
    if listing.max_guests <= 4:
        romantic += 0.5
    romantic = _clamp(romantic + 2.0)

    wellness = 0.0
    if _has(ids, "sauna"):
        wellness += 3.0
    if _has(ids, "hot_tub", "jacuzzi"):
        wellness += 2.5
    if _has(ids, "massage"):
        wellness += 1.0
    wellness = _clamp(wellness + 2.0)

    family = 0.0
    if _has(ids, "children_welcome", "kids", "family"):
        family += 3.0
    if _has(ids, "garden"):
        family += 2.0
    if listing.max_guests >= 4:
        family += 2.0
    if poi_stats:
        family += min(3.0, float(poi_stats.get("playgrounds") or 0) * 0.6)
    family = _clamp(family + 1.5)

    workation = 0.0
    if _has(ids, "wifi"):
        workation += 4.0
    if _has(ids, "desk"):
        workation += 3.0
    if _has(ids, "ac"):
        workation += 0.5
    if poi_stats:
        workation += min(2.5, float(poi_stats.get("cafes") or 0) * 0.25)
    workation = _clamp(workation + 1.0)

    outdoor = 5.0
    if loc and (
        getattr(loc, "near_mountains", False)
        or getattr(loc, "near_forest", False)
        or getattr(loc, "near_lake", False)
        or getattr(loc, "near_river", False)
        or getattr(loc, "near_protected_area", False)
        or getattr(loc, "ski_slopes_nearby", False)
        or getattr(loc, "cycling_routes_nearby", False)
    ):
        outdoor += 2.0
    if loc and getattr(loc, "ski_slopes_nearby", False):
        outdoor += 1.0
    if loc and getattr(loc, "cycling_routes_nearby", False):
        outdoor += 0.6
    if _has(ids, "bike", "terrace"):
        outdoor += 0.8
    if poi_stats:
        oc = float(poi_stats.get("outdoor_score_nodes") or 0)
        outdoor += _clamp(oc * 0.35, 0.0, 4.0)
    outdoor = _clamp(outdoor)

    quiet = 7.5
    if poi_stats:
        nl = float(poi_stats.get("nightlife") or 0)
        quiet = _clamp(10.0 - min(6.0, nl * 0.55))
    if loc and getattr(loc, "quiet_rural", False):
        quiet += 1.2
    if _has(ids, "tv"):
        quiet -= 0.3
    quiet = _clamp(quiet)

    accessibility = 5.5
    if poi_stats:
        tn = float(poi_stats.get("transport_nodes") or 0)
        accessibility += min(3.5, tn * 0.08)
    if loc and getattr(loc, "city", None):
        accessibility += 1.0
    if loc and getattr(loc, "historic_center_nearby", False):
        accessibility += 0.8
    accessibility = _clamp(accessibility)

    return {
        "romantic": round(romantic, 1),
        "outdoor": round(outdoor, 1),
        "nature": round(nature, 1),
        "quiet": round(quiet, 1),
        "family": round(family, 1),
        "wellness": round(wellness, 1),
        "workation": round(workation, 1),
        "accessibility": round(accessibility, 1),
        "calculated_at": timezone.now().isoformat(),
        "version": 1,
    }
