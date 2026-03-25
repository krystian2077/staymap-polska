"""
Podmienia zdjęcia wszystkich zatwierdzonych ofert na JPEG z puli Unsplash (bez kasowania ofert).

Użycie:
  python manage.py refresh_unsplash_covers

Po wcześniejszym seed_mass_listings z samym PIL — uruchom tę komendę zamiast ponownego --clear.
"""
from __future__ import annotations

from django.core.files.base import ContentFile
from django.core.management.base import BaseCommand
from django.db import transaction

from apps.common.demo_unsplash_photos import get_cached_unsplash_jpeg_bytes, mass_seed_unsplash_url_pool
from apps.common.management.commands.seed_mass_listings import _rebuild_discovery_collections_mass
from apps.discovery.services import DiscoveryFeedService
from apps.listings.models import Listing, ListingImage
from apps.search.services import invalidate_search_cache


class Command(BaseCommand):
    help = "Usuwa zdjęcia ofert i zapisuje okładki z rotacyjnej puli Unsplash."

    def add_arguments(self, parser):
        parser.add_argument(
            "--batch",
            type=int,
            default=100,
            help="Ile ofert przetwarzać w jednej transakcji (domyślnie 100).",
        )

    def handle(self, *args, **options):
        batch = max(1, int(options["batch"]))
        pool = mass_seed_unsplash_url_pool()
        if not pool:
            self.stderr.write("Brak puli URL-i Unsplash.")
            return

        self.stdout.write(f"Pobieranie {len(pool)} obrazów do cache…")
        for u in pool:
            get_cached_unsplash_jpeg_bytes(u)

        qs = Listing.objects.filter(status=Listing.Status.APPROVED).order_by("id")
        total = qs.count()
        self.stdout.write(f"Ofert do aktualizacji: {total}")

        processed = 0
        ids = list(qs.values_list("id", flat=True))
        for start in range(0, len(ids), batch):
            chunk_ids = ids[start : start + batch]
            with transaction.atomic():
                ListingImage.all_objects.filter(listing_id__in=chunk_ids).delete()
                for lid in chunk_ids:
                    listing = Listing.objects.get(pk=lid)
                    h = hash(str(lid))
                    u = pool[h % len(pool)]
                    blob = get_cached_unsplash_jpeg_bytes(u)
                    if not blob:
                        self.stderr.write(f"  Pominięto {listing.slug} (brak danych JPEG).")
                        continue
                    img = ListingImage(
                        listing=listing,
                        is_cover=True,
                        sort_order=0,
                        alt_text=f"{listing.title[:80]} — okładka",
                    )
                    cf = ContentFile(blob, name=f"{listing.slug[:180]}-cover.jpg")
                    img.image.save(cf.name, cf, save=False)
                    img.save()
                    processed += 1
            self.stdout.write(f"  … {min(start + batch, total)}/{total}")
            self.stdout.flush()

        _rebuild_discovery_collections_mass(self)

        invalidate_search_cache()
        DiscoveryFeedService.invalidate_homepage_cache()
        self.stdout.write(self.style.SUCCESS(f"Gotowe. Zaktualizowano zdjęcia u {processed} ofert. Cache wyczyszczony."))
