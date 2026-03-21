from django.db.models import Avg, Count, Q
from django.db.models.signals import post_delete, post_save
from django.dispatch import receiver

from apps.listings.models import Listing

from .models import Review


def _refresh_listing_review_stats(listing_id):
    agg = (
        Review.objects.filter(
            listing_id=listing_id,
            deleted_at__isnull=True,
            reviewer_role=Review.ReviewerRole.GUEST,
            is_public=True,
        )
        .aggregate(avg=Avg("overall_rating"), c=Count("id"))
    )
    avg = agg["avg"]
    c = agg["c"] or 0
    Listing.objects.filter(pk=listing_id).update(
        average_rating=avg,
        review_count=c,
    )


@receiver([post_save, post_delete], sender=Review)
def refresh_listing_review_stats(sender, instance, **kwargs):
    _refresh_listing_review_stats(instance.listing_id)
