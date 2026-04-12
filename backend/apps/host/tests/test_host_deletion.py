import pytest
from decimal import Decimal
from django.contrib.gis.geos import Point
from apps.host.models import HostProfile
from apps.listings.models import Listing, ListingLocation

@pytest.mark.django_db
def test_host_can_soft_delete_own_listing(api_client, user_host):
    profile = HostProfile.objects.get(user=user_host)
    listing = Listing.objects.create(
        host=profile,
        title="Oferta do usunięcia",
        slug="oferta-do-usuniecia",
        description="Opis",
        base_price=Decimal("100"),
        cleaning_fee=Decimal("0"),
        currency="PLN",
        status=Listing.Status.APPROVED,
        max_guests=2,
    )
    ListingLocation.objects.create(
        listing=listing,
        point=Point(19.0, 50.0, srid=4326),
        city="Warszawa",
        region="mazowieckie",
        country="PL",
    )
    
    api_client.force_authenticate(user=user_host)
    url = f"/api/v1/host/listings/{listing.id}/"
    res = api_client.delete(url)
    
    assert res.status_code == 204
    listing.refresh_from_db()
    assert listing.deleted_at is not None
    
    # Sprawdzenie czy nie jest widoczna w liście
    res_list = api_client.get("/api/v1/host/listings/")
    assert all(item["id"] != str(listing.id) for item in res_list.json()["data"])

@pytest.mark.django_db
def test_host_cannot_delete_other_host_listing(api_client, user_host, guest_user):
    # guest_user musi mieć profil hosta, aby test był miarodajny dla uprawnień
    from apps.host.models import HostProfile
    guest_user.is_host = True
    guest_user.save()
    profile2, _ = HostProfile.objects.get_or_create(user=guest_user)
    
    listing = Listing.objects.create(
        host=profile2,
        title="Obca oferta",
        slug="obca-oferta",
        base_price=Decimal("100"),
        status=Listing.Status.APPROVED,
    )
    
    api_client.force_authenticate(user=user_host)
    url = f"/api/v1/host/listings/{listing.id}/"
    res = api_client.delete(url)
    
    assert res.status_code == 404
    listing.refresh_from_db()
    assert listing.deleted_at is None
