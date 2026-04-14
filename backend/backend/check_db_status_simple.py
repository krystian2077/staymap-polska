import os
import django
import sys

# Dodajemy backend do ścieżki
sys.path.append(os.getcwd())
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.testing")

try:
    django.setup()
    from apps.listings.models import Listing
    from apps.search.services import PUBLIC_SEARCH_STATUSES
    
    count = Listing.objects.all().count()
    approved = Listing.objects.filter(status__in=PUBLIC_SEARCH_STATUSES).count()
    by_status = {}
    for s, name in Listing.Status.choices:
        by_status[name] = Listing.objects.filter(status=s).count()
        
    print(f"Total Listings: {count}")
    print(f"Approved Listings: {approved}")
    print(f"By Status: {by_status}")
    
    if approved == 0 and count > 0:
        print("\nWARNING: No approved listings found. Fallback should return 0 if no listings are approved.")
    elif count == 0:
        print("\nCRITICAL: Database is empty!")
        
except Exception as e:
    print(f"Error: {e}")
