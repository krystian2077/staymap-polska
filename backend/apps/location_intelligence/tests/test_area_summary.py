from decimal import Decimal

import pytest
from django.contrib.gis.geos import Point

from apps.host.models import HostProfile
from apps.listings.models import Listing, ListingLocation
from apps.location_intelligence.area_summary import compose_area_summary_body, ensure_area_summary
from apps.location_intelligence.models import AreaSummaryCache
from apps.location_intelligence.tasks import refresh_stale_area_summaries


@pytest.fixture
def approved_listing_area(db, user_host):
    hp, _ = HostProfile.objects.get_or_create(user=user_host, defaults={})
    listing = Listing.objects.create(
        host=hp,
        title="Test area",
        slug="test-area-summary",
        description="Opis",
        base_price=Decimal("100.00"),
        status=Listing.Status.APPROVED,
        max_guests=4,
        amenities=[],
    )
    ListingLocation.objects.create(
        listing=listing,
        point=Point(19.95, 49.30, srid=4326),
        city="Zakopane",
        region="małopolskie",
        country="PL",
        near_mountains=True,
        near_forest=True,
    )
    return listing


@pytest.mark.django_db
def test_compose_area_summary_includes_region_and_flags(approved_listing_area):
    listing = approved_listing_area
    text = compose_area_summary_body(
        listing,
        {
            "groups": {
                "eat_drink": [{"name": "A"}],
                "nature_leisure": [],
                "transport": [{"name": "B"}, {"name": "C"}, {"name": "D"}],
            }
        },
    )
    assert "Zakopane" in text
    assert "małopolskie" in text
    assert "górski" in text or "lasy" in text
    assert "OpenStreetMap" in text


@pytest.mark.django_db
def test_listing_detail_includes_area_summary(api_client, approved_listing_area):
    listing = approved_listing_area
    res = api_client.get(f"/api/v1/listings/{listing.slug}/")
    assert res.status_code == 200
    summary = res.json()["data"].get("area_summary")
    assert isinstance(summary, str)
    assert len(summary) > 20


@pytest.mark.django_db
def test_refresh_stale_area_summaries_task(approved_listing_area):
    listing = approved_listing_area
    n = refresh_stale_area_summaries()
    assert n >= 1
    row = AreaSummaryCache.objects.get(listing=listing)
    assert len(row.body) > 10
    ensure_area_summary(listing, force=False)
    row.refresh_from_db()
    assert row.body
