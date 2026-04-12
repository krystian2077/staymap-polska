import pytest
from decimal import Decimal
from django.contrib.gis.geos import Point
from django.core.files.uploadedfile import SimpleUploadedFile
from PIL import Image
from io import BytesIO

from apps.host.models import HostProfile
from apps.listings.models import Listing, ListingLocation, ListingImage

@pytest.mark.django_db
def test_listing_full_flow(api_client, user_host):
    """
    Pełny cykl: dodanie oferty z lokalizacją i zdjęciem, sprawdzenie widoczności zdjęcia, usunięcie oferty.
    """
    profile = HostProfile.objects.get(user=user_host)
    # Utwórz ofertę
    data = {
        "title": "Testowa oferta integracyjna",
        "description": "Opis testowy oferty z pełnym cyklem.",
        "base_price": "123.45",
        "cleaning_fee": "10.00",
        "currency": "PLN",
        "amenities": ["wifi", "kitchen", "parking"],
        "max_guests": 3,
        "booking_mode": "instant",
        "bedrooms": 2,
        "beds": 2,
        "bathrooms": 1,
        "location": {
            "lat": 52.2297,
            "lng": 21.0122,
            "city": "Warszawa",
            "region": "Mazowieckie",
            "country": "PL",
            "address_line": "ul. Testowa 1",
            "postal_code": "00-001"
        }
    }
    api_client.force_authenticate(user=user_host)
    res = api_client.post("/api/v1/host/listings/", data, format="json")
    assert res.status_code == 201
    listing_id = res.json()["data"]["id"]

    # Dodaj zdjęcie
    img = Image.new("RGB", (100, 100), color="red")
    buf = BytesIO()
    img.save(buf, format="JPEG")
    buf.seek(0)
    image_file = SimpleUploadedFile("test.jpg", buf.read(), content_type="image/jpeg")
    img_data = {"image": image_file, "is_cover": True}
    res_img = api_client.post(f"/api/v1/host/listings/{listing_id}/images/", img_data, format="multipart")
    assert res_img.status_code == 201
    img_url = res_img.json()["data"].get("display_url")
    assert img_url and img_url.startswith("/media/")

    # Pobierz szczegóły oferty i sprawdź zdjęcie
    res_det = api_client.get(f"/api/v1/host/listings/{listing_id}/")
    assert res_det.status_code == 200
    amenity_ids = [a.get("id") for a in res_det.json()["data"].get("amenities", [])]
    assert {"wifi", "kitchen", "parking"}.issubset(set(amenity_ids))
    images = res_det.json()["data"].get("images", [])
    assert any(i["display_url"].startswith("/media/") for i in images)

    # Usuń ofertę
    res_del = api_client.delete(f"/api/v1/host/listings/{listing_id}/")
    assert res_del.status_code == 204
    # Sprawdź, że nie ma jej na liście
    res_list = api_client.get("/api/v1/host/listings/")
    assert all(item["id"] != listing_id for item in res_list.json()["data"])
