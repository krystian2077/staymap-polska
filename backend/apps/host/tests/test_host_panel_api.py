"""Testy panelu gospodarza: statystyki, recenzje, blokowanie dat, pole guest w rezerwacjach."""

from datetime import date, timedelta
from decimal import Decimal
from io import BytesIO

import pytest
from django.contrib.gis.geos import Point
from django.core.files.uploadedfile import SimpleUploadedFile
from PIL import Image

from apps.bookings.models import BlockedDate, Booking
from apps.host.models import HostProfile
from apps.listings.models import Listing, ListingLocation
from apps.reviews.models import Review


@pytest.mark.django_db
def test_host_stats_403_for_guest(api_client, guest_user):
    api_client.force_authenticate(user=guest_user)
    res = api_client.get("/api/v1/host/stats/")
    assert res.status_code == 403


@pytest.mark.django_db
def test_host_stats_200_shape(api_client, user_host):
    api_client.force_authenticate(user=user_host)
    res = api_client.get("/api/v1/host/stats/")
    assert res.status_code == 200
    data = res.json()["data"]
    assert "revenue_this_month" in data
    assert "revenue_last_month" in data
    assert "occupancy_percent" in data
    assert "avg_rating" in data
    assert "bookings_count" in data
    assert "bookings_pending" in data
    assert "new_messages" in data
    assert "reviews_pending_response" in data
    assert isinstance(data["revenue_this_month"], (int, float))


@pytest.mark.django_db
def test_host_reviews_403_for_guest(api_client, guest_user):
    api_client.force_authenticate(user=guest_user)
    res = api_client.get("/api/v1/host/reviews/")
    assert res.status_code == 403


@pytest.mark.django_db
def test_host_reviews_200_empty_meta(api_client, user_host):
    api_client.force_authenticate(user=user_host)
    res = api_client.get("/api/v1/host/reviews/")
    assert res.status_code == 200
    body = res.json()
    assert body["data"] == []
    meta = body["meta"]
    assert "count" in meta and "avg_rating" in meta and "pending_response_count" in meta
    assert meta["count"] == 0


@pytest.mark.django_db
def test_host_reviews_lists_guest_review(api_client, user_host, guest_user, approved_listing):
    check_in = date.today() - timedelta(days=30)
    check_out = check_in + timedelta(days=3)
    booking = Booking.objects.create(
        listing=approved_listing,
        guest=guest_user,
        check_in=check_in,
        check_out=check_out,
        guests_count=2,
        status=Booking.Status.COMPLETED,
        pricing_breakdown={"total": "100"},
        final_amount=Decimal("100"),
        currency="PLN",
    )
    Review.objects.create(
        listing=approved_listing,
        booking=booking,
        author=guest_user,
        reviewer_role=Review.ReviewerRole.GUEST,
        overall_rating=Decimal("4.5"),
        content="Świetny pobyt!",
        is_public=True,
        is_blind_review_released=True,
    )

    api_client.force_authenticate(user=user_host)
    res = api_client.get("/api/v1/host/reviews/")
    assert res.status_code == 200
    body = res.json()
    assert len(body["data"]) == 1
    row = body["data"][0]
    assert row["content"] == "Świetny pobyt!"
    assert str(approved_listing.id) == row["listing_id"]
    assert body["meta"]["count"] >= 1


@pytest.mark.django_db
def test_block_dates_creates_rows(api_client, user_host, approved_listing):
    api_client.force_authenticate(user=user_host)
    d1 = (date.today() + timedelta(days=60)).isoformat()
    d2 = (date.today() + timedelta(days=61)).isoformat()
    res = api_client.post(
        f"/api/v1/host/listings/{approved_listing.id}/block-dates/",
        {"dates": [d1, d2], "reason": "Konserwacja"},
        format="json",
    )
    assert res.status_code == 200
    assert d1 in res.json()["data"]["dates"]
    assert BlockedDate.objects.filter(listing=approved_listing).count() == 2


@pytest.mark.django_db
def test_block_dates_400_when_dates_not_list(api_client, user_host, approved_listing):
    api_client.force_authenticate(user=user_host)
    res = api_client.post(
        f"/api/v1/host/listings/{approved_listing.id}/block-dates/",
        {"dates": "2025-01-01"},
        format="json",
    )
    assert res.status_code == 400
    assert res.json()["error"]["code"] == "VALIDATION_ERROR"


@pytest.mark.django_db
def test_block_dates_revives_soft_deleted(api_client, user_host, approved_listing):
    d = date.today() + timedelta(days=90)
    existing = BlockedDate.all_objects.create(listing=approved_listing, date=d)
    existing.soft_delete()
    api_client.force_authenticate(user=user_host)
    res = api_client.post(
        f"/api/v1/host/listings/{approved_listing.id}/block-dates/",
        {"dates": [d.isoformat()]},
        format="json",
    )
    assert res.status_code == 200
    existing.refresh_from_db()
    assert existing.deleted_at is None


@pytest.mark.django_db
def test_host_bookings_include_guest(api_client, user_host, guest_user, approved_listing):
    check_in = date.today() + timedelta(days=5)
    check_out = check_in + timedelta(days=2)
    Booking.objects.create(
        listing=approved_listing,
        guest=guest_user,
        check_in=check_in,
        check_out=check_out,
        guests_count=1,
        status=Booking.Status.PENDING,
        pricing_breakdown={"total": "50"},
        final_amount=Decimal("50"),
        currency="PLN",
    )
    api_client.force_authenticate(user=user_host)
    res = api_client.get("/api/v1/host/bookings/")
    assert res.status_code == 200
    rows = res.json()["data"]
    assert len(rows) >= 1
    g = rows[0]["guest"]
    assert g["first_name"] == guest_user.first_name
    assert g["last_name"] == guest_user.last_name
    assert str(guest_user.id) == g["id"]


@pytest.mark.django_db
def test_host_listing_not_owned_returns_404_for_block_dates(api_client, user_host, guest_user):
    """Inny host — inna oferta; user_host nie może blokować cudzej listingu."""
    from django.contrib.auth import get_user_model

    User = get_user_model()
    other = User.objects.create_user(
        email="otherhost@test.pl",
        password="secret12345",
        first_name="Inny",
        last_name="Host",
    )
    other.is_host = True
    other.save(update_fields=["is_host", "updated_at"])
    profile, _ = HostProfile.objects.get_or_create(user=other)
    listing = Listing.objects.create(
        host=profile,
        title="Cudza oferta",
        slug="cudza-oferta-block-test",
        description="x",
        base_price=Decimal("50"),
        cleaning_fee=Decimal("0"),
        currency="PLN",
        status=Listing.Status.APPROVED,
        max_guests=2,
        booking_mode=Listing.BookingMode.INSTANT,
    )
    ListingLocation.objects.create(
        listing=listing,
        point=Point(19.0, 50.0, srid=4326),
        city="Warszawa",
        region="mazowieckie",
        country="PL",
    )

    api_client.force_authenticate(user=user_host)
    res = api_client.post(
        f"/api/v1/host/listings/{listing.id}/block-dates/",
        {"dates": [date.today().isoformat()]},
        format="json",
    )
    assert res.status_code == 404
