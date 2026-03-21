import logging

from celery import shared_task
from django.utils import timezone

logger = logging.getLogger(__name__)


@shared_task(name="reviews.send_review_reminder_emails")
def send_review_reminder_emails():
    """Przypomnienie e-mailem: zakończony pobyt, brak recenzji gościa (okno 7 dni po wyjeździe)."""
    from datetime import timedelta

    from apps.bookings.models import Booking
    from apps.common.email_service import EmailService

    from .models import Review

    today = timezone.localdate()
    window_start = today - timedelta(days=7)
    qs = (
        Booking.objects.filter(
            deleted_at__isnull=True,
            status=Booking.Status.CONFIRMED,
            check_out__lt=today,
            check_out__gte=window_start,
            review_reminder_sent=False,
        )
        .select_related("guest", "listing")
    )
    n = 0
    for booking in qs:
        has_guest = Review.objects.filter(
            booking=booking,
            reviewer_role=Review.ReviewerRole.GUEST,
            deleted_at__isnull=True,
        ).exists()
        if has_guest:
            Booking.objects.filter(pk=booking.pk).update(
                review_reminder_sent=True,
            )
            continue
        try:
            EmailService.review_reminder_guest(booking)
        except Exception:
            logger.exception("review reminder email failed booking=%s", booking.pk)
            continue
        Booking.objects.filter(pk=booking.pk).update(
            review_reminder_sent=True,
        )
        n += 1
    return n


@shared_task(name="reviews.release_blind_review", bind=True, max_retries=3)
def release_blind_review_task(self, review_pk: str):
    from .models import Review
    from .services import ReviewService

    review = Review.objects.filter(pk=review_pk, deleted_at__isnull=True).select_related("booking").first()
    if not review:
        return {"status": "missing"}
    if review.is_blind_review_released:
        return {"status": "already_released"}
    booking = review.booking
    if booking:
        roles = set(
            Review.objects.filter(booking=booking, deleted_at__isnull=True).values_list(
                "reviewer_role", flat=True
            )
        )
        if Review.ReviewerRole.GUEST in roles and Review.ReviewerRole.HOST in roles:
            for r in Review.objects.filter(booking=booking, deleted_at__isnull=True):
                if not r.is_blind_review_released:
                    ReviewService.release_review(r)
            return {"status": "released_pair"}
    ReviewService.release_review(review)
    return {"status": "released"}


@shared_task(name="reviews.update_listing_average_rating", bind=True, max_retries=3)
def update_listing_average_rating(self, listing_id: str):
    from django.db.models import Avg, Count

    from apps.listings.models import Listing

    from .models import Review

    agg = (
        Review.objects.filter(
            listing_id=listing_id,
            deleted_at__isnull=True,
            reviewer_role=Review.ReviewerRole.GUEST,
            is_public=True,
        )
        .aggregate(avg=Avg("overall_rating"), c=Count("id"))
    )
    Listing.objects.filter(pk=listing_id).update(
        average_rating=agg["avg"],
        review_count=agg["c"] or 0,
    )
