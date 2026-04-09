"""
Usuwa wszystkie oferty (Listing) wraz z powiązanymi danymi:
  - ListingImage (zdjęcia + pliki mediów)
  - ListingLocation
  - NearbyPlaceCache, AreaSummaryCache
  - Booking, BlockedDate, BookingStatusHistory
  - Review
  - CollectionListing (powiązania z kolekcjami)
  - CompareSession (powiązania z sesjami porównania)

Nie usuwa użytkowników, hostów, kolekcji DiscoveryCollection ani sesji CompareSession —
tylko czyści powiązania z ofertami.
"""
from django.core.management.base import BaseCommand
from django.db import transaction


class Command(BaseCommand):
    help = "Usuwa wszystkie oferty (pinezki/miejsca) z bazy danych"

    def add_arguments(self, parser):
        parser.add_argument(
            "--yes",
            action="store_true",
            help="Pomiń potwierdzenie (tryb nieinteraktywny)",
        )

    def handle(self, *args, **options):
        if not options["yes"]:
            self.stdout.write(
                self.style.WARNING(
                    "UWAGA: Ta operacja usunie WSZYSTKIE oferty i powiązane dane!\n"
                    "Wpisz 'tak' aby kontynuować: "
                ),
                ending="",
            )
            self.stdout.flush()
            confirm = input()
            if confirm.strip().lower() not in ("tak", "yes", "y"):
                self.stdout.write(self.style.NOTICE("Anulowano."))
                return

        from apps.listings.models import Listing, ListingImage, ListingLocation

        with transaction.atomic():
            # Usuń pliki mediów (zdjęcia)
            images = ListingImage.objects.all()
            deleted_images = 0
            for img in images:
                if img.image:
                    try:
                        img.image.delete(save=False)
                    except Exception:
                        pass
                deleted_images += 1
            images.delete()
            self.stdout.write(f"  Usunięto zdjęć: {deleted_images}")

            # Usuń wszystkie oferty (kaskadowo usuwa lokalizacje, cache, rezerwacje, opinie itd.)
            count, details = Listing.objects.all().delete()
            self.stdout.write(f"  Usunięto rekordów łącznie: {count}")
            for model_name, num in sorted(details.items()):
                self.stdout.write(f"    {model_name}: {num}")

        self.stdout.write(self.style.SUCCESS("Gotowe — baza wyczyszczona z ofert."))
