from datetime import date, timedelta
from decimal import Decimal
from unittest.mock import patch

import pytest
from rest_framework.exceptions import NotFound, PermissionDenied, ValidationError

from apps.bookings.models import BlockedDate, Booking
from apps.bookings.services import (
    AvailabilityService,
    BookingService,
    calendar_blocked_dates,
    calendar_booked_dates,
    calendar_busy_ranges,
)
from apps.common.exceptions import BookingNotCancellableError, BookingUnavailableError
from apps.listings.models import Listing


@pytest.mark.django_db
class TestAvailabilityService:
    def test_ranges_overlap(self):
        a = date(2025, 6, 1)
        b = date(2025, 6, 10)
        assert AvailabilityService.ranges_overlap(a, b, date(2025, 6, 5), date(2025, 6, 15))
        assert not AvailabilityService.ranges_overlap(a, b, b, date(2025, 6, 20))
        assert not AvailabilityService.ranges_overlap(date(2025, 6, 20), date(2025, 6, 25), a, b)

    def test_has_booking_conflict_exclude_self(self, approved_listing, guest_user):
        check_in = date.today() + timedelta(days=100)
        check_out = check_in + timedelta(days=3)
        b = Booking.objects.create(
            listing=approved_listing,
            guest=guest_user,
            check_in=check_in,
            check_out=check_out,
            guests_count=2,
            status=Booking.Status.CONFIRMED,
            pricing_breakdown={"total": "100"},
            final_amount=Decimal("100"),
            currency="PLN",
        )
        assert not AvailabilityService.has_booking_conflict(
            approved_listing.id, check_in, check_out, exclude_booking_id=b.id
        )

    def test_blocked_nights_and_assert_available(self, approved_listing, guest_user):
        check_in = date.today() + timedelta(days=120)
        check_out = check_in + timedelta(days=4)
        BlockedDate.objects.create(listing=approved_listing, date=check_in + timedelta(days=1))
        nights = AvailabilityService.blocked_nights(approved_listing.id, check_in, check_out)
        assert len(nights) == 1
        with pytest.raises(BookingUnavailableError):
            AvailabilityService.assert_available(approved_listing, check_in, check_out)


@pytest.mark.django_db
class TestCalendarHelpers:
    def test_calendar_busy_and_booked(self, approved_listing, guest_user):
        check_in = date.today() + timedelta(days=130)
        check_out = check_in + timedelta(days=2)
        Booking.objects.create(
            listing=approved_listing,
            guest=guest_user,
            check_in=check_in,
            check_out=check_out,
            guests_count=2,
            status=Booking.Status.CONFIRMED,
            pricing_breakdown={"total": "1"},
            final_amount=Decimal("1"),
            currency="PLN",
        )
        busy = calendar_busy_ranges(approved_listing.id)
        assert len(busy) == 1
        booked = calendar_booked_dates(approved_listing.id)
        assert str(check_in) in booked or any(check_in.isoformat() in x for x in booked)

    def test_calendar_blocked_dates_only(self, approved_listing):
        d = date.today() + timedelta(days=200)
        BlockedDate.objects.create(listing=approved_listing, date=d)
        assert d.isoformat() in calendar_blocked_dates(approved_listing.id)


@pytest.mark.django_db
class TestBookingService:
    def test_overlapping_booking_raises(self, approved_listing, guest_user):
        check_in = date.today() + timedelta(days=30)
        check_out = check_in + timedelta(days=5)
        Booking.objects.create(
            listing=approved_listing,
            guest=guest_user,
            check_in=check_in,
            check_out=check_out,
            guests_count=2,
            status=Booking.Status.CONFIRMED,
            pricing_breakdown={"total": "100"},
            final_amount=Decimal("100"),
            currency="PLN",
        )
        with pytest.raises(BookingUnavailableError):
            BookingService.create_booking(
                listing_id=approved_listing.id,
                guest=guest_user,
                check_in=check_in + timedelta(days=1),
                check_out=check_out + timedelta(days=1),
                guests_count=2,
            )

    def test_create_instant_confirmed_without_payment_gateway(self, approved_listing, guest_user):
        check_in = date.today() + timedelta(days=60)
        check_out = check_in + timedelta(days=2)
        b = BookingService.create_booking(
            listing_id=approved_listing.id,
            guest=guest_user,
            check_in=check_in,
            check_out=check_out,
            guests_count=2,
        )
        assert b.status == Booking.Status.CONFIRMED
        assert b.status_history.count() >= 1

    def test_create_listing_not_found(self, guest_user):
        from uuid import uuid4

        with pytest.raises(NotFound):
            BookingService.create_booking(
                listing_id=uuid4(),
                guest=guest_user,
                check_in=date.today() + timedelta(days=300),
                check_out=date.today() + timedelta(days=302),
                guests_count=2,
            )

    def test_create_listing_not_approved(self, approved_listing, guest_user):
        approved_listing.status = Listing.Status.DRAFT
        approved_listing.save(update_fields=["status", "updated_at"])
        with pytest.raises(ValidationError):
            BookingService.create_booking(
                listing_id=approved_listing.id,
                guest=guest_user,
                check_in=date.today() + timedelta(days=310),
                check_out=date.today() + timedelta(days=312),
                guests_count=2,
            )

    def test_create_adults_mismatch(self, approved_listing, guest_user):
        with pytest.raises(ValidationError):
            BookingService.create_booking(
                listing_id=approved_listing.id,
                guest=guest_user,
                check_in=date.today() + timedelta(days=320),
                check_out=date.today() + timedelta(days=322),
                guests_count=3,
                adults=1,
                children=0,
            )

    def test_create_rejects_guests_above_listing_max(self, approved_listing, guest_user):
        with pytest.raises(ValidationError):
            BookingService.create_booking(
                listing_id=approved_listing.id,
                guest=guest_user,
                check_in=date.today() + timedelta(days=321),
                check_out=date.today() + timedelta(days=323),
                guests_count=approved_listing.max_guests + 1,
                adults=approved_listing.max_guests + 1,
                children=0,
            )

    def test_create_persists_cost_split(self, approved_listing, guest_user):
        b = BookingService.create_booking(
            listing_id=approved_listing.id,
            guest=guest_user,
            check_in=date.today() + timedelta(days=322),
            check_out=date.today() + timedelta(days=324),
            guests_count=2,
            adults=2,
            children=0,
            cost_split={"people": 2},
        )
        split = b.pricing_breakdown.get("cost_split")
        assert split is not None
        assert split["people"] == 2

    def test_create_applies_adult_and_child_surcharges(self, approved_listing, guest_user):
        b = BookingService.create_booking(
            listing_id=approved_listing.id,
            guest=guest_user,
            check_in=date.today() + timedelta(days=323),
            check_out=date.today() + timedelta(days=325),
            guests_count=3,
            adults=2,
            children=1,
            pets=2,
        )
        assert Decimal(str(b.pricing_breakdown.get("adults_surcharge_total", "0"))) > Decimal("0")
        assert Decimal(str(b.pricing_breakdown.get("children_surcharge_total", "0"))) > Decimal("0")

    def test_append_status_noop_same_status(self, approved_listing, guest_user):
        ci = date.today() + timedelta(days=330)
        co = ci + timedelta(days=2)
        b = BookingService.create_booking(
            listing_id=approved_listing.id,
            guest=guest_user,
            check_in=ci,
            check_out=co,
            guests_count=1,
        )
        n = b.status_history.count()
        BookingService.append_status(b, b.status, user=guest_user, note="noop")
        assert b.status_history.count() == n

    def test_cancel_wrong_guest(self, approved_listing, guest_user, django_user_model):
        other = django_user_model.objects.create_user(
            email="noguest@test.pl", password="x" * 12, first_name="N", last_name="G"
        )
        ci = date.today() + timedelta(days=340)
        co = ci + timedelta(days=2)
        b = BookingService.create_booking(
            listing_id=approved_listing.id,
            guest=guest_user,
            check_in=ci,
            check_out=co,
            guests_count=1,
        )
        with pytest.raises(PermissionDenied):
            BookingService.cancel_by_guest(b, other)

    def test_cancel_not_allowed_status(self, approved_listing, guest_user):
        ci = date.today() + timedelta(days=350)
        co = ci + timedelta(days=2)
        b = BookingService.create_booking(
            listing_id=approved_listing.id,
            guest=guest_user,
            check_in=ci,
            check_out=co,
            guests_count=1,
        )
        b.status = Booking.Status.CANCELLED
        b.save(update_fields=["status", "updated_at"])
        with pytest.raises(BookingNotCancellableError):
            BookingService.cancel_by_guest(b, guest_user)

    def test_host_confirm_pending(self, approved_listing, guest_user, user_host):
        approved_listing.booking_mode = Listing.BookingMode.REQUEST
        approved_listing.save(update_fields=["booking_mode", "updated_at"])
        ci = date.today() + timedelta(days=360)
        co = ci + timedelta(days=2)
        b = BookingService.create_booking(
            listing_id=approved_listing.id,
            guest=guest_user,
            check_in=ci,
            check_out=co,
            guests_count=1,
        )
        assert b.status == Booking.Status.PENDING
        with patch("apps.bookings.services.transaction.on_commit", lambda cb: cb()):
            b2 = BookingService.update_status_by_host(b, user_host, Booking.Status.CONFIRMED)
        assert b2.status == Booking.Status.CONFIRMED

    def test_host_update_wrong_status(self, approved_listing, guest_user, user_host):
        ci = date.today() + timedelta(days=370)
        co = ci + timedelta(days=2)
        b = BookingService.create_booking(
            listing_id=approved_listing.id,
            guest=guest_user,
            check_in=ci,
            check_out=co,
            guests_count=1,
        )
        with pytest.raises(ValidationError):
            BookingService.update_status_by_host(b, user_host, Booking.Status.CONFIRMED)


