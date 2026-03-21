from __future__ import annotations

import logging
import secrets
from datetime import date, timedelta
from typing import Any

from django.conf import settings
from django.core.cache import cache
from django.db import transaction
from django.db.models import Prefetch
from django.utils import timezone

from apps.bookings.services import calendar_booked_dates
from apps.common.exceptions import CompareLimitError, CompareSessionRequiredError
from apps.discovery.models import CollectionListing, CompareSession, DiscoveryCollection
from apps.listings.models import Listing, ListingImage

logger = logging.getLogger(__name__)

DISCOVERY_HOMEPAGE_CACHE_KEY = "discovery:homepage:v1"
DISCOVERY_HOMEPAGE_TTL = 1800  # 30 min


def first_available_check_in(listing_id, start: date, *, max_horizon_days: int = 45) -> date | None:
    try:
        busy_iso = calendar_booked_dates(listing_id)
    except Exception:
        logger.warning("calendar_booked_dates failed for listing %s", listing_id)
        return None
    busy = {date.fromisoformat(x) for x in busy_iso}
    d = start
    limit = start + timedelta(days=max_horizon_days)
    while d < limit:
        if d not in busy:
            return d
        d += timedelta(days=1)
    return None


def _touch_compare_session(session: CompareSession) -> None:
    hours = getattr(settings, "COMPARE_SESSION_TTL_HOURS", 48)
    session.expires_at = timezone.now() + timedelta(hours=hours)
    session.save(update_fields=["expires_at", "updated_at"])


class CompareService:
    @staticmethod
    def _max_listings() -> int:
        return getattr(settings, "COMPARE_MAX_LISTINGS", 3)

    @classmethod
    @transaction.atomic
    def bootstrap_anonymous(cls) -> CompareSession:
        key = secrets.token_urlsafe(32)[:64]
        session = CompareSession.objects.create(user=None, session_key=key)
        return session

    @classmethod
    @transaction.atomic
    def resolve_session(cls, request) -> CompareSession:
        user = request.user
        if user.is_authenticated:
            session, _ = CompareSession.objects.select_for_update().get_or_create(
                user=user,
                defaults={"session_key": ""},
            )
            if session.expires_at < timezone.now():
                session.listings.clear()
            _touch_compare_session(session)
            return session

        key = (request.headers.get("X-Compare-Session") or "").strip()
        if not key:
            raise CompareSessionRequiredError()
        session = (
            CompareSession.objects.select_for_update()
            .filter(user__isnull=True, session_key=key)
            .first()
        )
        if session is None or session.expires_at < timezone.now():
            raise CompareSessionRequiredError()
        _touch_compare_session(session)
        return session

    @classmethod
    @transaction.atomic
    def add_listing(cls, session: CompareSession, listing_id) -> None:
        listing = Listing.objects.get(pk=listing_id, status=Listing.Status.APPROVED)
        if session.listings.filter(pk=listing.pk).exists():
            _touch_compare_session(session)
            return
        if session.listings.count() >= cls._max_listings():
            raise CompareLimitError(
                f"Maksymalnie {cls._max_listings()} oferty w porównaniu."
            )
        session.listings.add(listing)
        _touch_compare_session(session)

    @classmethod
    @transaction.atomic
    def remove_listing(cls, session: CompareSession, listing_id) -> None:
        session.listings.remove(listing_id)
        _touch_compare_session(session)


class DiscoveryFeedService:
    @staticmethod
    def _listing_qs():
        img_qs = ListingImage.objects.order_by("-is_cover", "sort_order", "id")
        return (
            Listing.objects.filter(status=Listing.Status.APPROVED)
            .select_related("location", "host__user")
            .prefetch_related(Prefetch("images", queryset=img_qs))
        )

    @classmethod
    def _serialize_similar(
        cls, listing: Listing, request, *, available_from: str | None = None
    ) -> dict[str, Any]:
        from apps.discovery.serializers import SimilarListingCardSerializer

        ctx: dict = {"request": request}
        if available_from:
            ctx["available_from"] = available_from
        return SimilarListingCardSerializer(listing, context=ctx).data

    @classmethod
    def build_homepage_payload(cls, request) -> dict[str, Any]:
        today = date.today()
        featured_collections: list[dict] = []
        img_qs = ListingImage.objects.order_by("-is_cover", "sort_order", "id")

        for col in DiscoveryCollection.objects.filter(
            is_active=True, deleted_at__isnull=True
        ).order_by("sort_order", "title")[:12]:
            cl_rows = (
                CollectionListing.objects.filter(collection=col, deleted_at__isnull=True)
                .select_related("listing", "listing__location", "listing__host__user")
                .prefetch_related(Prefetch("listing__images", queryset=img_qs))
                .order_by("sort_order", "id")[:8]
            )
            ordered_listings = [
                r.listing
                for r in cl_rows
                if r.listing.status == Listing.Status.APPROVED and r.listing.deleted_at is None
            ]
            featured_collections.append(
                {
                    "id": str(col.id),
                    "title": col.title,
                    "description": col.description or "",
                    "mode": col.travel_mode or None,
                    "listings": [
                        cls._serialize_similar(x, request) for x in ordered_listings
                    ],
                }
            )

        last_minute: list[dict] = []
        candidates = list(cls._listing_qs().order_by("base_price", "-created_at")[:40])
        for listing in candidates:
            avail = first_available_check_in(listing.id, today)
            if avail is None:
                continue
            card = cls._serialize_similar(
                listing, request, available_from=avail.isoformat()
            )
            last_minute.append(card)
            if len(last_minute) >= 12:
                break

        return {
            "featured_collections": featured_collections,
            "last_minute": last_minute,
        }

    @classmethod
    def get_homepage(cls, request) -> dict[str, Any]:
        cached = cache.get(DISCOVERY_HOMEPAGE_CACHE_KEY)
        if cached is not None:
            return cached
        payload = cls.build_homepage_payload(request)
        cache.set(DISCOVERY_HOMEPAGE_CACHE_KEY, payload, DISCOVERY_HOMEPAGE_TTL)
        return payload

    @staticmethod
    def invalidate_homepage_cache() -> None:
        cache.delete(DISCOVERY_HOMEPAGE_CACHE_KEY)


def cleanup_expired_compare_sessions() -> int:
    """Usuwa wygasłe sesje porównań (powiązania M2M znikną kaskadowo przez CASCADE na... M2M clears?)"""
    qs = CompareSession.objects.filter(expires_at__lt=timezone.now())
    n, _ = qs.delete()
    return n
