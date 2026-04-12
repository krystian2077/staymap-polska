"""
Bogate dane demo dla StayMap (Etap 1–3): oferty, lokalizacje, zdjęcia (Unsplash → /media,
z fallbackiem do gradientu PIL), udogodnienia, oceny destynacji, opinie, blokady kalendarza.
"""
from __future__ import annotations

import hashlib
import urllib.error
import urllib.request
from datetime import date, timedelta
from decimal import Decimal
from io import BytesIO

from django.contrib.auth import get_user_model
from django.core.files.base import ContentFile
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from django.contrib.gis.geos import Point
from PIL import Image, ImageDraw, ImageFont

from apps.common.demo_unsplash_photos import DEMO_LISTING_PHOTOS
from apps.bookings.models import BlockedDate, Booking, BookingStatusHistory
from apps.host.models import HostProfile
from apps.listings.location_tags import LOCATION_TAG_FIELD_NAMES
from apps.listings.models import Listing, ListingImage, ListingLocation
from apps.reviews.models import Review

User = get_user_model()


def _jpeg_placeholder(title: str, variant: int) -> ContentFile:
    """Prosty gradient + tytuł — wygląda jak spójna grafika demo (bez zewnętrznych URL)."""
    w, h = 1280, 720
    hsh = int(hashlib.sha256(f"{title}-{variant}".encode()).hexdigest()[:6], 16)
    r0, g0, b0 = (hsh >> 16) & 0xFF, (hsh >> 8) & 0xFF, hsh & 0xFF
    r1 = min(255, r0 + 60)
    g1 = min(255, g0 + 40)
    b1 = min(255, b0 + 50)
    img = Image.new("RGB", (w, h))
    px = img.load()
    for y in range(h):
        t = y / max(h - 1, 1)
        r = int(r0 * (1 - t) + r1 * t)
        g = int(g0 * (1 - t) + g1 * t)
        b = int(b0 * (1 - t) + b1 * t)
        for x in range(w):
            px[x, y] = (r, g, b)
    draw = ImageDraw.Draw(img)
    try:
        font = ImageFont.truetype("DejaVuSans.ttf", 44)
        small = ImageFont.truetype("DejaVuSans.ttf", 22)
    except OSError:
        font = ImageFont.load_default()
        small = font
    draw.rectangle([0, h - 120, w, h], fill=(10, 40, 22))
    draw.text((40, 48), "StayMap Polska", fill=(255, 255, 255), font=small)
    draw.text((40, 90), title[:52], fill=(255, 255, 255), font=font)
    draw.text((40, h - 80), f"Wizualizacja demo #{variant + 1}", fill=(220, 250, 220), font=small)
    buf = BytesIO()
    img.save(buf, format="JPEG", quality=88)
    return ContentFile(buf.getvalue(), name=f"demo-{variant}-{abs(hash(title)) % 10000}.jpg")


def _fetch_remote_jpeg(url: str, filename: str, timeout: int = 25) -> ContentFile | None:
    """Pobiera JPEG z podanego URL (np. images.unsplash.com); None przy błędzie."""
    req = urllib.request.Request(
        url,
        headers={"User-Agent": "StayMapPolska/1.0 (demo-seed; +https://staymap.pl)"},
        method="GET",
    )
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            data = resp.read()
    except (urllib.error.URLError, OSError, ValueError):
        return None
    if not data or len(data) < 800:
        return None
    return ContentFile(data, name=filename)


def _score(**kwargs):
    base = {"calculated_at": timezone.now().isoformat()}
    base.update(kwargs)
    return base


DEMO_LISTINGS = [
    {
        "slug": "domek-z-widokiem-na-giewont-zakopane",
        "title": "Domek z widokiem na Giewont — sauna i tarasa",
        "short_description": "Klimatyczny drewniany dom w Kościelisku: sauna fińska, kominek i widok na Tatry.",
        "host_email": "anna.kowalska@host.staymap.pl",
        "host_first": "Anna",
        "host_last": "Kowalska",
        "bio": "Mieszkam w Zakopanem od 20 lat. Dbam, by goście czuli się jak w górskim domu.",
        "city": "Zakopane",
        "region": "małopolskie",
        "lat": 49.2992,
        "lng": 19.9496,
        "address_line": "ul. Górska 12 (dokładny adres po rezerwacji)",
        "postal_code": "34-500",
        "near_mountains": True,
        "near_forest": True,
        "base_price": Decimal("420"),
        "cleaning_fee": Decimal("150"),
        "max_guests": 6,
        "bedrooms": 3,
        "beds": 4,
        "bathrooms": 2,
        "booking_mode": Listing.BookingMode.INSTANT,
        "cancellation_policy": Listing.CancellationPolicy.MODERATE,
        "is_pet_friendly": True,
        "listing_type": {"name": "Dom", "icon": "🏡", "slug": "dom"},
        "amenities": [
            {"id": "sauna", "name": "Sauna", "icon": "sauna", "category": "wellness"},
            {"id": "wifi", "name": "Wi‑Fi", "icon": "wifi", "category": "tech"},
            {"id": "parking", "name": "Parking", "icon": "parking", "category": "outdoor"},
            {"id": "fireplace", "name": "Kominek", "icon": "fireplace", "category": "comfort"},
            {"id": "kitchen", "name": "Pełna kuchnia", "icon": "kitchen", "category": "comfort"},
            {"id": "terrace", "name": "Taras z widokiem", "icon": "terrace", "category": "outdoor"},
            {"id": "ac", "name": "Klimatyzacja", "icon": "ac", "category": "comfort"},
        ],
        "destination_score_cache": _score(
            romantic=8.2,
            outdoor=9.1,
            nature=8.7,
            quiet=7.4,
            family=7.9,
            wellness=8.8,
            workation=5.2,
            accessibility=6.8,
        ),
        "description": (
            "Drewniany dom z 2018 roku, ocieplany i całoroczny. Salon z kominkiem i dużym stołem, "
            "kuchnia wyposażona w zmywarkę, piekarnik i ekspres do kawy. Na parterze sypialnia z łóżkiem "
            "king size, na piętrze dwie mniejsze sypialnie. Sauna fińska po całym dniu w górach — to must. "
            "Taras od strony południowej: śniadania przy wschodzie słońca. Do centrum Zakopanego 12 minut "
            "samochodem, szlak na Gubałówkę 25 min pieszo. W cenie drewno do kominka (sezon zimowy)."
        ),
        "blocked_offsets": [45, 46, 47],
        "reviews": [
            (5.0, "Tatry jak z pocztówki", "Wrócimy na pewno. Sauna, widok, cisza — wszystko zgodne z opisem."),
            (4.5, "Idealny na rodzinny wyjazd", "Dzieciaki zachwycone, my też. Polecamy wycieczkę na Rusinową."),
        ],
    },
    {
        "slug": "apartament-nad-jeziorem-niegocin",
        "title": "Apartament z pomostem — Niegocin",
        "short_description": "Nowoczesny apartament w Giżycku: 20 m do mariny, rowery w cenie.",
        "host_email": "piotr.lewandowski@host.staymap.pl",
        "host_first": "Piotr",
        "host_last": "Lewandowski",
        "bio": "Żeglarz i miłośnik Mazur. Pomogę zaplanować rejs lub spływ kajakiem.",
        "city": "Giżycko",
        "region": "warmińsko-mazurskie",
        "lat": 54.0378,
        "lng": 21.7668,
        "address_line": "ul. Portowa 4a",
        "postal_code": "11-500",
        "near_lake": True,
        "near_forest": True,
        "base_price": Decimal("310"),
        "cleaning_fee": Decimal("90"),
        "max_guests": 4,
        "bedrooms": 2,
        "beds": 2,
        "bathrooms": 1,
        "booking_mode": Listing.BookingMode.INSTANT,
        "cancellation_policy": Listing.CancellationPolicy.FLEXIBLE,
        "is_pet_friendly": False,
        "listing_type": {"name": "Apartament", "icon": "🏢", "slug": "apartament"},
        "amenities": [
            {"id": "wifi", "name": "Wi‑Fi", "icon": "wifi", "category": "tech"},
            {"id": "parking", "name": "Parking", "icon": "parking", "category": "outdoor"},
            {"id": "bike", "name": "Rowery", "icon": "bike", "category": "outdoor"},
            {"id": "kitchen", "name": "Kuchnia", "icon": "kitchen", "category": "comfort"},
            {"id": "tv", "name": "Telewizor", "icon": "tv", "category": "tech"},
        ],
        "destination_score_cache": _score(
            romantic=7.8,
            outdoor=8.4,
            nature=8.0,
            quiet=6.5,
            family=8.1,
            wellness=6.0,
            workation=7.0,
            accessibility=8.5,
        ),
        "description": (
            "Apartament na drugim piętrze z widokiem na jezioro. Balkon z meblami ogrodowymi, "
            "klimatyzacja, smart TV. 400 m do plaży miejskiej, 5 minut do Twierdzy Boyen. "
            "W piwnicy schowek na narty wodne i 2 kajaki (po wcześniejszym uzgodnieniu)."
        ),
        "blocked_offsets": [30, 31],
        "reviews": [
            (4.8, "Mazury w najlepszym wydaniu", "Czysto, zadbane, lokalizacja pierwsza klasa."),
        ],
    },
    {
        "slug": "chata-szklarska-poręba-kamienna",
        "title": "Kamienna chata — Karkonosze",
        "short_description": "Stylowa chata z jacuzzi na zewnątrz, 8 min od wyciągu Szrenica.",
        "host_email": "magdalena.nowak@host.staymap.pl",
        "host_first": "Magdalena",
        "host_last": "Nowak",
        "bio": "Prowadzę dwie chaty w Sudetach. Lubię spersonalizowane powitania dla gości.",
        "city": "Szklarska Poręba",
        "region": "dolnośląskie",
        "lat": 50.8247,
        "lng": 15.5225,
        "address_line": "ul. Podgórna 3",
        "postal_code": "58-580",
        "near_mountains": True,
        "near_forest": True,
        "base_price": Decimal("380"),
        "cleaning_fee": Decimal("120"),
        "max_guests": 5,
        "bedrooms": 2,
        "beds": 3,
        "bathrooms": 2,
        "booking_mode": Listing.BookingMode.REQUEST,
        "cancellation_policy": Listing.CancellationPolicy.STRICT,
        "is_pet_friendly": False,
        "listing_type": {"name": "Chata", "icon": "🏔️", "slug": "chata"},
        "amenities": [
            {"id": "jacuzzi", "name": "Jacuzzi na zewnątrz", "icon": "jacuzzi", "category": "wellness"},
            {"id": "wifi", "name": "Wi‑Fi", "icon": "wifi", "category": "tech"},
            {"id": "fireplace", "name": "Kominek", "icon": "fireplace", "category": "comfort"},
            {"id": "parking", "name": "Parking 2 miejsca", "icon": "parking", "category": "outdoor"},
        ],
        "destination_score_cache": _score(
            romantic=8.9,
            outdoor=9.0,
            nature=8.2,
            quiet=8.0,
            family=6.5,
            wellness=9.2,
            workation=5.5,
            accessibility=7.2,
        ),
        "description": (
            "Kamień i drewno, duże przeszklenia na południe. Jacuzzi na tarasie działa cały rok. "
            "Sypialnia na antresoli z widokiem na Śnieżne Kotły. Zimą bus do wyciągu co 20 min (przystanek 200 m)."
        ),
        "blocked_offsets": [14, 15, 16],
        "reviews": [
            (5.0, "Romantyczny weekend", "Jacuzzi o zmierzchu — nie zapomnimy tego widoku."),
            (4.7, "Piekielnie dobre wyjście w góry", "Polecam szlak na Szrenicę o świcie."),
        ],
    },
    {
        "slug": "dom-morski-bryza-hel",
        "title": "Dom „Morska Bryza” — Hel, 300 m od plaży",
        "short_description": "Drewniany dom z ogródkiem, prysznicem zewnętrznym i grillem.",
        "host_email": "tomasz.wisniewski@host.staymap.pl",
        "host_first": "Tomasz",
        "host_last": "Wiśniewski",
        "bio": "Rybak i przewodnik po Mierzei. Wskażę najlepsze foki i lody.",
        "city": "Hel",
        "region": "pomorskie",
        "lat": 54.6067,
        "lng": 18.7933,
        "address_line": "ul. Leśna 8",
        "postal_code": "84-150",
        "near_sea": True,
        "near_forest": True,
        "base_price": Decimal("450"),
        "cleaning_fee": Decimal("100"),
        "max_guests": 7,
        "bedrooms": 3,
        "beds": 5,
        "bathrooms": 2,
        "booking_mode": Listing.BookingMode.INSTANT,
        "cancellation_policy": Listing.CancellationPolicy.MODERATE,
        "is_pet_friendly": True,
        "listing_type": {"name": "Dom", "icon": "🏠", "slug": "dom"},
        "amenities": [
            {"id": "garden", "name": "Ogród z grillem", "icon": "garden", "category": "outdoor"},
            {"id": "wifi", "name": "Wi‑Fi", "icon": "wifi", "category": "tech"},
            {"id": "washer", "name": "Pralka", "icon": "washer", "category": "comfort"},
            {"id": "pets", "name": "Zwierzęta mile widziane", "icon": "pets", "category": "outdoor"},
        ],
        "destination_score_cache": _score(
            romantic=7.5,
            outdoor=8.8,
            nature=7.9,
            quiet=7.0,
            family=9.0,
            wellness=6.5,
            workation=4.5,
            accessibility=7.8,
        ),
        "description": (
            "Idealny na rodzinne wakacje: piasek, lasy sosnowe i spokój. Prysznic na podwórku po plaży, "
            "leżaki i hamak. Rowerki dla dzieci, karta plażowa w cenie sezonu. Do centrum Helu 15 min spacerem."
        ),
        "blocked_offsets": [60, 61, 62, 63],
        "reviews": [
            (4.9, "Wakacje marzenie", "Dzieci w niebie, my też. Plaża blisko, dom super wyposażony."),
        ],
    },
    {
        "slug": "glamping-bieszczady-dolina",
        "title": "Glamping z widokiem na połoniny",
        "short_description": "Namiot safari z łóżkiem king, prywatna łazienka, śniadania regionalne.",
        "host_email": "katarzyna.zielinska@host.staymap.pl",
        "host_first": "Katarzyna",
        "host_last": "Zielińska",
        "bio": "Ekoturystyka i lokalne produkty z sąsiedniej zagrody.",
        "city": "Wetlina",
        "region": "podkarpackie",
        "lat": 49.15,
        "lng": 22.55,
        "address_line": "Dolina Wetlina — dokładny dojazd w wiadomości",
        "postal_code": "38-722",
        "near_mountains": True,
        "near_forest": True,
        "base_price": Decimal("520"),
        "cleaning_fee": Decimal("80"),
        "max_guests": 2,
        "bedrooms": 1,
        "beds": 1,
        "bathrooms": 1,
        "booking_mode": Listing.BookingMode.REQUEST,
        "cancellation_policy": Listing.CancellationPolicy.NON_REFUNDABLE,
        "is_pet_friendly": False,
        "listing_type": {"name": "Glamping", "icon": "⛺", "slug": "glamping"},
        "amenities": [
            {"id": "wifi", "name": "Wi‑Fi (LTE)", "icon": "wifi", "category": "tech"},
            {"id": "kitchen", "name": "Mini kuchnia", "icon": "kitchen", "category": "comfort"},
            {"id": "desk", "name": "Stół roboczy", "icon": "desk", "category": "tech"},
        ],
        "destination_score_cache": _score(
            romantic=9.5,
            outdoor=9.2,
            nature=9.6,
            quiet=9.0,
            family=4.0,
            wellness=7.5,
            workation=6.0,
            accessibility=4.5,
        ),
        "description": (
            "Jeden namiot na działce — pełna prywatność. Poranne mgły w dolinie, wieczorne ognisko. "
            "Śniadanie z jaj sadowych i chlebem z pieca. Najlepiej auto z wyższym prześwitem (ostatnie 2 km polna droga)."
        ),
        "blocked_offsets": [20],
        "reviews": [
            (5.0, "Magia Bieszczad", "Cisza, której szukaliśmy. Pobyt jak z filmu."),
        ],
    },
    {
        "slug": "loft-krakow-kazimierz",
        "title": "Industrialny loft — Kazimierz",
        "short_description": "Designerski apartament 65 m², idealny na city break i remote work.",
        "host_email": "michal.dabrowski@host.staymap.pl",
        "host_first": "Michał",
        "host_last": "Dąbrowski",
        "bio": "Architekt. Loft urządziłem sam — chcę, by Kraków poczuli jak mieszkaniec.",
        "city": "Kraków",
        "region": "małopolskie",
        "lat": 50.05,
        "lng": 19.94,
        "address_line": "ul. Dietla 42 / 15",
        "postal_code": "31-039",
        "near_forest": False,
        "base_price": Decimal("290"),
        "cleaning_fee": Decimal("70"),
        "max_guests": 3,
        "bedrooms": 1,
        "beds": 2,
        "bathrooms": 1,
        "booking_mode": Listing.BookingMode.INSTANT,
        "cancellation_policy": Listing.CancellationPolicy.FLEXIBLE,
        "is_pet_friendly": False,
        "listing_type": {"name": "Apartament", "icon": "🛋️", "slug": "apartament"},
        "amenities": [
            {"id": "wifi", "name": "Światłowód 600 Mb", "icon": "wifi", "category": "tech"},
            {"id": "desk", "name": "Biurko ergonomiczne", "icon": "desk", "category": "tech"},
            {"id": "ac", "name": "Klimatyzacja", "icon": "ac", "category": "comfort"},
            {"id": "washer", "name": "Pralko-suszarka", "icon": "washer", "category": "comfort"},
        ],
        "destination_score_cache": _score(
            romantic=7.0,
            outdoor=3.0,
            nature=2.5,
            quiet=5.5,
            family=5.0,
            wellness=5.0,
            workation=9.2,
            accessibility=9.5,
        ),
        "description": (
            "Wysokie sufity, beton i cegła. Strefa pracy z monitorem 27'', krzesło Herman Miller. "
            "5 minut pieszo na Plac Nowy, 12 minut na Wawel. Idealny na tygodniowy workation + kultura."
        ),
        "blocked_offsets": [],
        "reviews": [
            (4.6, "Workation 10/10", "Internet błyskawiczny, kawa z ekspresu — wracam na targi."),
        ],
    },
    {
        "slug": "willa-sopot-molo",
        "title": "Willa przy Monciaku — Sopot",
        "short_description": "Zabytkowa willa z ogrodem, 4 minuty do molo, śniadania na tarasie.",
        "host_email": "ewa.szymanska@host.staymap.pl",
        "host_first": "Ewa",
        "host_last": "Szymańska",
        "bio": "Trzecie pokolenie sopockiej willi — historia i gościnność.",
        "city": "Sopot",
        "region": "pomorskie",
        "lat": 54.4418,
        "lng": 18.5601,
        "address_line": "ul. Grunwaldzka 18",
        "postal_code": "81-759",
        "near_sea": True,
        "base_price": Decimal("510"),
        "cleaning_fee": Decimal("130"),
        "max_guests": 8,
        "bedrooms": 4,
        "beds": 5,
        "bathrooms": 3,
        "booking_mode": Listing.BookingMode.REQUEST,
        "cancellation_policy": Listing.CancellationPolicy.MODERATE,
        "is_pet_friendly": False,
        "listing_type": {"name": "Willa", "icon": "🏛️", "slug": "willa"},
        "amenities": [
            {"id": "wifi", "name": "Wi‑Fi", "icon": "wifi", "category": "tech"},
            {"id": "parking", "name": "Parking na 2 auta", "icon": "parking", "category": "outdoor"},
            {"id": "garden", "name": "Ogród", "icon": "garden", "category": "outdoor"},
            {"id": "kitchen", "name": "Kuchnia szefa", "icon": "kitchen", "category": "comfort"},
            {"id": "tv", "name": "TV", "icon": "tv", "category": "tech"},
        ],
        "destination_score_cache": _score(
            romantic=8.0,
            outdoor=6.5,
            nature=5.5,
            quiet=6.8,
            family=8.5,
            wellness=7.0,
            workation=6.5,
            accessibility=9.0,
        ),
        "description": (
            "Odrestaurowana przedwojenna willa: oryginalne drzwi i parkiety, nowa łazienka w każdej sypialni. "
            "Taras od strony ogrodu — śniadania z piekarni Migdałowa. Molo i plaża w zasięgu spaceru."
        ),
        "blocked_offsets": [7, 8],
        "reviews": [
            (4.9, "Klasa i klimat", "Czuliśmy się jak w filmie. Pani Ewa bardzo pomocna."),
            (4.8, "Lokalizacja premium", "Wszędzie blisko, a w domu cisza."),
        ],
    },
    {
        "slug": "domek-nad-stawem-wielkopolska",
        "title": "Domek nad stawem — Wielkopolska",
        "short_description": "Drewniany domek dla 4 os., prywatny staw z pomostem, łódka wiosłowa.",
        "host_email": "lukasz.wojcik@host.staymap.pl",
        "host_first": "Łukasz",
        "host_last": "Wójcik",
        "bio": "Rolnik i entuzjasta wędkarstwa — pokażę najlepsze miejsca na szczupaka.",
        "city": "Środa Wielkopolska",
        "region": "wielkopolskie",
        "lat": 52.228,
        "lng": 17.277,
        "address_line": "Gajówka nad stawem (GPS po rezerwacji)",
        "postal_code": "63-000",
        "near_lake": True,
        "near_forest": True,
        "base_price": Decimal("260"),
        "cleaning_fee": Decimal("60"),
        "max_guests": 4,
        "bedrooms": 2,
        "beds": 2,
        "bathrooms": 1,
        "booking_mode": Listing.BookingMode.INSTANT,
        "cancellation_policy": Listing.CancellationPolicy.FLEXIBLE,
        "is_pet_friendly": True,
        "listing_type": {"name": "Domek", "icon": "🏡", "slug": "domek"},
        "amenities": [
            {"id": "wifi", "name": "Wi‑Fi", "icon": "wifi", "category": "tech"},
            {"id": "parking", "name": "Parking", "icon": "parking", "category": "outdoor"},
            {"id": "kitchen", "name": "Kuchnia", "icon": "kitchen", "category": "comfort"},
            {"id": "fireplace", "name": "Kominek", "icon": "fireplace", "category": "comfort"},
        ],
        "destination_score_cache": _score(
            romantic=8.0,
            outdoor=7.5,
            nature=8.8,
            quiet=8.9,
            family=7.8,
            wellness=6.2,
            workation=5.8,
            accessibility=6.0,
        ),
        "description": (
            "Mały domek z łóżkiem na antresoli i salonem na dole. Staw z czystą wodą — kąpiel na własną "
            "odpowiedzialność :) Wędkowanie po uzgodnieniu. Sklep 6 km, cisza gwarantowana."
        ),
        "blocked_offsets": [90, 91],
        "reviews": [
            (4.7, "Reset od miasta", "Staw, ognisko, gwiazdy. Polecamy parom i rodzinom."),
        ],
    },
]


class Command(BaseCommand):
    help = "Wypełnia bazę bogatymi danymi demo (oferty, zdjęcia Unsplash lub PIL, opinie, blokady)."

    def add_arguments(self, parser):
        parser.add_argument(
            "--fresh",
            action="store_true",
            help="Usuwa rezerwacje, opinie, oferty i użytkowników (z wyjątkiem superuserów).",
        )
        parser.add_argument(
            "--refresh-images",
            action="store_true",
            help="Usuwa istniejące zdjęcia ofert demo i ponownie je pobiera (Unsplash / PIL).",
        )
        parser.add_argument(
            "--count",
            type=int,
            default=0,
            help="Ignorowane — zawsze wg stałej listy DEMO_LISTINGS.",
        )

    @transaction.atomic
    def handle(self, *args, **options):
        self.stdout.write(self.style.HTTP_INFO("StayMap — seed_db (Etap 3)"))
        self._refresh_images = bool(options["refresh_images"])

        if options["fresh"]:
            from apps.ai_assistant.models import AiRecommendation

            AiRecommendation.objects.all().delete()
            from apps.discovery.models import CollectionListing, CompareSession, DiscoveryCollection

            CompareSession.objects.all().delete()
            CollectionListing.objects.all().delete()
            DiscoveryCollection.objects.all().delete()
            from apps.users.models import SavedSearch, WishlistItem

            WishlistItem.objects.all().delete()
            SavedSearch.objects.all().delete()
            BookingStatusHistory.objects.all().delete()
            Booking.all_objects.all().delete()
            BlockedDate.all_objects.all().delete()
            Review.all_objects.all().delete()
            ListingImage.all_objects.all().delete()
            ListingLocation.all_objects.all().delete()
            Listing.all_objects.all().delete()
            HostProfile.all_objects.all().delete()
            User.objects.filter(is_superuser=False).delete()
            self.stdout.write("  Wyczyszczono dane (bez superuserów).")

        self._ensure_admin()
        self._ensure_demo_guests()

        for spec in DEMO_LISTINGS:
            self._upsert_listing(spec)

        self._seed_discovery()

        self.stdout.write(
            self.style.SUCCESS(
                f"  Gotowe: {User.objects.count()} użytkowników, "
                f"{Listing.objects.count()} ofert, "
                f"{Review.objects.count()} opinii."
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

    def _ensure_demo_guests(self):
        """Goście wystawiający opinie + konto pod rezerwacje."""
        guests = [
            ("guest1@staymap.pl", "Aleksandra", "Maj", "guest12345"),
            ("guest2@staymap.pl", "Bartosz", "Celinski", "guest12345"),
            ("guest3@staymap.pl", "Karolina", "Piotrowska", "guest12345"),
            ("traveler@staymap.pl", "Jan", "Kowalczyk", "travel12345"),
        ]
        for email, fn, ln, pw in guests:
            u, created = User.objects.get_or_create(
                email=email,
                defaults={"first_name": fn, "last_name": ln, "is_host": False},
            )
            if created:
                u.set_password(pw)
                u.save()
        self.stdout.write("  Konta demo gości: guest1@… guest2@… guest3@… traveler@… (hasła jak wyżej)")

    def _upsert_listing(self, spec: dict):
        email = spec["host_email"]
        user, created = User.objects.get_or_create(
            email=email,
            defaults={
                "first_name": spec["host_first"],
                "last_name": spec["host_last"],
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
        profile.bio = spec["bio"]
        profile.avatar_url = f"https://i.pravatar.cc/150?u={email}"
        profile.is_verified = True
        profile.response_rate = Decimal("0.97")
        profile.save(update_fields=["bio", "avatar_url", "is_verified", "response_rate", "updated_at"])

        listing, lc = Listing.all_objects.get_or_create(
            slug=spec["slug"],
            defaults={
                "host": profile,
                "title": spec["title"],
                "short_description": spec["short_description"],
                "description": spec["description"],
                "base_price": spec["base_price"],
                "cleaning_fee": spec["cleaning_fee"],
                "currency": "PLN",
                "status": Listing.Status.APPROVED,
                "max_guests": spec["max_guests"],
                "bedrooms": spec["bedrooms"],
                "beds": spec["beds"],
                "bathrooms": spec["bathrooms"],
                "booking_mode": spec["booking_mode"],
                "cancellation_policy": spec["cancellation_policy"],
                "is_pet_friendly": spec["is_pet_friendly"],
                "listing_type": spec["listing_type"],
                "amenities": spec["amenities"],
                "destination_score_cache": spec["destination_score_cache"],
                "check_in_time": "15:00",
                "check_out_time": "11:00",
            },
        )
        if not lc:
            listing.host = profile
            listing.title = spec["title"]
            listing.short_description = spec["short_description"]
            listing.description = spec["description"]
            listing.base_price = spec["base_price"]
            listing.cleaning_fee = spec["cleaning_fee"]
            listing.status = Listing.Status.APPROVED
            listing.max_guests = spec["max_guests"]
            listing.bedrooms = spec["bedrooms"]
            listing.beds = spec["beds"]
            listing.bathrooms = spec["bathrooms"]
            listing.booking_mode = spec["booking_mode"]
            listing.cancellation_policy = spec["cancellation_policy"]
            listing.is_pet_friendly = spec["is_pet_friendly"]
            listing.listing_type = spec["listing_type"]
            listing.amenities = spec["amenities"]
            listing.destination_score_cache = spec["destination_score_cache"]
            listing.deleted_at = None
            listing.save()

        loc, _ = ListingLocation.all_objects.get_or_create(
            listing=listing,
            defaults={
                "point": Point(
                    spec["lng"] + 0.002,
                    spec["lat"] + 0.002,
                    srid=4326,
                ),
                "city": spec["city"],
                "region": spec["region"],
                "country": "PL",
                "address_line": spec["address_line"],
                "postal_code": spec["postal_code"],
                **{k: spec.get(k, False) for k in LOCATION_TAG_FIELD_NAMES},
            },
        )
        loc.city = spec["city"]
        loc.region = spec["region"]
        loc.address_line = spec["address_line"]
        loc.postal_code = spec["postal_code"]
        for k in LOCATION_TAG_FIELD_NAMES:
            setattr(loc, k, spec.get(k, False))
        loc.point = Point(spec["lng"] + 0.002, spec["lat"] + 0.002, srid=4326)
        loc.deleted_at = None
        loc.save()

        n_img = listing.images.filter(deleted_at__isnull=True).count()
        if n_img == 0 or self._refresh_images:
            if n_img > 0:
                ListingImage.all_objects.filter(listing=listing).delete()
            photo_urls = DEMO_LISTING_PHOTOS.get(spec["slug"], [])
            for i in range(5):
                li = ListingImage(listing=listing, is_cover=(i == 0), sort_order=i)
                li.alt_text = f"{spec['title'][:80]} — ujęcie {i + 1}"
                fname = f"{spec['slug']}-{i}.jpg"
                img_file = None
                if i < len(photo_urls):
                    img_file = _fetch_remote_jpeg(photo_urls[i], fname)
                    if img_file is None:
                        self.stdout.write(
                            self.style.WARNING(
                                f"  Unsplash niedostępny dla {spec['slug']} #{i + 1}, użyto placeholderu PIL."
                            )
                        )
                if img_file is None:
                    img_file = _jpeg_placeholder(spec["title"], i)
                li.image.save(img_file.name, img_file, save=False)
                li.save()

        Review.objects.filter(listing=listing).delete()
        reviewers = list(User.objects.filter(email__startswith="guest").order_by("email")[:3])
        for idx, (stars, title, body) in enumerate(spec["reviews"]):
            rev_user = reviewers[idx % len(reviewers)] if reviewers else None
            Review.objects.create(
                listing=listing,
                booking=None,
                author=rev_user,
                reviewer_role=Review.ReviewerRole.GUEST,
                author_display_first=rev_user.first_name if rev_user else "Gość",
                author_display_last=rev_user.last_name if rev_user else "StayMap",
                overall_rating=Decimal(str(stars)),
                title=title,
                content=body,
                subscores={
                    "cleanliness": float(stars) - 0.1,
                    "location": float(stars),
                    "communication": float(stars),
                    "accuracy": float(stars) - 0.2,
                },
                is_public=True,
                is_blind_review_released=True,
            )

        BlockedDate.all_objects.filter(listing=listing).delete()
        today = date.today()
        for off in spec.get("blocked_offsets", []):
            BlockedDate.objects.create(listing=listing, date=today + timedelta(days=off))

        self.stdout.write(f"  Oferta: {listing.title} ({listing.slug})")

    def _seed_discovery(self):
        """Kolekcje na stronę główną (Etap 5)."""
        from apps.discovery.models import CollectionListing, DiscoveryCollection
        from apps.discovery.services import DiscoveryFeedService
        from apps.listings.models import Listing

        mountain_slugs = [
            "domek-z-widokiem-na-giewont-zakopane",
            "chata-szklarska-poręba-kamienna",
            "glamping-bieszczady-dolina",
        ]

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

        for i, slug in enumerate(mountain_slugs):
            listing = Listing.objects.filter(slug=slug, status=Listing.Status.APPROVED).first()
            if listing:
                CollectionListing.objects.create(collection=col_mount, listing=listing, sort_order=i)

        DiscoveryFeedService.invalidate_homepage_cache()
        self.stdout.write(self.style.SUCCESS("  Discovery: kolekcje homepage zaktualizowane."))

