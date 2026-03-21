from decimal import Decimal

import pytest
from django.contrib.gis.geos import Point

from apps.host.models import HostProfile
from apps.listings.models import Listing, ListingLocation


@pytest.mark.django_db
def test_moderation_queue_requires_admin(api_client, user_host):
    api_client.force_authenticate(user=user_host)
    res = api_client.get("/api/v1/admin/moderation/listings/")
    assert res.status_code == 403


@pytest.mark.django_db
def test_moderation_approve_and_reject(api_client, admin_user, user_host):
    profile = HostProfile.objects.get(user=user_host)
    pending = Listing.objects.create(
        host=profile,
        title="Do moderacji",
        slug="do-moderacji-test-api",
        description="Opis",
        base_price=Decimal("120"),
        cleaning_fee=Decimal("0"),
        currency="PLN",
        status=Listing.Status.PENDING,
        max_guests=2,
        booking_mode=Listing.BookingMode.INSTANT,
    )
    ListingLocation.objects.create(
        listing=pending,
        point=Point(21.0, 52.0, srid=4326),
        city="Warszawa",
        region="mazowieckie",
        country="PL",
    )
    api_client.force_authenticate(user=admin_user)
    q = api_client.get("/api/v1/admin/moderation/listings/")
    assert q.status_code == 200
    assert any(str(pending.id) == item["id"] for item in q.json()["data"])

    res_ok = api_client.post(
        f"/api/v1/admin/moderation/listings/{pending.id}/approve/",
        {},
        format="json",
    )
    assert res_ok.status_code == 200
    assert res_ok.json()["data"]["status"] == Listing.Status.APPROVED

    pending2 = Listing.objects.create(
        host=profile,
        title="Do odrzucenia",
        slug="do-odrzucenia-test-api",
        description="Opis",
        base_price=Decimal("130"),
        cleaning_fee=Decimal("0"),
        currency="PLN",
        status=Listing.Status.PENDING,
        max_guests=2,
        booking_mode=Listing.BookingMode.INSTANT,
    )
    ListingLocation.objects.create(
        listing=pending2,
        point=Point(21.01, 52.01, srid=4326),
        city="Warszawa",
        region="mazowieckie",
        country="PL",
    )
    res_rej = api_client.post(
        f"/api/v1/admin/moderation/listings/{pending2.id}/reject/",
        {"comment": "Zdjęcia nie spełniają wymagań."},
        format="json",
    )
    assert res_rej.status_code == 200
    assert res_rej.json()["data"]["status"] == Listing.Status.REJECTED
    pending2.refresh_from_db()
    assert "wymagań" in pending2.moderation_comment
