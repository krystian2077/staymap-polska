import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.base')
django.setup()

from apps.listings.models import Listing

count = Listing.objects.filter(status=Listing.Status.APPROVED).count()
print(f"Liczba zatwierdzonych ofert: {count}")

for m in ['romantic', 'family', 'pet', 'workation', 'slow', 'outdoor', 'lake', 'mountains', 'wellness']:
    # Test orchestratora
    from apps.search.services import SearchOrchestrator
    qs = SearchOrchestrator.build_queryset({"travel_mode": m})
    print(f"Tryb {m}: {qs.count()} ofert")

if count == 0:
    print("BRAK OFERT W BAZIE!")
else:
    listing = Listing.objects.filter(status=Listing.Status.APPROVED).first()
    print(f"Przykładowa oferta: {listing.title} (slug: {listing.slug})")
