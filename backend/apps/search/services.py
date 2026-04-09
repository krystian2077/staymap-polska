from __future__ import annotations

import hashlib
import json
import logging
from typing import Any
from uuid import UUID

from django.contrib.gis.db.models.functions import Distance
from django.contrib.gis.geos import Point
from django.contrib.gis.measure import D
from django.core.cache import cache
from django.db.models import Prefetch, Q

from apps.listings.location_tags import LOCATION_TAG_FIELD_NAMES
from apps.listings.models import Listing, ListingImage
from apps.search.travel_modes import TravelModeRanker

logger = logging.getLogger(__name__)

SEARCH_CACHE_TTL = 300  # 5 min (Etap 2.5)
MAX_CACHED_IDS = 2500
# Piny mapy — domyślnie tyle samo co max wyników w cache (masowy seed ~2500 ofert).
MAX_MAP_PINS = MAX_CACHED_IDS


def invalidate_search_cache() -> None:
    """Usuwa wpisy search:v1:* w Redis (po imporcie wielu ofert)."""
    try:
        import redis
        from django.conf import settings

        loc = settings.CACHES["default"]["LOCATION"]
        url = loc[0] if isinstance(loc, (list, tuple)) else loc
        r = redis.from_url(url)
        for key in r.scan_iter(match="*search:v1*", count=256):
            r.delete(key)
    except Exception:
        logger.warning("invalidate_search_cache: nie udało się wyczyścić Redis", exc_info=True)


class SearchOrchestrator:
    """
    Geo + filtry + tryb podróży + sortowanie.
    Dostępność (daty) — Etap 3 (Booking / BlockedDate).
    """

    @classmethod
    def _normalize_params_for_cache(cls, params: dict[str, Any]) -> dict[str, Any]:
        out: dict[str, Any] = {}
        for k in sorted(params.keys()):
            if k == "page_size":
                continue
            v = params[k]
            if hasattr(v, "isoformat"):
                out[k] = v.isoformat()
            else:
                out[k] = v
        return out

    @classmethod
    def _make_cache_key(cls, params: dict[str, Any]) -> str:
        normalized = cls._normalize_params_for_cache(params)
        serialized = json.dumps(normalized, sort_keys=True, default=str)
        digest = hashlib.md5(serialized.encode()).hexdigest()
        return f"search:v1:{digest}"

    @classmethod
    def get_ordered_ids(cls, params: dict[str, Any]) -> list[UUID]:
        """Lista PK w kolejności wyników — z Redis (TTL) albo z bazy."""
        cache_key = cls._make_cache_key(params)
        cached = cache.get(cache_key)
        if cached is not None:
            try:
                raw_ids = json.loads(cached)
                return [UUID(x) for x in raw_ids]
            except (json.JSONDecodeError, TypeError, ValueError):
                logger.warning("search cache corrupt for key %s — rebuilding", cache_key)

        qs = cls.build_queryset(params)
        ids = list(qs.values_list("id", flat=True)[:MAX_CACHED_IDS])
        try:
            cache.set(
                cache_key,
                json.dumps([str(x) for x in ids]),
                SEARCH_CACHE_TTL,
            )
        except Exception:
            logger.exception("search cache set failed")
        return ids

    @classmethod
    def build_queryset(cls, params: dict[str, Any], *, for_map: bool = False):
        img_prefetch = Prefetch(
            "images",
            queryset=ListingImage.objects.order_by("-is_cover", "sort_order", "id"),
        )

        qs = (
            Listing.objects.filter(status=Listing.Status.APPROVED)
            .select_related("location", "host__user")
            .defer("description")
        )
        if not for_map:
            qs = qs.prefetch_related(img_prefetch)

        point = cls._extract_point(params)
        has_point = point is not None
        if point:
            radius_km = float(params.get("radius_km") or 50)
            qs = qs.filter(location__point__dwithin=(point, D(km=radius_km))).annotate(
                distance=Distance("location__point", point)
            )

        if location := params.get("location"):
            loc_q = Q(location__city__icontains=location) | Q(
                location__region__icontains=location
            ) | Q(title__icontains=location)
            qs = qs.filter(loc_q)

        if guests := params.get("guests"):
            qs = qs.filter(max_guests__gte=guests)

        if params.get("min_price") is not None:
            qs = qs.filter(base_price__gte=params["min_price"])
        if params.get("max_price") is not None:
            qs = qs.filter(base_price__lte=params["max_price"])

        if booking_mode := params.get("booking_mode"):
            qs = qs.filter(booking_mode=booking_mode)

        if travel_mode := params.get("travel_mode"):
            qs = TravelModeRanker.apply(qs, travel_mode)

        for tag in LOCATION_TAG_FIELD_NAMES:
            if params.get(tag) is True:
                qs = qs.filter(**{f"location__{tag}": True})

        # listing_types — filtr po listing_type.slug w JSONField
        if listing_types := params.get("listing_types"):
            from django.db.models import Q as _Q
            lt_q = _Q()
            for lt_slug in listing_types:
                lt_q |= _Q(listing_type__slug=lt_slug)
            qs = qs.filter(lt_q)

        # amenities — oferta musi mieć wszystkie wymagane amenity IDs
        if amenities := params.get("amenities"):
            for a_id in amenities:
                # JSONField @> operator: checks if JSON array contains element with given id
                qs = qs.filter(amenities__contains=[{"id": a_id}])

        # is_pet_friendly
        if params.get("is_pet_friendly") is True:
            qs = qs.filter(is_pet_friendly=True)

        # bbox / viewport mapy
        if all(params.get(b) is not None for b in ("bbox_south", "bbox_west", "bbox_north", "bbox_east")):
            from django.contrib.gis.geos import Polygon as _Polygon
            try:
                bbox_poly = _Polygon.from_bbox((
                    float(params["bbox_west"]),
                    float(params["bbox_south"]),
                    float(params["bbox_east"]),
                    float(params["bbox_north"]),
                ))
                bbox_poly.srid = 4326
                qs = qs.filter(location__point__within=bbox_poly)
            except Exception:
                pass  # invalid bbox → ignore silently

        # Dostępność po datach (BlockedDate + aktywne Booking)
        if (df := params.get("date_from")) and (dt := params.get("date_to")):
            try:
                from apps.bookings.models import BlockedDate as _BD, Booking as _Bk
                blocked_ids = (
                    _BD.objects.filter(
                        date__gte=df,
                        date__lt=dt,
                        deleted_at__isnull=True,
                    )
                    .values_list("listing_id", flat=True)
                    .distinct()
                )
                booked_ids = (
                    _Bk.objects.filter(
                        check_in__lt=dt,
                        check_out__gt=df,
                        status__in=[_Bk.Status.CONFIRMED, _Bk.Status.AWAITING_PAYMENT],
                        deleted_at__isnull=True,
                    )
                    .values_list("listing_id", flat=True)
                    .distinct()
                )
                unavailable = set(blocked_ids) | set(booked_ids)
                if unavailable:
                    qs = qs.exclude(id__in=unavailable)
            except Exception:
                pass  # availability filter is best-effort

        return cls._apply_ranking(qs, params, has_point=has_point)

    @staticmethod
    def _extract_point(params: dict[str, Any]) -> Point | None:
        lat, lng = params.get("latitude"), params.get("longitude")
        if lat is not None and lng is not None:
            return Point(float(lng), float(lat), srid=4326)
        return None

    @classmethod
    def _apply_ranking(cls, qs, params: dict[str, Any], *, has_point: bool):
        ordering = params.get("ordering", "recommended")

        if ordering == "price_asc":
            return qs.order_by("base_price", "id")
        if ordering == "price_desc":
            return qs.order_by("-base_price", "id")
        if ordering == "newest":
            return qs.order_by("-created_at", "id")

        order: list[str] = []
        if has_point:
            order.append("distance")
        if params.get("travel_mode"):
            order.extend(["-travel_score", "-created_at", "id"])
        else:
            order.extend(["-created_at", "id"])
        return qs.order_by(*order)

    @classmethod
    def build_map_queryset(cls, params: dict[str, Any]):
        """Te same filtry/sortowanie co lista, bez prefetch zdjęć."""
        return cls.build_queryset(params, for_map=True)
