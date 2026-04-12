import pytest
from decimal import Decimal
from io import BytesIO

from django.contrib.gis.geos import Point
from django.core.files.uploadedfile import SimpleUploadedFile

from PIL import Image

from apps.host.models import HostProfile
from apps.listings.models import Listing, ListingImage, ListingLocation


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
def test_host_listings_auto_publish_pending_status(api_client, user_host):
    profile = HostProfile.objects.get(user=user_host)
    listing = Listing.objects.create(
        host=profile,
        title="Oferta oczekująca",
        slug="oferta-oczekujaca-host-test",
        description="To jest opis oferty, który ma ponad dwadzieścia znaków.",
        base_price=Decimal("100"),
        cleaning_fee=Decimal("0"),
        currency="PLN",
        status=Listing.Status.PENDING,
        amenities=["wifi"],
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
    res = api_client.get("/api/v1/host/listings/")
    assert res.status_code == 200
    data = res.json()["data"]
    target = next(item for item in data if item["id"] == str(listing.id))
    assert target["status"] == Listing.Status.APPROVED
    listing.refresh_from_db()
    assert listing.status == Listing.Status.APPROVED


@pytest.mark.django_db
def test_submit_for_review_publishes_listing(api_client, user_host):
    profile = HostProfile.objects.get(user=user_host)
    listing = Listing.objects.create(
        host=profile,
        title="Szkic do publikacji",
        slug="szkic-do-moderacji-host-test",
        description="To jest opis oferty, który ma ponad dwadzieścia znaków.",
        base_price=Decimal("100"),
        cleaning_fee=Decimal("0"),
        currency="PLN",
        status=Listing.Status.DRAFT,
        amenities=["wifi"],
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

    img = Image.new("RGB", (100, 100), color="blue")
    buf = BytesIO()
    img.save(buf, format="JPEG")
    buf.seek(0)
    image_file = SimpleUploadedFile("cover.jpg", buf.read(), content_type="image/jpeg")
    ListingImage.objects.create(listing=listing, image=image_file, is_cover=True, sort_order=1)

    api_client.force_authenticate(user=user_host)
    res = api_client.post(
        f"/api/v1/host/listings/{listing.id}/submit-for-review/",
        {},
        format="json",
    )
    assert res.status_code == 200
    assert res.json()["data"]["status"] == Listing.Status.APPROVED
    listing.refresh_from_db()
    assert listing.status == Listing.Status.APPROVED


@pytest.mark.django_db
def test_submit_for_review_requires_minimum_required_fields(api_client, user_host):
    profile = HostProfile.objects.get(user=user_host)
    user_host.first_name = ""
    user_host.last_name = ""
    user_host.save(update_fields=["first_name", "last_name", "updated_at"])

    listing = Listing.objects.create(
        host=profile,
        title="abc",
        slug="braki-do-publikacji-host-test",
        description="za krotki opis",
        base_price=Decimal("100"),
        cleaning_fee=Decimal("0"),
        currency="PLN",
        status=Listing.Status.DRAFT,
        amenities=[],
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
    res = api_client.post(f"/api/v1/host/listings/{listing.id}/submit-for-review/", {}, format="json")

    assert res.status_code == 400
    details = res.json()["error"]["details"]
    assert "host_name" in details
    assert "title" in details
    assert "description" in details
    assert "images" in details
    assert "amenities" in details


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


@pytest.mark.django_db
def test_host_listing_delete(api_client, user_host, approved_listing):
    api_client.force_authenticate(user=user_host)
    listing_id = approved_listing.id
    res = api_client.delete(f"/api/v1/host/listings/{listing_id}/")
    assert res.status_code == 200
    
    # Check that it's soft-deleted
    approved_listing.refresh_from_db()
    assert approved_listing.deleted_at is not None
    
    # Check that it's not in the regular list
    res_list = api_client.get("/api/v1/host/listings/")
    assert all(item["id"] != str(listing_id) for item in res_list.json()["data"])
    
    # Check audit log
    from apps.common.models import AuditLog
    assert AuditLog.objects.filter(action="listing.soft_delete", object_id=str(listing_id)).exists()
