from decimal import Decimal
from unittest.mock import patch

import pytest
from django.contrib.gis.geos import Point

from apps.host.models import HostProfile
from apps.listings.models import Listing, ListingLocation


@pytest.fixture
def approved_listing_nearby(db, user_host):
    hp, _ = HostProfile.objects.get_or_create(user=user_host, defaults={})
    listing = Listing.objects.create(
        host=hp,
        title="Test POI",
        slug="test-poi-listing",
        description="Opis",
        base_price=Decimal("200.00"),
        status=Listing.Status.APPROVED,
        max_guests=4,
        amenities=[{"id": "wifi", "name": "Wi‑Fi", "icon": "wifi", "category": "tech"}],
        destination_score_cache=None,
    )
    ListingLocation.objects.create(
        listing=listing,
        point=Point(21.7668, 54.0378, srid=4326),
        city="Giżycko",
        region="warmińsko-mazurskie",
        country="PL",
    )
    return listing


@patch("apps.location_intelligence.services.fetch_overpass_elements")
@pytest.mark.django_db
def test_nearby_returns_grouped_poi(mock_fetch, api_client, approved_listing_nearby):
    listing = approved_listing_nearby
    mock_fetch.return_value = (
        [
            {
                "type": "node",
                "id": 9001,
                "lat": 54.038,
                "lon": 21.767,
                "tags": {"amenity": "restaurant", "name": "Rest demo"},
            },
            {
                "type": "node",
                "id": 9002,
                "lat": 54.039,
                "lon": 21.768,
                "tags": {"leisure": "park", "name": "Park demo"},
            },
        ],
        None,
    )

    res = api_client.get(f"/api/v1/listings/{listing.slug}/nearby/")
    assert res.status_code == 200
    body = res.json()
    assert body["data"]["source"] == "live"
    eat = body["data"]["groups"]["eat_drink"]
    assert len(eat) == 1
    assert eat[0]["name"] == "Rest demo"
    parks = body["data"]["groups"]["nature_leisure"]
    assert len(parks) == 1
    assert parks[0]["kind"] == "park"

    listing.refresh_from_db()
    assert listing.destination_score_cache is not None
    assert "romantic" in listing.destination_score_cache


@pytest.mark.django_db
def test_retrieve_fills_null_destination_scores(api_client, approved_listing_nearby):
    listing = approved_listing_nearby
    res = api_client.get(f"/api/v1/listings/{listing.slug}/")
    assert res.status_code == 200
    scores = res.json()["data"].get("destination_score_cache")
    assert scores is not None
    assert scores.get("nature") is not None
