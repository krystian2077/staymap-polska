import os
import django
import json

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.development")
django.setup()

from apps.search.services import SearchOrchestrator
from apps.listings.models import Listing

def debug_travel_mode(mode):
    print(f"\n--- Testing Travel Mode: {mode} ---")
    params = {"travel_mode": mode, "ordering": "recommended"}
    qs = SearchOrchestrator.build_queryset(params)
    count = qs.count()
    print(f"Total count for {mode}: {count}")
    
    if count > 0:
        first = qs.first()
        print(f"First result: {first.title} (ID: {first.id}, Score: {getattr(first, 'travel_score', 'N/A')})")
    else:
        # Check why it's 0
        all_count = Listing.objects.count()
        approved_count = Listing.objects.filter(status=Listing.Status.APPROVED).count()
        print(f"Total listings in DB: {all_count}")
        print(f"Total approved listings in DB: {approved_count}")
        
        # Check TravelModeRanker directly
        from apps.search.travel_modes import TravelModeRanker
        qs_all = Listing.objects.filter(status=Listing.Status.APPROVED)
        qs_ranked = TravelModeRanker.apply(qs_all, mode)
        print(f"Ranked count: {qs_ranked.count()}")

if __name__ == "__main__":
    for mode in ["romantic", "family", "pet"]:
        debug_travel_mode(mode)
