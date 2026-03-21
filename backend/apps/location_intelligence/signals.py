from django.db.models.signals import post_delete, post_save
from django.dispatch import receiver

from apps.listings.models import Listing, ListingLocation
from apps.location_intelligence.models import AreaSummaryCache, NearbyPlaceCache


def _invalidate_listing_intel(listing_id):
    NearbyPlaceCache.objects.filter(listing_id=listing_id).delete()
    AreaSummaryCache.objects.filter(listing_id=listing_id).delete()
    Listing.objects.filter(pk=listing_id).update(destination_score_cache=None)


@receiver(post_save, sender=ListingLocation)
def listing_location_saved_invalidate_intel(sender, instance, **kwargs):
    _invalidate_listing_intel(instance.listing_id)


@receiver(post_delete, sender=ListingLocation)
def listing_location_deleted_invalidate_intel(sender, instance, **kwargs):
    _invalidate_listing_intel(instance.listing_id)
