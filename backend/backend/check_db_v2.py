import os
import django
from django.conf import settings

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.testing')
try:
    django.setup()
except Exception as e:
    print(f"Django setup error: {e}")
    exit(1)

from apps.listings.models import Listing

try:
    count = Listing.objects.count()
    print(f"Total listings count: {count}")
    
    statuses = Listing.objects.values('status').annotate(count=django.db.models.Count('id'))
    print(f"Statuses distribution: {list(statuses)}")
    
    if count > 0:
        first = Listing.objects.first()
        print(f"First listing ID: {first.id}, Slug: {first.slug}, Status: {first.status}, Title: {first.title}")
    else:
        print("NO LISTINGS FOUND IN DB")
        
except Exception as e:
    print(f"Error querying DB: {e}")
