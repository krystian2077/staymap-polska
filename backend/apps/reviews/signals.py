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


def _recalculate_subscores(listing_id):
    reviews = Review.objects.filter(
        listing_id=listing_id,
        is_public=True,
        reviewer_role=Review.ReviewerRole.GUEST,
        subscores__isnull=False,
    )
    keys = ["cleanliness", "location", "communication", "accuracy"]
    agg = {}
    for key in keys:
        vals = [
            r.subscores[key]
            for r in reviews
            if isinstance(r.subscores, dict) and key in r.subscores
        ]
        if vals:
            agg[key] = round(sum(vals) / len(vals), 2)
    if agg:
        Listing.objects.filter(id=listing_id).update(average_subscores=agg)
    else:
        Listing.objects.filter(id=listing_id).update(average_subscores=None)


@receiver([post_save, post_delete], sender=Review)
def refresh_listing_review_stats(sender, instance, **kwargs):
    _refresh_listing_review_stats(instance.listing_id)
    _recalculate_subscores(instance.listing_id)
