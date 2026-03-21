from datetime import date, timedelta
from decimal import Decimal

import pytest

from apps.bookings.models import Booking
from apps.reviews.models import Review


@pytest.mark.django_db
def test_create_guest_review_requires_auth(api_client, approved_listing, guest_user):
    check_in = date.today() - timedelta(days=14)
    check_out = date.today() - timedelta(days=7)
    booking = Booking.objects.create(
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
    res = api_client.post(
        "/api/v1/reviews/",
        {
            "booking_id": str(booking.id),
            "reviewer_role": "guest",
            "overall_rating": "4.5",
            "title": "Świetnie",
            "content": "Polecam pobyt.",
        },
        format="json",
    )
    assert res.status_code == 401


@pytest.mark.django_db
def test_create_guest_review_returns_201(api_client, approved_listing, guest_user):
    check_in = date.today() - timedelta(days=14)
    check_out = date.today() - timedelta(days=7)
    booking = Booking.objects.create(
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
    api_client.force_authenticate(user=guest_user)
    res = api_client.post(
        "/api/v1/reviews/",
        {
            "booking_id": str(booking.id),
            "reviewer_role": "guest",
            "overall_rating": "4.5",
            "title": "Świetnie",
            "content": "Polecam pobyt.",
        },
        format="json",
    )
    assert res.status_code == 201
    data = res.json()["data"]
    assert data["reviewer_role"] == Review.ReviewerRole.GUEST
    assert data["overall_rating"] == "4.5"


@pytest.mark.django_db
def test_listing_reviews_lists_public_guest_reviews(api_client, approved_listing, guest_user):
    """W środowisku testów Celery jest eager — task release może od razu ustawić is_public."""
    check_in = date.today() - timedelta(days=14)
    check_out = date.today() - timedelta(days=7)
    booking = Booking.objects.create(
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
    api_client.force_authenticate(user=guest_user)
    cre = api_client.post(
        "/api/v1/reviews/",
        {
            "booking_id": str(booking.id),
            "reviewer_role": "guest",
            "overall_rating": "5.0",
            "title": "Super",
            "content": "Rewelacja.",
        },
        format="json",
    )
    assert cre.status_code == 201
    api_client.force_authenticate(user=None)
    pub = api_client.get(f"/api/v1/listings/{approved_listing.slug}/reviews/")
    assert pub.status_code == 200
    rows = pub.json()["data"]
    assert len(rows) >= 1
    assert rows[0]["content"] == "Rewelacja."
