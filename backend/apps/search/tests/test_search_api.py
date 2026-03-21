import pytest

from apps.listings.models import Listing
from apps.listings.services import ListingService


def _approved_listing(user_host, *, title, lat, lng, city, price="100.00", guests=2):
    listing = ListingService.create_listing(
        user_host,
        listing_data={
            "title": title,
            "description": "x",
            "base_price": price,
            "currency": "PLN",
            "booking_mode": "instant",
            "status": Listing.Status.APPROVED,
            "max_guests": guests,
        },
        location_data={"lat": lat, "lng": lng, "city": city, "region": "test", "country": "PL"},
    )
    return listing


@pytest.mark.django_db
def test_search_geo_order_and_map(api_client, user_host):
    _approved_listing(user_host, title="Domek A", lat=52.23, lng=21.01, city="Warszawa", price="300.00")
    _approved_listing(user_host, title="Domek B", lat=52.25, lng=21.02, city="Warszawa", price="100.00")
    _approved_listing(user_host, title="Domek C", lat=54.35, lng=18.65, city="Gdańsk", price="200.00")

    r = api_client.get(
        "/api/v1/search/",
        {"latitude": "52.23", "longitude": "21.01", "radius_km": "80", "ordering": "recommended"},
    )
    assert r.status_code == 200
    body = r.json()
    # 80 km od Warszawy — Gdańsk poza zasięgiem
    assert body["meta"]["count"] == 2
    titles = [x["title"] for x in body["data"]]
    assert titles[0] == "Domek A"

    m = api_client.get(
        "/api/v1/search/map/",
        {"latitude": "52.23", "longitude": "21.01", "radius_km": "80"},
    )
    assert m.status_code == 200
    pins = m.json()["data"]
    assert len(pins) == 2
    assert all("lat" in p and "lng" in p and "price" in p for p in pins)


@pytest.mark.django_db
def test_search_travel_mode_family_orders_by_guests(api_client, user_host):
    _approved_listing(
        user_host, title="Mały", lat=50.0, lng=19.0, city="Kraków", guests=2
    )
    _approved_listing(
        user_host, title="Duży", lat=50.01, lng=19.01, city="Kraków", guests=8
    )

    r = api_client.get(
        "/api/v1/search/",
        {
            "location": "Kraków",
            "travel_mode": "family",
            "ordering": "recommended",
        },
    )
    assert r.status_code == 200
    titles = [x["title"] for x in r.json()["data"]]
    assert titles[0] == "Duży"


@pytest.mark.django_db
def test_search_invalid_travel_mode(api_client, user_host):
    _approved_listing(user_host, title="X", lat=50.0, lng=19.0, city="X")
    r = api_client.get("/api/v1/search/", {"travel_mode": "nope"})
    assert r.status_code == 400


@pytest.mark.django_db
def test_search_cursor_pagination(api_client, user_host):
    for i in range(5):
        _approved_listing(
            user_host,
            title=f"L{i}",
            lat=50.0 + i * 0.01,
            lng=19.0,
            city="TestCity",
        )
    r1 = api_client.get("/api/v1/search/", {"location": "TestCity", "page_size": "2"})
    assert r1.status_code == 200
    assert len(r1.json()["data"]) == 2
    nxt = r1.json()["meta"]["next"]
    assert nxt
    r2 = api_client.get(nxt)
    assert r2.status_code == 200
    assert len(r2.json()["data"]) == 2
