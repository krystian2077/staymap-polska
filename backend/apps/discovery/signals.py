from django.db.models.signals import post_delete, post_save
from django.dispatch import receiver

from apps.discovery.models import CollectionListing, DiscoveryCollection
from apps.discovery.services import DiscoveryFeedService


@receiver(post_save, sender=DiscoveryCollection)
@receiver(post_delete, sender=DiscoveryCollection)
@receiver(post_save, sender=CollectionListing)
@receiver(post_delete, sender=CollectionListing)
def invalidate_discovery_homepage_cache(**kwargs):
    DiscoveryFeedService.invalidate_homepage_cache()
