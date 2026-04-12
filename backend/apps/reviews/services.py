from __future__ import annotations

from datetime import datetime, timedelta

from django.db import transaction
from django.utils import timezone

from rest_framework.exceptions import PermissionDenied, ValidationError

from apps.bookings.models import Booking

from .models import Review


BLIND_PERIOD_DAYS = 0


class ReviewService:
    @classmethod
    @transaction.atomic
    def create_review(cls, booking: Booking, author, data: dict) -> Review:
        if booking.listing.host.user_id != author.id and booking.guest_id != author.id:
            raise PermissionDenied()
        role = data.get("reviewer_role") or Review.ReviewerRole.GUEST
        if role not in (Review.ReviewerRole.GUEST, Review.ReviewerRole.HOST):
            raise ValidationError({"reviewer_role": ["Nieprawidłowa rola."]})
        if role == Review.ReviewerRole.GUEST:
            if booking.guest_id != author.id:
                raise PermissionDenied()
        if role == Review.ReviewerRole.HOST:
            if booking.listing.host.user_id != author.id:
                raise PermissionDenied()

        if Review.objects.filter(
            booking=booking,
            reviewer_role=role,
            deleted_at__isnull=True,
        ).exists():
            raise ValidationError({"detail": ["Recenzja dla tej roli już istnieje."]})

        today = timezone.localdate()
        if role == Review.ReviewerRole.GUEST and today < booking.check_out:
            raise ValidationError({"detail": ["Recenzję można dodać po dniu wymeldowania."]})

        if booking.status not in (
            Booking.Status.CONFIRMED,
            Booking.Status.COMPLETED,
        ):
            raise ValidationError({"detail": ["Nieprawidłowy status rezerwacji do recenzji."]})

        release_at = timezone.make_aware(
            datetime.combine(
                booking.check_out + timedelta(days=BLIND_PERIOD_DAYS),
                datetime.min.time(),
            )
        )
        review = Review.objects.create(
            listing=booking.listing,
            booking=booking,
            author=author,
            reviewer_role=role,
            author_display_first=author.first_name,
            author_display_last=author.last_name,
            blind_release_at=release_at,
            is_public=True,
            is_blind_review_released=True,
            overall_rating=data["overall_rating"],
            title=data.get("title", ""),
            content=data["content"],
            subscores=data.get("subscores"),
        )
        from .tasks import release_blind_review_task

        release_blind_review_task.apply_async(args=[str(review.pk)], eta=release_at)
        cls._check_early_release(booking)
        return review

    @classmethod
    def _check_early_release(cls, booking: Booking):
        has_guest = Review.objects.filter(
            booking=booking,
            reviewer_role=Review.ReviewerRole.GUEST,
            deleted_at__isnull=True,
        ).exists()
        has_host = Review.objects.filter(
            booking=booking,
            reviewer_role=Review.ReviewerRole.HOST,
            deleted_at__isnull=True,
        ).exists()
        if has_guest and has_host:
            for r in Review.objects.filter(booking=booking, deleted_at__isnull=True):
                cls.release_review(r)

    @classmethod
    @transaction.atomic
    def release_review(cls, review: Review):
        if review.is_blind_review_released:
            return
        Review.objects.filter(pk=review.pk).update(
            is_public=True,
            is_blind_review_released=True,
        )
        from .tasks import update_listing_average_rating

        update_listing_average_rating.delay(str(review.listing_id))

    @classmethod
    def add_host_response(cls, review: Review, host, text: str) -> Review:
        if review.listing.host.user_id != host.id:
            raise PermissionDenied()
        if review.reviewer_role != Review.ReviewerRole.GUEST:
            raise ValidationError({"detail": ["Odpowiedź tylko do recenzji gościa."]})
        if not review.is_public:
            raise ValidationError({"detail": ["Recenzja jeszcze niewidoczna."]})
        if review.host_response:
            raise ValidationError({"detail": ["Odpowiedź już została dodana."]})
        review.host_response = text[:2000]
        review.save(update_fields=["host_response", "updated_at"])
        return review
