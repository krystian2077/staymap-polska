from apps.discovery.models import DiscoveryCollection
from apps.discovery.services import DiscoveryFeedService

deleted_count, _ = DiscoveryCollection.objects.filter(slug='nad-jeziorem').delete()
DiscoveryFeedService.invalidate_homepage_cache()

if deleted_count > 0:
    print(f"Successfully deleted collection 'nad-jeziorem'.")
else:
    print("Collection 'nad-jeziorem' not found or already deleted.")
