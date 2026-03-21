import pytest
from decimal import Decimal

from django.contrib.gis.geos import Point

from apps.host.models import HostProfile
from apps.listings.models import Listing, ListingLocation


@pytest.mark.django_db
def test_host_listings_requires_host_role(api_client, guest_user):
    api_client.force_authenticate(user=guest_user)
    res = api_client.get("/api/v1/host/listings/")
    assert res.status_code == 403


@pytest.mark.django_db
def test_onboarding_start_sets_is_host(api_client, guest_user):
    api_client.force_authenticate(user=guest_user)
    res = api_client.post("/api/v1/host/onboarding/start/", {}, format="json")
    assert res.status_code == 200
    body = res.json()
    assert "data" in body
    assert body["meta"]["created"] in (True, False)
    guest_user.refresh_from_db()
    assert guest_user.is_host


@pytest.mark.django_db
def test_host_listings_lists_own_offers(api_client, user_host, approved_listing):
    api_client.force_authenticate(user=user_host)
    res = api_client.get("/api/v1/host/listings/")
    assert res.status_code == 200
    data = res.json()["data"]
    assert any(str(approved_listing.id) == item["id"] for item in data)


@pytest.mark.django_db
def test_submit_for_review_changes_status(api_client, user_host):
    profile = HostProfile.objects.get(user=user_host)
    listing = Listing.objects.create(
        host=profile,
        title="Szkic do moderacji",
        slug="szkic-do-moderacji-host-test",
        description="Opis",
        base_price=Decimal("100"),
        cleaning_fee=Decimal("0"),
        currency="PLN",
        status=Listing.Status.DRAFT,
        max_guests=2,
        booking_mode=Listing.BookingMode.INSTANT,
    )
    ListingLocation.objects.create(
        listing=listing,
        point=Point(19.0, 50.0, srid=4326),
        city="Kraków",
        region="małopolskie",
        country="PL",
    )
    api_client.force_authenticate(user=user_host)
    res = api_client.post(
        f"/api/v1/host/listings/{listing.id}/submit-for-review/",
        {},
        format="json",
    )
    assert res.status_code == 200
    assert res.json()["data"]["status"] == Listing.Status.PENDING
    listing.refresh_from_db()
    assert listing.status == Listing.Status.PENDING


@pytest.mark.django_db
def test_host_bookings_list(api_client, user_host, guest_user, approved_listing):
    from datetime import date, timedelta

    from apps.bookings.models import Booking

    check_in = date.today() + timedelta(days=10)
    check_out = check_in + timedelta(days=3)
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
    api_client.force_authenticate(user=user_host)
    res = api_client.get("/api/v1/host/bookings/")
    assert res.status_code == 200
    assert len(res.json()["data"]) >= 1
