from __future__ import annotations

from uuid import UUID

from django.db import transaction
from django.utils import timezone

from apps.listings.models import Listing
from apps.users.models import SavedSearch, WishlistItem


class WishlistService:
    @staticmethod
    def _get_visible_listing(listing_id: UUID) -> Listing:
        return Listing.objects.get(pk=listing_id, status=Listing.Status.APPROVED)

    @classmethod
    @transaction.atomic
    def add(cls, user, listing_id: UUID) -> WishlistItem:
        listing = cls._get_visible_listing(listing_id)
        existing = WishlistItem.all_objects.filter(user=user, listing=listing).first()
        if existing:
            if existing.deleted_at:
                existing.deleted_at = None
                existing.save(update_fields=["deleted_at", "updated_at"])
            return existing
        return WishlistItem.objects.create(user=user, listing=listing)

    @classmethod
    @transaction.atomic
    def remove(cls, user, listing_id: UUID) -> None:
        WishlistItem.objects.filter(
            user=user,
            listing_id=listing_id,
            deleted_at__isnull=True,
        ).update(deleted_at=timezone.now())

    @classmethod
    def list_for_user(cls, user):
        return (
            WishlistItem.objects.filter(user=user)
            .select_related("listing", "listing__location")
            .prefetch_related("listing__images")
        )


class SavedSearchService:
    @staticmethod
    @transaction.atomic
    def create(user, *, name: str, query_payload: dict, notify_new_listings: bool = False) -> SavedSearch:
        return SavedSearch.objects.create(
            user=user,
            name=name.strip()[:100],
            query_payload=query_payload or {},
            notify_new_listings=bool(notify_new_listings),
        )

    @staticmethod
    @transaction.atomic
    def delete(user, pk: UUID) -> None:
        SavedSearch.objects.filter(user=user, pk=pk, deleted_at__isnull=True).update(
            deleted_at=timezone.now()
        )

    @staticmethod
    def list_for_user(user):
        return SavedSearch.objects.filter(user=user)
