import pytest

from apps.listings.models import Listing


@pytest.mark.django_db
def test_create_and_soft_delete_listing(api_client, user_host):
    api_client.force_authenticate(user=user_host)
    payload = {
        "title": "Test domek",
        "description": "Opis",
        "base_price": "199.00",
        "currency": "PLN",
        "booking_mode": "instant",
        "status": "draft",
        "max_guests": 4,
        "location": {
            "lat": 49.3,
            "lng": 19.95,
            "city": "Zakopane",
            "region": "małopolskie",
            "country": "PL",
        },
    }
    cre = api_client.post("/api/v1/listings/", payload, format="json")
    assert cre.status_code == 201
    slug = cre.json()["data"]["slug"]

    dele = api_client.delete(f"/api/v1/listings/{slug}/")
    assert dele.status_code == 200
    assert dele.json()["data"]["slug"] == slug
    assert dele.json()["data"]["deleted_at"]

    assert not Listing.objects.filter(slug=slug).exists()
    assert Listing.all_objects.filter(slug=slug).exists()
