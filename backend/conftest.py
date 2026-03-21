from decimal import Decimal

import pytest
from rest_framework.test import APIClient


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def user_host(db):
    from django.contrib.auth import get_user_model

    User = get_user_model()
    user = User.objects.create_user(
        email="host@test.pl",
        password="secret12345",
        first_name="Jan",
        last_name="Host",
    )
    user.is_host = True
    user.save(update_fields=["is_host", "updated_at"])
    from apps.host.models import HostProfile

    HostProfile.objects.get_or_create(user=user)
    return user


@pytest.fixture
def guest_user(db):
    from django.contrib.auth import get_user_model

    User = get_user_model()
    return User.objects.create_user(
        email="guest@test.pl",
        password="secret12345",
        first_name="Gosia",
        last_name="Gosc",
    )


@pytest.fixture
def admin_user(db):
    from django.contrib.auth import get_user_model

    User = get_user_model()
    user = User.objects.create_user(
        email="admin@test.pl",
        password="secret12345",
        first_name="Ada",
        last_name="Admin",
    )
    user.is_admin = True
    user.is_staff = True
    user.save(update_fields=["is_admin", "is_staff", "updated_at"])
    return user


@pytest.fixture
def approved_listing(db, user_host):
    from django.contrib.gis.geos import Point

    from apps.host.models import HostProfile
    from apps.listings.models import Listing, ListingLocation

    profile, _ = HostProfile.objects.get_or_create(user=user_host)
    listing = Listing.objects.create(
        host=profile,
        title="Oferta testowa API",
        slug="oferta-test-api",
        description="Opis",
        base_price=Decimal("250"),
        cleaning_fee=Decimal("50"),
        currency="PLN",
        status=Listing.Status.APPROVED,
        max_guests=4,
        booking_mode=Listing.BookingMode.INSTANT,
    )
    ListingLocation.objects.create(
        listing=listing,
        point=Point(19.94, 49.30, srid=4326),
        city="Zakopane",
        region="małopolskie",
        country="PL",
    )
    return listing
