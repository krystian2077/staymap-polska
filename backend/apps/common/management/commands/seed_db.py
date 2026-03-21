import random
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils.text import slugify

from django.contrib.gis.geos import Point

from apps.host.models import HostProfile
from apps.listings.models import Listing, ListingLocation

User = get_user_model()

SAMPLE_SPOTS = [
    ("Zakopane", "małopolskie", 49.2992, 19.9496),
    ("Giżycko", "warmińsko-mazurskie", 54.0378, 21.7668),
    ("Szklarska Poręba", "dolnośląskie", 50.8247, 15.5225),
    ("Hel", "pomorskie", 54.6067, 18.7933),
    ("Bieszczady", "podkarpackie", 49.25, 22.35),
]

TITLES = [
    "Domek z sauną nad jeziorem",
    "Górska chata z kominkiem",
    "Apartament z widokiem",
    "Leśna chatka — cisza i spokój",
    "Glamping nad rzeką",
]


class Command(BaseCommand):
    help = "Wypełnia bazę przykładowymi użytkownikami, hostami i ofertami (Etap 1)."

    def add_arguments(self, parser):
        parser.add_argument(
            "--fresh",
            action="store_true",
            help="Usuwa istniejące oferty i profile hostów (bez superuserów).",
        )
        parser.add_argument(
            "--count",
            type=int,
            default=6,
            help="Liczba ofert do utworzenia (domyślnie 6).",
        )

    @transaction.atomic
    def handle(self, *args, **options):
        self.stdout.write(self.style.HTTP_INFO("StayMap — seed_db"))

        if options["fresh"]:
            Listing.all_objects.all().delete()
            HostProfile.all_objects.all().delete()
            User.objects.filter(is_superuser=False).delete()
            self.stdout.write("  Wyczyszczono dane (bez superuserów).")

        self._ensure_admin()
        count = max(1, options["count"])
        for i in range(count):
            self._create_host_listing(i)

        self.stdout.write(
            self.style.SUCCESS(
                f"  Gotowe: {User.objects.count()} użytkowników, "
                f"{Listing.objects.count()} ofert (widoczne przez manager)."
            )
        )

    def _ensure_admin(self):
        if User.objects.filter(email="admin@staymap.pl").exists():
            return
        User.objects.create_superuser(
            email="admin@staymap.pl",
            password="admin123",
            first_name="Admin",
            last_name="StayMap",
        )
        self.stdout.write(self.style.SUCCESS("  Superuser: admin@staymap.pl / admin123"))

    def _create_host_listing(self, index: int):
        n = index + 1
        email = f"host{n}@staymap.pl"
        user, created = User.objects.get_or_create(
            email=email,
            defaults={
                "first_name": f"Host{n}",
                "last_name": "Testowy",
                "is_host": True,
            },
        )
        if created:
            user.set_password("host12345")
            user.save()
        else:
            user.is_host = True
            user.save(update_fields=["is_host", "updated_at"])

        profile, _ = HostProfile.objects.get_or_create(user=user)
        city, region, lat, lng = random.choice(SAMPLE_SPOTS)
        title = f"{random.choice(TITLES)} — {city}"
        base_slug = slugify(title)[:180] or f"listing-{n}"
        slug = base_slug
        k = 0
        while Listing.all_objects.filter(slug=slug).exists():
            k += 1
            slug = f"{base_slug}-{k}"

        listing = Listing.objects.create(
            host=profile,
            title=title,
            slug=slug,
            description=f"Przykładowa oferta seed #{n} w okolicach {city}.",
            base_price=Decimal(str(random.randint(150, 600))),
            currency="PLN",
            status=Listing.Status.APPROVED,
            max_guests=random.randint(2, 8),
        )
        ListingLocation.objects.create(
            listing=listing,
            point=Point(
                lng + random.uniform(-0.08, 0.08),
                lat + random.uniform(-0.08, 0.08),
                srid=4326,
            ),
            city=city,
            region=region,
            country="PL",
        )
        self.stdout.write(f"  Oferta: {listing.title} ({listing.slug})")
