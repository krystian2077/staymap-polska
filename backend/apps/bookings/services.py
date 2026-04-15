from __future__ import annotations

from datetime import date, timedelta
from decimal import Decimal
from typing import Optional

from django.conf import settings
from django.db import transaction
from django.utils import timezone

from rest_framework.exceptions import NotFound, PermissionDenied, ValidationError

from apps.common.audit import log_action
from apps.common.exceptions import (
    BookingNotCancellableError,
    BookingUnavailableError,
    PricingError,
)
from apps.listings.models import Listing
from apps.pricing.services import PricingService

from .models import BlockedDate, Booking, BookingStatusHistory


class AvailabilityService:
    """Dostępność terminów — blokady hosta + aktywne rezerwacje."""

    BLOCKING_STATUSES = (
        Booking.Status.PENDING,
        Booking.Status.AWAITING_PAYMENT,
        Booking.Status.CONFIRMED,
    )

    @classmethod
    def ranges_overlap(cls, a_in: date, a_out: date, b_in: date, b_out: date) -> bool:
        return a_in < b_out and a_out > b_in

    @classmethod
    def has_booking_conflict(
        cls,
        listing_id,
        check_in: date,
        check_out: date,
        exclude_booking_id=None,
    ) -> bool:
        qs = Booking.objects.filter(
            listing_id=listing_id,
            deleted_at__isnull=True,
            status__in=cls.BLOCKING_STATUSES,
        ).filter(check_in__lt=check_out, check_out__gt=check_in)
        if exclude_booking_id:
            qs = qs.exclude(pk=exclude_booking_id)
        return qs.exists()

    @classmethod
    def blocked_nights(cls, listing_id, check_in: date, check_out: date) -> list[date]:
        nights = []
        d = check_in
        blocked = set(
            BlockedDate.objects.filter(
                listing_id=listing_id,
                date__gte=check_in,
                date__lt=check_out,
                deleted_at__isnull=True,
            ).values_list("date", flat=True)
        )
        while d < check_out:
            if d in blocked:
                nights.append(d)
            d += timedelta(days=1)
        return nights

    @classmethod
    def assert_available(cls, listing: Listing, check_in: date, check_out: date):
        if cls.has_booking_conflict(listing.id, check_in, check_out):
            raise BookingUnavailableError("Te daty kolidują z inną rezerwacją.")
        blocked = cls.blocked_nights(listing.id, check_in, check_out)
        if blocked:
            raise BookingUnavailableError("Wybrane noce obejmują dni niedostępne w kalendarzu hosta.")


class BookingService:
    @classmethod
    @transaction.atomic
    def create_booking(
        cls,
        *,
        listing_id,
        guest,
        check_in: date,
        check_out: date,
        guests_count: int,
        adults: Optional[int] = None,
        children: int = 0,
        pets: int = 0,
        special_requests: str = "",
        cost_split=None,
    ) -> Booking:
        listing = (
            Listing.objects.select_for_update()
            .select_related("host")
            .filter(pk=listing_id, deleted_at__isnull=True)
            .first()
        )
        if not listing:
            raise NotFound("Nie znaleziono oferty.")
        if listing.status != Listing.Status.APPROVED:
            raise ValidationError({"listing": ["Ta oferta nie przyjmuje rezerwacji."]})

        AvailabilityService.assert_available(listing, check_in, check_out)

        ad = adults if adults is not None else guests_count
        ch = max(0, int(children))
        pt = max(0, int(pets))
        if ad < 1:
            raise ValidationError({"adults": ["Wymagany jest co najmniej jeden dorosły."]})
        if ad + ch != guests_count:
            raise ValidationError(
                {"guests_count": ["Liczba gości musi być równa dorosłym + dzieciom."]}
            )
        if guests_count > listing.max_guests:
            raise ValidationError(
                {
                    "guests_count": [
                        f"Maksymalna liczba gości dla tej oferty to {listing.max_guests}."
                    ]
                }
            )

        try:
            breakdown = PricingService.calculate(
                listing,
                check_in,
                check_out,
                guests=guests_count,
                adults=ad,
                children=ch,
                pets=pt,
            )
        except PricingError:
            raise

        if cost_split:
            people = cost_split.get("people")
            if not isinstance(people, int):
                raise ValidationError({"cost_split": ["Pole people musi być liczbą całkowitą."]})
            if people < 1 or people > listing.max_guests:
                raise ValidationError(
                    {
                        "cost_split": [
                            f"Podział kosztów może obejmować od 1 do {listing.max_guests} osób."
                        ]
                    }
                )
            total_for_split = Decimal(str(breakdown["total"]))
            per_person = (total_for_split / Decimal(people)).quantize(Decimal("0.01"))
            breakdown["cost_split"] = {
                "people": people,
                "per_person": f"{per_person:.2f}",
                "total": f"{total_for_split:.2f}",
                "currency": breakdown.get("currency", listing.currency),
                "max_guests": listing.max_guests,
            }
        total = Decimal(breakdown["total"])
        if total <= 0:
            raise PricingError("Nieprawidłowa kwota rezerwacji.")

        # Bez płatności online: instant = od razu potwierdzona; request = oczekuje hosta.
        if listing.booking_mode == Listing.BookingMode.INSTANT:
            new_status = Booking.Status.CONFIRMED
        else:
            new_status = Booking.Status.PENDING

        deadline = None
        if new_status == Booking.Status.PENDING:
            hours = getattr(settings, "HOST_REQUEST_ACCEPT_HOURS", 24)
            deadline = timezone.now() + timedelta(hours=hours)

        booking = Booking.objects.create(
            listing=listing,
            guest=guest,
            check_in=check_in,
            check_out=check_out,
            guests_count=guests_count,
            adults=ad,
            children=ch,
            special_requests=(special_requests or "")[:2000],
            cancellation_policy_snapshot=listing.cancellation_policy,
            status=new_status,
            pricing_breakdown=breakdown,
            final_amount=total,
            currency=breakdown["currency"],
            host_response_deadline=deadline,
        )
        note = (
            "Utworzenie i potwierdzenie rezerwacji (bez płatności online)."
            if new_status == Booking.Status.CONFIRMED
            else "Utworzenie rezerwacji"
        )
        BookingStatusHistory.objects.create(
            booking=booking,
            old_status="",
            new_status=new_status,
            changed_by=guest,
            note=note,
        )
        log_action(
            action="booking.created",
            object_type="booking",
            object_id=str(booking.id),
            actor=guest,
            metadata={"status": new_status, "listing_id": str(listing.id)},
        )

        if new_status == Booking.Status.CONFIRMED:

            def _queue_confirmation():
                from apps.bookings.tasks import send_booking_confirmation_email

                send_booking_confirmation_email.delay(str(booking.id))

            transaction.on_commit(_queue_confirmation)

        if new_status == Booking.Status.PENDING:

            def _notify_host_new():
                from apps.messaging.ws_notify import notify_host_new_booking_request

                notify_host_new_booking_request(
                    host_user_id=listing.host.user_id,
                    booking_id=booking.id,
                )

            transaction.on_commit(_notify_host_new)

        return booking

    @classmethod
    def append_status(cls, booking: Booking, new_status: str, *, user=None, note: str = ""):
        old = booking.status
        if old == new_status:
            return
        booking.status = new_status
        booking.save(update_fields=["status", "updated_at"])
        BookingStatusHistory.objects.create(
            booking=booking,
            old_status=old,
            new_status=new_status,
            changed_by=user,
            note=note[:500],
        )
        log_action(
            action="booking.status_changed",
            object_type="booking",
            object_id=str(booking.id),
            actor=user,
            metadata={"old_status": old, "new_status": new_status},
        )

    @classmethod
    @transaction.atomic
    def cancel_by_guest(cls, booking: Booking, guest) -> Booking:
        if booking.guest_id != guest.id:
            raise PermissionDenied()
        if booking.status not in (
            Booking.Status.PENDING,
            Booking.Status.AWAITING_PAYMENT,
            Booking.Status.CONFIRMED,
        ):
            raise BookingNotCancellableError()
        cls.append_status(
            booking,
            Booking.Status.CANCELLED,
            user=guest,
            note="Anulowanie przez gościa",
        )

        def _notify_host():
            from apps.messaging.ws_notify import notify_booking_status_changed

            notify_booking_status_changed(
                user_id=booking.listing.host.user_id,
                booking_id=booking.id,
                new_status=Booking.Status.CANCELLED,
            )

        transaction.on_commit(_notify_host)
        return booking

    @classmethod
    @transaction.atomic
    def update_status_by_host(cls, booking: Booking, host, new_status: str) -> Booking:
        if booking.listing.host.user_id != host.id:
            raise PermissionDenied()
        if booking.status != Booking.Status.PENDING:
            raise ValidationError({"status": ["Tylko rezerwacja w statusie „oczekująca” może być zmieniona."]})
        if new_status not in (Booking.Status.CONFIRMED, Booking.Status.REJECTED):
            raise ValidationError({"status": ["Dozwolone: confirmed lub rejected."]})
        note = "Akceptacja przez hosta" if new_status == Booking.Status.CONFIRMED else "Odrzucenie przez hosta"
        cls.append_status(booking, new_status, user=host, note=note)
        if new_status == Booking.Status.CONFIRMED:

            def _queue_confirmation():
                from apps.bookings.tasks import send_booking_confirmation_email

                send_booking_confirmation_email.delay(str(booking.id))

            transaction.on_commit(_queue_confirmation)

        def _notify_host():
            from apps.messaging.ws_notify import notify_booking_status_changed

            notify_booking_status_changed(
                user_id=booking.listing.host.user_id,
                booking_id=booking.id,
                new_status=new_status,
            )

        transaction.on_commit(_notify_host)
        return booking


def calendar_busy_ranges(listing_id) -> list[dict]:
    rows = (
        Booking.objects.filter(
            listing_id=listing_id,
            deleted_at__isnull=True,
            status__in=AvailabilityService.BLOCKING_STATUSES,
        )
        .values("check_in", "check_out")
        .order_by("check_in")
    )
    return [{"check_in": r["check_in"].isoformat(), "check_out": r["check_out"].isoformat()} for r in rows]


def calendar_blocked_dates(listing_id) -> list[str]:
    dates = BlockedDate.objects.filter(
        listing_id=listing_id,
        deleted_at__isnull=True,
    ).values_list("date", flat=True)
    return sorted(d.isoformat() for d in dates)


def calendar_booked_dates(listing_id) -> list[str]:
    """Wszystkie noce niedostępne: blokady hosta + zajęte zakresy rezerwacji."""
    dates = set(calendar_blocked_dates(listing_id))
    for r in calendar_busy_ranges(listing_id):
        d = date.fromisoformat(r["check_in"])
        end = date.fromisoformat(r["check_out"])
        while d < end:
            dates.add(d.isoformat())
            d += timedelta(days=1)
    return sorted(dates)
