"""Statystyki i pomocnicze operacje dla panelu gospodarza."""

from __future__ import annotations

from datetime import date
from decimal import Decimal

from django.db.models import Sum

from apps.bookings.models import Booking
from apps.listings.models import Listing
from apps.reviews.models import Review


def host_stats_payload(user) -> dict:
    """Zwraca słownik zgodny z oczekiwaniami frontendu (HostStats)."""
    today = date.today()

    start_this = today.replace(day=1)
    if start_this.month == 1:
        start_prev = start_this.replace(year=start_this.year - 1, month=12, day=1)
    else:
        start_prev = start_this.replace(month=start_this.month - 1, day=1)

    def month_end(d: date) -> date:
        if d.month == 12:
            return date(d.year + 1, 1, 1)
        return date(d.year, d.month + 1, 1)

    end_this = month_end(start_this)

    base = Booking.objects.filter(deleted_at__isnull=True, listing__host__user=user)

    def revenue_range(start: date, end: date) -> float:
        s = (
            base.filter(
                status__in=(Booking.Status.CONFIRMED, Booking.Status.COMPLETED),
                created_at__date__gte=start,
                created_at__date__lt=end,
            ).aggregate(x=Sum("final_amount"))["x"]
            or Decimal("0")
        )
        return float(s)

    revenue_this = revenue_range(start_this, end_this)
    revenue_prev = revenue_range(start_prev, start_this)

    listings = Listing.objects.filter(host__user=user, deleted_at__isnull=True)
    approved = listings.filter(status=Listing.Status.APPROVED)
    ratings = [float(x) for x in approved.values_list("average_rating", flat=True) if x is not None]
    avg_rating = sum(ratings) / len(ratings) if ratings else 0.0

    days_in_month = (end_this - start_this).days or 30
    month_bookings = base.filter(
        check_in__gte=start_this,
        check_in__lt=end_this,
        status__in=(
            Booking.Status.CONFIRMED,
            Booking.Status.COMPLETED,
            Booking.Status.PENDING,
        ),
    ).count()
    denom = max(1, approved.count() * days_in_month)
    occupancy = min(100, int((month_bookings / denom) * 100))

    bookings_count = base.count()
    bookings_pending = base.filter(status=Booking.Status.PENDING).count()

    reviews_no_reply = Review.objects.filter(
        deleted_at__isnull=True,
        listing__host__user=user,
        reviewer_role=Review.ReviewerRole.GUEST,
        is_public=True,
        host_response="",
    ).count()

    return {
        "revenue_this_month": revenue_this,
        "revenue_last_month": revenue_prev,
        "occupancy_percent": occupancy,
        "avg_rating": round(avg_rating, 2),
        "bookings_count": bookings_count,
        "bookings_pending": bookings_pending,
        "new_messages": 0,
        "reviews_pending_response": reviews_no_reply,
    }
