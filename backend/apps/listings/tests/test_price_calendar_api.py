import calendar
from datetime import date
from decimal import Decimal

import pytest
from django.contrib.gis.geos import Point

from apps.host.models import HostProfile
from apps.listings.models import Listing, ListingLocation


@pytest.fixture
def approved_listing_price_cal(db, user_host):
    hp, _ = HostProfile.objects.get_or_create(user=user_host, defaults={})
    listing = Listing.objects.create(
        host=hp,
        title="Kalendarz cen",
        slug="test-price-calendar-listing",
        description="",
        base_price=Decimal("220.00"),
        cleaning_fee=Decimal("0"),
        currency="PLN",
        status=Listing.Status.APPROVED,
        max_guests=4,
    )
    ListingLocation.objects.create(
        listing=listing,
        point=Point(21.0, 52.0, srid=4326),
        city="Warszawa",
        region="mazowieckie",
        country="PL",
    )
    return listing


@pytest.mark.django_db
def test_price_calendar_default_month(api_client, approved_listing_price_cal):
    listing = approved_listing_price_cal
    res = api_client.get(f"/api/v1/listings/{listing.slug}/price-calendar/")
    assert res.status_code == 200
    body = res.json()
    assert body["data"]["currency"] == "PLN"
    assert "days" in body["data"]
    today = date.today()
    _, last = calendar.monthrange(today.year, today.month)
    assert len(body["data"]["days"]) == last


@pytest.mark.django_db
def test_price_calendar_custom_range(api_client, approved_listing_price_cal):
    listing = approved_listing_price_cal
    res = api_client.get(
        f"/api/v1/listings/{listing.slug}/price-calendar/",
        {"from": "2030-06-01", "to": "2030-06-05"},
    )
    assert res.status_code == 200
    days = res.json()["data"]["days"]
    assert len(days) == 5
    assert days[0]["date"] == "2030-06-01"


@pytest.mark.django_db
def test_price_calendar_invalid_date(api_client, approved_listing_price_cal):
    listing = approved_listing_price_cal
    res = api_client.get(
        f"/api/v1/listings/{listing.slug}/price-calendar/",
        {"from": "not-a-date", "to": "2030-01-02"},
    )
    assert res.status_code == 400
