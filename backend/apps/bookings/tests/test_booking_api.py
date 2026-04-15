"""Testy API rezerwacji (quote, create, me, retrieve, destroy)."""
from __future__ import annotations

from datetime import date, timedelta
from decimal import Decimal
from unittest.mock import patch

import pytest
from django.core.cache import cache

from apps.bookings.models import Booking
from apps.listings.models import Listing, ListingLocation


@pytest.fixture
def approved_listing_instant(db, user_host):
    from django.contrib.gis.geos import Point

    from apps.host.models import HostProfile

    profile, _ = HostProfile.objects.get_or_create(user=user_host)
    listing = Listing.objects.create(
        host=profile,
        title="API quote",
        slug="api-quote-test",
        description="x",
        base_price=Decimal("100"),
        cleaning_fee=Decimal("0"),
        currency="PLN",
        status=Listing.Status.APPROVED,
        max_guests=4,
        booking_mode=Listing.BookingMode.INSTANT,
    )
    ListingLocation.objects.create(
        listing=listing,
        point=Point(19.94, 49.30, srid=4326),
        city="Zakopane",
        region="małopolskie",
        country="PL",
    )
    return listing


@pytest.fixture
def approved_listing_request(db, user_host):
    from django.contrib.gis.geos import Point

    from apps.host.models import HostProfile

    profile, _ = HostProfile.objects.get_or_create(user=user_host)
    listing = Listing.objects.create(
        host=profile,
        title="Request mode",
        slug="request-mode-test",
        description="x",
        base_price=Decimal("200"),
        cleaning_fee=Decimal("0"),
        currency="PLN",
        status=Listing.Status.APPROVED,
        max_guests=4,
        booking_mode=Listing.BookingMode.REQUEST,
    )
    ListingLocation.objects.create(
        listing=listing,
        point=Point(19.94, 49.30, srid=4326),
        city="Zakopane",
        region="małopolskie",
        country="PL",
    )
    return listing


@pytest.mark.django_db
def test_bookings_quote_requires_auth(api_client):
    res = api_client.post(
        "/api/v1/bookings/quote/",
        {
            "listing_id": "00000000-0000-0000-0000-000000000001",
            "check_in": str(date.today() + timedelta(days=10)),
            "check_out": str(date.today() + timedelta(days=12)),
        },
        format="json",
    )
    assert res.status_code == 401


@pytest.mark.django_db
def test_bookings_quote_not_listable_returns_400(api_client, guest_user, approved_listing_instant):
    approved_listing_instant.status = Listing.Status.DRAFT
    approved_listing_instant.save(update_fields=["status", "updated_at"])
    api_client.force_authenticate(user=guest_user)
    ci = date.today() + timedelta(days=20)
    co = ci + timedelta(days=2)
    res = api_client.post(
        "/api/v1/bookings/quote/",
        {
            "listing_id": str(approved_listing_instant.id),
            "check_in": str(ci),
            "check_out": str(co),
            "guests": 2,
        },
        format="json",
    )
    assert res.status_code == 400
    assert res.json()["error"]["code"] == "LISTING_NOT_BOOKABLE"


@pytest.mark.django_db
def test_bookings_quote_success_and_cache(api_client, guest_user, approved_listing_instant):
    cache.clear()
    api_client.force_authenticate(user=guest_user)
    ci = date.today() + timedelta(days=25)
    co = ci + timedelta(days=3)
    payload = {
        "listing_id": str(approved_listing_instant.id),
        "check_in": str(ci),
        "check_out": str(co),
        "guests": 3,
        "adults": 2,
        "children": 1,
        "pets": 2,
    }
    r1 = api_client.post("/api/v1/bookings/quote/", payload, format="json")
    assert r1.status_code == 200
    assert "data" in r1.json()
    assert r1.json()["data"]["total"] is not None

    with patch("apps.bookings.views.PricingService.calculate") as mock_calc:
        r2 = api_client.post("/api/v1/bookings/quote/", payload, format="json")
        assert r2.status_code == 200
        mock_calc.assert_not_called()


@pytest.mark.django_db
def test_bookings_quote_validation_invalid_dates(api_client, guest_user, approved_listing_instant):
    api_client.force_authenticate(user=guest_user)
    ci = date.today() + timedelta(days=30)
    res = api_client.post(
        "/api/v1/bookings/quote/",
        {
            "listing_id": str(approved_listing_instant.id),
            "check_in": str(ci),
            "check_out": str(ci),
            "guests": 1,
        },
        format="json",
    )
    assert res.status_code == 400


@pytest.mark.django_db
def test_bookings_create_instant_confirmed(api_client, guest_user, approved_listing_instant):
    api_client.force_authenticate(user=guest_user)
    ci = date.today() + timedelta(days=40)
    co = ci + timedelta(days=2)
    res = api_client.post(
        "/api/v1/bookings/",
        {
            "listing_id": str(approved_listing_instant.id),
            "check_in": str(ci),
            "check_out": str(co),
            "guests_count": 2,
            "adults": 2,
            "children": 0,
        },
        format="json",
    )
    assert res.status_code == 201
    body = res.json()["data"]
    assert body["status"] == Booking.Status.CONFIRMED
    assert body["listing"] is not None


@pytest.mark.django_db
def test_bookings_create_request_mode_pending(api_client, guest_user, approved_listing_request):
    api_client.force_authenticate(user=guest_user)
    ci = date.today() + timedelta(days=45)
    co = ci + timedelta(days=2)
    res = api_client.post(
        "/api/v1/bookings/",
        {
            "listing_id": str(approved_listing_request.id),
            "check_in": str(ci),
            "check_out": str(co),
            "guests_count": 2,
            "adults": 2,
            "children": 0,
        },
        format="json",
    )
    assert res.status_code == 201
    assert res.json()["data"]["status"] == Booking.Status.PENDING


@pytest.mark.django_db
def test_bookings_create_guests_mismatch(api_client, guest_user, approved_listing_instant):
    api_client.force_authenticate(user=guest_user)
    ci = date.today() + timedelta(days=50)
    co = ci + timedelta(days=2)
    res = api_client.post(
        "/api/v1/bookings/",
        {
            "listing_id": str(approved_listing_instant.id),
            "check_in": str(ci),
            "check_out": str(co),
            "guests_count": 3,
            "adults": 1,
            "children": 1,
        },
        format="json",
    )
    assert res.status_code == 400


@pytest.mark.django_db
def test_bookings_create_rejects_guests_above_listing_max(api_client, guest_user, approved_listing_instant):
    api_client.force_authenticate(user=guest_user)
    ci = date.today() + timedelta(days=52)
    co = ci + timedelta(days=2)
    res = api_client.post(
        "/api/v1/bookings/",
        {
            "listing_id": str(approved_listing_instant.id),
            "check_in": str(ci),
            "check_out": str(co),
            "guests_count": approved_listing_instant.max_guests + 1,
            "adults": approved_listing_instant.max_guests + 1,
            "children": 0,
        },
        format="json",
    )
    assert res.status_code == 400


@pytest.mark.django_db
def test_bookings_create_persists_cost_split(api_client, guest_user, approved_listing_instant):
    api_client.force_authenticate(user=guest_user)
    ci = date.today() + timedelta(days=53)
    co = ci + timedelta(days=2)
    res = api_client.post(
        "/api/v1/bookings/",
        {
            "listing_id": str(approved_listing_instant.id),
            "check_in": str(ci),
            "check_out": str(co),
            "guests_count": 2,
            "adults": 2,
            "children": 0,
            "pets": 1,
            "cost_split": {"people": 2},
        },
        format="json",
    )
    assert res.status_code == 201
    split = res.json()["data"]["pricing_breakdown"].get("cost_split")
    assert split is not None
    assert split["people"] == 2
    assert res.json()["data"]["cost_split"]["people"] == 2


@pytest.mark.django_db
def test_bookings_create_applies_percentage_surcharges(api_client, guest_user, approved_listing_instant):
    api_client.force_authenticate(user=guest_user)
    ci = date.today() + timedelta(days=53)
    co = ci + timedelta(days=2)
    res = api_client.post(
        "/api/v1/bookings/",
        {
            "listing_id": str(approved_listing_instant.id),
            "check_in": str(ci),
            "check_out": str(co),
            "guests_count": 3,
            "adults": 2,
            "children": 1,
            "pets": 2,
        },
        format="json",
    )
    assert res.status_code == 201
    breakdown = res.json()["data"]["pricing_breakdown"]
    assert Decimal(str(breakdown["adults_surcharge_total"])) > Decimal("0")
    assert Decimal(str(breakdown["children_surcharge_total"])) > Decimal("0")


@pytest.mark.django_db
def test_bookings_create_rejects_cost_split_above_listing_max(api_client, guest_user, approved_listing_instant):
    api_client.force_authenticate(user=guest_user)
    ci = date.today() + timedelta(days=54)
    co = ci + timedelta(days=2)
    res = api_client.post(
        "/api/v1/bookings/",
        {
            "listing_id": str(approved_listing_instant.id),
            "check_in": str(ci),
            "check_out": str(co),
            "guests_count": 2,
            "adults": 2,
            "children": 0,
            "cost_split": {"people": approved_listing_instant.max_guests + 1},
        },
        format="json",
    )
    assert res.status_code == 400


@pytest.mark.django_db
def test_bookings_me_and_retrieve(api_client, guest_user, approved_listing_instant):
    api_client.force_authenticate(user=guest_user)
    ci = date.today() + timedelta(days=55)
    co = ci + timedelta(days=2)
    created = api_client.post(
        "/api/v1/bookings/",
        {
            "listing_id": str(approved_listing_instant.id),
            "check_in": str(ci),
            "check_out": str(co),
            "guests_count": 1,
            "adults": 1,
        },
        format="json",
    )
    bid = created.json()["data"]["id"]

    me = api_client.get("/api/v1/bookings/me/")
    assert me.status_code == 200
    assert len(me.json()["data"]) >= 1

    one = api_client.get(f"/api/v1/bookings/{bid}/")
    assert one.status_code == 200
    assert one.json()["data"]["id"] == bid


@pytest.mark.django_db
def test_bookings_retrieve_other_user_404(api_client, guest_user, django_user_model, approved_listing_instant):
    other = django_user_model.objects.create_user(
        email="other@test.pl",
        password="x" * 12,
        first_name="O",
        last_name="T",
    )
    api_client.force_authenticate(user=guest_user)
    ci = date.today() + timedelta(days=60)
    co = ci + timedelta(days=2)
    bid = api_client.post(
        "/api/v1/bookings/",
        {
            "listing_id": str(approved_listing_instant.id),
            "check_in": str(ci),
            "check_out": str(co),
            "guests_count": 1,
            "adults": 1,
        },
        format="json",
    ).json()["data"]["id"]

    api_client.force_authenticate(user=other)
    assert api_client.get(f"/api/v1/bookings/{bid}/").status_code == 404


@pytest.mark.django_db
def test_bookings_cancel_destroy(api_client, guest_user, approved_listing_instant):
    api_client.force_authenticate(user=guest_user)
    ci = date.today() + timedelta(days=70)
    co = ci + timedelta(days=2)
    bid = api_client.post(
        "/api/v1/bookings/",
        {
            "listing_id": str(approved_listing_instant.id),
            "check_in": str(ci),
            "check_out": str(co),
            "guests_count": 1,
            "adults": 1,
        },
        format="json",
    ).json()["data"]["id"]

    res = api_client.delete(f"/api/v1/bookings/{bid}/")
    assert res.status_code == 200
    assert res.json()["data"]["status"] == Booking.Status.CANCELLED
