"""
Krótki opis okolicy (PL) — cache w DB, opcjonalnie wzbogacony o statystyki z NearbyPlaceCache.
"""

from __future__ import annotations

from datetime import timedelta

from django.utils import timezone

from apps.listings.models import Listing
from apps.location_intelligence.models import AreaSummaryCache, NearbyPlaceCache

SUMMARY_TTL = timedelta(days=7)


def _nearby_payload_for_listing(listing: Listing) -> dict | None:
    try:
        row = listing.nearby_places_cache
    except NearbyPlaceCache.DoesNotExist:
        return None
    return row.payload if isinstance(row.payload, dict) else None


def compose_area_summary_body(listing: Listing, nearby_payload: dict | None) -> str:
    loc = listing.location
    if loc is None:
        return ""

    city = (loc.city or "").strip()
    region = (loc.region or "").strip()
    parts: list[str] = []

    if city and region:
        parts.append(
            f"Lokalizacja: {city} (woj. {region}). Okolica sprzyja wypoczynkowi "
            f"i wycieczkom — typowy kierunek podróży po Polsce."
        )
    elif city:
        parts.append(
            f"{city} to dobra baza wypadowa: zwykle znajdziesz tu infrastrukturę turystyczną "
            f"i połączenia z okolicznymi atrakcjami."
        )
    else:
        parts.append(
            "Ta oferta leży w atrakcyjnej turystycznie części Polski — sprzyja spacerom, "
            "aktywnościom outdoorowym i zwolnieniu tempa."
        )

    nature_bits: list[str] = []
    if loc.near_lake:
        nature_bits.append("bliskość jeziora")
    if loc.near_mountains:
        nature_bits.append("górski krajobraz")
    if loc.near_forest:
        nature_bits.append("lasy i spokój")
    if loc.near_sea:
        nature_bits.append("bliskość Bałtyku")
    if nature_bits:
        parts.append("Atuty natury w opisie obiektu: " + ", ".join(nature_bits) + ".")

    if nearby_payload and isinstance(nearby_payload.get("groups"), dict):
        g = nearby_payload["groups"]
        eat = len(g.get("eat_drink") or [])
        parks = len(g.get("nature_leisure") or [])
        tr = len(g.get("transport") or [])
        culture = len(g.get("culture") or [])
        hints: list[str] = []
        if eat >= 4:
            hints.append("w promieniu kilku kilometrów jest wiele punktów gastronomicznych (OSM)")
        elif eat >= 1:
            hints.append("w okolicy znajdziesz lokale gastronomiczne (OSM)")
        if parks >= 1:
            hints.append("są parki lub tereny rekreacyjne")
        if culture >= 1:
            hints.append("obiekty kultury i atrakcje turystyczne są w zasięgu krótkiego przejazdu")
        if tr >= 3:
            hints.append("dojazd ułatwia sieć przystanków i/lub stacji (OSM)")
        elif tr >= 1:
            hints.append("w pobliżu są przystanki komunikacji (OSM)")
        if hints:
            parts.append("Na podstawie danych OpenStreetMap: " + "; ".join(hints) + ".")

    return " ".join(parts)


def ensure_area_summary(listing: Listing, *, force: bool = False) -> str | None:
    """Tworzy lub odświeża cache opisu okolicy. Zwraca tekst lub None bez lokalizacji."""
    if not hasattr(listing, "location") or listing.location is None:
        return None

    if not force:
        row = AreaSummaryCache.objects.filter(listing=listing).first()
        if row and timezone.now() - row.fetched_at < SUMMARY_TTL:
            return row.body

    payload = _nearby_payload_for_listing(listing)
    body = compose_area_summary_body(listing, payload)
    AreaSummaryCache.objects.update_or_create(
        listing=listing,
        defaults={
            "body": body,
            "fetched_at": timezone.now(),
            "meta": {"version": 1},
        },
    )
    return body


def get_or_build_area_summary(listing: Listing) -> str | None:
    """API / serializer — respektuje TTL, bez force."""
    return ensure_area_summary(listing, force=False)
