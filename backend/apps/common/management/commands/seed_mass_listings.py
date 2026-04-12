"""
Masowy seed ofert (np. 2500) — zgodny z modelami StayMap.

Użycie:
  python manage.py seed_mass_listings --count 2500 --clear

--clear  usuwa istniejące oferty i powiązane dane (rezerwacje, recenzje, …), potem seeduje od zera.
"""
from __future__ import annotations

from datetime import date
from decimal import Decimal

from django.contrib.auth.hashers import make_password
from django.contrib.gis.geos import Point
from django.core.files.base import ContentFile
from django.core.management.base import BaseCommand
from django.db import transaction
from django.db.models import Q
from django.utils.text import slugify

from apps.bookings.models import BlockedDate, Booking, BookingStatusHistory, Payment
from apps.common.management.commands.seed_db import _jpeg_placeholder
from apps.common.seed_mass_listings_generators import (
    RNG as SEED_RNG,
    PRICE_RANGES,
    SEA_MTN_BOOST,
    SHORT_DESCS,
    TYPE_POOL,
    amenity_set,
    amenities_to_json,
    build_pool,
    extra_location_tags,
    gen_desc,
    gen_host_data,
    gen_title,
    listing_type_json,
    pricing_rules_payload,
)
from apps.discovery.models import CollectionListing, CompareSession
from apps.host.models import HostProfile
from apps.listings.location_tags import LOCATION_TAG_FIELD_NAMES
from apps.listings.models import Listing, ListingImage, ListingLocation
from apps.location_intelligence.destination_scores import compute_destination_scores
from apps.location_intelligence.models import AreaSummaryCache, NearbyPlaceCache
from apps.messaging.models import Conversation, Message
from apps.pricing.models import HolidayPricingRule, LongStayDiscountRule, SeasonalPricingRule
from apps.reviews.models import Review
from apps.users.models import User, WishlistItem

from apps.ai_assistant.models import AiRecommendation
from apps.common.demo_unsplash_photos import get_cached_unsplash_jpeg_bytes, mass_seed_unsplash_url_pool
from apps.discovery.services import DiscoveryFeedService
from apps.search.services import invalidate_search_cache


def _wipe_listing_ecosystem() -> None:
    """Usuwa dane blokujące CASCADE/PROTECT przed czyszczeniem Listing."""
    Payment.objects.all().delete()
    BookingStatusHistory.objects.all().delete()
    Message.objects.all().delete()
    Conversation.objects.all().delete()
    Review.objects.all().delete()
    Booking.objects.all().delete()
    BlockedDate.objects.all().delete()
    WishlistItem.objects.all().delete()
    AiRecommendation.objects.all().delete()
    CollectionListing.objects.all().delete()
    for cs in CompareSession.objects.all():
        cs.listings.clear()
    AreaSummaryCache.objects.all().delete()
    NearbyPlaceCache.objects.all().delete()
    SeasonalPricingRule.objects.all().delete()
    HolidayPricingRule.objects.all().delete()
    LongStayDiscountRule.objects.all().delete()
    from apps.pricing.models import CustomDatePrice

    CustomDatePrice.objects.all().delete()
    ListingImage.all_objects.all().delete()
    ListingLocation.all_objects.all().delete()
    Listing.all_objects.all().delete()


def _rebuild_discovery_collections_mass(command: BaseCommand) -> None:
    """Po --clear brak slugów demo — uzupełnij kolekcje homepage z istniejących ofert (tagi lokalizacji)."""
    from apps.discovery.models import CollectionListing, DiscoveryCollection
    from apps.listings.models import Listing

    col_mount, _ = DiscoveryCollection.objects.get_or_create(
        slug="gory-weekend",
        defaults={
            "title": "Góry na weekend",
            "description": "Tatry, Bieszczady i spokój lasu — wyjazd od piątku do niedzieli.",
            "sort_order": 1,
            "is_active": True,
            "travel_mode": "mountains",
        },
    )
    CollectionListing.objects.filter(collection=col_mount).delete()

    mtn_qs = (
        Listing.objects.filter(status=Listing.Status.APPROVED, location__near_mountains=True).order_by(
            "id"
        )
    )
    mtn_list = list(mtn_qs[:8])
    if not mtn_list:
        mtn_list = list(Listing.objects.filter(status=Listing.Status.APPROVED).order_by("id")[:8])

    for i, listing in enumerate(mtn_list):
        CollectionListing.objects.create(collection=col_mount, listing=listing, sort_order=i)

    command.stdout.write(command.style.SUCCESS("  Discovery: kolekcje homepage uzupełnione z ofert masowych."))


def _apply_pricing(listing: Listing, rules: list[dict]) -> None:
    for r in rules:
        k = r["kind"]
        if k == "seasonal":
            SeasonalPricingRule.objects.create(
                listing=listing,
                name=r["name"][:120],
                valid_from=date.fromisoformat(r["date_from"]),
                valid_to=date.fromisoformat(r["date_to"]),
                multiplier=Decimal(str(r["multiplier"])),
                priority=0,
            )
        elif k == "long_stay":
            LongStayDiscountRule.objects.create(
                listing=listing,
                min_nights=r["min_nights"],
                discount_percent=Decimal(str(r["discount_percent"])),
                priority=0,
            )


def _build_data_row(idx: int, loc: tuple) -> dict:
    from apps.common.seed_mass_listings_generators import P, RI, RNG, RF

    city, region, lat, lon, near_sea, near_mtn, near_lake, near_forest, _w = loc
    lat += RNG.uniform(-0.06, 0.06)
    lon += RNG.uniform(-0.09, 0.09)

    ltype = P(TYPE_POOL)
    max_g = RI(2, 14)
    bedrooms = min(max_g // 2 + 1, 7)
    beds = RI(bedrooms, bedrooms + 2)
    baths = max(1, bedrooms // 2)

    pmin, pmax = PRICE_RANGES.get(ltype, (130, 500))
    if near_sea or near_mtn:
        pmin = int(pmin * SEA_MTN_BOOST)
        pmax = int(pmax * SEA_MTN_BOOST)
    base_p = RI(pmin, pmax)
    clean_f = RI(50, 350)
    pet_ok = RNG.random() < 0.33
    forest_f = near_forest or (RNG.random() < 0.35 and not near_sea)

    title = gen_title(ltype, city, region, near_mtn, near_lake, near_sea, forest_f)
    slug_base = slugify(title)[:100] + f"-{idx}"
    slug = slug_base[:220]

    desc = gen_desc(ltype, region, near_mtn, near_lake, near_sea, forest_f, max_g, city)
    short = P(SHORT_DESCS)

    am_slugs = amenity_set(ltype, near_mtn, near_lake, near_sea, pet_ok, base_p)
    tags_extra = extra_location_tags(near_sea, near_mtn, near_lake, forest_f)

    pr = pricing_rules_payload(base_p, near_sea, near_mtn)
    rating = RF(4.15, 5.00, 2)
    revs = RI(2, 380) if idx < 1800 else RI(1, 40)
    # Jedna miniatura na ofertę — wystarczy do listy/mapy; 5–8× PIL na rekord rozciągałby seed godzinami.
    n_img = 1

    loc_payload: dict = {
        "city": city,
        "region": region,
        "country": "PL",
        "lat": round(lat, 6),
        "lon": round(lon, 6),
    }
    base_tags = {
        "near_mountains": near_mtn,
        "near_lake": bool(near_lake or near_sea),
        "near_sea": near_sea,
        "near_forest": forest_f,
    }
    for k in LOCATION_TAG_FIELD_NAMES:
        if k in base_tags:
            loc_payload[k] = base_tags[k]
        else:
            loc_payload[k] = bool(tags_extra.get(k, False))

    return {
        "idx": idx,
        "title": title[:200],
        "slug": slug,
        "description": desc,
        "short_description": short[:320],
        "ltype": ltype,
        "base_price": base_p,
        "cleaning_fee": clean_f,
        "max_guests": max_g,
        "bedrooms": bedrooms,
        "beds": beds,
        "bathrooms": baths,
        "booking_mode": "instant" if RNG.random() < 0.65 else "request",
        "cancellation_policy": P(
            ["flexible", "flexible", "moderate", "moderate", "strict", "non_refundable"]
        ),
        "check_in": P(["13:00", "14:00", "15:00", "16:00"]),
        "check_out": P(["10:00", "11:00", "12:00"]),
        "is_pet_friendly": pet_ok,
        "amenity_slugs": am_slugs,
        "location": loc_payload,
        "n_images": n_img,
        "average_rating": rating,
        "review_count": revs,
        "pricing_rules": pr,
    }


class Command(BaseCommand):
    help = "Seed wielu ofert (JSON listing_type/amenities, PostGIS, PIL zdjęcia)."

    def add_arguments(self, parser):
        parser.add_argument("--count", type=int, default=2500, help="Liczba ofert (domyślnie 2500).")
        parser.add_argument(
            "--clear",
            action="store_true",
            help="Usuń istniejące oferty i powiązane rekordy przed seedem.",
        )
        parser.add_argument(
            "--hosts",
            type=int,
            default=400,
            help="Liczba unikalnych gospodarzy (domyślnie 400).",
        )
        parser.add_argument(
            "--batch-size",
            type=int,
            default=50,
            help="Ile ofert zatwierdzać w jednej transakcji (domyślnie 50).",
        )
        parser.add_argument(
            "--no-unsplash",
            action="store_true",
            help="Pomiń Unsplash — tylko szybkie placeholdery PIL (offline / bez sieci).",
        )

    def handle(self, *args, **options):
        count: int = options["count"]
        do_clear: bool = options["clear"]
        n_hosts: int = options["hosts"]
        batch_size: int = max(1, int(options["batch_size"]))
        use_unsplash: bool = not bool(options["no_unsplash"])
        unsplash_pool: list[str] = mass_seed_unsplash_url_pool() if use_unsplash else []

        if do_clear:
            self.stdout.write(self.style.WARNING("Czyszczenie ofert i powiązań…"))
            with transaction.atomic():
                _wipe_listing_ecosystem()
            self.stdout.write(self.style.SUCCESS("Baza oczyszczona."))

        self.stdout.write(f"Tworzenie {n_hosts} gospodarzy…")
        hosts: list[HostProfile] = []
        with transaction.atomic():
            for hi in range(1, n_hosts + 1):
                hd = gen_host_data(hi)
                usr, _ = User.objects.get_or_create(
                    email=hd["email"],
                    defaults={
                        "first_name": hd["fn"],
                        "last_name": hd["ln"],
                        "is_host": True,
                        "is_active": True,
                        "password": make_password("StayMap2025!"),
                    },
                )
                hp, _ = HostProfile.objects.get_or_create(
                    user=usr,
                    defaults={
                        "bio": hd["bio"][:2000],
                        "avatar_url": f"https://picsum.photos/seed/{hd['avatar_seed']}/200/200",
                        "response_rate": Decimal(str(hd["response_rate"])),
                        "is_verified": SEED_RNG.random() < 0.3,
                    },
                )
                hosts.append(hp)
                if hi % 100 == 0:
                    self.stdout.write(f"  … {hi}/{n_hosts}")

        self.stdout.write(f"Budowanie puli {count} ofert…")
        pool = build_pool(count)
        data = [_build_data_row(i, loc) for i, loc in enumerate(pool, 1)]

        if unsplash_pool:
            self.stdout.write(
                f"Pobieranie {len(unsplash_pool)} unikalnych JPEG z Unsplash (cache na czas seeda)…"
            )
            failed = 0
            for u in unsplash_pool:
                if get_cached_unsplash_jpeg_bytes(u) is None:
                    failed += 1
            if failed:
                self.stdout.write(
                    self.style.WARNING(f"  Unsplash: {failed}/{len(unsplash_pool)} URL-i niedostępnych — fallback PIL.")
                )
            else:
                self.stdout.write(self.style.SUCCESS("  Unsplash: pula zdjęć w pamięci."))

        done = 0
        for start in range(0, len(data), batch_size):
            chunk = data[start : start + batch_size]
            with transaction.atomic():
                for ld in chunk:
                    host = hosts[(ld["idx"] - 1) % len(hosts)]
                    lt_json = listing_type_json(ld["ltype"])
                    amenities_json = amenities_to_json(ld["amenity_slugs"])

                    slug = ld["slug"][:220]
                    base_slug = slug
                    n = 0
                    while Listing.all_objects.filter(slug=slug).exists():
                        n += 1
                        slug = f"{base_slug[:200]}-u{n}"[:220]

                    listing = Listing.objects.create(
                        host=host,
                        title=ld["title"],
                        slug=slug,
                        description=ld["description"],
                        short_description=ld["short_description"][:320],
                        listing_type=lt_json,
                        base_price=Decimal(str(ld["base_price"])),
                        cleaning_fee=Decimal(str(ld["cleaning_fee"])),
                        currency="PLN",
                        max_guests=ld["max_guests"],
                        bedrooms=ld["bedrooms"],
                        beds=ld["beds"],
                        bathrooms=ld["bathrooms"],
                        booking_mode=ld["booking_mode"],
                        cancellation_policy=ld["cancellation_policy"],
                        check_in_time=ld["check_in"][:5],
                        check_out_time=ld["check_out"][:5],
                        is_pet_friendly=ld["is_pet_friendly"],
                        amenities=amenities_json,
                        average_rating=Decimal(str(ld["average_rating"])),
                        review_count=ld["review_count"],
                        status=Listing.Status.APPROVED,
                    )

                    loc_d = ld["location"]
                    tag_kwargs = {k: bool(loc_d[k]) for k in LOCATION_TAG_FIELD_NAMES}
                    ListingLocation.objects.create(
                        listing=listing,
                        point=Point(float(loc_d["lon"]), float(loc_d["lat"]), srid=4326),
                        city=loc_d["city"],
                        region=loc_d["region"],
                        country=loc_d.get("country", "PL"),
                        address_line="",
                        postal_code="",
                        **tag_kwargs,
                    )

                    listing.refresh_from_db()
                    listing.destination_score_cache = compute_destination_scores(listing, None)
                    listing.save(update_fields=["destination_score_cache", "updated_at"])

                    for pi in range(ld["n_images"]):
                        img = ListingImage(
                            listing=listing,
                            is_cover=(pi == 0),
                            sort_order=pi,
                            alt_text=f"{listing.title[:80]} — {pi + 1}",
                        )
                        cf = None
                        if unsplash_pool:
                            u = unsplash_pool[(ld["idx"] - 1 + pi) % len(unsplash_pool)]
                            blob = get_cached_unsplash_jpeg_bytes(u)
                            if blob:
                                cf = ContentFile(blob, name=f"{slug}-{pi}.jpg")
                        if cf is None:
                            cf = _jpeg_placeholder(listing.title, pi)
                        img.image.save(cf.name, cf, save=False)
                        img.save()

                    _apply_pricing(listing, ld["pricing_rules"])
                    done += 1

            if done % 250 == 0:
                self.stdout.write(f"  … {done}/{len(data)} zapisanych")
                self.stdout.flush()

        _rebuild_discovery_collections_mass(self)

        invalidate_search_cache()
        DiscoveryFeedService.invalidate_homepage_cache()

        self.stdout.write(
            self.style.SUCCESS(
                f"Gotowe. Nowych ofert: {done}, łącznie Listing: {Listing.objects.count()}"
            )
        )
        self.stdout.write(
            "  Cache wyszukiwania (Redis) i feed strony głównej wyczyszczone.",
        )
        self.stdout.write(
            self.style.WARNING(
                "  Uwaga: tylko `seed_db` tworzy 8 ofert demo. Tysiące ofert: "
                "`python manage.py seed_mass_listings --count 2500 --clear` (usuwa istniejące oferty)."
            )
        )
