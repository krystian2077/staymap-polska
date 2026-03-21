from datetime import timedelta

from celery import shared_task
from django.db import transaction
from django.utils import timezone

from apps.common.email_service import EmailService
from apps.listings.models import Listing

from .models import Booking
from .services import BookingService


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def send_booking_confirmation_email(self, booking_id: str):
    try:
        booking = Booking.objects.select_related("listing", "guest", "listing__host__user").get(
            pk=booking_id
        )
    except Booking.DoesNotExist:
        return

    if booking.confirmation_email_sent or booking.status != Booking.Status.CONFIRMED:
        return

    try:
        EmailService.booking_confirmed_guest(booking)
        EmailService.booking_confirmed_host(booking)
    except Exception as exc:
        raise self.retry(exc=exc) from exc

    booking.confirmation_email_sent = True
    booking.save(update_fields=["confirmation_email_sent", "updated_at"])


@shared_task
def auto_reject_expired_requests():
    """Prośby o rezerwację (REQUEST) — brak odpowiedzi hosta po upływie host_response_deadline."""
    now = timezone.now()
    qs = Booking.objects.filter(
        status=Booking.Status.PENDING,
        listing__booking_mode=Listing.BookingMode.REQUEST,
        host_response_deadline__isnull=False,
        host_response_deadline__lt=now,
        deleted_at__isnull=True,
    ).select_related("listing")
    for b in qs:
        with transaction.atomic():
            BookingService.append_status(
                b,
                Booking.Status.REJECTED,
                user=None,
                note="Automatyczne odrzucenie — przekroczony czas na odpowiedź hosta",
            )


@shared_task
def cancel_abandoned_bookings():
    """Rezerwacje oczekujące na płatność dłużej niż BOOKING_PAYMENT_TIMEOUT_H."""
    hours = getattr(settings, "BOOKING_PAYMENT_TIMEOUT_H", 1)
    threshold = timezone.now() - timedelta(hours=hours)
    qs = Booking.objects.filter(
        status=Booking.Status.AWAITING_PAYMENT,
        updated_at__lt=threshold,
        deleted_at__isnull=True,
    )
    for b in qs:
        with transaction.atomic():
            BookingService.append_status(
                b,
                Booking.Status.ABANDONED,
                user=None,
                note="Brak płatności w wymaganym czasie",
            )
