from datetime import date
from decimal import Decimal

import pytest
from django.contrib.gis.geos import Point
from rest_framework.test import APIClient

from apps.host.models import HostProfile
from apps.listings.models import Listing, ListingLocation
from apps.pricing.models import SeasonalPricingRule


@pytest.fixture
def host_api(db, user_host):
    user_host.is_host = True
    user_host.save(update_fields=["is_host", "updated_at"])
    HostProfile.objects.get_or_create(user=user_host, defaults={})
    c = APIClient()
    c.force_authenticate(user=user_host)
    return c


@pytest.fixture
def host_listing(db, user_host):
    hp, _ = HostProfile.objects.get_or_create(user=user_host, defaults={})
    listing = Listing.objects.create(
        host=hp,
        title="Test cennik reguł",
        slug="test-host-pricing-rules",
        description="Opis testowy wystarczająco długi.",
        base_price=Decimal("200.00"),
        cleaning_fee=Decimal("0"),
        currency="PLN",
        status=Listing.Status.APPROVED,
        max_guests=4,
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
def test_pricing_rules_get(host_api, host_listing):
    res = host_api.get(f"/api/v1/host/listings/{host_listing.id}/pricing-rules/")
    assert res.status_code == 200
    body = res.json()["data"]
    assert "platform_reference" in body
    assert "seasonality_default" in body["platform_reference"]
    assert body["apply_pl_travel_peak_extras"] is True
    assert body["seasonal_rules"] == []


@pytest.mark.django_db
def test_pricing_rules_create_seasonal(host_api, host_listing):
    res = host_api.post(
        f"/api/v1/host/listings/{host_listing.id}/pricing-rules/",
        {
            "rule_type": "seasonal",
            "valid_from": "2030-07-01",
            "valid_to": "2030-07-31",
            "multiplier": "1.25",
            "priority": 2,
            "name": "Lipiec test",
        },
        format="json",
    )
    assert res.status_code == 201
    assert res.json()["data"]["rule_type"] == "seasonal"
    assert SeasonalPricingRule.objects.filter(listing=host_listing).count() == 1


@pytest.mark.django_db
def test_pricing_rules_delete(host_api, host_listing):
    r = SeasonalPricingRule.objects.create(
        listing=host_listing,
        name="x",
        valid_from=date(2030, 6, 1),
        valid_to=date(2030, 6, 30),
        multiplier=Decimal("1.1"),
    )
    res = host_api.delete(
        f"/api/v1/host/listings/{host_listing.id}/pricing-rules/{r.id}/?rule_type=seasonal"
    )
    assert res.status_code == 204
    r.refresh_from_db()
    assert r.deleted_at is not None
