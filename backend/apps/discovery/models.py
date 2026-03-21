from __future__ import annotations

import uuid
from datetime import timedelta

from django.conf import settings
from django.db import models
from django.db.models import Q
from django.utils import timezone

from apps.common.models import BaseModel


class DiscoveryCollection(BaseModel):
    """Kuratowana kolekcja na stronę główną (Etap 5)."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    slug = models.SlugField(max_length=120, unique=True, db_index=True)
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True, default="")
    sort_order = models.PositiveSmallIntegerField(default=0, db_index=True)
    is_active = models.BooleanField(default=True, db_index=True)
    travel_mode = models.CharField(
        max_length=32,
        blank=True,
        default="",
        help_text="Opcjonalny filtr trybu (link „Zobacz więcej”).",
    )
    listings = models.ManyToManyField(
        "listings.Listing",
        through="CollectionListing",
        related_name="discovery_collections",
        blank=True,
    )

    class Meta:
        ordering = ("sort_order", "title")

    def __str__(self):
        return self.title


class CollectionListing(BaseModel):
    collection = models.ForeignKey(
        DiscoveryCollection,
        on_delete=models.CASCADE,
        related_name="collection_listings",
    )
    listing = models.ForeignKey(
        "listings.Listing",
        on_delete=models.CASCADE,
        related_name="collection_memberships",
    )
    sort_order = models.PositiveSmallIntegerField(default=0)

    class Meta:
        ordering = ("sort_order", "id")
        constraints = [
            models.UniqueConstraint(
                fields=["collection", "listing"],
                condition=Q(deleted_at__isnull=True),
                name="discovery_collection_listing_uniq",
            ),
        ]


class CompareSession(BaseModel):
    """Porównanie do 3 ofert, TTL (WA-6)."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name="compare_sessions",
    )
    session_key = models.CharField(max_length=64, blank=True, default="", db_index=True)
    expires_at = models.DateTimeField(db_index=True)
    listings = models.ManyToManyField(
        "listings.Listing",
        blank=True,
        related_name="compare_sessions",
    )

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["user"],
                condition=Q(user__isnull=False),
                name="discovery_compare_one_session_per_user",
            ),
            models.UniqueConstraint(
                fields=["session_key"],
                condition=~Q(session_key=""),
                name="discovery_compare_session_key_uniq",
            ),
        ]

    def save(self, *args, **kwargs):
        if self.expires_at is None:
            hours = getattr(settings, "COMPARE_SESSION_TTL_HOURS", 48)
            self.expires_at = timezone.now() + timedelta(hours=hours)
        super().save(*args, **kwargs)
