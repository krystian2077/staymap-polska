"""
seed_polska — profesjonalny seed 230 ofert na mapie Polski.

Tworzy:
 - 20 kont hostów (hasło: host12345)
 - 50 kont gości do recenzji (hasło: guest12345)
 - 230 ofert rozmieszczonych geograficznie (Podhale, Mazury, Bieszczady, ...)
 - po 5 zdjęć Unsplash na ofertę (dopasowane tematycznie + fallback PIL)
 - 2–5 recenzji per oferta (Faker PL + kuratorowane szablony)
 - sezonowe reguły cenowe i rabaty długiego pobytu
 - kolekcje Discovery na stronę główną

Użycie:
  docker compose exec backend python manage.py seed_polska
  docker compose exec backend python manage.py seed_polska --yes
  docker compose exec backend python manage.py seed_polska --yes --refresh-images
"""
from __future__ import annotations

import hashlib
import random
import re
from datetime import date, timedelta
from decimal import Decimal, ROUND_HALF_UP
from io import BytesIO

from django.contrib.auth import get_user_model
from django.contrib.gis.geos import Point
from django.core.files.base import ContentFile
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from PIL import Image, ImageDraw, ImageFont

from apps.bookings.models import BlockedDate
from apps.host.models import HostProfile
from apps.listings.location_tags import LOCATION_TAG_FIELD_NAMES
from apps.listings.models import Listing, ListingImage, ListingLocation
from apps.pricing.models import LongStayDiscountRule, SeasonalPricingRule
from apps.reviews.models import Review

from apps.common.demo_unsplash_photos import get_cached_unsplash_jpeg_bytes
from apps.common.seed_polska_geo_data import (
    AMENITIES,
    HOST_DATA,
    LISTING_TYPE_BY_SLUG,
    PHOTO_POOLS,
    REGION_CONTEXT,
    REGIONS,
    REVIEW_TEMPLATES,
    TYPE_BASE_AMENITIES,
    TYPE_OPTIONAL_AMENITIES,
    TYPE_PHOTO_THEME,
)

User = get_user_model()

# Stały zarodek — reprodukowalny seed przy każdym uruchomieniu
RNG_SEED = 2024
RNG = random.Random(RNG_SEED)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _jpeg_placeholder(title: str, variant: int) -> ContentFile:
    """Gradient PIL z tytułem — fallback gdy Unsplash niedostępny."""
    w, h = 1280, 720
    hsh = int(hashlib.sha256(f"{title}-{variant}".encode()).hexdigest()[:6], 16)
    r0, g0, b0 = (hsh >> 16) & 0xFF, (hsh >> 8) & 0xFF, hsh & 0xFF
    r1, g1, b1 = min(255, r0 + 70), min(255, g0 + 50), min(255, b0 + 60)
    img = Image.new("RGB", (w, h))
    px = img.load()
    for y in range(h):
        t = y / max(h - 1, 1)
        cr, cg, cb = int(r0 * (1 - t) + r1 * t), int(g0 * (1 - t) + g1 * t), int(b0 * (1 - t) + b1 * t)
        for x in range(w):
            px[x, y] = (cr, cg, cb)
    draw = ImageDraw.Draw(img)
    try:
        font = ImageFont.truetype("DejaVuSans.ttf", 40)
        small = ImageFont.truetype("DejaVuSans.ttf", 20)
    except OSError:
        font = ImageFont.load_default()
        small = font
    draw.rectangle([0, h - 110, w, h], fill=(15, 45, 30))
    draw.text((40, 50), "StayMap Polska", fill=(255, 255, 255), font=small)
    draw.text((40, 82), title[:60], fill=(255, 255, 255), font=font)
    draw.text((40, h - 75), f"Zdjęcie #{variant + 1}", fill=(200, 240, 200), font=small)
    buf = BytesIO()
    img.save(buf, format="JPEG", quality=85)
    return ContentFile(buf.getvalue(), name=f"ph-{abs(hash(title)) % 99999}-{variant}.jpg")


def _slugify_pl(text: str) -> str:
    """Uproszczony slugify zachowujący polskie litery → ascii."""
    trans = str.maketrans("ąćęłńóśźżĄĆĘŁŃÓŚŹŻ", "acelnoszzACELNOSZZ")
    s = text.lower().translate(trans)
    s = re.sub(r"[^a-z0-9]+", "-", s).strip("-")
    return s[:200]


def _dec(v: float, places: int = 2) -> Decimal:
    q = Decimal(10) ** -places
    return Decimal(str(v)).quantize(q, rounding=ROUND_HALF_UP)


def _pick_locality(region: dict) -> dict:
    """Losuje miejscowość z regionu zgodnie z wagami."""
    locs = region["localities"]
    weights = [loc["weight"] for loc in locs]
    return RNG.choices(locs, weights=weights, k=1)[0]


def _jitter_point(locality: dict) -> tuple[float, float]:
    """Losuje punkt w promieniu r stopni od centrum miejscowości."""
    r = locality.get("r", 0.012)
    dlat = RNG.uniform(-r, r)
    dlng = RNG.uniform(-r * 1.4, r * 1.4)  # 1.4 kompensuje skrót na szerokości PL
    lat = round(locality["lat"] + dlat, 6)
    lng = round(locality["lng"] + dlng, 6)
    return lat, lng


def _point_too_close(lat: float, lng: float, existing: list[tuple[float, float]], min_km: float = 6.0) -> bool:
    """Sprawdza czy nowy punkt jest zbyt blisko już istniejących pinezek (odległość przybliżona)."""
    for elat, elng in existing:
        dlat_km = (lat - elat) * 111.0
        dlng_km = (lng - elng) * 68.0  # ~68 km/deg na szer. 52°N
        dist_km = (dlat_km ** 2 + dlng_km ** 2) ** 0.5
        if dist_km < min_km:
            return True
    return False


def _pick_point_with_spacing(
    region: dict,
    used_points: list[tuple[float, float]],
    min_km: float = 6.0,
    max_attempts: int = 25,
) -> tuple[dict, float, float]:
    """
    Losuje miejscowość i punkt z minimalnym odstępem od istniejących pinezek.
    Zwraca (locality, lat, lng).
    Po wyczerpaniu prób akceptuje najlepszy znaleziony kandydat.
    """
    best_locality = _pick_locality(region)
    best_lat, best_lng = _jitter_point(best_locality)
    best_dist = 0.0

    for _ in range(max_attempts):
        locality = _pick_locality(region)
        lat, lng = _jitter_point(locality)
        if not _point_too_close(lat, lng, used_points, min_km):
            return locality, lat, lng
        # Oblicz minimalną odległość tego kandydata do track'owanych pinów
        if used_points:
            min_d = min(
                ((lat - e[0]) * 111) ** 2 + ((lng - e[1]) * 68) ** 2
                for e in used_points
            ) ** 0.5
            if min_d > best_dist:
                best_dist = min_d
                best_locality = locality
                best_lat, best_lng = lat, lng
    return best_locality, best_lat, best_lng


def _pick_type_slug(region: dict, used_counts: dict[str, int]) -> str:
    """Losuje typ oferty zgodnie z wagami regionu; unika przeładowania jednego typu."""
    weights_raw = region["type_weights"]
    eligible = {
        slug: w for slug, w in weights_raw.items()
        if w > 0 and len(region["name_templates"].get(slug, [])) > 0
    }
    if not eligible:
        eligible = {"domek": 1}
    slugs = list(eligible.keys())
    weights = [eligible[s] for s in slugs]
    return RNG.choices(slugs, weights=weights, k=1)[0]


def _pick_name(region: dict, type_slug: str, locality: dict, used_names: set[str]) -> str:
    """Wybiera unikalną nazwę z puli szablonów regionu."""
    templates = list(region["name_templates"].get(type_slug, ["Domek"]))
    city = locality["city"]
    # Najpierw próbuj czyste nazwy bez miasta
    RNG.shuffle(templates)
    for t in templates:
        if t not in used_names:
            return t
    # Następnie z suffixem miasta
    for t in templates:
        candidate = f"{t} — {city}"
        if candidate not in used_names:
            return candidate
    # Ostatecznie z numerem
    for i in range(2, 20):
        candidate = f"{templates[0]} {i}"
        if candidate not in used_names:
            return candidate
    return f"{templates[0]} ({city})"


def _build_amenities(type_slug: str, region: dict, rng: random.Random) -> list[dict]:
    """Zwraca listę udogodnień: bazowe + 2–3 opcjonalne dopasowane do regionu."""
    base = [AMENITIES[k] for k in TYPE_BASE_AMENITIES.get(type_slug, ["wifi"]) if k in AMENITIES]
    optional_pool = list(TYPE_OPTIONAL_AMENITIES.get(type_slug, []))
    terrain = region.get("terrain", "forest")
    # Region-specific bonus
    if terrain == "mountains" and "sauna" in optional_pool:
        if rng.random() < 0.5:
            optional_pool = ["sauna"] + [x for x in optional_pool if x != "sauna"]
    if terrain == "lake":
        for k in ["kayak", "boat", "fishing"]:
            if k in optional_pool:
                optional_pool = [k] + [x for x in optional_pool if x != k]
    if terrain == "sea":
        for k in ["bike", "grill", "terrace"]:
            if k in optional_pool:
                optional_pool = [k] + [x for x in optional_pool if x != k]
    n_opt = rng.randint(2, 4)
    base_ids = {a["id"] for a in base}
    extras = [AMENITIES[k] for k in optional_pool if k in AMENITIES and k not in base_ids]
    rng.shuffle(extras)
    return base + extras[:n_opt]


def _build_location_tags(region: dict, locality: dict) -> dict[str, bool]:
    """Scala tagi regionu + tagi specyficzne dla miejscowości."""
    tags = {k: False for k in LOCATION_TAG_FIELD_NAMES}
    tags.update(region.get("location_tags", {}))
    tags.update(locality.get("extra_tags", {}))
    return tags


def _pick_photo_pool_key(type_slug: str, region: dict) -> str:
    terrain = region.get("terrain", "forest")
    by_terrain = TYPE_PHOTO_THEME.get(type_slug, {})
    return by_terrain.get(terrain, by_terrain.get("mountains", "forest_rural"))


def _fetch_image(url: str, fname: str) -> ContentFile | None:
    data = get_cached_unsplash_jpeg_bytes(url, timeout=20)
    if data:
        return ContentFile(data, name=fname)
    return None


def _base_price(type_slug: str, region: dict, rng: random.Random) -> Decimal:
    base_ranges = {
        "domek":      (190, 360),
        "chata":      (200, 400),
        "apartament": (150, 290),
        "luksus":     (500, 1200),
        "dworek":     (380, 800),
        "kemping":    (80,  160),
        "pokoj":      (100, 200),
    }
    lo, hi = base_ranges.get(type_slug, (180, 300))
    raw = rng.randint(lo, hi)
    m = region.get("price_multiplier", 1.0)
    price = raw * m
    # Zaokrąglenie do 10 PLN
    return _dec(round(price / 10) * 10)


def _cleaning_fee(base_price: Decimal, type_slug: str) -> Decimal:
    ratios = {"luksus": 0.20, "dworek": 0.18, "domek": 0.22, "chata": 0.22, "apartament": 0.18, "pokoj": 0.10, "kemping": 0.10}
    ratio = ratios.get(type_slug, 0.20)
    fee = float(base_price) * ratio
    return _dec(round(fee / 10) * 10)


def _generate_description(region: dict, type_slug: str, locality: dict, faker_instance) -> tuple[str, str]:
    """Zwraca (description, short_description) dla oferty."""
    context_lines = REGION_CONTEXT.get(region["id"], ["Piękne miejsce na wypoczynek w Polsce."])
    context = RNG.choice(context_lines)
    para1 = faker_instance.paragraph(nb_sentences=RNG.randint(3, 5))
    para2 = faker_instance.paragraph(nb_sentences=RNG.randint(2, 4))
    description = f"{context}\n\n{para1}\n\n{para2}"
    # Short description: pierwsze zdanie kontekstu + skrót
    short = context.split(".")[0] + "."
    if len(short) > 320:
        short = short[:317] + "..."
    return description, short


def _generate_score(type_slug: str, region: dict, rng: random.Random) -> dict:
    """Generuje cache score destynacji."""
    terrain = region.get("terrain", "forest")
    base = {
        "romantic": rng.uniform(6.0, 9.5),
        "outdoor": rng.uniform(5.0, 9.5),
        "nature": rng.uniform(5.0, 9.5),
        "quiet": rng.uniform(5.5, 9.5),
        "family": rng.uniform(5.5, 9.0),
        "wellness": rng.uniform(5.0, 9.0),
        "workation": rng.uniform(3.5, 8.0),
        "accessibility": rng.uniform(4.0, 9.0),
    }
    if terrain == "mountains":
        base["outdoor"] = min(10.0, base["outdoor"] + 1.2)
        base["nature"] = min(10.0, base["nature"] + 1.0)
        base["quiet"] = min(10.0, base["quiet"] + 0.5)
    elif terrain == "lake":
        base["nature"] = min(10.0, base["nature"] + 0.8)
        base["family"] = min(10.0, base["family"] + 0.8)
    elif terrain == "sea":
        base["family"] = min(10.0, base["family"] + 1.0)
        base["outdoor"] = min(10.0, base["outdoor"] + 0.8)
    if type_slug == "luksus":
        base["romantic"] = min(10.0, base["romantic"] + 1.0)
        base["wellness"] = min(10.0, base["wellness"] + 1.0)
    elif type_slug == "apartament":
        base["workation"] = min(10.0, base["workation"] + 1.5)
        base["accessibility"] = min(10.0, base["accessibility"] + 1.2)
    return {k: round(v, 1) for k, v in base.items()} | {"calculated_at": timezone.now().isoformat()}


# ---------------------------------------------------------------------------
# Management command
# ---------------------------------------------------------------------------

class Command(BaseCommand):
    help = "Seeduje 230 realistycznych ofert rozmieszczonych po mapie Polski."

    def add_arguments(self, parser):
        parser.add_argument("--yes", action="store_true", help="Pomiń potwierdzenie.")
        parser.add_argument("--refresh-images", action="store_true", help="Wymuś ponowne pobieranie zdjęć.")

    @transaction.atomic
    def handle(self, *args, **options):
        self._refresh_images = options["refresh_images"]

        if not options["yes"]:
            self.stdout.write(self.style.WARNING(
                "UWAGA: Seed doda 230 ofert, 20 hostów i 50 gości do bazy.\n"
                "Wpisz 'tak' aby kontynuować: "
            ), ending="")
            self.stdout.flush()
            if input().strip().lower() not in ("tak", "yes", "y"):
                self.stdout.write(self.style.NOTICE("Anulowano."))
                return

        self.stdout.write(self.style.HTTP_INFO("StayMap — seed_polska (230 ofert)"))

        # Faker PL
        try:
            from faker import Faker
            faker = Faker("pl_PL")
            faker.seed_instance(RNG_SEED)
        except ImportError:
            faker = None

        # Kroki
        self._ensure_admin()
        hosts = self._create_hosts()
        guests = self._create_guests(n=50, faker=faker)

        total_listings = 0
        total_reviews = 0
        used_names: set[str] = set()
        used_points: list[tuple[float, float]] = []  # globalna lista zaakceptowanych pinów

        for region in REGIONS:
            count = region["count"]
            self.stdout.write(f"\n  Region: {region['label']} ({count} ofert)")
            pool_idx: dict[str, int] = {}  # per-pool photo rotation index

            for i in range(count):
                locality, lat, lng = _pick_point_with_spacing(region, used_points, min_km=6.0)
                used_points.append((lat, lng))

                type_slug = _pick_type_slug(region, {})
                listing_type = LISTING_TYPE_BY_SLUG[type_slug]
                name = _pick_name(region, type_slug, locality, used_names)
                used_names.add(name)
                tags = _build_location_tags(region, locality)
                amenities = _build_amenities(type_slug, region, RNG)
                base_price = _base_price(type_slug, region, RNG)
                cleaning_fee = _cleaning_fee(base_price, type_slug)
                score = _generate_score(type_slug, region, RNG)

                # Parametry wg typu
                capacity_map = {
                    "domek":      (RNG.randint(2, 8),  RNG.randint(1, 4), RNG.randint(1, 5), RNG.randint(1, 2)),
                    "chata":      (RNG.randint(2, 8),  RNG.randint(1, 4), RNG.randint(1, 5), RNG.randint(1, 2)),
                    "apartament": (RNG.randint(2, 5),  RNG.randint(1, 2), RNG.randint(1, 3), RNG.randint(1, 2)),
                    "luksus":     (RNG.randint(4, 12), RNG.randint(3, 6), RNG.randint(4, 8), RNG.randint(2, 4)),
                    "dworek":     (RNG.randint(4, 12), RNG.randint(3, 6), RNG.randint(4, 8), RNG.randint(2, 3)),
                    "kemping":    (RNG.randint(2, 4),  1,                 RNG.randint(1, 2), 1),
                    "pokoj":      (RNG.randint(1, 3),  1,                 RNG.randint(1, 2), 1),
                }
                max_guests, bedrooms, beds, bathrooms = capacity_map.get(type_slug, (4, 2, 2, 1))

                booking_mode = RNG.choices(
                    [Listing.BookingMode.INSTANT, Listing.BookingMode.REQUEST],
                    weights=[7, 3],
                )[0]
                cancel_policy = RNG.choices(
                    [Listing.CancellationPolicy.FLEXIBLE, Listing.CancellationPolicy.MODERATE, Listing.CancellationPolicy.STRICT],
                    weights=[5, 3, 2],
                )[0]
                is_pet_friendly = RNG.random() < 0.35
                host = RNG.choice(hosts)

                if faker:
                    description, short_description = _generate_description(region, type_slug, locality, faker)
                else:
                    description = f"Obiekt w miejscowości {locality['city']}. Piękne otoczenie przyrody."
                    short_description = f"Komfortowy obiekt w regionie {region['label']}."

                # Utwórz lub aktualizuj listing
                listing, created = Listing.all_objects.get_or_create(
                    slug=_slugify_pl(name),
                    defaults={
                        "host": host,
                        "title": name,
                        "short_description": short_description,
                        "description": description,
                        "base_price": base_price,
                        "cleaning_fee": cleaning_fee,
                        "currency": "PLN",
                        "status": Listing.Status.APPROVED,
                        "max_guests": max_guests,
                        "bedrooms": bedrooms,
                        "beds": beds,
                        "bathrooms": bathrooms,
                        "booking_mode": booking_mode,
                        "cancellation_policy": cancel_policy,
                        "is_pet_friendly": is_pet_friendly,
                        "listing_type": listing_type,
                        "amenities": amenities,
                        "destination_score_cache": score,
                        "check_in_time": "15:00",
                        "check_out_time": "11:00",
                    },
                )
                if not created:
                    listing.host = host
                    listing.title = name
                    listing.short_description = short_description
                    listing.description = description
                    listing.base_price = base_price
                    listing.cleaning_fee = cleaning_fee
                    listing.status = Listing.Status.APPROVED
                    listing.max_guests = max_guests
                    listing.bedrooms = bedrooms
                    listing.beds = beds
                    listing.bathrooms = bathrooms
                    listing.booking_mode = booking_mode
                    listing.cancellation_policy = cancel_policy
                    listing.is_pet_friendly = is_pet_friendly
                    listing.listing_type = listing_type
                    listing.amenities = amenities
                    listing.destination_score_cache = score
                    listing.deleted_at = None
                    listing.save()

                # Lokalizacja
                loc_defaults = {
                    "point": Point(lng, lat, srid=4326),
                    "city": locality["city"],
                    "region": locality["voivodeship"],
                    "country": "PL",
                    "address_line": f"ul. (dokładny adres po rezerwacji) — {locality['city']}",
                    "postal_code": "",
                    **{k: tags.get(k, False) for k in LOCATION_TAG_FIELD_NAMES},
                }
                loc, _ = ListingLocation.all_objects.get_or_create(listing=listing, defaults=loc_defaults)
                loc.city = locality["city"]
                loc.region = locality["voivodeship"]
                loc.point = Point(lng, lat, srid=4326)
                for k in LOCATION_TAG_FIELD_NAMES:
                    setattr(loc, k, tags.get(k, False))
                loc.deleted_at = None
                loc.save()

                # Zdjęcia
                self._upsert_images(listing, type_slug, region, pool_idx, name)

                # Cennik
                self._create_pricing(listing, region, type_slug)

                # Recenzje
                n_reviews = self._create_reviews(listing, guests, faker)
                total_reviews += n_reviews

                # Blokady kalendarza (kilka losowych terminów)
                BlockedDate.all_objects.filter(listing=listing).delete()
                today = date.today()
                n_blocked = RNG.randint(0, 4)
                blocked_offsets = sorted(RNG.sample(range(10, 120), min(n_blocked * 3, 60))[:n_blocked * 3])
                used_dates: set[date] = set()
                for off in blocked_offsets:
                    d = today + timedelta(days=off)
                    if d not in used_dates:
                        BlockedDate.objects.create(listing=listing, date=d)
                        used_dates.add(d)

                total_listings += 1
                self.stdout.write(f"    [{i+1:>3}/{count}] {name[:60]}")

        self._seed_discovery()

        self.stdout.write(self.style.SUCCESS(
            f"\n  Gotowe: {User.objects.count()} użytkowników, "
            f"{Listing.objects.count()} ofert, "
            f"{Review.objects.count()} recenzji."
        ))

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    def _ensure_admin(self):
        if not User.objects.filter(email="admin@staymap.pl").exists():
            User.objects.create_superuser(
                email="admin@staymap.pl",
                password="admin123",
                first_name="Admin",
                last_name="StayMap",
            )
            self.stdout.write(self.style.SUCCESS("  Superuser: admin@staymap.pl / admin123"))

    def _create_hosts(self) -> list[HostProfile]:
        profiles = []
        for h in HOST_DATA:
            user, created = User.objects.get_or_create(
                email=h["email"],
                defaults={"first_name": h["first"], "last_name": h["last"], "is_host": True},
            )
            if created:
                user.set_password("host12345")
                user.save()
            else:
                user.is_host = True
                user.save(update_fields=["is_host", "updated_at"])

            profile, _ = HostProfile.objects.get_or_create(user=user)
            profile.bio = h["bio"]
            profile.avatar_url = f"https://i.pravatar.cc/150?u={h['email']}"
            profile.is_verified = RNG.random() < 0.75
            profile.response_rate = _dec(RNG.uniform(0.78, 1.0), 3)
            profile.save(update_fields=["bio", "avatar_url", "is_verified", "response_rate", "updated_at"])
            profiles.append(profile)

        self.stdout.write(f"  Hosty: {len(profiles)} kont (hasło: host12345)")
        return profiles

    def _create_guests(self, n: int, faker) -> list[User]:
        guests = []
        for idx in range(n):
            if faker:
                fn, ln = faker.first_name(), faker.last_name()
            else:
                fn, ln = f"Gość{idx}", "StayMap"
            email = f"guest{idx + 1:03d}@staymap.pl"
            user, created = User.objects.get_or_create(
                email=email,
                defaults={"first_name": fn, "last_name": ln, "is_host": False},
            )
            if created:
                user.set_password("guest12345")
                user.save()
            guests.append(user)
        self.stdout.write(f"  Goście: {n} kont (hasło: guest12345)")
        return guests

    def _upsert_images(
        self,
        listing: Listing,
        type_slug: str,
        region: dict,
        pool_idx: dict[str, int],
        title: str,
    ):
        n_existing = listing.images.filter(deleted_at__isnull=True).count()
        if n_existing > 0 and not self._refresh_images:
            return
        if n_existing > 0:
            ListingImage.all_objects.filter(listing=listing).delete()

        pool_key = _pick_photo_pool_key(type_slug, region)
        pool = PHOTO_POOLS.get(pool_key, PHOTO_POOLS["forest_rural"])
        start_idx = pool_idx.get(pool_key, 0)

        for i in range(5):
            url = pool[(start_idx + i) % len(pool)]
            fname = f"{_slugify_pl(title)[:40]}-{i}.jpg"
            img_file = _fetch_image(url, fname)
            if img_file is None:
                img_file = _jpeg_placeholder(title, i)
            li = ListingImage(listing=listing, is_cover=(i == 0), sort_order=i)
            li.alt_text = f"{title[:80]} — ujęcie {i + 1}"
            li.image.save(img_file.name, img_file, save=False)
            li.save()

        # Przesuń indeks puli żeby następna oferta dostała inne zdjęcia
        pool_idx[pool_key] = (start_idx + 3) % len(pool)

    def _create_pricing(self, listing: Listing, region: dict, type_slug: str):
        """Dodaje sezonowe reguły cenowe i rabaty długiego pobytu."""
        SeasonalPricingRule.all_objects.filter(listing=listing).delete()
        LongStayDiscountRule.all_objects.filter(listing=listing).delete()

        m = region.get("price_multiplier", 1.0)
        terrain = region.get("terrain", "forest")
        today = date.today()
        year = today.year

        # Sezon letni (15 VI – 31 VIII)
        SeasonalPricingRule.objects.create(
            listing=listing,
            name="Sezon letni",
            valid_from=date(year, 6, 15),
            valid_to=date(year, 8, 31),
            multiplier=_dec(RNG.uniform(1.25, 1.45)),
            priority=2,
        )
        # Sylwester i Nowy Rok (28 XII – 3 I)
        SeasonalPricingRule.objects.create(
            listing=listing,
            name="Sylwester / Nowy Rok",
            valid_from=date(year, 12, 28),
            valid_to=date(year + 1, 1, 3),
            multiplier=_dec(RNG.uniform(1.70, 2.20)),
            priority=5,
        )
        # Ferie zimowe (15 I – 28 II) — wyższy mnożnik w górach
        winter_mult = RNG.uniform(1.45, 1.80) if terrain == "mountains" else RNG.uniform(1.15, 1.35)
        SeasonalPricingRule.objects.create(
            listing=listing,
            name="Ferie zimowe",
            valid_from=date(year, 1, 15),
            valid_to=date(year, 2, 28),
            multiplier=_dec(winter_mult),
            priority=3,
        )
        # Majówka (30 IV – 4 V)
        SeasonalPricingRule.objects.create(
            listing=listing,
            name="Majówka",
            valid_from=date(year, 4, 30),
            valid_to=date(year, 5, 4),
            multiplier=_dec(RNG.uniform(1.30, 1.60)),
            priority=4,
        )
        # Długi pobyt ≥7 nocy
        LongStayDiscountRule.objects.create(
            listing=listing,
            min_nights=7,
            discount_percent=_dec(RNG.uniform(8.0, 14.0)),
            priority=1,
        )
        # Bardzo długi pobyt ≥14 nocy
        LongStayDiscountRule.objects.create(
            listing=listing,
            min_nights=14,
            discount_percent=_dec(RNG.uniform(15.0, 22.0)),
            priority=2,
        )

    def _create_reviews(self, listing: Listing, guests: list[User], faker) -> int:
        Review.objects.filter(listing=listing).delete()
        n = RNG.randint(2, 5)
        rev_guests = RNG.sample(guests, min(n, len(guests)))
        total_rating = 0.0
        count = 0
        for g in rev_guests:
            stars, title, body = RNG.choice(REVIEW_TEMPLATES)
            # Delikatne losowe odchylenie gwiazdek
            stars = max(3.5, min(5.0, stars + RNG.uniform(-0.3, 0.1)))
            stars = round(stars * 2) / 2  # zaokrąglenie do 0.5
            if faker:
                extra = faker.sentence(nb_words=RNG.randint(6, 12))
                body = f"{body} {extra}"
            sub = {
                "cleanliness": round(min(5.0, stars + RNG.uniform(-0.3, 0.2)) * 2) / 2,
                "location":    round(min(5.0, stars + RNG.uniform(-0.2, 0.3)) * 2) / 2,
                "communication": round(min(5.0, stars + RNG.uniform(-0.1, 0.1)) * 2) / 2,
                "accuracy":    round(min(5.0, stars + RNG.uniform(-0.3, 0.1)) * 2) / 2,
            }
            Review.objects.create(
                listing=listing,
                booking=None,
                author=g,
                reviewer_role=Review.ReviewerRole.GUEST,
                author_display_first=g.first_name,
                author_display_last=g.last_name,
                overall_rating=_dec(stars),
                title=title,
                content=body,
                subscores=sub,
                is_public=True,
                is_blind_review_released=True,
            )
            total_rating += stars
            count += 1

        # Zaktualizuj cache ratingu na listingu
        if count:
            avg = total_rating / count
            listing.average_rating = _dec(avg)
            listing.review_count = count
            listing.save(update_fields=["average_rating", "review_count", "updated_at"])

        return count

    def _seed_discovery(self):
        """Odświeża kolekcje Discovery na stronę główną."""
        from apps.discovery.models import CollectionListing, DiscoveryCollection
        try:
            from apps.discovery.services import DiscoveryFeedService
            has_service = True
        except ImportError:
            has_service = False

        collections_def = [
            {
                "slug": "nad-woda",
                "title": "Nad wodą",
                "description": "Domki i apartamenty blisko jezior, rzek i morza — lato zaczyna się tu.",
                "sort_order": 1,
                "travel_mode": "lake",
                "tag_filter": "near_lake",
            },
            {
                "slug": "gory-weekend",
                "title": "W górach na weekend",
                "description": "Tatry, Bieszczady, Karkonosze — góry przez cały rok.",
                "sort_order": 2,
                "travel_mode": "mountains",
                "tag_filter": "near_mountains",
            },
            {
                "slug": "nad-morzem",
                "title": "Nad Bałtykiem",
                "description": "Wakacje z szumem fal — plaże od Świnoujścia po Hel.",
                "sort_order": 3,
                "travel_mode": "sea",
                "tag_filter": "near_sea",
            },
            {
                "slug": "cisza-i-przyroda",
                "title": "Cisza i przyroda",
                "description": "Dala od miasta, blisko natury — domki w parkach i rezerwatach.",
                "sort_order": 4,
                "travel_mode": "nature",
                "tag_filter": "near_protected_area",
            },
        ]

        for col_def in collections_def:
            tag = col_def.pop("tag_filter")
            col, _ = DiscoveryCollection.objects.get_or_create(
                slug=col_def["slug"],
                defaults={**col_def, "is_active": True},
            )
            CollectionListing.objects.filter(collection=col).delete()
            # Wybierz do 8 najwyżej ocenianych z pasującą lokalizacją
            listings = (
                Listing.objects.filter(
                    status=Listing.Status.APPROVED,
                    location__isnull=False,
                    **{f"location__{tag}": True},
                )
                .order_by("-average_rating", "-review_count")[:8]
            )
            for idx, lst in enumerate(listings):
                CollectionListing.objects.create(collection=col, listing=lst, sort_order=idx)

        if has_service:
            try:
                DiscoveryFeedService.invalidate_homepage_cache()
            except Exception:
                pass

        self.stdout.write(self.style.SUCCESS("  Discovery: kolekcje homepage zaktualizowane."))
