import uuid

from django.conf import settings
from django.db import models
from django.db.models import F, Q

from apps.common.models import BaseModel
from apps.listings.models import Listing


class BlockedDate(BaseModel):
    """Zablokowane noce w kalendarzu hosta (brak możliwości rezerwacji)."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    listing = models.ForeignKey(
        Listing,
        on_delete=models.CASCADE,
        related_name="blocked_dates",
    )
    date = models.DateField(db_index=True)

    class Meta:
        verbose_name = "Zablokowany dzień"
        verbose_name_plural = "Zablokowane dni"
        constraints = [
            models.UniqueConstraint(
                fields=["listing", "date"],
                condition=models.Q(deleted_at__isnull=True),
                name="bookings_blockeddate_listing_date_uniq",
            ),
        ]
        indexes = [
            models.Index(fields=["listing_id", "date"]),
        ]

    def __str__(self):
        return f"{self.listing.title} — {self.date}"


class Booking(BaseModel):
    class Status(models.TextChoices):
        PENDING = "pending", "Oczekująca (prośba do hosta)"
        AWAITING_PAYMENT = "awaiting_payment", "Oczekuje płatności"
        CONFIRMED = "confirmed", "Potwierdzona"
        CANCELLED = "cancelled", "Anulowana"
        REJECTED = "rejected", "Odrzucona"
        COMPLETED = "completed", "Zakończona"
        ABANDONED = "abandoned", "Porzucona (brak płatności)"
        PAYMENT_FAILED = "payment_failed", "Płatność nieudana"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    listing = models.ForeignKey(
        Listing,
        on_delete=models.PROTECT,
        related_name="bookings",
    )
    guest = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="bookings",
    )
    check_in = models.DateField(db_index=True)
    check_out = models.DateField(db_index=True)
    guests_count = models.PositiveSmallIntegerField(default=1)
    adults = models.PositiveSmallIntegerField(default=1)
    children = models.PositiveSmallIntegerField(default=0)
    special_requests = models.TextField(blank=True)
    cancellation_policy_snapshot = models.CharField(max_length=32, blank=True)
    status = models.CharField(
        max_length=32,
        choices=Status.choices,
        default=Status.PENDING,
        db_index=True,
    )
    pricing_breakdown = models.JSONField()
    final_amount = models.DecimalField(max_digits=10, decimal_places=2)
    currency = models.CharField(max_length=3, default="PLN")
    stripe_checkout_session_id = models.CharField(max_length=255, null=True, blank=True)
    confirmation_email_sent = models.BooleanField(default=False)
    review_reminder_sent = models.BooleanField(
        default=False,
        help_text="Czy wysłano przypomnienie o ocenie po zakończonym pobycie.",
    )
    host_response_deadline = models.DateTimeField(null=True, blank=True)

    class Meta:
        verbose_name = "Rezerwacja"
        verbose_name_plural = "Rezerwacje"
        indexes = [
            models.Index(fields=["listing_id", "check_in", "check_out"]),
            models.Index(fields=["guest_id", "status"]),
        ]
        constraints = [
            models.CheckConstraint(
                condition=Q(check_out__gt=F("check_in")),
                name="booking_checkout_after_checkin",
            ),
        ]

    def __str__(self):
        return (
            f"Rezerwacja {str(self.id)[:8].upper()}: "
            f"{self.guest.email} → {self.listing.title} "
            f"({self.check_in}/{self.check_out}) [{self.status}]"
        )


class BookingStatusHistory(BaseModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    booking = models.ForeignKey(
        Booking,
        on_delete=models.CASCADE,
        related_name="status_history",
    )
    old_status = models.CharField(max_length=32, blank=True)
    new_status = models.CharField(max_length=32)
    changed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="booking_status_changes",
    )
    note = models.CharField(max_length=500, blank=True)

    class Meta:
        verbose_name = "Historia statusu rezerwacji"
        verbose_name_plural = "Historie statusów rezerwacji"
        ordering = ["created_at"]

    def __str__(self):
        return f"{self.booking_id}: {self.old_status} → {self.new_status}"


class Payment(BaseModel):
    class Status(models.TextChoices):
        PENDING = "pending", "Oczekuje"
        SUCCEEDED = "succeeded", "Zaksięgowana"
        FAILED = "failed", "Nieudana"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    booking = models.ForeignKey(
        Booking,
        on_delete=models.PROTECT,
        related_name="payments",
    )
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    currency = models.CharField(max_length=3, default="PLN")
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING,
    )
    stripe_checkout_session_id = models.CharField(max_length=255, blank=True)
    stripe_payment_intent_id = models.CharField(max_length=255, blank=True)
    provider_payment_id = models.CharField(
        max_length=255,
        unique=True,
        help_text="Unikalny identyfikator Stripe (np. payment_intent) — idempotencja webhook.",
    )

    class Meta:
        verbose_name = "Płatność"
        verbose_name_plural = "Płatności"

    def __str__(self):
        return f"{self.booking_id} {self.amount} {self.currency} [{self.status}]"


class StripeWebhookEvent(BaseModel):
    """Idempotencja: Stripe może wysłać ten sam event wielokrotnie."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    stripe_event_id = models.CharField(max_length=255, unique=True, db_index=True)
    event_type = models.CharField(max_length=120)
    processed = models.BooleanField(default=False)
    payload_summary = models.CharField(max_length=500, blank=True)

    class Meta:
        verbose_name = "Webhook Stripe"
        verbose_name_plural = "Webhooki Stripe"

    def __str__(self):
        return f"{self.stripe_event_id} ({self.event_type})"
