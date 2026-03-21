import uuid

from django.conf import settings
from django.db import models

from apps.common.models import BaseModel


class Review(BaseModel):
    """Recenzja powiązana z rezerwacją (okres ślepy + ewentualnie host o gościu)."""

    class ReviewerRole(models.TextChoices):
        GUEST = "guest", "Gość o pobycie"
        HOST = "host", "Host o gościu"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    listing = models.ForeignKey(
        "listings.Listing",
        on_delete=models.CASCADE,
        related_name="stay_reviews",
    )
    booking = models.ForeignKey(
        "bookings.Booking",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="stay_reviews",
    )
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="stay_reviews",
    )
    reviewer_role = models.CharField(
        max_length=16,
        choices=ReviewerRole.choices,
        default=ReviewerRole.GUEST,
        db_index=True,
    )
    author_display_first = models.CharField(max_length=80, blank=True)
    author_display_last = models.CharField(max_length=80, blank=True)
    overall_rating = models.DecimalField(max_digits=2, decimal_places=1)
    title = models.CharField(max_length=200, blank=True)
    content = models.TextField()
    subscores = models.JSONField(
        null=True,
        blank=True,
        help_text='np. {"cleanliness":4.5,"location":5,"communication":4.5,"accuracy":5}',
    )
    blind_release_at = models.DateTimeField(null=True, blank=True)
    is_public = models.BooleanField(default=False, db_index=True)
    is_blind_review_released = models.BooleanField(default=False)
    host_response = models.TextField(blank=True)

    class Meta:
        verbose_name = "Recenzja"
        verbose_name_plural = "Recenzje"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["listing_id", "is_public", "created_at"]),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=["booking", "reviewer_role"],
                condition=models.Q(booking__isnull=False, deleted_at__isnull=True),
                name="reviews_review_booking_role_uniq",
            ),
        ]

    def __str__(self):
        who = self.author.email if self.author_id else "anon"
        return f"★{self.overall_rating} — {who} → {self.listing_id}"
