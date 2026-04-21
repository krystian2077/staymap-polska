"""
Odświeża CollectionListing dla kolekcji Discovery.

Dla każdej kolekcji:
  1. Próbuje dopasować oferty przez tag lokalizacyjny (near_lake, near_mountains, ...).
  2. Jeśli mniej niż `--min-per-collection` wyników — uzupełnia najwyżej ocenianymi
     zatwierdzonymi ofertami (fallback bez tagu).

Użycie:
  python manage.py refresh_discovery
  python manage.py refresh_discovery --limit 8 --min-per-collection 2
"""
from __future__ import annotations

from django.core.management.base import BaseCommand

from apps.discovery.models import CollectionListing, DiscoveryCollection
from apps.discovery.services import DiscoveryFeedService
from apps.listings.models import Listing

COLLECTION_TAG_MAP = {
    "nad-woda": "near_lake",
    "gory-weekend": "near_mountains",
    "nad-morzem": "near_sea",
    "cisza-i-przyroda": "near_protected_area",
}


class Command(BaseCommand):
    help = "Odświeża CollectionListing dla kolekcji Discovery (z fallbackiem gdy brak tagów)."

    def add_arguments(self, parser):
        parser.add_argument("--limit", type=int, default=8, help="Max ofert na kolekcję")
        parser.add_argument(
            "--min-per-collection",
            type=int,
            default=2,
            help="Minimalna liczba ofert — poniżej uruchamia fallback",
        )
        parser.add_argument(
            "--dry-run", action="store_true", help="Pokaż co zostałoby przypisane, nie zapisuj"
        )

    def handle(self, *args, **options):
        limit = options["limit"]
        min_count = options["min_per_collection"]
        dry_run = options["dry_run"]

        approved_qs = (
            Listing.objects.filter(status=Listing.Status.APPROVED, deleted_at__isnull=True)
            .select_related("location")
            .order_by("-average_rating", "-review_count", "-created_at")
        )

        fallback_pool = list(approved_qs[:50])

        collections = DiscoveryCollection.objects.filter(is_active=True, deleted_at__isnull=True).order_by(
            "sort_order", "title"
        )

        if not collections.exists():
            self.stdout.write(self.style.WARNING("Brak aktywnych kolekcji w bazie."))
            return

        for col in collections:
            tag = COLLECTION_TAG_MAP.get(col.slug)
            listings: list[Listing] = []

            if tag:
                tagged = list(approved_qs.filter(**{f"location__{tag}": True})[:limit])
                listings = tagged

            if len(listings) < min_count:
                existing_ids = {l.id for l in listings}
                for lst in fallback_pool:
                    if lst.id not in existing_ids:
                        listings.append(lst)
                    if len(listings) >= limit:
                        break

            self.stdout.write(
                f"  [{col.slug}] «{col.title}» → {len(listings)} ofert"
                f"{' (fallback)' if tag and len(list(approved_qs.filter(**{f'location__{tag}': True})[:1])) < min_count else ''}"
            )

            if not dry_run:
                CollectionListing.objects.filter(collection=col).delete()
                for idx, lst in enumerate(listings[:limit]):
                    CollectionListing.objects.create(collection=col, listing=lst, sort_order=idx)

        if not dry_run:
            DiscoveryFeedService.invalidate_homepage_cache()
            self.stdout.write(self.style.SUCCESS("Cache discovery wyczyszczony."))
            self.stdout.write(self.style.SUCCESS("Gotowe — kolekcje zaktualizowane."))
        else:
            self.stdout.write(self.style.WARNING("Dry-run — nic nie zapisano."))
