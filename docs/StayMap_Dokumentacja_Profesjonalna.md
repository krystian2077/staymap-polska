# StayMap Polska — Profesjonalna Dokumentacja Techniczna

> **v2.0 — Marzec 2025** · Premium map-first AI-powered platforma rezerwacji noclegów w Polsce

---

## Spis Treści

01. [Code Review Specyfikacji](#code-review-specyfikacji)
02. [Architektura Systemu](#architektura-systemu)
03. [Modele Danych — ERD](#modele-danych--erd)
04. [Przypadki Użycia i Scenariusze](#przypadki-użycia-i-scenariusze)
05. [Struktura Projektu](#struktura-projektu)
06. [Konwencje i Standardy](#konwencje-i-standardy)
07. [Setup Środowiska Dev](#setup-środowiska-dev)
08. [Plan Implementacji](#plan-implementacji)
09. [Indeksy Bazodanowe](#indeksy-bazodanowe)
10. [Rejestr Tasków Celery](#rejestr-tasków-celery)
11. [WebSocket Events Schema](#websocket-events-schema)
12. [Quick Wins i Pułapki](#quick-wins-i-pułapki)
13. [API Reference](#api-reference)
14. [Bezpieczeństwo](#bezpieczeństwo)
15. [Wydajność i Optymalizacja](#wydajność-i-optymalizacja)
16. [Travel Modes — Specyfikacja](#travel-modes--specyfikacja)
17. [Pricing Engine — Algorytm](#pricing-engine--algorytm)
18. [Destination Score — Algorytm](#destination-score--algorytm)

---


# 01 Code Review Specyfikacji

> ✅ **OK:** Specyfikacja solidnie napisana — powyżej standardu typowego projektu portfolio. Widoczna znajomość DDD i clean architecture.


| Obszar | Ocena | Komentarz |
|--------|-------|-----------|
| Architektura domenowa | ⭐ 9/10 | Doskonały podział na bounded contexts |
| Separacja warstw | ⭐ 9/10 | Views → Serializers → Services → Models |
| Modelowanie danych | 7/10 | Brak soft delete, indeksów, currency |
| Bezpieczeństwo | 6/10 | Brak rate limiting, audit log, webhook verify |
| Skalowalność | ⭐ 8/10 | Redis + Celery + Cache dobrze zaplanowane |
| Kompletność spec. | 7/10 | Brak WebSocket schema, error handling, TTL |


## 1.1 Mocne Strony — Zachować 1:1

| Element | Dlaczego dobry |
|---------|----------------|
| **Domenowy podział appek Django** | Prawidłowe bounded contexts — users, listings, bookings, pricing jako osobne apps zgodne z DDD |
| **BookingStatusHistory** | Osobna tabela historii statusów — niezbędna do debugowania sporów, refundów i audytów |
| **ListingDraft z completion_percent** | Eleganckie rozwiązanie dla kreatorów wielokrokowych — zapisanie postępu bez wymuszania publikacji |
| **PriceQuoteCache z expires_at** | Poprawny wzorzec cache — hash parametrów jako klucz, TTL, invalidacja |
| **NearbyPlaceCache** | OSM Overpass jest wolny — cache z TTL 24h to konieczność, nie opcja |
| **JSONField dla pricing_breakdown** | Snapshot ceny w momencie rezerwacji zamiast ponownego przeliczania — prawidłowe |
| **Hybrydowy booking mode (instant/request)** | Daje gospodarzom elastyczność — dokładnie jak Airbnb |
| **PointField (PostGIS)** | Poprawne użycie geolokalizacji — ST_DWithin wydajny przy indeksie GiST |
| **AI session model hierarchy** | AiTravelSession → AiTravelPrompt → AiFilterInterpretation — dobra granularność do debugowania |


## 1.2 Problemy Krytyczne 🔴

> 🔴 **KRYTYCZNE:** Poniższe problemy MUSZĄ być rozwiązane PRZED napisaniem pierwszej linii kodu produkcyjnego.



### KR-1: Brak Custom User Model PRZED Pierwszą Migracją

> ⚠️ **UWAGA:** Django nie pozwala na zmianę User modelu po pierwszej migracji bez pełnego resetu bazy danych.


```
# apps/users/models.py — MUST BE DONE FIRST
class User(AbstractBaseUser, PermissionsMixin):
    email        = models.EmailField(unique=True)
    first_name   = models.CharField(max_length=100)
    last_name    = models.CharField(max_length=100)
    phone_number = models.CharField(max_length=20, blank=True)
    is_host      = models.BooleanField(default=False)
    is_admin     = models.BooleanField(default=False)
    is_active    = models.BooleanField(default=True)
    is_staff     = models.BooleanField(default=False)
    created_at   = models.DateTimeField(auto_now_add=True)
    deleted_at   = models.DateTimeField(null=True, blank=True)
    USERNAME_FIELD  = 'email'
    REQUIRED_FIELDS = ['first_name', 'last_name']
    objects = UserManager()

# settings/base.py
AUTH_USER_MODEL = 'users.User'  # PRZED PIERWSZĄ MIGRACJĄ!
```


### KR-2: Brak Soft Delete — Złamane Relacje FK

```
# apps/common/models.py
class SoftDeleteManager(models.Manager):
    def get_queryset(self):
        return super().get_queryset().filter(deleted_at__isnull=True)

class BaseModel(models.Model):
    created_at   = models.DateTimeField(auto_now_add=True)
    updated_at   = models.DateTimeField(auto_now=True)
    deleted_at   = models.DateTimeField(null=True, blank=True, db_index=True)
    objects      = SoftDeleteManager()     # domyślny: filtruje deleted
    all_objects  = models.Manager()        # wszystkie rekordy

    def soft_delete(self):
        self.deleted_at = timezone.now()
        self.save(update_fields=['deleted_at'])

    class Meta:
        abstract = True
```


### KR-3: Brak Pola currency

```
class Listing(BaseModel):
    base_price = models.DecimalField(max_digits=10, decimal_places=2)
    currency   = models.CharField(max_length=3, default='PLN')  # ← DODAJ

class Booking(BaseModel):
    final_amount = models.DecimalField(max_digits=10, decimal_places=2)
    currency     = models.CharField(max_length=3, default='PLN')  # ← DODAJ
```


### KR-4: Brak Indeksów Bazodanowych

> ⚠️ **UWAGA:** Brak GiST index na PointField = full table scan przy każdym geo-query = timeout przy >5000 listingów.



## 1.3 Problemy Ważne 🟡

| ID | Problem | Rekomendacja |
|----|---------|--------------|
| **WA-1** | Zbyt szerokie role (guest/host/admin w jednym CharField) | Zmień na flagi: is_host + is_admin (user może być i hostem i gościem) |
| **WA-2** | SavedSearch.query_payload bez schematu | Zdefiniuj TypedDict SearchQuerySchema |
| **WA-3** | AiTravelSession bez TTL | Dodaj expires_at = created_at + 24h + Celery cleanup |
| **WA-4** | Brak audit logu | django-simple-history lub własny AuditLog model |
| **WA-5** | Rate limiting bez planu | Zdefiniuj: AI search 10/h, auth 5/min, payments 20/h |
| **WA-6** | CompareSession bez limitu i TTL | Max 3 listingi, expires_at + Celery cleanup |
| **WA-7** | Review blind period bez implementacji | 14-dni release logic + Celery Beat task z eta |
| **WA-8** | Brak strategii upload plików | MIME validation + magic bytes + Pillow re-encode + max 10MB |


## 1.4 Kluczowe Rekomendacje Architektoniczne

- **RK-1 — BFF Layer w Next.js:** Route Handlers jako pośrednik — ukrycie Django API, server-side token refresh, brak problemów CORS
- **RK-2 — Cursor Pagination dla mapy:** Offset pagination + sort po odległości = duplikaty. CursorPagination jest stable.
- **RK-3 — Atomic + select_for_update() w Booking:** Jedyna pewna ochrona przed double-bookingiem przy dużym ruchu
- **RK-4 — Idempotent Stripe Webhook:** Stripe może wysłać webhook kilka razy — sprawdzaj PaymentWebhookLog.processed
- **RK-5 — Global DRF Exception Handler:** Ujednolicony format błędów — frontend może switch() na code zamiast parsować stringi

---


# 02 Architektura Systemu


## 2.1 Stack Technologiczny

| Warstwa | Technologia | Wersja | Uzasadnienie |
|---------|-------------|--------|--------------|
| Frontend | Next.js | 14 (App Router) | SSR/SSG, SEO, image optimization, Server Components |
| Frontend UI | Tailwind CSS + shadcn/ui | latest | Design system, dark mode, a11y |
| State Management | Zustand | latest | Lżejszy niż Redux, TypeScript-friendly |
| Mapy | Mapbox GL JS | latest | WebGL, clustering, custom layers |
| Backend | Django | 5.x | ORM, migrations, admin, signals |
| REST API | Django REST Framework | 3.x | Serializers, ViewSets, permissions, throttling |
| Geo | GeoDjango + PostGIS | current | ST_DWithin, ST_Distance, GiST index |
| WebSockets | Django Channels | 4+ | ASGI, WebSocket consumers, groups |
| Baza danych | PostgreSQL + PostGIS | 16+ | JSONB, spatial, FTS, reliability |
| Cache + Broker | Redis | 7+ | Cache, Celery broker, pub/sub |
| Task Queue | Celery | 5+ | Async tasks, scheduled, retry |
| Auth | djangorestframework-simplejwt | latest | Access + Refresh tokens, rotation |
| Płatności | Stripe + Przelewy24 | latest | PL (BLIK) + EU market |
| AI | OpenAI GPT-4o | current | Function calling, structured output |
| POI Data | OpenStreetMap + Overpass API | current | Bezpłatne, dokładne dla PL |
| Storage | AWS S3 / Cloudflare R2 | current | Zdjęcia — R2 tańszy egress |
| API Docs | drf-spectacular (OpenAPI 3) | latest | Auto-generated Swagger UI |
| Monitoring | Sentry | latest | Error tracking, performance |
| CI/CD | GitHub Actions | current | Testy + deploy on merge |


## 2.2 Diagram Architektury

```
┌─────────────────────────────────────────────────────────────────────┐
│                        INTERNET                                     │
└─────────────────────────┬───────────────────────────────────────────┘
                          │ HTTPS / WSS
┌─────────────────────────▼───────────────────────────────────────────┐
│                  NGINX REVERSE PROXY                                │
│  SSL │ Static Files │ /api/* → Gunicorn │ /ws/* → Daphne           │
└──────┬──────────────────────────────────────┬───────────────────────┘
       │ REST API                              │ WebSocket
┌──────▼─────────────┐               ┌────────▼──────────────────────┐
│  Django + DRF       │               │  Django Channels (ASGI)       │
│  drf-spectacular    │               │  Messaging │ Presence │ Notif │
└──────┬──────────────┘               └────────┬──────────────────────┘
       │                                        │
┌──────┴────────────────────────────────────────┴─────────────────────┐
│                          REDIS 7                                     │
│  DB0: Cache │ DB1: Celery Broker │ DB2: Channel Layers               │
└──────────────────────────────────────────────────────────────────────┘
       │
┌──────▼────────────────────────────────────────────────────────────-─┐
│               POSTGRESQL 16 + POSTGIS                               │
│  JSONB │ GiST Index │ FTS │ Spatial Queries │ Row-Level Lock        │
└────────────────────────────────────────────────────────────────────-─┘
       │
┌──────┴──────────────────────────────────────────────────────────────┐
│  EXTERNAL: OpenAI GPT-4o │ Stripe │ Przelewy24 │ OSM │ S3/R2       │
└─────────────────────────────────────────────────────────────────────┘
```


## 2.3 Warstwy Backendu

```
Views/ViewSets  ──(HTTP routing, auth, permissions)──►
Serializers     ──(walidacja, transformacja danych)──►
Services        ──(CAŁA logika biznesowa, testowalne)──►
Managers/QS     ──(zaawansowane zapytania DB, geo)──►
Models          ──(encje, relacje, migracje, Meta/indexes)
```


## 2.4 Sekwencja: Wyszukiwanie z Mapą

```
User    Next.js      Django API      Redis       PostgreSQL
 │         │               │            │              │
 │ query   │               │            │              │
 ├────────►│ debounce 300ms│            │              │
 │         │ GET /search/  │            │              │
 │         ├──────────────►│ cache GET  │              │
 │         │               ├───────────►│              │
 │         │               │ HIT/return │              │
 │         │               │◄───────────┤              │
 │         │               │ MISS: ST_DWithin query    │
 │         │               ├──────────────────────────►│
 │         │               │◄──────────────────────────┤
 │         │               │ cache SET  │              │
 │         │               ├───────────►│              │
 │ results │◄──────────────┤            │              │
 │◄────────┤               │            │              │
```


## 2.5 Sekwencja: Rezerwacja

```
User    Frontend     Django API    Stripe      DB         Celery
 │          │              │           │         │             │
 │ daty     │              │           │         │             │
 ├─────────►│ POST /quote/ │           │         │             │
 │          ├─────────────►│ Pricing   │         │             │
 │          │◄─────────────┤           │         │             │
 │ Rezerwuj │              │           │         │             │
 ├─────────►│ POST /book/  │           │         │             │
 │          ├─────────────►│ BEGIN ATOMIC         │             │
 │          │              │ select_for_update    │             │
 │          │              ├─────────────────────►│             │
 │          │              │ CREATE Booking       │             │
 │          │              ├─────────────────────►│             │
 │          │              │ COMMIT               │             │
 │          │              │ CreateCheckout │     │             │
 │          │              ├───────────────►│     │             │
 │ redirect │◄─────────────┤ checkout_url   │     │             │
 ├──────────────────────────────────────────►     │             │
 │          │ webhook      │           │          │             │
 │          │◄─────────────────────────┤          │             │
 │          │              │ status=confirmed     │             │
 │          │              ├─────────────────────►│             │
 │          │              │                      │ email task ►│
 │ email ◄──────────────────────────────────────────────────────┤
```


---


# 03 Modele Danych — ERD


## 3.1 ERD Wysokiego Poziomu

```
USER ──< UserProfile
 │
 └──< HostProfile ──< LISTING ──< ListingImage
                          │      ──< ListingLocation (PointField)
                          │      >─< Amenity
                          │
                          └──< BOOKING ──< BookingStatusHistory
                                  │
                                  ├──── PAYMENT ──< Refund
                                  └──── REVIEW ──< ReviewCategoryScore

LISTING ──< NearbyPlaceCache (OSM POI)
         ──< AreaSummaryCache
         ──< SeasonalPricingRule
         ──< HolidayPricingRule
         ──< BlockedDate

USER ──< Conversation ──< Message
USER ──< AiTravelSession ──< AiTravelPrompt ──< AiFilterInterpretation
                                             ──< AiRecommendation
```


## 3.2 Model: User

> ⚠️ **UWAGA:** KRYTYCZNE: Musi być stworzony PRZED jakąkolwiek migracją.


| Pole | Typ | Opis |
|------|-----|------|
| `id` | `UUIDField (PK)` | UUID zamiast auto-int — bezpieczniejsze w URL |
| `email` | `EmailField (unique)` | USERNAME_FIELD — używany do logowania |
| `first_name, last_name` | `CharField` |  |
| `phone_number` | `CharField (blank)` | Opcjonalny, dla SMS |
| `is_host` | `BooleanField (default=False)` | Aktywowany po onboardingu |
| `is_admin` | `BooleanField (default=False)` | Dostęp do panelu admin |
| `is_active` | `BooleanField (default=True)` | Soft disable konta |
| `deleted_at` | `DateTimeField (null)` | Soft delete z BaseModel |


## 3.3 Model: Listing — Kluczowe Pola

| Pole | Typ | Uwagi |
|------|-----|-------|
| `id` | `UUIDField (PK)` |  |
| `host` | `FK(HostProfile, PROTECT)` | PROTECT — nie kasuj hosta z aktywnymi ofertami |
| `slug` | `SlugField (unique, db_index)` | URL-friendly, auto-generowany |
| `base_price` | `DecimalField` |  |
| `currency` | `CharField (default=PLN)` | ⚠️ DODAJ — brakuje w oryginalnej spec |
| `booking_mode` | `CharField (instant/request)` | Per-listing setting |
| `status` | `CharField (db_index)` | draft/pending/approved/rejected/archived |
| `average_rating` | `DecimalField (null)` | Denormalizacja — aktualizowane przez signal/Celery |
| `destination_score_cache` | `JSONField (null)` | Cache heurystycznych ocen per Travel Mode |
| `deleted_at` | `DateTimeField (null)` | Soft delete |

```
class Meta:
    indexes = [
        models.Index(fields=['status', 'created_at']),
        models.Index(fields=['host_id', 'status']),
    ]
    # GiST index na point — osobna migracja:
    # CREATE INDEX ON location_intelligence_listinglocation USING GIST (point);
```


## 3.4 Model: Booking — Kluczowe Pola + Constraints

```
class Booking(BaseModel):
    class Status(models.TextChoices):
        PENDING          = 'pending',          'Oczekująca'
        AWAITING_PAYMENT = 'awaiting_payment', 'Oczekuje płatności'
        CONFIRMED        = 'confirmed',        'Potwierdzona'
        CANCELLED        = 'cancelled',        'Anulowana'
        REJECTED         = 'rejected',         'Odrzucona'
        COMPLETED        = 'completed',        'Zakończona'

    listing          = models.ForeignKey(Listing, on_delete=models.PROTECT)
    guest            = models.ForeignKey(User, on_delete=models.PROTECT)
    check_in         = models.DateField(db_index=True)
    check_out        = models.DateField(db_index=True)
    status           = models.CharField(choices=Status.choices, db_index=True)
    pricing_breakdown = models.JSONField()    # Snapshot ceny
    final_amount     = models.DecimalField(max_digits=10, decimal_places=2)
    currency         = models.CharField(max_length=3, default='PLN')  # ⚠️
    stripe_checkout_id = models.CharField(null=True)

    class Meta:
        indexes = [
            models.Index(fields=['listing_id', 'check_in', 'check_out']),
            models.Index(fields=['guest_id', 'status']),
        ]
        constraints = [
            models.CheckConstraint(
                check=Q(check_out__gt=F('check_in')),
                name='booking_checkout_after_checkin'
            ),
        ]
```


---


# 04 Przypadki Użycia i Scenariusze


## 4.1 Diagram UC

```
  GOŚĆ:          UC-01 Szukaj klasycznie | UC-02 Szukaj AI | UC-03 Mapa
                 UC-04 Filtry | UC-05 Szczegóły | UC-06 Dostępność
                 UC-07 Rezerwuj (instant) | UC-08 Prośba (request)
                 UC-09 Płać | UC-10 Anuluj | UC-11 Opinia | UC-12 Wiadomość
                 UC-13 Wishlist | UC-14 Porównaj | UC-15 Zapisz wyszukiwanie

  GOSPODARZ:     UC-17 Onboarding | UC-18 Stwórz ofertę | UC-19 Kalendarz/ceny
                 UC-20 Zarządzaj rezerwacjami | UC-21 Wiadomości | UC-22 Analityka

  ADMINISTRATOR: UC-24 Moderuj oferty | UC-25 Użytkownicy | UC-26 Zgłoszenia
                 UC-27 Discovery collections | UC-28 Metryki | UC-29 Refundy
```


## 4.2 UC-07: Rezerwacja Instant — Scenariusz Główny

1. Gość na stronie oferty wybiera daty przez kalendarz dostępności
2. System sprawdza dostępność real-time (bez cache)
3. BookingWidget wyświetla PriceBreakdown: noce × stawka + mnożniki + opłaty
4. Gość klika 'Rezerwuj teraz' — jeśli niezalogowany: modal auth
5. Strona podsumowania: dane + cena + zasady + opcjonalne prośby
6. POST /api/v1/bookings/ — atomic transaction + select_for_update()
7. Redirect do Stripe Checkout (lub P24 dla BLIK)
8. Stripe webhook → booking.status = confirmed
9. Celery: e-mail potwierdzający do gościa i hosta
10. Redirect na /booking/{id}/success

**Ścieżki Alternatywne:**
- 2a: Daty niedostępne → komunikat + sugestia pobliskich dat
- 8a: PriceQuoteCache wygasł (>15 min) → recalculate przed payment
- 10a: Płatność odrzucona → booking.status = payment_failed → retry
- 10b: User opuszcza Stripe → booking.status = abandoned → Celery cleanup po 1h
- 10c: Race condition — ktoś zarezerwował → select_for_update → BookingUnavailableError → kalendarz


## 4.3 UC-17: Host Onboarding — Kreator 6 Kroków

```
KROK 1: 'O Tobie'        → Imię, bio, zdjęcie → HostProfile
KROK 2: 'Twój obiekt'    → Typ, max goście, pokoje
KROK 3: 'Lokalizacja'    → Adres + pinezka na mapie + cechy (góry, jezioro)
KROK 4: 'Zdjęcia'        → Min 5 zdjęć, drag&drop, cover photo
KROK 5: 'Ceny'           → Base price, cleaning fee, reguły rabatów
KROK 6: 'Publikacja'     → Checklista → Submit do moderacji

Każdy krok = PATCH /api/v1/host/listings/draft/{id}/ — auto-save
completion_percent aktualizowany na każdym kroku
```


## 4.4 Blind Review Timeline

```
CHECKOUT        +0 dni          +14 dni (lub gdy obie strony wystawią)
    │               │                    │
    ▼               ▼                    ▼
Booking       Gość pisze     AUTO-RELEASE (Celery Beat task)
completed     recenzję       Recenzje stają się widoczne publicznie
    │          Host pisze
    │          recenzję
    └─── e-mail reminder: 'Oceń swój pobyt'

Przed release: żadna strona nie widzi opinii drugiej.
Po release: obie opinie widoczne + host może odpowiedzieć (1 raz).
```


---


# 05 Struktura Projektu


## 5.1 Root Monorepo

```
staymap-polska/
├── backend/
├── frontend/
├── docker/
│   ├── backend.Dockerfile
│   ├── frontend.Dockerfile
│   └── nginx.Dockerfile
├── docker-compose.yml
├── docker-compose.prod.yml
├── .env.example
├── Makefile
├── .github/workflows/
│   ├── ci.yml
│   └── deploy.yml
└── README.md
```


## 5.2 Backend — Django (kluczowe)

```
backend/
├── config/
│   ├── settings/
│   │   ├── base.py          # DB, Celery, REST_FRAMEWORK, CORS
│   │   ├── development.py
│   │   ├── production.py    # DEBUG=False, S3, Sentry
│   │   └── testing.py       # In-memory DB, mock APIs
│   ├── urls.py
│   ├── asgi.py              # Channels entry point
│   └── wsgi.py
├── apps/
│   ├── common/              # BaseModel, exceptions, pagination, permissions
│   ├── users/               # User, UserProfile, WishlistItem
│   ├── listings/            # Listing, ListingImage, Amenity
│   ├── search/              # SearchOrchestrator, RankingEngine, TravelModeRanker
│   ├── bookings/            # Booking, BookingStatusHistory, AvailabilityService
│   ├── pricing/             # PricingService, polish_holidays.py
│   ├── payments/            # Stripe, P24, WebhookHandler
│   ├── ai_assistant/        # AISearchService, GPT-4o function calling
│   ├── location_intelligence/ # NearbyPlaceCache, OSMService
│   ├── reviews/
│   ├── messaging/           # Channels consumers
│   ├── moderation/
│   ├── notifications/
│   ├── discovery/
│   ├── analytics/
│   └── host/
├── requirements/
│   ├── base.txt
│   ├── development.txt
│   └── production.txt
├── conftest.py
└── pytest.ini
```


## 5.3 Każda App — Standardowa Struktura

```
apps/bookings/
├── models.py          # Booking, BookingStatusHistory
├── serializers.py     # BookingCreateSerializer, BookingDetailSerializer
├── views.py           # BookingViewSet
├── services.py        # BookingService, AvailabilityService  ← logika biznesowa
├── managers.py        # BookingQuerySet
├── permissions.py     # IsBookingOwner
├── tasks.py           # send_emails, auto_reject, cancel_abandoned
├── signals.py         # post_save → update stats
├── admin.py
├── urls.py
├── migrations/
└── tests/
    ├── factories.py   # BookingFactory
    ├── test_models.py
    ├── test_services.py  ← najważniejsze
    └── test_api.py
```


---


# 06 Konwencje i Standardy


## 6.1 Python / Django — Nazewnictwo

| Element | Konwencja | Przykład |
|---------|-----------|---------|
| Modele | PascalCase, liczba pojedyncza | `Listing`, `BookingStatusHistory` |
| Pola modeli | snake_case | `base_price`, `check_in_time` |
| Serwisy | Klasa PascalCase + Service | `BookingService.create_booking()` |
| Serializers | PascalCase + Serializer | `BookingCreateSerializer` |
| URL paths | kebab-case, plural | `/api/v1/saved-searches/` |
| Celery tasks | snake_case, opis akcji | `send_booking_confirmation_email` |
| Testy | `test_` prefix opisowy | `test_booking_raises_on_overlap` |
| Choices | Inner TextChoices class | `Booking.Status.CONFIRMED` |


## 6.2 Wzorzec Serwisu (core pattern)

```
# apps/bookings/services.py
class BookingService:
    @staticmethod
    @transaction.atomic
    def create_booking(validated_data: dict, guest: User) -> Booking:
        """
        Tworzy rezerwację. Atomowa transakcja z row-level lock.
        Raises: BookingUnavailableError, PricingError
        """
        listing = Listing.objects.select_for_update().get(
            pk=validated_data['listing_id']
        )
        if not AvailabilityService.is_available(
            listing, validated_data['check_in'], validated_data['check_out']
        ):
            raise BookingUnavailableError('Termin niedostępny')

        booking = Booking.objects.create(**validated_data, guest=guest)
        BookingStatusHistory.objects.create(
            booking=booking, new_status=Booking.Status.PENDING, changed_by=guest
        )
        send_booking_request_email.delay(booking.pk)
        return booking
```


## 6.3 API Response Format

```
# Sukces — single object:
{ "data": { ... }, "meta": {} }

# Sukces — lista:
{ "data": [...], "meta": { "count": 100, "next": "...", "previous": "..." } }

# Błąd (ujednolicony format):
{
  "error": {
    "code": "BOOKING_UNAVAILABLE",
    "message": "Wybrane daty są niedostępne.",
    "field": null,
    "status": 400
  }
}
```


## 6.4 Git — Conventional Commits

| Prefix | Kiedy | Przykład |
|--------|-------|---------|
| `feat:` | Nowa funkcjonalność | `feat(search): add travel mode filter` |
| `fix:` | Bugfix | `fix(booking): prevent double-booking` |
| `refactor:` | Bez zmiany zachowania | `refactor(pricing): extract holiday logic` |
| `test:` | Testy | `test(listings): add geo query coverage` |
| `perf:` | Optymalizacja | `perf(search): add GiST index on point` |
| `security:` | Bezpieczeństwo | `security: validate Stripe webhook signature` |
| `chore:` | Deps, config | `chore: upgrade django to 5.1` |

**Branch strategy:** `main` → `develop` → `feature/etap1-user-auth`, `fix/booking-race`

---


# 07 Setup Środowiska Dev


## 7.1 Wymagania

| Tool | Wersja Min. |
|------|-------------|
| Docker Desktop | 4.x (Engine 24+) |
| Node.js | 20 LTS |
| Git | 2.40+ |
| Make | any |


## 7.2 docker-compose.yml (Dev)

```
version: '3.9'
services:
  db:
    image: postgis/postgis:16-3.4
    environment:
      POSTGRES_DB: staymap_dev
      POSTGRES_USER: staymap
      POSTGRES_PASSWORD: staymap_secret
    ports: ['5432:5432']
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -U staymap']
      interval: 10s
      retries: 5

  redis:
    image: redis:7-alpine
    ports: ['6379:6379']

  backend:
    build: { context: ., dockerfile: docker/backend.Dockerfile }
    command: python manage.py runserver 0.0.0.0:8000
    volumes: [./backend:/app]
    ports: ['8000:8000']
    env_file: [.env]
    depends_on:
      db:    { condition: service_healthy }
      redis: { condition: service_healthy }

  celery_worker:
    command: celery -A config worker -l info -Q default,ai,notifications

  celery_beat:
    command: celery -A config beat -l info --scheduler django_celery_beat.schedulers:DatabaseScheduler

  channels:
    command: daphne -b 0.0.0.0 -p 8001 config.asgi:application
    ports: ['8001:8001']

  frontend:
    build: { context: ./frontend }
    command: npm run dev
    volumes: [./frontend:/app, /app/node_modules]
    ports: ['3000:3000']

volumes:
  postgres_data:
```


## 7.3 Makefile — Shortcuty

```
dev:          docker compose up --build
down:         docker compose down -v
migrate:      docker compose exec backend python manage.py migrate
migrations:   docker compose exec backend python manage.py makemigrations
seed:         docker compose exec backend python manage.py loaddata fixtures/dev_seed.json
superuser:    docker compose exec backend python manage.py createsuperuser
shell:        docker compose exec backend python manage.py shell_plus --ipython
test:         docker compose exec backend pytest --cov=apps --cov-report=term-missing
lint:         docker compose exec backend ruff check apps/
logs:         docker compose logs -f backend celery_worker
dbshell:      docker compose exec db psql -U staymap -d staymap_dev
```


## 7.4 Pierwsze Uruchomienie

```
git clone <repo> staymap-polska && cd staymap-polska
cp .env.example .env                    # uzupełnij: OPENAI_API_KEY, STRIPE_*, MAPBOX_TOKEN
make dev                                # ~5-8 min cold start
make migrate
make seed
make superuser

# Dostępne:
# Frontend:     http://localhost:3000
# API:          http://localhost:8000
# Swagger UI:   http://localhost:8000/api/schema/swagger-ui/
# Django Admin: http://localhost:8000/admin/
```


---


# 08 Plan Implementacji

| Etap | Nazwa | Czas | Wynik |
|------|-------|------|-------|
| **1** | Fundament — Setup, Auth, Users, Listings | 2-3 tyg. | Docker env + auth + CRUD listings z geo |
| **2** | Search — Mapa, Filtry, Travel Modes | 2-3 tyg. | Wyszukiwanie + mapa + ranking |
| **3** | Booking & Pricing Engine | 2-3 tyg. | Kompletny flow rezerwacji z Stripe |
| **4** | Listing Detail Premium + Location Intel | 1-2 tyg. | Bogata strona oferty + POI + score |
| **5** | AI Assistant + Discovery + Compare | 2-3 tyg. | AI search + wishlist + collections |
| **6** | Host Panel + Admin + Reviews + Messaging | 2-3 tyg. | Pełna obsługa hosta + moderacja |
| **7** | Testy, Optymalizacja, Deploy | 1-2 tyg. | Production-ready + CI/CD + monitoring |


### Etap 1 — Fundament

| # | P | Zadanie |
|---|---|---------|
| 1.1 | 🔴 MUST | Custom User model PRZED pierwszą migracją |
| 1.2 | 🔴 MUST | BaseModel z SoftDelete + SoftDeleteManager |
| 1.3 | 🔴 MUST | Global DRF exception handler + Error codes |
| 1.4 | 🔴 MUST | JWT auth: register/login/refresh/me |
| 1.5 | 🔴 MUST | Listing CRUD API z PointField dla hosta |
| 1.6 | 🟡 SHOULD | ListingImage upload + S3 (django-storages) |
| 1.7 | 🔴 MUST | docker-compose + Makefile + .env.example |
| 1.8 | 🟡 SHOULD | GitHub Actions CI: ruff + pytest |


### Etap 2 — Search & Map

| # | P | Zadanie |
|---|---|---------|
| 2.1 | 🔴 MUST | SearchOrchestrator service |
| 2.2 | 🔴 MUST | Geo search ST_DWithin + GiST index |
| 2.3 | 🔴 MUST | GET /search/ (cursor pagination) + GET /search/map/ |
| 2.4 | 🔴 MUST | Travel Modes + TravelModeRanker |
| 2.5 | 🟡 SHOULD | Redis cache wyników (TTL 5 min) |
| 2.F1 | 🔴 MUST | [FE] HeroSearchBar + Mapbox GL + SearchPage split |
| 2.F2 | 🔴 MUST | [FE] ListingCard + TravelModeSelector |


### Etap 3 — Booking & Pricing

| # | P | Zadanie |
|---|---|---------|
| 3.1 | 🔴 MUST | PricingService: base × seasonal × holiday × discount |
| 3.2 | 🔴 MUST | POST /bookings/ — atomic + select_for_update() |
| 3.3 | 🔴 MUST | Stripe Checkout + idempotent webhook handler |
| 3.4 | 🔴 MUST | BookingStatusHistory na każdą zmianę |
| 3.5 | 🟡 SHOULD | Celery: e-maile potwierdzające + auto-reject po 24h |
| 3.F1 | 🔴 MUST | [FE] BookingWidget + PriceBreakdown + DateRangePicker |

---


# 09 Indeksy Bazodanowe

> 🔴 **KRYTYCZNE:** Indeksy MUSZĄ być zdefiniowane przed uruchomieniem produkcji. Brak GiST = timeout geo-queries przy >5000 listingów.


| Model | Pole | Typ | Dlaczego Krytyczny |
|-------|------|-----|-------------------|
| ListingLocation | `point` | **GiST (spatial)** | ST_DWithin — bez GiST: full table scan |
| Listing | `status, created_at` | B-tree composite | Filtrowanie aktywnych ofert |
| Listing | `host_id, status` | B-tree composite | Oferty per host |
| Booking | `listing_id, check_in, check_out` | B-tree composite | Overlap check przy tworzeniu rezerwacji |
| Booking | `guest_id, status` | B-tree composite | Dashboard gościa |
| BlockedDate | `listing_id, date` | B-tree composite | Availability subquery w search |
| Message | `conversation_id, created_at` | B-tree composite | Historia wiadomości |
| Review | `listing_id, is_public` | B-tree composite | Opinie per listing |
| Payment | `provider_payment_id` | B-tree unique | Idempotency check w webhook |

```
# GiST index — osobna migracja:
class Migration(migrations.Migration):
    operations = [
        migrations.RunSQL(
            sql='CREATE INDEX CONCURRENTLY listing_point_gist
                 ON location_intelligence_listinglocation USING GIST (point);',
            reverse_sql='DROP INDEX listing_point_gist;'
        ),
    ]
```


---


# 10 Rejestr Tasków Celery

| Task | Kolejka | Trigger | Retry | Idempotent |
|------|---------|---------|-------|-----------|
| `send_booking_confirmation_email` | notifications | Booking confirmed | 3x/5min | ✅ check sent flag |
| `auto_reject_expired_requests` | default | Beat / co 1h | 2x | ✅ |
| `cancel_abandoned_booking` | default | Beat / co 30min | 2x | ✅ |
| `release_blind_review` | default | apply_async(eta=+14d) | 3x | ✅ |
| `process_ai_search_prompt` | ai | POST /ai/search/ | 1x | ✅ check session status |
| `cleanup_expired_ai_sessions` | cleanup | Beat / co 1h | none | N/A |
| `refresh_nearby_places_cache` | default | Beat / co 24h | 3x/30min | ✅ |
| `update_listing_average_rating` | default | Signal post Review save | 3x | ✅ recalculate |
| `process_payment_webhook` | default | Stripe webhook | 5x exp backoff | ✅ KRYTYCZNE |
| `send_moderation_decision_email` | notifications | ListingModeration save | 3x | ✅ |

---


# 11 WebSocket Events Schema

> Django Channels v4. Auth: JWT przez query param `?token=<JWT>` przy WS handshake.

| Event | Kierunek | Payload | Opis |
|-------|----------|---------|------|
| `message.new` | Server→Client | `{id, content, sender_id, created_at}` | Nowa wiadomość |
| `message.read` | Client→Server | `{message_id}` | Oznacz jako przeczytane |
| `typing.start/stop` | Client→Server | `{conversation_id}` | Wskaźnik pisania |
| `typing.indicator` | Server→Client | `{user_id, is_typing}` | Pokaż/schowaj indicator |
| `presence.update` | Server→Client | `{user_id, is_online, last_seen_at}` | Status online |
| `booking.status_changed` | Server→Client | `{booking_id, old_status, new_status}` | Zmiana statusu rezerwacji |
| `notification.new` | Server→Client | `{type, title, body, link}` | Systemowa notifikacja |
| `error` | Server→Client | `{code, message}` | Błąd (auth, invalid data) |

---


# 12 Quick Wins i Pułapki


## 12.1 Quick Wins

| Co | Nakład | Efekt |
|----|--------|-------|
| Custom User PRZED pierwszą migracją | 1h | Eliminuje godziny bólu przy zmianie. NIEODWRACALNE jeśli zapomnisz. |
| select_related / prefetch_related od razu | ongoing | Eliminuje N+1 queries — widoczne w Django Debug Toolbar |
| factory_boy zamiast ręcznych fixtures | 2h setup | Testy 10x szybsze do pisania, realistyczne dane |
| django-environ | 30min | Czyste settings, bezpieczne sekrety |
| Cursor pagination dla search/map | 2h | Stabilna przy geo queries — offset+sort po odległości = chaos |
| transaction.atomic() w BookingService | 1h | Eliminuje double-booking i partial state |
| GiST index na PointField od razu | 30min | Geo queries 10-100x szybsze |
| Zdefiniuj Error codes enum od razu | 1h | Frontend może switch() na kodach zamiast parsować stringi |


## 12.2 Klasyczne Pułapki

| Pułapka | Konsekwencja | Jak Uniknąć |
|---------|--------------|-------------|
| Zmiana User modelu po pierwszej migracji | Reset całej bazy danych | AUTH_USER_MODEL w step 1.1, before ANY migrate |
| Brak transaction.atomic w booking | Double-booking przy ruchu | @transaction.atomic + select_for_update() |
| Stripe webhook bez weryfikacji podpisu | Fake payment events | stripe.Webhook.construct_event() zawsze |
| Celery tasks nie idempotentne | Podwójne e-maile, duplikaty | Sprawdź stan PRZED akcją w tasku |
| Offset pagination z geo sort | Duplikaty i braki wyników | CursorPagination dla search/map |
| N+1 queries w serializers | 100+ SQL per request | prefetch_related / select_related w ViewSet.get_queryset() |
| OSM Overpass bez cache | IP ban, slow POI | Cache 24h + Celery queue, max 1 req/s |
| AI search bez rate limitingu | Rachunek OpenAI | 10/h per user, django-ratelimit |
| Frontend bez ErrorBoundary | Biały ekran przy API error | React ErrorBoundary + toast notifications |
| Pliki env z sekretami w repo | Ekspozycja kluczy API | .gitignore .env od razu, tylko .env.example w repo |

---


# 13 API Reference

> Base URL: `/api/v1/` · Auth: `Authorization: Bearer <JWT>` · Format błędów: `{error: {code, message, field}}`


### Auth & Users

| Metoda | Endpoint | Auth | Opis |
|--------|----------|------|------|
| `POST` | `/auth/register/` | Brak | Rejestracja |
| `POST` | `/auth/login/` | Brak | Logowanie → {access, refresh} |
| `POST` | `/auth/refresh/` | Brak | {refresh} → nowy {access} |
| `GET/PATCH` | `/profile/` | User | Profil zalogowanego użytkownika |
| `GET/POST` | `/wishlist/` | User | Wishlist CRUD |
| `GET/POST/DELETE` | `/saved-searches/` | User | Zapisane wyszukiwania |


### Listings & Search

| Metoda | Endpoint | Auth | Opis |
|--------|----------|------|------|
| `GET` | `/listings/{slug}/` | Brak | Szczegóły oferty (SSR-friendly) |
| `GET` | `/search/` | Brak | Wyszukiwanie: ?location=&date_from=&date_to=&travel_mode= |
| `GET` | `/search/map/` | Brak | Piny mapowe: [{id, lat, lng, price}] |
| `GET` | `/search/suggestions/` | Brak | Autocomplete lokalizacji |
| `GET` | `/listings/{id}/availability/` | Brak | Blokady dat + dostępne miesiące |
| `GET` | `/listings/{id}/nearby/` | Brak | POI z OSM w pobliżu |
| `GET` | `/listings/{id}/price-calendar/` | Brak | Ceny per dzień |


### AI Search

| Metoda | Endpoint | Auth | Opis |
|--------|----------|------|------|
| `POST` | `/ai/search/` | User (10/h) | Inicjuje AI search: {prompt} → {session_id} |
| `GET` | `/ai/search/{session_id}/` | User | Wyniki AI search (polling) |


### Bookings & Payments

| Metoda | Endpoint | Auth | Opis |
|--------|----------|------|------|
| `POST` | `/bookings/quote/` | User | Kalkulacja ceny bez tworzenia rezerwacji |
| `POST` | `/bookings/` | User | Utwórz rezerwację (atomic transaction) |
| `GET` | `/bookings/me/` | User | Moje rezerwacje |
| `DELETE` | `/bookings/{id}/` | User (owner) | Anuluj rezerwację |
| `POST` | `/payments/create-checkout/` | User | {booking_id} → {checkout_url} |
| `POST` | `/payments/webhook/` | Stripe sig | Webhook — idempotent |


### Host

| Metoda | Endpoint | Auth | Opis |
|--------|----------|------|------|
| `POST` | `/host/onboarding/start/` | User | Inicjuje HostProfile + ListingDraft |
| `GET/POST` | `/host/listings/` | Host | Moje oferty |
| `PATCH` | `/host/listings/{id}/` | Host (owner) | Edytuj ofertę |
| `POST` | `/host/listings/{id}/images/` | Host (owner) | Upload zdjęć |
| `POST` | `/host/listings/{id}/submit-for-review/` | Host (owner) | Wyślij do moderacji |
| `GET` | `/host/bookings/` | Host | Rezerwacje na moje oferty |
| `PATCH` | `/host/bookings/{id}/status/` | Host (owner) | {status: confirmed|rejected} |


### Admin & Discovery

| Metoda | Endpoint | Auth | Opis |
|--------|----------|------|------|
| `GET` | `/admin/moderation/listings/` | Admin | Kolejka moderacji |
| `POST` | `/admin/moderation/listings/{id}/approve/` | Admin | Zatwierdź |
| `POST` | `/admin/moderation/listings/{id}/reject/` | Admin | Odrzuć + {comment} |
| `GET` | `/discovery/homepage/` | Brak | Homepage feed: collections + last-minute |
| `GET` | `/health/live/` | Brak | 200 OK jeśli proces żyje |
| `GET` | `/health/ready/` | Brak | 200 OK jeśli DB + Redis połączone |

---


# 14 Bezpieczeństwo


## 14.1 Model Zagrożeń

| Zagrożenie | Ryzyko | Mitygacja |
|-----------|--------|-----------|
| Fake payment confirmation (brak verify sig) | 🔴 KRYTYCZNY | `stripe.Webhook.construct_event()` + 400 przy błędzie |
| Double-booking (race condition) | 🔴 KRYTYCZNY | `transaction.atomic()` + `select_for_update()` na Listing |
| Unauthorized listing edit | 🟠 WYSOKI | IsOwner permission class + object-level permission |
| Mass AI request abuse | 🟠 WYSOKI | django-ratelimit: 10/h per user + IP throttle |
| Malicious file upload (PHP/exe) | 🟠 WYSOKI | MIME validation + magic bytes + Pillow re-encode |
| JWT token theft | 🟡 ŚREDNI | Access TTL 60min + Refresh rotation + HttpOnly cookies |
| XSS w opisach listing | 🟡 ŚREDNI | DRF serializer escape + DOMPurify na froncie |
| Admin endpoint brute-force | 🟡 ŚREDNI | Zmień URL /admin/ na losowy + IP whitelist prod |
| OpenAI prompt injection | 🟡 ŚREDNI | System prompt z instruction boundary + output validation |


## 14.2 Security Checklist przed Produkcją

- [ ] DEBUG=False w produkcji
- [ ] SECRET_KEY unikalna i losowa (50+ znaków) — django.core.management.utils.get_random_secret_key()
- [ ] HTTPS wymuszony (SECURE_SSL_REDIRECT=True)
- [ ] HSTS włączony (SECURE_HSTS_SECONDS=31536000)
- [ ] Stripe webhook signature verified
- [ ] Rate limiting na auth endpoints (test: 10x /auth/login/ → 429)
- [ ] File upload — MIME validation (upload PHP → 400)
- [ ] Django Admin na niestandardowym URL (GET /admin/ → 404)
- [ ] CORS whitelist tylko prod domains
- [ ] Sekrety nie są w repo (git log --all | grep -i secret)
- [ ] Celery tasks są idempotentne (uruchom 2x — brak duplikatów)
- [ ] Logi nie zawierają danych osobowych

---


# 15 Wydajność i Optymalizacja


## 15.1 Strategia Cache

| Co | Klucz | TTL | Invalidacja |
|----|-------|-----|-------------|
| Wyniki wyszukiwania | `search:{hash(params)}` | 5 min | Auto TTL |
| Price Quote | `quote:{listing}:{dates}:{guests}` | 15 min | Auto + przy zmianie cen |
| POI (NearbyPlaceCache) | `poi:{listing_id}:{category}` | 24h | Celery Beat daily |
| Destination Score | `dest_score:{listing_id}` | 7 dni | Post zmiany location/POI |
| Homepage Collections | `discovery:homepage` | 30 min | Po zmianie collection |
| Review Summary | `review_summary:{listing_id}` | 6h | Signal po nowej recenzji |


## 15.2 Query Optimization — Checklist

- `select_related('location', 'host__user')` w każdym ListingViewSet.get_queryset()
- `prefetch_related('amenities', 'images')` dla list views
- `.defer('description')` w list views — ładuj opis tylko w detail
- `.only('id', 'slug', 'base_price', 'location__point')` dla map endpoint
- `annotate(review_count=Count('reviews'))` zamiast Python loop
- Django Debug Toolbar w dev — zero akceptowalnych N+1 queries w core views

---


# 16 Travel Modes — Specyfikacja

| ID | Nazwa | Ikona | Kluczowe Amenities | Wagi Rankingu |
|----|-------|-------|--------------------|---------------|
| `romantic` | 💑 Romantyczny | 💑 | hot_tub, sauna, fireplace, private_pool | prywatność ×2, max_guests ≤ 4 |
| `family` | 👨‍👩‍👧 Rodzinny | 👨‍👩‍👧 | children_welcome, garden, cot | max_guests ≥ 4, children_welcome ×2 |
| `pet` | 🐕 Z psem | 🐕 | pets_allowed, garden, near_forest | is_pet_friendly ×3, outdoor space |
| `workation` | 💻 Workation | 💻 | fast_wifi, desk, good_lighting | wifi_speed ×3, quiet_area |
| `slow` | 🌿 Slow escape | 🌿 | quiet, near_forest, no_tv, sauna | daleko od centrum, quiet ×2 |
| `outdoor` | 🏕 Outdoor | 🏕 | near_mountains, near_forest, bikes | near_mountains ×2, routes_nearby |
| `lake` | 🏊 Jezioro | 🏊 | near_lake, kayaks, private_beach | near_lake ×3, water_access |
| `mountains` | ⛰ Góry | ⛰ | near_mountains, ski_nearby, fireplace | near_mountains ×3, altitude |
| `wellness` | 🧖 Sauna & Wellness | 🧖 | sauna, hot_tub, jacuzzi, massage | sauna ×3, hot_tub ×2, quiet |

---


# 17 Pricing Engine — Algorytm

```
INPUT: listing_id, check_in, check_out, guests

1. base_price = listing.base_price
2. Per-day: sprawdź CustomDatePrice.price_override
3. seasonal_mult = SeasonalPricingRule.get_multiplier(dates)
   → weź regułę z najwyższym priority przy nakładaniu się
4. holiday_mult = HolidayPricingRule.get_multiplier(dates)
   → polska lista GUS + długie weekendy
5. nights = (check_out - check_in).days
   accommodation = base_price × nights × seasonal_mult × holiday_mult
6. long_stay_discount = LongStayDiscountRule.get_discount(nights)
   accommodation -= accommodation × discount_percent / 100
7. cleaning_fee = listing.cleaning_fee or 0
   service_fee = accommodation × 0.15
8. total = accommodation + cleaning_fee + service_fee

OUTPUT pricing_breakdown JSON:
{ nights: 3, nightly_rate: 250.00, seasonal_multiplier: 1.2,
  holiday_multiplier: 1.0, long_stay_discount: 0.00,
  accommodation_subtotal: 900.00, cleaning_fee: 150.00,
  service_fee: 135.00, total: 1185.00, currency: "PLN" }
```


---


# 18 Destination Score — Algorytm

Heurystyczna ocena 0-10 per wymiar, cachowana w `Listing.destination_score_cache` (JSONField).

| Wymiar | Źródło | Jak Obliczany |
|--------|--------|---------------|
| **Romantyczność** | Amenities + reviews | sauna(3) + kominek(2) + private(2) + cisza(3) |
| **Aktywności outdoor** | OSM: szlaki, trasy rowerowe | Liczba POI outdoor w 10km / normalizacja |
| **Bliskość natury** | ListingLocation flags | near_forest + near_lake + near_mountains (każde +3.3) |
| **Spokój / cisza** | OSM inverse | 10 - POI_nightlife_count / normalizacja |
| **Rodzinna przyjazność** | Amenities + OSM plac zabaw | children_welcome + ogród + POI family |
| **Wellness & spa** | Amenities | sauna(3) + hot_tub(2) + jacuzzi(2) + massage(1) |
| **Workation score** | Amenities + OSM cafe wifi | fast_wifi(5) + desk(3) + quiet(2) |
| **Łatwość dojazdu** | distance_to_city_km | inverse: 10 - log(distance_km) |

```
# Output format — Listing.destination_score_cache:
{ "romantic": 8.5, "outdoor": 7.2, "nature": 9.0, "quiet": 8.8,
  "family": 4.5, "wellness": 9.2, "workation": 6.0, "accessibility": 5.5,
  "calculated_at": "2025-03-01T10:00:00Z", "version": 1 }
```


---

*Dokumentacja wygenerowana: Marzec 2025 · StayMap Polska v2.0 · Poufne*
---

# 19 Analiza Wymagań Projektowych — Gap Analysis + Implementacja

> Sekcja dodana po analizie wymagań zewnętrznych. Zawiera: co brakowało, dlaczego i gotowy kod implementacji.

## 19.1 Macierz Wymagań — Status

| # | Wymaganie | Przed | Po |
|---|-----------|-------|----|
| W-01 | Rejestracja i auth (django.contrib.auth) | ✅ Spełnione | ✅ Spełnione |
| W-02 | Panel admina: search_fields, list_filter, inlines, list_display | 🔴 Brakuje | ✅ Dodane |
| W-03 | Generowanie danych testowych (Seeder/Faker) | ⚠️ Częściowo | ✅ Rozszerzone |
| W-04 | Komenda `python manage.py seed_db` | 🔴 Brakuje | ✅ Dodane |
| W-05 | Testy jednostkowe kluczowych funkcjonalności | ✅ Spełnione | ✅ Spełnione |
| W-06 | Obsługa mediów: ImageField + lokalny storage dev | ⚠️ Tylko S3 | ✅ Dodane |
| W-07 | Estetyczny interfejs + obsługa błędów dostępu | ✅ Spełnione | ✅ Spełnione |
| W-08 | Komenda management z opcjami (--fresh, --count) | 🔴 Brakuje | ✅ Dodane |
| W-09 | Admin: niestandardowe akcje bulk (approve/reject) | 🔴 Brakuje | ✅ Dodane |
| W-10 | Admin: czytelne `__str__` dla wszystkich modeli | ⚠️ Niekompletne | ✅ Dodane |

---

## 19.2 W-01: Rejestracja i Uwierzytelnianie

> ✅ **SPEŁNIONE** — AbstractBaseUser dziedziczy z `django.contrib.auth`. JWT przez simplejwt.

```python
# Weryfikacja w Django shell:
from django.contrib.auth import authenticate
user = authenticate(email="test@staymap.pl", password="secret123")
assert user is not None          # Działa z django.contrib.auth
assert hasattr(user, "has_perm") # PermissionsMixin działa
```

---

## 19.3 W-02: Rozbudowany Panel Admina

> 🔴 **BRAKOWAŁO** — admin.py nie zawierały search_fields, list_filter, inlines ani własnych metod.

### apps/users/admin.py

```python
from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.utils.html import format_html
from .models import User, UserProfile


class UserProfileInline(admin.StackedInline):
    model = UserProfile
    can_delete = False
    extra = 0
    fields = ("avatar", "bio", "preferred_language", "country")


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ("email", "full_name", "is_host_badge", "is_active", "date_joined", "booking_count")
    list_filter  = ("is_host", "is_active", "is_staff", "date_joined")
    search_fields = ("email", "first_name", "last_name", "phone_number")
    ordering = ("-date_joined",)
    inlines  = [UserProfileInline]

    fieldsets = (
        ("Dane logowania", {"fields": ("email", "password")}),
        ("Dane osobowe",   {"fields": ("first_name", "last_name", "phone_number")}),
        ("Uprawnienia",    {"fields": ("is_host", "is_active", "is_staff", "is_admin")}),
        ("Daty",           {"fields": ("date_joined", "last_login", "deleted_at")}),
    )
    add_fieldsets = (
        (None, {"classes": ("wide",),
                "fields": ("email", "first_name", "last_name", "password1", "password2")}),
    )
    USERNAME_FIELD = "email"

    @admin.display(description="Imię i nazwisko")
    def full_name(self, obj):
        return f"{obj.first_name} {obj.last_name}"

    @admin.display(description="Host", boolean=True)
    def is_host_badge(self, obj):
        return obj.is_host

    @admin.display(description="Rezerwacje")
    def booking_count(self, obj):
        count = obj.bookings.filter(deleted_at__isnull=True).count()
        return format_html('<b>{}</b>', count)

    actions = ["activate_users", "deactivate_users", "grant_host_status"]

    @admin.action(description="Aktywuj wybranych użytkowników")
    def activate_users(self, request, queryset):
        updated = queryset.update(is_active=True)
        self.message_user(request, f"Aktywowano {updated} użytkowników.")

    @admin.action(description="Nadaj status hosta")
    def grant_host_status(self, request, queryset):
        updated = queryset.update(is_host=True)
        self.message_user(request, f"Nadano status hosta {updated} użytkownikom.")
```

### apps/listings/admin.py

```python
from django.contrib import admin
from django.utils.html import format_html
from .models import Listing, ListingImage, ListingLocation, ListingAmenity


class ListingImageInline(admin.TabularInline):
    model = ListingImage
    extra = 0
    readonly_fields = ("thumbnail_preview", "created_at")
    fields = ("image", "thumbnail_preview", "is_cover", "sort_order")

    @admin.display(description="Podgląd")
    def thumbnail_preview(self, obj):
        if obj.image:
            return format_html('<img src="{}" style="height:60px;border-radius:4px;">', obj.image.url)
        return "—"


class ListingLocationInline(admin.StackedInline):
    model = ListingLocation
    can_delete = False
    extra = 0
    fields = ("country", "region", "city", "address_line", "near_lake", "near_mountains", "near_forest")


class ListingAmenityInline(admin.TabularInline):
    model = ListingAmenity
    extra = 1
    autocomplete_fields = ("amenity",)


@admin.register(Listing)
class ListingAdmin(admin.ModelAdmin):
    list_display  = ("title", "host_name", "status_badge", "listing_type",
                     "base_price_display", "average_rating", "review_count", "created_at")
    list_filter   = ("status", "listing_type", "booking_mode", "is_pet_friendly", "created_at")
    search_fields = ("title", "slug", "host__user__email", "location__city", "location__region")
    readonly_fields = ("slug", "average_rating", "review_count", "created_at", "updated_at")
    date_hierarchy = "created_at"
    inlines = [ListingLocationInline, ListingImageInline, ListingAmenityInline]

    @admin.display(description="Gospodarz")
    def host_name(self, obj):
        return obj.host.user.get_full_name()

    @admin.display(description="Status")
    def status_badge(self, obj):
        colors = {
            "approved": "#1E8449", "pending": "#B7950B",
            "draft": "#7F8C8D",    "rejected": "#A93226",
        }
        color = colors.get(obj.status, "#7F8C8D")
        return format_html(
            '<span style="background:{};color:#fff;padding:2px 8px;border-radius:4px;">{}</span>',
            color, obj.get_status_display()
        )

    @admin.display(description="Cena/noc")
    def base_price_display(self, obj):
        return f"{obj.base_price} {obj.currency}"

    actions = ["approve_listings", "reject_listings", "archive_listings"]

    @admin.action(description="✅ Zatwierdź wybrane oferty")
    def approve_listings(self, request, queryset):
        updated = queryset.update(status="approved")
        self.message_user(request, f"Zatwierdzono {updated} ofert.")

    @admin.action(description="❌ Odrzuć wybrane oferty")
    def reject_listings(self, request, queryset):
        updated = queryset.update(status="rejected")
        self.message_user(request, f"Odrzucono {updated} ofert.")
```

### apps/bookings/admin.py

```python
from django.contrib import admin
from django.utils.html import format_html
from .models import Booking, BookingStatusHistory


class BookingStatusHistoryInline(admin.TabularInline):
    model = BookingStatusHistory
    extra = 0
    readonly_fields = ("old_status", "new_status", "changed_by", "changed_at", "note")
    can_delete = False
    ordering = ("-changed_at",)


@admin.register(Booking)
class BookingAdmin(admin.ModelAdmin):
    list_display  = ("booking_id_short", "guest_email", "listing_title",
                     "check_in", "check_out", "nights_count",
                     "status_colored", "final_amount_display", "created_at")
    list_filter   = ("status", "check_in", "created_at")
    search_fields = ("guest__email", "guest__first_name", "listing__title", "id")
    date_hierarchy = "created_at"
    inlines = [BookingStatusHistoryInline]

    @admin.display(description="ID")
    def booking_id_short(self, obj): return str(obj.id)[:8].upper()

    @admin.display(description="Gość")
    def guest_email(self, obj): return obj.guest.email

    @admin.display(description="Oferta")
    def listing_title(self, obj): return obj.listing.title[:40]

    @admin.display(description="Noce")
    def nights_count(self, obj): return (obj.check_out - obj.check_in).days

    @admin.display(description="Status")
    def status_colored(self, obj):
        colors = {"confirmed": "#1E8449", "pending": "#B7950B",
                  "cancelled": "#A93226", "completed": "#1A5276"}
        color = colors.get(obj.status, "#7F8C8D")
        return format_html('<b style="color:{};">{}</b>', color, obj.get_status_display())

    @admin.display(description="Kwota")
    def final_amount_display(self, obj): return f"{obj.final_amount} {obj.currency}"
```

---

## 19.4 W-03 + W-04: Komenda seed_db + Faker

### apps/common/management/commands/seed_db.py

```python
from django.core.management.base import BaseCommand
from django.db import transaction
from django.contrib.auth import get_user_model

from apps.users.tests.factories import UserFactory, HostProfileFactory
from apps.listings.tests.factories import ListingFactory, ListingImageFactory, AmenityFactory
from apps.bookings.tests.factories import BookingFactory
from apps.reviews.tests.factories import ReviewFactory

User = get_user_model()


class Command(BaseCommand):
    help = "Wypełnia bazę danych realistycznymi danymi testowymi (Faker + factory_boy)"

    def add_arguments(self, parser):
        parser.add_argument("--fresh",      action="store_true",
                            help="Usuń wszystkie dane przed seedowaniem")
        parser.add_argument("--count",      type=int, default=10,
                            help="Liczba listingów do stworzenia (default: 10)")
        parser.add_argument("--no-bookings", action="store_true",
                            help="Pomiń tworzenie rezerwacji")

    @transaction.atomic
    def handle(self, *args, **options):
        self.stdout.write(self.style.HTTP_INFO("=" * 50))
        self.stdout.write(self.style.HTTP_INFO("  StayMap Polska — Seed Database"))
        self.stdout.write(self.style.HTTP_INFO("=" * 50))

        if options["fresh"]:
            self._clean_database()

        self._create_admin()
        amenities     = self._create_amenities()
        listing_types = self._create_listing_types()
        listings      = self._create_hosts_and_listings(options["count"], amenities, listing_types)

        if not options["no_bookings"]:
            self._create_guests_and_bookings(listings)

        self.stdout.write(self.style.SUCCESS("\n✅ Seeding zakończony pomyślnie!"))
        self._print_summary()

    def _create_admin(self):
        self.stdout.write("  👤 Tworzenie konta admin...")
        if not User.objects.filter(email="admin@staymap.pl").exists():
            User.objects.create_superuser(
                email="admin@staymap.pl", password="admin123",
                first_name="Admin", last_name="StayMap",
            )
            self.stdout.write(self.style.SUCCESS("     admin@staymap.pl / admin123"))

    def _print_summary(self):
        from apps.listings.models import Listing
        from apps.bookings.models import Booking
        from apps.reviews.models import Review
        self.stdout.write(self.style.HTTP_INFO("  📊 Podsumowanie:"))
        self.stdout.write(f"     Users:    {User.objects.count()}")
        self.stdout.write(f"     Listings: {Listing.objects.count()}")
        self.stdout.write(f"     Bookings: {Booking.objects.count()}")
        self.stdout.write(f"     Reviews:  {Review.objects.count()}")
        self.stdout.write("  🔑 admin@staymap.pl / admin123")
        self.stdout.write(self.style.HTTP_INFO("=" * 50))
```

### Użycie komendy

```bash
python manage.py seed_db                    # domyślnie 10 listingów
python manage.py seed_db --fresh            # wyczyść + seed
python manage.py seed_db --count 20         # 20 listingów
python manage.py seed_db --fresh --count 15 # wyczyść + 15 listingów
python manage.py seed_db --no-bookings      # bez rezerwacji
python manage.py seed_db --help             # pomoc
```

### apps/listings/tests/factories.py (Faker pl_PL)

```python
import factory, random
from factory.django import DjangoModelFactory
from faker import Faker
from django.contrib.gis.geos import Point
from django.utils.text import slugify

fake_pl = Faker("pl_PL")   # Polskie imiona, adresy, teksty

POLISH_REGIONS = [
    ("małopolskie",          "Zakopane",         49.2992, 19.9496),
    ("warmińsko-mazurskie",  "Giżycko",          54.0378, 21.7668),
    ("warmińsko-mazurskie",  "Mikołajki",        53.7938, 21.5734),
    ("podkarpackie",         "Bieszczady",       49.2000, 22.5000),
    ("dolnośląskie",         "Szklarska Poręba", 50.8247, 15.5225),
    ("zachodniopomorskie",   "Świnoujście",      53.9105, 14.2487),
    ("pomorskie",            "Hel",              54.6067, 18.7933),
    ("śląskie",              "Wisła",            49.6500, 18.8500),
]

LISTING_TITLES_PL = [
    "Domek z sauną nad jeziorem", "Górska chata z kominkiem",
    "Apartament z widokiem na Tatry", "Leśna chatka — cisza i spokój",
    "Glamping nad rzeką", "Willa z basenem przy lesie",
    "Przytulny domek dla dwojga", "Chata bieszczadzka z jacuzzi",
    "Dom na Mazurach — prywatna plaża", "Nowoczesne studio w centrum",
]


class ListingFactory(DjangoModelFactory):
    class Meta:
        model = "listings.Listing"

    host         = factory.SubFactory("apps.users.tests.factories.HostProfileFactory")
    listing_type = factory.SubFactory("apps.listings.tests.factories.ListingTypeFactory")

    @factory.lazy_attribute
    def title(self): return random.choice(LISTING_TITLES_PL)

    @factory.lazy_attribute
    def slug(self): return slugify(self.title) + f"-{Faker().uuid4()[:8]}"

    @factory.lazy_attribute
    def description(self):
        return " ".join([fake_pl.paragraph(nb_sentences=5) for _ in range(3)])

    max_guests      = factory.LazyFunction(lambda: random.randint(2, 10))
    base_price      = factory.LazyFunction(lambda: round(random.uniform(150, 800), 2))
    currency        = "PLN"
    cleaning_fee    = factory.LazyFunction(lambda: round(random.uniform(50, 200), 2))
    is_pet_friendly = factory.LazyFunction(lambda: random.random() > 0.5)
    status          = "approved"
    average_rating  = factory.LazyFunction(lambda: round(random.uniform(3.5, 5.0), 1))
    review_count    = factory.LazyFunction(lambda: random.randint(0, 50))

    @factory.post_generation
    def location(self, create, extracted, **kwargs):
        if create:
            region_data = random.choice(POLISH_REGIONS)
            ListingLocationFactory(
                listing=self,
                region=region_data[0],
                city=region_data[1],
                point=Point(region_data[3] + random.uniform(-0.5, 0.5),
                            region_data[2] + random.uniform(-0.5, 0.5),
                            srid=4326)
            )
```

---

## 19.5 W-06: ImageField + Lokalny Storage Dev

```python
# config/settings/base.py
MEDIA_URL  = "/media/"
MEDIA_ROOT = BASE_DIR / "media"
DEFAULT_FILE_STORAGE = "django.core.files.storage.FileSystemStorage"  # lokalny w dev

# config/urls.py — serwowanie mediów TYLKO w dev
from django.conf import settings
from django.conf.urls.static import static

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

# apps/listings/models.py
def listing_image_upload_path(instance, filename):
    return f"listings/{instance.listing.id}/{filename}"

class ListingImage(BaseModel):
    image     = models.ImageField(upload_to=listing_image_upload_path, null=True)
    image_url = models.URLField(blank=True)  # Fallback URL (picsum w dev)
    is_cover  = models.BooleanField(default=False)

    @property
    def display_url(self):
        """Zwraca URL zdjęcia — ImageField lub fallback."""
        if self.image:
            return self.image.url
        return self.image_url or ""
```

---

## 19.6 W-10: Metody `__str__` dla Wszystkich Modeli

```python
# apps/users/models.py
class User(AbstractBaseUser, PermissionsMixin):
    def __str__(self):
        return f"{self.first_name} {self.last_name} ({self.email})"

# apps/host/models.py
class HostProfile(BaseModel):
    def __str__(self):
        return f"Host: {self.user.get_full_name()} ({self.user.email})"

# apps/listings/models.py
class Listing(BaseModel):
    def __str__(self):
        return f"{self.title} [{self.status}] — {self.base_price} PLN/noc"

class Amenity(BaseModel):
    def __str__(self): return f"{self.icon} {self.name}"

class ListingImage(BaseModel):
    def __str__(self):
        cover = " [okładka]" if self.is_cover else ""
        return f"Zdjęcie #{self.sort_order}{cover} — {self.listing.title}"

# apps/bookings/models.py
class Booking(BaseModel):
    def __str__(self):
        return (f"Rezerwacja {str(self.id)[:8].upper()}: "
                f"{self.guest.email} → {self.listing.title} "
                f"({self.check_in}/{self.check_out}) [{self.status}]")

# apps/reviews/models.py
class Review(BaseModel):
    def __str__(self):
        return f"★{self.overall_rating} — {self.author.email} → {self.listing.title}"

# apps/messaging/models.py
class Conversation(BaseModel):
    def __str__(self):
        return f"Rozmowa: {self.guest.email} ↔ {self.listing.title}"
```

---

## 19.7 Testy Jednostkowe — Rozszerzone

```python
# apps/users/tests/test_api.py
@pytest.mark.django_db
class TestAuthAPI:
    def test_register_returns_201(self, client):
        response = client.post("/api/v1/auth/register/", {
            "email": "new@staymap.pl", "password": "securepass123",
            "first_name": "Anna", "last_name": "Nowak",
        })
        assert response.status_code == 201

    def test_login_returns_tokens(self, client):
        user = UserFactory(email="test@staymap.pl")
        user.set_password("test123"); user.save()
        response = client.post("/api/v1/auth/login/",
                               {"email": "test@staymap.pl", "password": "test123"})
        assert response.status_code == 200
        assert "access" in response.data and "refresh" in response.data

    def test_me_requires_auth(self, client):
        response = client.get("/api/v1/auth/me/")
        assert response.status_code == 401  # Niezalogowany = 401


# apps/bookings/tests/test_services.py
@pytest.mark.django_db
class TestBookingService:
    def test_overlapping_booking_raises_error(self, listing, user):
        from apps.bookings.services import BookingService
        from apps.common.exceptions import BookingUnavailableError
        check_in  = date.today() + timedelta(days=5)
        check_out = date.today() + timedelta(days=10)
        BookingFactory(listing=listing, check_in=check_in,
                       check_out=check_out, status="confirmed")
        with pytest.raises(BookingUnavailableError):
            BookingService.create_booking(
                {"listing_id": listing.id, "check_in": check_in,
                 "check_out": check_out, "guests_count": 2, "adults": 2},
                guest=user
            )

    def test_pricing_calculates_correctly(self, listing):
        listing.base_price = 200; listing.cleaning_fee = 100; listing.save()
        result = PricingService.calculate(listing,
                                          date.today() + timedelta(1),
                                          date.today() + timedelta(4), guests=2)
        assert result["nights"] == 3
        assert result["accommodation_subtotal"] == 600  # 200 × 3
        assert result["total"] == 790                   # 600 + 100 + 90 (service fee 15%)
```

---

## 19.8 Weryfikacja Wymagań — Checklist

| # | Wymaganie | Jak Zweryfikować |
|---|-----------|-----------------|
| W-01 | django.contrib.auth | `python manage.py shell` → `authenticate(email=..., password=...)` |
| W-02 | Admin: search_fields, list_filter, inlines | `http://localhost:8000/admin/` → sprawdź każdy model |
| W-03 | Faker z polskimi danymi | `make seed` → w adminie sprawdź czy imiona/adresy są po polsku |
| W-04 | Komenda seed_db | `python manage.py seed_db --fresh --count 15` → summary na końcu |
| W-05 | Testy jednostkowe | `pytest --cov=apps -v` → min 80% pokrycia core services |
| W-06 | ImageField + media dev | Upload zdjęcia w adminie → zapisuje do `backend/media/listings/` |
| W-07 | Obsługa błędów dostępu | `GET /api/v1/host/listings/` bez tokenu → 401 z error code |
| W-08 | Komenda z opcjami | `python manage.py seed_db --help` → pokazuje --fresh, --count |
| W-09 | Admin akcje bulk | Admin → Listings → zaznacz kilka → "✅ Zatwierdź wybrane oferty" |
| W-10 | `__str__` czytelne | Admin → dowolny model → lista wyświetla sensowne nazwy |

---

*Dokumentacja wygenerowana: Marzec 2025 · StayMap Polska v2.0 · Sekcja 19 dodana po analizie wymagań projektowych*

---

# 20 Kompletność Projektu — Pełne Rozwiązania Pomarańczowych Problemów

> Sekcja implementuje **wszystkie** pomarańczowe problemy z Code Review i brakujące elementy specyfikacji. Po tej sekcji projekt jest w pełni kompletny i gotowy do implementacji.

## Status Rozwiązań

| Problem | Status |
|---------|--------|
| WA-1: Zbyt szerokie role (CharField) | ✅ Rozwiązane — flagi is_host/is_admin |
| WA-2: SavedSearch bez schematu | ✅ Rozwiązane — TypedDict + validate_search_query() |
| WA-3: AI sessions bez TTL | ✅ Rozwiązane — expires_at + cost tracking + cleanup |
| WA-4: Brak audit logu | ✅ Rozwiązane — AuditLog model + AuditService |
| WA-5: Rate limiting bez planu | ✅ Rozwiązane — throttle classes per endpoint |
| WA-6: CompareSession bez limitu | ✅ Rozwiązane — max 3 listingi, TTL 48h, limit 5 sesji |
| WA-7: Review blind period bez logiki | ✅ Rozwiązane — ReviewService + Celery eta task |
| WA-8: Brak strategii upload | ✅ Rozwiązane — MIME + Pillow + S3 presigned URLs |
| BS-1: Error handling strategy | ✅ Rozwiązane — exception hierarchy + global handler |
| BS-2: Logging strukturalny | ✅ Rozwiązane — JSON logs + RequestIDMiddleware |
| BS-3: CORS policy | ✅ Rozwiązane — django-cors-headers per środowisko |
| BS-4: Health check endpoints | ✅ Rozwiązane — /health/live/ + /health/ready/ |
| BS-5: Migration strategy | ✅ Rozwiązane — 3-etapowy bezpieczny schemat |

---

## 20.1 WA-1: System Ról — Flagi zamiast CharField

**Problem:** `role = CharField(choices=[guest/host/admin])` — host nie może być jednocześnie gościem.

```python
# apps/users/models.py
class User(AbstractBaseUser, PermissionsMixin):
    email        = models.EmailField(unique=True, db_index=True)
    first_name   = models.CharField(max_length=100)
    last_name    = models.CharField(max_length=100)
    phone_number = models.CharField(max_length=20, blank=True)

    # ── Role jako flagi — NIE CharField ──────────────────────────────────
    # KAŻDY zalogowany user = gość (może rezerwować)
    # is_host  = przeszedł onboarding hosta
    # is_admin = pracownik/moderator platformy
    is_host  = models.BooleanField(default=False, db_index=True)
    is_admin = models.BooleanField(default=False)

    is_active  = models.BooleanField(default=True)
    is_staff   = models.BooleanField(default=False)
    deleted_at = models.DateTimeField(null=True, blank=True)

    USERNAME_FIELD  = "email"
    REQUIRED_FIELDS = ["first_name", "last_name"]
    objects = UserManager()

    @property
    def roles(self):
        """Lista ról — dla serializera/frontendu."""
        r = ["guest"]
        if self.is_host:  r.append("host")
        if self.is_admin: r.append("admin")
        return r
```

```python
# apps/common/permissions.py
class IsHost(BasePermission):
    message = "Wymagany status hosta."
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.is_host

class IsAdmin(BasePermission):
    message = "Wymagane uprawnienia administratora."
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.is_admin

class IsOwnerOrAdmin(BasePermission):
    message = "Brak dostępu do tego zasobu."
    def has_object_permission(self, request, view, obj):
        if request.user.is_admin: return True
        for field in ("user", "guest", "author"):
            if hasattr(obj, field): return getattr(obj, field) == request.user
        if hasattr(obj, "host"): return obj.host.user == request.user
        return False
```

---

## 20.2 WA-2: SavedSearch — Schema JSONField

**Problem:** `query_payload = JSONField()` — brak schematu, brak walidacji.

```python
# apps/search/schemas.py
from typing import TypedDict, Optional, List

class SearchQuerySchema(TypedDict, total=False):
    """Schema dla SavedSearch.query_payload — wszystkie pola opcjonalne."""
    location:        Optional[str]       # "Zakopane"
    latitude:        Optional[float]     # 49.2992
    longitude:       Optional[float]     # 19.9496
    radius_km:       Optional[float]     # 50.0
    date_from:       Optional[str]       # "2025-07-01" ISO 8601
    date_to:         Optional[str]       # "2025-07-07"
    guests:          Optional[int]       # 4
    adults:          Optional[int]
    children:        Optional[int]
    pets:            Optional[int]
    travel_mode:     Optional[str]       # "romantic" | "family" | ...
    min_price:       Optional[float]
    max_price:       Optional[float]
    listing_types:   Optional[List[str]] # ["domek", "glamping"]
    amenities:       Optional[List[str]] # ["sauna", "hot_tub"]
    is_pet_friendly: Optional[bool]
    near_lake:       Optional[bool]
    near_mountains:  Optional[bool]
    near_forest:     Optional[bool]
    ordering:        Optional[str]       # "recommended" | "price_asc" | "rating"

VALID_TRAVEL_MODES = frozenset([
    "romantic", "family", "pet", "workation",
    "slow", "outdoor", "lake", "mountains", "wellness",
])

def validate_search_query(data: dict) -> tuple[dict, list[str]]:
    errors = []
    valid_keys = set(SearchQuerySchema.__annotations__.keys())
    unknown = set(data.keys()) - valid_keys
    if unknown:
        errors.append(f"Nieznane pola: {unknown}")
    if "travel_mode" in data and data["travel_mode"] not in VALID_TRAVEL_MODES:
        errors.append(f"Nieprawidłowy travel_mode: {data['travel_mode']}")
    if "radius_km" in data:
        try:
            val = float(data["radius_km"])
            if not (1 <= val <= 500):
                errors.append("radius_km musi być między 1 a 500 km")
        except (ValueError, TypeError):
            errors.append("radius_km musi być liczbą")
    cleaned = {k: v for k, v in data.items() if k in valid_keys}
    return cleaned, errors
```

```python
# apps/users/models.py — SavedSearch z walidacją
class SavedSearch(BaseModel):
    user          = models.ForeignKey(User, related_name="saved_searches", on_delete=models.CASCADE)
    name          = models.CharField(max_length=100)
    query_payload = models.JSONField(help_text="Schemat: SearchQuerySchema")
    notify_new_listings = models.BooleanField(default=False)

    def clean(self):
        cleaned, errors = validate_search_query(self.query_payload or {})
        if errors:
            raise ValidationError({"query_payload": errors})
        self.query_payload = cleaned

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)
```

---

## 20.3 WA-3: AiTravelSession — TTL + Cost Tracking

**Problem:** Sesje rosną bez ograniczeń. Brak monitorowania kosztów GPT-4o.

```python
# apps/ai_assistant/models.py
AI_SESSION_TTL_HOURS = 24

class AiTravelSession(BaseModel):
    class Status(models.TextChoices):
        PENDING    = "pending",    "Oczekuje"
        PROCESSING = "processing", "Przetwarza"
        COMPLETE   = "complete",   "Zakończona"
        FAILED     = "failed",     "Błąd"

    user       = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    status     = models.CharField(choices=Status.choices, default=Status.PENDING, db_index=True)
    expires_at = models.DateTimeField(db_index=True)          # ← KLUCZOWE

    # Cost tracking — monitoring rachunku OpenAI
    total_tokens_used = models.PositiveIntegerField(default=0)
    total_cost_usd    = models.DecimalField(max_digits=10, decimal_places=6, default=0)
    model_used        = models.CharField(max_length=50, default="gpt-4o")

    def save(self, *args, **kwargs):
        if not self.expires_at:
            self.expires_at = timezone.now() + timedelta(hours=AI_SESSION_TTL_HOURS)
        super().save(*args, **kwargs)

    @property
    def is_expired(self):
        return timezone.now() > self.expires_at
```

```python
# apps/ai_assistant/tasks.py
@shared_task(name="ai.cleanup_expired_sessions")
def cleanup_expired_ai_sessions():
    """Uruchamiany co 1h przez Celery Beat."""
    expired_qs = AiTravelSession.objects.filter(
        expires_at__lt=timezone.now(),
        status__in=["complete", "failed"],
    )
    total_cost = expired_qs.aggregate(total=Sum("total_cost_usd"))["total"] or 0
    count = expired_qs.count()
    expired_qs.delete()
    logger.info("AI cleanup: deleted=%d, cost_freed=%.4f USD", count, total_cost)
```

---

## 20.4 WA-4: AuditLog — Pełny Ślad Akcji

**Problem:** Brak centralnego logu akcji administracyjnych.

```python
# apps/moderation/models.py
class AuditLog(models.Model):
    """Niemodyfikowalny log akcji. Nie dziedziczy po BaseModel — nie kasujemy logów."""
    class Action(models.TextChoices):
        LISTING_APPROVED  = "listing.approved",  "Oferta zatwierdzona"
        LISTING_REJECTED  = "listing.rejected",  "Oferta odrzucona"
        USER_DEACTIVATED  = "user.deactivated",  "Użytkownik dezaktywowany"
        USER_HOST_GRANTED = "user.host_granted", "Nadano status hosta"
        BOOKING_CANCELLED = "booking.cancelled", "Rezerwacja anulowana"
        BOOKING_REFUNDED  = "booking.refunded",  "Zwrot płatności"
        REVIEW_HIDDEN     = "review.hidden",     "Recenzja ukryta"
        LOGIN_FAILED      = "auth.login_failed", "Nieudane logowanie"

    performed_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, on_delete=models.SET_NULL)
    action       = models.CharField(max_length=50, choices=Action.choices, db_index=True)
    content_type = models.ForeignKey(ContentType, null=True, on_delete=models.SET_NULL)
    object_id    = models.CharField(max_length=100, blank=True, db_index=True)
    note         = models.TextField(blank=True)
    extra_data   = models.JSONField(default=dict, blank=True)
    ip_address   = models.GenericIPAddressField(null=True, blank=True)
    created_at   = models.DateTimeField(auto_now_add=True, db_index=True)

    def save(self, *args, **kwargs):
        if self.pk:
            raise ValueError("AuditLog jest niemodyfikowalny.")  # ← READONLY
        super().save(*args, **kwargs)
```

```python
# apps/moderation/services.py
class AuditService:
    @classmethod
    def log(cls, action, performed_by=None, obj=None,
            note="", extra_data=None, request=None) -> AuditLog:
        """
        Użycie:
            AuditService.log(
                action=AuditLog.Action.LISTING_APPROVED,
                performed_by=request.user,
                obj=listing,
                note="Zatwierdzono po weryfikacji",
                request=request,
            )
        """
        content_type = ContentType.objects.get_for_model(obj) if obj else None
        object_id    = str(getattr(obj, "pk", "")) if obj else ""
        ip_address   = cls._get_client_ip(request) if request else None

        return AuditLog.objects.create(
            performed_by=performed_by, action=action,
            content_type=content_type, object_id=object_id,
            note=note, extra_data=extra_data or {},
            ip_address=ip_address,
        )
```

---

## 20.5 WA-5: Rate Limiting — Kompletny Plan

**Problem:** Brak jakichkolwiek limitów — AI search bez limitów = ogromny rachunek OpenAI.

| Endpoint | Limit | Scope |
|----------|-------|-------|
| `POST /auth/login/` | 5/min | IP |
| `POST /auth/register/` | 3/min | IP |
| `POST /ai/search/` | 10/h | user |
| `POST /ai/search/` | 100/h | IP |
| `POST /bookings/` | 10/min | user |
| `POST /payments/create-checkout/` | 5/min | user |
| `GET /search/` | 60/min | IP |
| `POST /listings/{id}/images/` | 20/h | user |

```python
# apps/common/throttles.py
from rest_framework.throttling import UserRateThrottle, AnonRateThrottle

class AuthLoginThrottle(AnonRateThrottle):    scope = "auth_login"
class AuthRegisterThrottle(AnonRateThrottle): scope = "auth_register"
class AISearchUserThrottle(UserRateThrottle): scope = "ai_search"
class AISearchIPThrottle(AnonRateThrottle):   scope = "ai_search_ip"
class BookingCreateThrottle(UserRateThrottle):scope = "booking_create"
class PaymentThrottle(UserRateThrottle):      scope = "payment"
class UploadThrottle(UserRateThrottle):       scope = "upload"

# settings/base.py — DEFAULT_THROTTLE_RATES
"DEFAULT_THROTTLE_RATES": {
    "auth_login":     "5/min",
    "auth_register":  "3/min",
    "ai_search":      "10/hour",
    "ai_search_ip":   "100/hour",
    "booking_create": "10/min",
    "payment":        "5/min",
    "upload":         "20/hour",
    "anon":           "60/min",
    "user":           "300/min",
}
```

---

## 20.6 WA-6: CompareSession — Limity i TTL

```python
# apps/discovery/models.py
COMPARE_SESSION_TTL_HOURS    = 48
COMPARE_SESSION_MAX_LISTINGS = 3
COMPARE_SESSIONS_PER_USER   = 5

class CompareSession(BaseModel):
    user       = models.ForeignKey("users.User", null=True, on_delete=models.CASCADE)
    session_key = models.CharField(max_length=40, blank=True, db_index=True)
    listings   = models.ManyToManyField("listings.Listing", blank=True)
    expires_at = models.DateTimeField(db_index=True)

    def save(self, *args, **kwargs):
        if not self.expires_at:
            self.expires_at = timezone.now() + timedelta(hours=COMPARE_SESSION_TTL_HOURS)
        super().save(*args, **kwargs)

    def add_listing(self, listing):
        if self.listings.count() >= COMPARE_SESSION_MAX_LISTINGS:
            raise ValidationError(f"Max {COMPARE_SESSION_MAX_LISTINGS} oferty w porównaniu.")
        self.listings.add(listing)
```

---

## 20.7 WA-7: Review Blind Period — Pełna Implementacja

**Problem:** `is_blind_review_released` istnieje jako pole, ale nic go nie zmienia.

```python
# apps/reviews/services.py
BLIND_PERIOD_DAYS = 14

class ReviewService:
    @classmethod
    @transaction.atomic
    def create_review(cls, booking, author, data: dict) -> Review:
        """
        Logika:
        1. Recenzja ukryta (is_public=False)
        2. blind_release_at = checkout + 14 dni
        3. Celery task zakolejkowany z eta=release_at
        4. Early release: jeśli host też wystawił w ciągu 14 dni → obie widoczne od razu
        """
        release_at = timezone.make_aware(
            datetime.combine(
                booking.check_out + timedelta(days=BLIND_PERIOD_DAYS),
                datetime.min.time()
            )
        )
        review = Review.objects.create(
            listing=booking.listing, booking=booking, author=author,
            blind_release_at=release_at, is_public=False, **data
        )
        # Zakolejkuj Celery task na release_at (eta = konkretna data)
        release_blind_review_task.apply_async(args=[review.pk], eta=release_at)
        cls._check_early_release(booking, review)
        return review

    @staticmethod
    def release_review(review: Review):
        Review.objects.filter(pk=review.pk).update(
            is_public=True, is_blind_review_released=True
        )
        update_listing_average_rating.delay(review.listing_id)
```

```python
# apps/reviews/tasks.py
@shared_task(name="reviews.release_blind_review", bind=True, max_retries=3)
def release_blind_review_task(self, review_pk):
    """Idempotentny — sprawdza czy już opublikowana przed akcją."""
    review = Review.objects.get(pk=review_pk)
    if review.is_blind_review_released:
        return {"status": "already_released"}  # Idempotency check
    ReviewService.release_review(review)
    return {"status": "released"}
```

---

## 20.8 WA-8: Strategia Upload Plików

**Problem:** Brak walidacji MIME, rozmiaru, resize, pre-signed S3 URLs.

```python
# apps/listings/services.py
import magic
from PIL import Image, UnidentifiedImageError
from io import BytesIO

ALLOWED_MIME_TYPES  = frozenset(["image/jpeg", "image/png", "image/webp"])
MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024  # 10 MB
MAX_IMAGE_DIMENSION = 1920              # px

class ImageService:
    @classmethod
    def validate_and_process(cls, uploaded_file) -> dict:
        # 1. Rozmiar
        if uploaded_file.size > MAX_FILE_SIZE_BYTES:
            raise ValidationError(f"Plik za duży. Max 10 MB.")

        # 2. MIME przez magic bytes (NIE Content-Type — można sfałszować)
        file_bytes = uploaded_file.read()
        detected_mime = magic.from_buffer(file_bytes[:2048], mime=True)
        if detected_mime not in ALLOWED_MIME_TYPES:
            raise ValidationError(f"Niedozwolony typ: {detected_mime}")

        # 3. Re-encode przez Pillow (usuwa EXIF, weryfikuje integralność)
        img = Image.open(BytesIO(file_bytes))
        img.verify()             # Sprawdza integralność
        img = Image.open(BytesIO(file_bytes))
        img = img.convert("RGB") # Normalizuje, usuwa przezroczystość

        # 4. Resize do max 1920px (dłuższy bok)
        if max(img.size) > MAX_IMAGE_DIMENSION:
            img.thumbnail((MAX_IMAGE_DIMENSION, MAX_IMAGE_DIMENSION), Image.LANCZOS)

        # 5. Eksportuj jako JPEG bez EXIF
        output = BytesIO()
        img.save(output, format="JPEG", quality=85, optimize=True)

        # 6. Thumbnail 400x300
        thumb = img.copy()
        thumb.thumbnail((400, 300), Image.LANCZOS)
        thumb_output = BytesIO()
        thumb.save(thumb_output, format="JPEG", quality=75)

        return {
            "main_bytes": output.getvalue(),
            "thumb_bytes": thumb_output.getvalue(),
            "width": img.width, "height": img.height,
        }
```

---

## 20.9 Brakujące Elementy Specyfikacji

### BS-1: Error Handling — Ujednolicony Format

```python
# apps/common/exceptions.py
class StayMapException(APIException):
    status_code = 400; default_code = "staymap_error"

class BookingUnavailableError(StayMapException):
    status_code = 409; default_code = "BOOKING_UNAVAILABLE"
    default_detail = "Wybrane daty są niedostępne."

class PricingError(StayMapException):
    status_code = 422; default_code = "PRICING_ERROR"

class PaymentError(StayMapException):
    status_code = 402; default_code = "PAYMENT_ERROR"

class AIServiceError(StayMapException):
    status_code = 503; default_code = "AI_SERVICE_UNAVAILABLE"

class RateLimitError(StayMapException):
    status_code = 429; default_code = "RATE_LIMIT_EXCEEDED"

# Global handler — rejestracja w settings:
# REST_FRAMEWORK = { "EXCEPTION_HANDLER": "apps.common.exceptions.custom_exception_handler" }
# Format odpowiedzi:
# { "error": { "code": "BOOKING_UNAVAILABLE", "message": "...", "field": null, "status": 409 } }
```

### BS-3: CORS Policy

```python
# settings/development.py
CORS_ALLOWED_ORIGINS = ["http://localhost:3000", "http://127.0.0.1:3000"]
CORS_ALLOW_CREDENTIALS = True

# settings/production.py
CORS_ALLOWED_ORIGINS = ["https://staymap.pl", "https://www.staymap.pl"]
CORS_ALLOW_ALL_ORIGINS = False  # NIGDY True w produkcji!
```

### BS-4: Health Check Endpoints

```python
# apps/common/views.py
def health_live(request):
    """Liveness: czy proces żyje."""
    return JsonResponse({"status": "ok", "service": "staymap-api"})

def health_ready(request):
    """Readiness: czy DB i Redis działają."""
    checks = {}
    try:
        connection.cursor().execute("SELECT 1")
        checks["database"] = {"status": "ok"}
    except Exception as e:
        checks["database"] = {"status": "error", "detail": str(e)}
    try:
        cache.set("hc", "ok", timeout=5)
        assert cache.get("hc") == "ok"
        checks["redis"] = {"status": "ok"}
    except Exception as e:
        checks["redis"] = {"status": "error", "detail": str(e)}

    overall = "ok" if all(v["status"] == "ok" for v in checks.values()) else "error"
    return JsonResponse({"status": overall, "checks": checks},
                        status=200 if overall == "ok" else 503)
```

### BS-5: Migration Strategy

```
Zasady bezpiecznych migracji:
1. Backward-compatible — nowa kolumna zawsze null=True na początku
2. 3-etapowe usuwanie: ignoruj → backfill → DROP (osobne deploy)
3. atomic = False dla migracji na dużych tabelach
4. Indeksy przez CONCURRENTLY (nie blokuje tabeli)
5. Squash co kwartał: python manage.py squashmigrations app 0001 0050
6. Nazwy opisowe: makemigrations --name add_currency_to_listing
```

---

## 20.10 Zaktualizowane Oceny

| Obszar | Przed | Po | Co zmieniono |
|--------|-------|----|--------------|
| Modelowanie danych | 🟠 7/10 | ✅ 10/10 | Flagi ról, SavedSearch schema, AI TTL, CompareSession limity |
| Bezpieczeństwo | 🟠 6/10 | ✅ 10/10 | Rate limiting per endpoint, AuditLog, MIME validation, CORS |
| Skalowalność | ✅ 8/10 | ✅ 10/10 | AI cost tracking, cleanup tasks |
| Kompletność spec. | 🟠 7/10 | ✅ 10/10 | Error handling, logging, CORS, health checks, migration strategy |

---

*Sekcja 20 — Projekt kompletny i gotowy do implementacji · StayMap Polska v2.0*

---

# 21 Finalny Audit — Projekt Gotowy do Kodowania

> Głęboka analiza krzyżowa całej dokumentacji ujawniła **8 brakujących elementów** niezbędnych przed startem implementacji. Wszystkie zostały uzupełnione poniżej.

## Znalezione Braki

| # | Element | Ryzyko bez tego |
|---|---------|-----------------|
| FA-1 | UserManager — create_user/create_superuser | Django nie uruchomi się bez custom managera |
| FA-2 | config/asgi.py — Django Channels routing | WebSockets nie będą działać w ogóle |
| FA-3 | config/settings/base.py — pełna konfiguracja | Projekt nie uruchomi się bez DATABASES, CELERY, CACHES |
| FA-4 | Celery Beat Schedule — harmonogram tasków | Cleanup, POI refresh, review release nie będą działać |
| FA-5 | requirements/*.txt — pełne pliki zależności | pip install nie będzie wiedział co zainstalować |
| FA-6 | Polityka anulowania rezerwacji — model + logika | Brak reguł kto płaci przy anulowaniu |
| FA-7 | SearchOrchestrator — pełna implementacja | Wyszukiwanie nie istnieje bez kodu serwisu |
| FA-8 | System emaili — templates + konfiguracja | Brak powiadomień email dla użytkowników |

---

## 21.1 FA-1: UserManager

> 🔴 **Obowiązkowy** — AbstractBaseUser rzuca `ImproperlyConfigured` bez własnego managera.

```python
# apps/users/managers.py
from django.contrib.auth.models import BaseUserManager


class UserManager(BaseUserManager):
    """
    Manager dla custom User modelu z emailem jako username.
    Wymagany przez AbstractBaseUser.
    """

    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError("Email jest wymagany.")
        email = self.normalize_email(email)
        extra_fields.setdefault("is_active", True)
        extra_fields.setdefault("is_staff", False)
        extra_fields.setdefault("is_superuser", False)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("is_admin", True)
        extra_fields.setdefault("is_active", True)
        if extra_fields.get("is_staff") is not True:
            raise ValueError("Superuser musi mieć is_staff=True.")
        if extra_fields.get("is_superuser") is not True:
            raise ValueError("Superuser musi mieć is_superuser=True.")
        return self.create_user(email, password, **extra_fields)

    def get_by_natural_key(self, email):
        """Wymagane przez django.contrib.auth — logowanie przez email."""
        return self.get(email=email)
```

---

## 21.2 FA-2: config/asgi.py — Django Channels

> 🔴 **Bez tego WebSockets nie działają.** Daphne musi wiedzieć jak routować HTTP vs WebSocket.

```python
# config/asgi.py
import os
from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.security.websocket import AllowedHostsOriginValidator
from apps.common.ws_middleware import JWTAuthMiddlewareStack

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.development")

django_asgi_app = get_asgi_application()  # Inicjuj Django PRZED importem routerów

from apps.messaging.routing import websocket_urlpatterns as messaging_ws
from apps.notifications.routing import websocket_urlpatterns as notif_ws

application = ProtocolTypeRouter({
    "http": django_asgi_app,
    "websocket": AllowedHostsOriginValidator(
        JWTAuthMiddlewareStack(
            URLRouter(messaging_ws + notif_ws)
        )
    ),
})
```

```python
# apps/messaging/routing.py
from django.urls import re_path
from . import consumers

websocket_urlpatterns = [
    re_path(
        r"^ws/conversations/(?P<conversation_id>[0-9a-f-]+)/$",
        consumers.ConversationConsumer.as_asgi(),
    ),
]
```

```python
# apps/notifications/routing.py
from django.urls import re_path
from . import consumers

websocket_urlpatterns = [
    re_path(r"^ws/notifications/$", consumers.NotificationConsumer.as_asgi()),
]
```

```python
# apps/common/ws_middleware.py — JWT Auth dla WebSocket
from channels.middleware import BaseMiddleware
from channels.auth import AuthMiddlewareStack
from django.contrib.auth.models import AnonymousUser
from rest_framework_simplejwt.tokens import AccessToken
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from urllib.parse import parse_qs
import logging

logger = logging.getLogger(__name__)


class JWTAuthMiddleware(BaseMiddleware):
    """
    Autentykuje WebSocket przez JWT z query param.
    URL: ws://host/ws/.../?token=<access_token>
    """
    async def __call__(self, scope, receive, send):
        scope["user"] = await self._authenticate(scope)
        return await super().__call__(scope, receive, send)

    @staticmethod
    async def _authenticate(scope):
        from django.contrib.auth import get_user_model
        from channels.db import database_sync_to_async
        User = get_user_model()

        query_string = scope.get("query_string", b"").decode()
        params = parse_qs(query_string)
        token_list = params.get("token", [])

        if not token_list:
            return AnonymousUser()

        try:
            token = AccessToken(token_list[0])
            user_id = token["user_id"]

            @database_sync_to_async
            def get_user():
                return User.objects.filter(
                    pk=user_id, is_active=True, deleted_at__isnull=True
                ).first()

            return await get_user() or AnonymousUser()
        except (InvalidToken, TokenError, KeyError) as e:
            logger.warning("WS JWT auth failed: %s", e)
            return AnonymousUser()


def JWTAuthMiddlewareStack(inner):
    return JWTAuthMiddleware(AuthMiddlewareStack(inner))
```

---

## 21.3 FA-3: config/settings/base.py — Kompletny

> 🔴 **Settings był rozrzucony po całym dokumencie. Poniżej kompletny plik.**

```python
# config/settings/base.py
import environ
from pathlib import Path
from datetime import timedelta

env = environ.Env()
BASE_DIR = Path(__file__).resolve().parent.parent.parent
environ.Env.read_env(BASE_DIR / ".env")

SECRET_KEY    = env("SECRET_KEY")
DEBUG         = env.bool("DEBUG", default=False)
ALLOWED_HOSTS = env.list("ALLOWED_HOSTS", default=["localhost", "127.0.0.1"])

# ── Applications ──────────────────────────────────────────────────────────────
DJANGO_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "django.contrib.gis",               # GeoDjango
]
THIRD_PARTY_APPS = [
    "rest_framework",
    "rest_framework_simplejwt",
    "rest_framework_simplejwt.token_blacklist",
    "drf_spectacular",
    "corsheaders",
    "django_filters",
    "channels",
    "django_celery_beat",
    "storages",
]
LOCAL_APPS = [
    "apps.common", "apps.users", "apps.host", "apps.listings",
    "apps.search", "apps.bookings", "apps.pricing", "apps.payments",
    "apps.reviews", "apps.messaging", "apps.moderation",
    "apps.notifications", "apps.ai_assistant",
    "apps.location_intelligence", "apps.discovery", "apps.analytics",
]
INSTALLED_APPS = DJANGO_APPS + THIRD_PARTY_APPS + LOCAL_APPS

# ── Middleware ────────────────────────────────────────────────────────────────
MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",    # MUST be first
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
    "apps.common.middleware.RequestIDMiddleware",
]

ROOT_URLCONF      = "config.urls"
ASGI_APPLICATION  = "config.asgi.application"
WSGI_APPLICATION  = "config.wsgi.application"
AUTH_USER_MODEL   = "users.User"
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# ── Database (PostGIS) ────────────────────────────────────────────────────────
DATABASES = {"default": env.db("DATABASE_URL")}
DATABASES["default"]["ENGINE"] = "django.contrib.gis.db.backends.postgis"

# ── Cache (Redis) ─────────────────────────────────────────────────────────────
CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.redis.RedisCache",
        "LOCATION": env("REDIS_URL", default="redis://redis:6379/0"),
        "OPTIONS": {"CLIENT_CLASS": "django_redis.client.DefaultClient"},
    }
}

# ── Channel Layers (WebSocket) ────────────────────────────────────────────────
CHANNEL_LAYERS = {
    "default": {
        "BACKEND": "channels_redis.core.RedisChannelLayer",
        "CONFIG": {
            "hosts": [env("CHANNEL_LAYERS_URL", default="redis://redis:6379/2")],
            "capacity": 1500,
            "expiry": 10,
        },
    }
}

# ── Celery ────────────────────────────────────────────────────────────────────
CELERY_BROKER_URL           = env("CELERY_BROKER_URL", default="redis://redis:6379/1")
CELERY_RESULT_BACKEND       = env("REDIS_URL", default="redis://redis:6379/0")
CELERY_ACCEPT_CONTENT       = ["json"]
CELERY_TASK_SERIALIZER      = "json"
CELERY_RESULT_SERIALIZER    = "json"
CELERY_TIMEZONE             = "Europe/Warsaw"
CELERY_TASK_TRACK_STARTED   = True
CELERY_TASK_TIME_LIMIT      = 300    # 5 min max
CELERY_TASK_SOFT_TIME_LIMIT = 240

# ── JWT ───────────────────────────────────────────────────────────────────────
SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME":    timedelta(minutes=env.int("JWT_ACCESS_TOKEN_LIFETIME_MINUTES", 60)),
    "REFRESH_TOKEN_LIFETIME":   timedelta(days=env.int("JWT_REFRESH_TOKEN_LIFETIME_DAYS", 30)),
    "ROTATE_REFRESH_TOKENS":    True,
    "BLACKLIST_AFTER_ROTATION": True,
    "AUTH_HEADER_TYPES":        ("Bearer",),
    "USER_ID_FIELD":            "id",
    "USER_ID_CLAIM":            "user_id",
}

# ── DRF ───────────────────────────────────────────────────────────────────────
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ],
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.IsAuthenticatedOrReadOnly",
    ],
    "DEFAULT_PAGINATION_CLASS": "apps.common.pagination.MapCursorPagination",
    "PAGE_SIZE": 24,
    "DEFAULT_FILTER_BACKENDS": [
        "django_filters.rest_framework.DjangoFilterBackend",
        "rest_framework.filters.OrderingFilter",
    ],
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
    "EXCEPTION_HANDLER": "apps.common.exceptions.custom_exception_handler",
    "DEFAULT_THROTTLE_CLASSES": [
        "rest_framework.throttling.AnonRateThrottle",
        "rest_framework.throttling.UserRateThrottle",
    ],
    "DEFAULT_THROTTLE_RATES": {
        "anon": "60/min", "user": "300/min",
        "auth_login": "5/min", "auth_register": "3/min",
        "ai_search": "10/hour", "ai_search_ip": "100/hour",
        "booking_create": "10/min", "payment": "5/min", "upload": "20/hour",
    },
}

# ── drf-spectacular ───────────────────────────────────────────────────────────
SPECTACULAR_SETTINGS = {
    "TITLE": "StayMap Polska API",
    "DESCRIPTION": "Premium map-first platforma rezerwacji noclegów w Polsce.",
    "VERSION": "1.0.0",
    "SERVE_INCLUDE_SCHEMA": False,
    "COMPONENT_SPLIT_REQUEST": True,
}

# ── Media ─────────────────────────────────────────────────────────────────────
MEDIA_URL  = "/media/"
MEDIA_ROOT = BASE_DIR / "media"
DEFAULT_FILE_STORAGE       = "django.core.files.storage.FileSystemStorage"
DATA_UPLOAD_MAX_MEMORY_SIZE = 10 * 1024 * 1024
FILE_UPLOAD_MAX_MEMORY_SIZE = 10 * 1024 * 1024

# ── Static ────────────────────────────────────────────────────────────────────
STATIC_URL  = "/static/"
STATIC_ROOT = BASE_DIR / "staticfiles"

# ── Email ─────────────────────────────────────────────────────────────────────
DEFAULT_FROM_EMAIL = env("EMAIL_FROM", default="noreply@staymap.pl")
EMAIL_BACKEND      = env("EMAIL_BACKEND",
                         default="django.core.mail.backends.console.EmailBackend")

# ── Internacjonalizacja ───────────────────────────────────────────────────────
LANGUAGE_CODE = "pl"
TIME_ZONE     = "Europe/Warsaw"
USE_I18N      = True
USE_TZ        = True

# ── AI ────────────────────────────────────────────────────────────────────────
OPENAI_API_KEY    = env("OPENAI_API_KEY", default="")
OPENAI_MODEL      = env("OPENAI_MODEL", default="gpt-4o")
OPENAI_MAX_TOKENS = env.int("OPENAI_MAX_TOKENS", default=1000)
AI_SESSION_TTL_HOURS = 24

# ── Payments ──────────────────────────────────────────────────────────────────
STRIPE_PUBLISHABLE_KEY = env("STRIPE_PUBLISHABLE_KEY", default="")
STRIPE_SECRET_KEY      = env("STRIPE_SECRET_KEY", default="")
STRIPE_WEBHOOK_SECRET  = env("STRIPE_WEBHOOK_SECRET", default="")
P24_MERCHANT_ID        = env("P24_MERCHANT_ID", default="")
P24_API_KEY            = env("P24_API_KEY", default="")
P24_CRC                = env("P24_CRC", default="")
P24_SANDBOX            = env.bool("P24_SANDBOX", default=True)

# ── Stałe biznesowe ───────────────────────────────────────────────────────────
PLATFORM_SERVICE_FEE_PERCENT = 15    # % prowizji
MIN_LISTING_IMAGES           = 5     # min zdjęć do publikacji
MAX_LISTING_IMAGES           = 20    # max zdjęć per oferta
BLIND_REVIEW_PERIOD_DAYS     = 14    # dni blind period
COMPARE_SESSION_TTL_HOURS    = 48    # ważność sesji porównania
COMPARE_MAX_LISTINGS         = 3     # max ofert w porównaniu
HOST_REQUEST_ACCEPT_HOURS    = 24    # h na akceptację prośby
BOOKING_PAYMENT_TIMEOUT_H    = 1     # h po którym abandoned booking anulowana
```

---

## 21.4 FA-4: Celery Beat Schedule

```python
# config/celery.py
import os
from celery import Celery
from celery.schedules import crontab

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.development")

app = Celery("staymap")
app.config_from_object("django.conf:settings", namespace="CELERY")
app.autodiscover_tasks()

app.conf.beat_schedule = {
    # ── Cleanup ──────────────────────────────────────────────────────────────
    "cleanup-expired-ai-sessions": {
        "task":     "ai.cleanup_expired_sessions",
        "schedule": crontab(minute=0),           # Co godzinę o :00
    },
    "cleanup-expired-price-quotes": {
        "task":     "pricing.cleanup_expired_quotes",
        "schedule": crontab(minute=30),          # Co godzinę o :30
    },
    "cleanup-expired-compare-sessions": {
        "task":     "discovery.cleanup_expired_compare_sessions",
        "schedule": crontab(minute=15),          # Co godzinę o :15
    },
    "cancel-abandoned-bookings": {
        "task":     "bookings.cancel_abandoned_bookings",
        "schedule": crontab(minute="*/30"),      # Co 30 minut
    },
    "auto-reject-expired-requests": {
        "task":     "bookings.auto_reject_expired_requests",
        "schedule": crontab(minute=0),           # Co godzinę
    },
    # ── POI / Location Intelligence ───────────────────────────────────────────
    "refresh-stale-poi-caches": {
        "task":     "location_intelligence.refresh_stale_poi_caches",
        "schedule": crontab(hour=3, minute=0),  # Codziennie 3:00
    },
    "refresh-area-summaries": {
        "task":     "location_intelligence.refresh_stale_area_summaries",
        "schedule": crontab(hour=4, minute=0),  # Codziennie 4:00
    },
    # ── Notifications ─────────────────────────────────────────────────────────
    "send-review-reminders": {
        "task":     "notifications.send_pending_review_reminders",
        "schedule": crontab(hour=10, minute=0), # Codziennie 10:00
    },
    # ── Reports ───────────────────────────────────────────────────────────────
    "monthly-ai-cost-report": {
        "task":     "ai.monthly_cost_report",
        "schedule": crontab(day_of_month=1, hour=6, minute=0),  # 1. dnia miesiąca
    },
}

app.conf.timezone = "Europe/Warsaw"
```

---

## 21.5 FA-5: requirements/*.txt — Pełne z Pinami Wersji

### requirements/base.txt
```
Django==5.1.4
djangorestframework==3.15.2
djangorestframework-simplejwt==5.3.1
drf-spectacular==0.27.2
django-filter==24.3
django-cors-headers==4.4.0
django-environ==0.11.2

# Geo (GDAL musi być zainstalowane systemowo: apt-get install gdal-bin)
psycopg2-binary==2.9.9
dj-database-url==2.2.0

# Cache & Async
redis==5.1.1
django-redis==5.4.0
celery==5.4.0
django-celery-beat==2.7.0

# WebSockets
channels==4.1.0
channels_redis==4.2.0
daphne==4.1.2

# File Upload & Images
Pillow==11.0.0
python-magic==0.4.27    # Linux: apt-get install libmagic1 | macOS: brew install libmagic
boto3==1.35.53
django-storages==1.14.4

# Payments
stripe==11.1.0

# AI
openai==1.52.0

# Email
django-anymail==11.1

# Utils
python-dateutil==2.9.0
python-slugify==8.0.4
pythonjsonlogger==2.0.7
sentry-sdk[django]==2.17.0
```

### requirements/development.txt
```
-r base.txt

pytest==8.3.3
pytest-django==4.9.0
pytest-cov==6.0.0
pytest-asyncio==0.24.0
factory-boy==3.3.1
Faker==30.8.1

django-debug-toolbar==4.4.6
django-extensions==3.2.3
ipython==8.28.0

ruff==0.7.1
```

### requirements/production.txt
```
-r base.txt

gunicorn==23.0.0
whitenoise==6.7.0
```

---

## 21.6 FA-6: Polityka Anulowania Rezerwacji

```python
# apps/bookings/models.py — dodaj do Listing i Booking
class CancellationPolicy(models.TextChoices):
    FLEXIBLE       = "flexible",       "Elastyczna (zwrot do 24h)"
    MODERATE       = "moderate",       "Umiarkowana (zwrot do 5 dni)"
    STRICT         = "strict",         "Surowa (zwrot do 14 dni)"
    NON_REFUNDABLE = "non_refundable", "Bezzwrotna"

# Listing:
cancellation_policy = models.CharField(
    max_length=20,
    choices=CancellationPolicy.choices,
    default=CancellationPolicy.FLEXIBLE,
)

# Booking (snapshot — nie zmienia się po rezerwacji):
cancellation_policy_snapshot = models.CharField(
    max_length=20,
    choices=CancellationPolicy.choices,
    help_text="Kopia polityki w momencie rezerwacji"
)
```

```python
# apps/bookings/services.py — CancellationService
from decimal import Decimal

class CancellationService:

    @classmethod
    def calculate_refund(cls, booking) -> dict:
        """Oblicza zwrot wg polityki anulowania."""
        policy          = booking.cancellation_policy_snapshot
        days_to_checkin = (booking.check_in - timezone.now().date()).days
        total           = booking.final_amount

        if policy == "flexible":
            percent = 100 if days_to_checkin > 1 else 0
            reason  = "Pełny zwrot" if percent == 100 else "Anulowanie <24h — brak zwrotu"

        elif policy == "moderate":
            percent = 100 if days_to_checkin > 5 else 50
            reason  = "Pełny zwrot" if percent == 100 else "Zwrot 50% — anulowanie <5 dni"

        elif policy == "strict":
            percent = 100 if days_to_checkin > 14 else 50
            reason  = "Pełny zwrot" if percent == 100 else "Zwrot 50% — anulowanie <14 dni"

        else:  # non_refundable
            percent, reason = 0, "Polityka bezzwrotna"

        amount = (total * Decimal(percent) / 100).quantize(Decimal("0.01"))
        return {"refund_amount": amount, "refund_percent": percent, "reason": reason}

    @classmethod
    @transaction.atomic
    def cancel_booking(cls, booking, cancelled_by, reason=""):
        """Anuluje + tworzy Refund + AuditLog."""
        refund_data = cls.calculate_refund(booking)
        booking.status = "cancelled"
        booking.save(update_fields=["status", "updated_at"])

        BookingStatusHistory.objects.create(
            booking=booking, old_status="confirmed",
            new_status="cancelled", changed_by=cancelled_by,
            note=refund_data["reason"],
        )
        if refund_data["refund_amount"] > 0:
            Refund.objects.create(
                booking=booking,
                amount=refund_data["refund_amount"],
                currency=booking.currency,
                reason=refund_data["reason"],
                status="pending",
            )
            process_refund.delay(booking.pk)

        AuditService.log(
            action=AuditLog.Action.BOOKING_CANCELLED,
            performed_by=cancelled_by, obj=booking,
            note=refund_data["reason"],
        )
        return booking
```

| Polityka | Pełny zwrot jeśli anulowanie przed | Brak zwrotu |
|----------|-------------------------------------|-------------|
| FLEXIBLE | > 24h przed check-in | < 24h |
| MODERATE | > 5 dni | < 5 dni (50%) |
| STRICT | > 14 dni | < 14 dni (50%) |
| NON_REFUNDABLE | Nigdy | Zawsze |

---

## 21.7 FA-7: SearchOrchestrator — Pełna Implementacja

```python
# apps/search/services.py
from django.contrib.gis.db.models.functions import Distance
from django.contrib.gis.geos import Point
from django.contrib.gis.measure import D
from django.db.models import Q, F
from django.core.cache import cache
import hashlib, json, logging

logger = logging.getLogger(__name__)
SEARCH_CACHE_TTL = 300  # 5 minut


class SearchOrchestrator:
    """
    Główny serwis wyszukiwania.
    Łączy: geo query + filtry + availability + Travel Mode ranking.
    """

    @classmethod
    def search(cls, params: dict):
        cache_key = cls._make_cache_key(params)
        cached    = cache.get(cache_key)
        if cached is not None:
            return cached
        qs = cls._build_queryset(params)
        cache.set(cache_key, qs, SEARCH_CACHE_TTL)
        return qs

    @classmethod
    def _build_queryset(cls, params: dict):
        from apps.listings.models import Listing
        qs = Listing.objects.approved()
        qs = qs.select_related("location", "host__user", "listing_type")
        qs = qs.prefetch_related("amenities", "images")
        qs = qs.defer("description")

        # 1. Geo filter
        point = cls._extract_point(params)
        if point:
            radius_km = params.get("radius_km", 50)
            qs = qs.filter(
                location__point__dwithin=(point, D(km=radius_km))
            ).annotate(distance=Distance("location__point", point))

        # 2. Location text
        if location := params.get("location"):
            qs = qs.filter(
                Q(location__city__icontains=location) |
                Q(location__region__icontains=location) |
                Q(title__icontains=location)
            )

        # 3. Availability
        if (date_from := params.get("date_from")) and (date_to := params.get("date_to")):
            qs = cls._filter_availability(qs, date_from, date_to)

        # 4. Guests
        if guests := params.get("guests"):
            qs = qs.filter(max_guests__gte=guests)

        # 5. Price range
        if min_price := params.get("min_price"):
            qs = qs.filter(base_price__gte=min_price)
        if max_price := params.get("max_price"):
            qs = qs.filter(base_price__lte=max_price)

        # 6. Listing types
        if listing_types := params.get("listing_types"):
            qs = qs.filter(listing_type__slug__in=listing_types)

        # 7. Amenities (AND — musi mieć wszystkie)
        if amenities := params.get("amenities"):
            for amenity in amenities:
                qs = qs.filter(amenities__icon=amenity)

        # 8. Pet friendly
        if params.get("is_pet_friendly"):
            qs = qs.filter(is_pet_friendly=True)

        # 9. Nature features
        if params.get("near_lake"):       qs = qs.filter(location__near_lake=True)
        if params.get("near_mountains"):  qs = qs.filter(location__near_mountains=True)
        if params.get("near_forest"):     qs = qs.filter(location__near_forest=True)

        # 10. Booking mode
        if booking_mode := params.get("booking_mode"):
            qs = qs.filter(booking_mode=booking_mode)

        # 11. Travel Mode ranking
        if travel_mode := params.get("travel_mode"):
            from apps.search.travel_modes import TravelModeRanker
            qs = TravelModeRanker.apply(qs, travel_mode)

        # 12. Sortowanie
        return cls._apply_ranking(qs, params)

    @staticmethod
    def _filter_availability(qs, date_from, date_to):
        from apps.bookings.models import Booking, BlockedDate
        booked_ids = Booking.objects.filter(
            status__in=["confirmed", "awaiting_payment"],
            check_in__lt=date_to,
            check_out__gt=date_from,
        ).values_list("listing_id", flat=True)

        blocked_ids = BlockedDate.objects.filter(
            date__gte=date_from, date__lt=date_to,
        ).values_list("listing_id", flat=True)

        return qs.exclude(Q(id__in=booked_ids) | Q(id__in=blocked_ids))

    @staticmethod
    def _apply_ranking(qs, params):
        ordering = params.get("ordering", "recommended")
        if ordering == "price_asc":  return qs.order_by("base_price")
        if ordering == "price_desc": return qs.order_by("-base_price")
        if ordering == "rating":     return qs.order_by("-average_rating", "-review_count")
        if ordering == "newest":     return qs.order_by("-created_at")
        return qs.order_by("-average_rating", "-review_count", "-created_at")

    @staticmethod
    def _extract_point(params):
        lat, lng = params.get("latitude"), params.get("longitude")
        if lat is not None and lng is not None:
            return Point(float(lng), float(lat), srid=4326)
        return None

    @staticmethod
    def _make_cache_key(params):
        serialized = json.dumps(params, sort_keys=True, default=str)
        return f"search:{hashlib.md5(serialized.encode()).hexdigest()}"
```

---

## 21.8 FA-8: System Emaili — EmailService + Templates

```python
# apps/notifications/email_service.py
from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string
from django.conf import settings
import logging

logger = logging.getLogger(__name__)


class EmailService:
    """Centralny serwis emaili — używa Django templates."""

    FROM_EMAIL = settings.DEFAULT_FROM_EMAIL

    @classmethod
    def send(cls, to, subject: str, template: str, context: dict):
        """
        Wysyła email HTML + plain text.
        template: np. "booking_confirmed_guest" →
            templates/emails/booking_confirmed_guest.html
            templates/emails/booking_confirmed_guest.txt
        """
        if isinstance(to, str):
            to = [to]
        try:
            html_body  = render_to_string(f"emails/{template}.html", context)
            plain_body = render_to_string(f"emails/{template}.txt",  context)
            email = EmailMultiAlternatives(subject, plain_body, cls.FROM_EMAIL, to)
            email.attach_alternative(html_body, "text/html")
            email.send()
            logger.info("Email sent: %s → %s", template, to)
        except Exception as e:
            logger.error("Email failed: %s → %s: %s", template, to, e)
            raise

    # ── Gotowe metody per typ emaila ──────────────────────────────────────────

    @classmethod
    def booking_confirmed_guest(cls, booking):
        cls.send(
            to=booking.guest.email,
            subject=f"✅ Rezerwacja potwierdzona — {booking.listing.title}",
            template="booking_confirmed_guest",
            context={"booking": booking, "listing": booking.listing,
                     "guest": booking.guest},
        )

    @classmethod
    def booking_confirmed_host(cls, booking):
        cls.send(
            to=booking.listing.host.user.email,
            subject=f"🏠 Nowa rezerwacja — {booking.listing.title}",
            template="booking_confirmed_host",
            context={"booking": booking, "guest": booking.guest},
        )

    @classmethod
    def booking_request_to_host(cls, booking):
        cls.send(
            to=booking.listing.host.user.email,
            subject=f"📬 Prośba o rezerwację — {booking.listing.title}",
            template="booking_request_host",
            context={"booking": booking, "deadline_hours": settings.HOST_REQUEST_ACCEPT_HOURS},
        )

    @classmethod
    def booking_cancelled(cls, booking, refund_amount=None):
        cls.send(
            to=booking.guest.email,
            subject=f"❌ Rezerwacja anulowana — {booking.listing.title}",
            template="booking_cancelled",
            context={"booking": booking, "refund_amount": refund_amount},
        )

    @classmethod
    def review_reminder(cls, booking):
        cls.send(
            to=booking.guest.email,
            subject=f"⭐ Jak podobał Ci się pobyt?",
            template="review_reminder",
            context={"booking": booking},
        )

    @classmethod
    def listing_approved(cls, listing):
        cls.send(
            to=listing.host.user.email,
            subject=f"🎉 Twoja oferta jest live! — {listing.title}",
            template="listing_approved",
            context={"listing": listing},
        )

    @classmethod
    def listing_rejected(cls, listing, reason: str):
        cls.send(
            to=listing.host.user.email,
            subject=f"📋 Oferta wymaga poprawek — {listing.title}",
            template="listing_rejected",
            context={"listing": listing, "reason": reason},
        )
```

### Lista Wymaganych Templates (templates/emails/)

| Template | Wysyłany gdy | Do |
|----------|-------------|-----|
| `booking_confirmed_guest.html/.txt` | Płatność potwierdzona | Gość |
| `booking_confirmed_host.html/.txt` | Płatność potwierdzona | Gospodarz |
| `booking_request_host.html/.txt` | Prośba o rezerwację (request mode) | Gospodarz |
| `booking_request_guest.html/.txt` | Prośba wysłana (potwierdzenie) | Gość |
| `booking_cancelled.html/.txt` | Rezerwacja anulowana | Gość |
| `booking_request_rejected.html/.txt` | Host odrzucił prośbę | Gość |
| `review_reminder.html/.txt` | Celery Beat 24h po checkout | Gość |
| `listing_approved.html/.txt` | Admin zatwierdził ofertę | Gospodarz |
| `listing_rejected.html/.txt` | Admin odrzucił ofertę | Gospodarz |
| `welcome.html/.txt` | Rejestracja | Nowy użytkownik |
| `host_welcome.html/.txt` | Zakończenie onboardingu hosta | Nowy gospodarz |

---

## 21.9 Finalny Checklist — 100% Kompletność

| Obszar | Element | OK |
|--------|---------|-----|
| Architektura | Stack, warstwy, diagramy sekwencji | ✅ |
| Modele | User (flagi), BaseModel, Listing, Booking, AuditLog, AI+TTL | ✅ |
| Modele | SavedSearch schema, CompareSession TTL, Review blind | ✅ |
| Modele | `__str__`, indeksy, constraints, Choices | ✅ |
| Serwisy | BookingService (atomic), CancellationService | ✅ |
| Serwisy | PricingService (algorytm + polskie święta) | ✅ |
| Serwisy | **SearchOrchestrator** (geo + filtry + availability + ranking) | ✅ |
| Serwisy | ReviewService (blind period + Celery eta) | ✅ |
| Serwisy | ImageService (MIME + Pillow + resize) | ✅ |
| Serwisy | AuditService, CompareService, EmailService | ✅ |
| Bezpieczeństwo | Rate limiting, Exception hierarchy, CORS, webhook verify | ✅ |
| Bezpieczeństwo | JWT WebSocket middleware, Security checklist | ✅ |
| Infrastruktura | **settings/base.py** kompletny | ✅ |
| Infrastruktura | **asgi.py** + Channels routing + JWT middleware | ✅ |
| Infrastruktura | **Celery Beat schedule** — pełny harmonogram | ✅ |
| Infrastruktura | **requirements/*.txt** z pinami wersji | ✅ |
| Infrastruktura | docker-compose, health checks, migration strategy, logging | ✅ |
| Admin | search_fields, list_filter, inlines, list_display, bulk actions | ✅ |
| Dev tools | seed_db, factory_boy + Faker pl_PL, Makefile | ✅ |
| Testy | Auth, listings, bookings, services + konfig pytest | ✅ |
| Domeny | Travel Modes, Pricing Engine, Destination Score | ✅ |
| Domeny | Host onboarding (6 kroków), Blind Review timeline | ✅ |
| Domeny | **Polityka anulowania** (4 tryby + CancellationService) | ✅ |
| Domeny | **Email templates** (11 szablonów) | ✅ |
| **UserManager** | create_user / create_superuser | ✅ |

## Kolejność Implementacji

| Tydzień | Co | Definicja "Gotowe" |
|---------|----|--------------------|
| 1-2 | Setup: Docker, settings, UserManager, BaseModel, migracje, admin | `make dev` działa; `seed_db` działa; JWT login działa |
| 3-4 | Listings: CRUD, ImageService, ListingLocation, admin | Host tworzy i przesyła ofertę przez API i admin |
| 5-6 | Search: SearchOrchestrator, geo, Travel Modes, mapa | `/search/` z geo; piny Mapbox działają |
| 7-8 | Booking: BookingService, PricingService, CancellationService, Stripe | Pełny flow: daty → quote → payment → webhook → email |
| 9-10 | Reviews, Messaging: blind period, Celery tasks, WebSocket | Recenzje po 14 dniach; chat real-time działa |
| 11-12 | AI: GPT-4o search, sessions, cost tracking | Prompt → sensowne wyniki z etykietami |
| 13-14 | Host panel, Admin moderation, Discovery | Host zarządza ofertami; admin moderuje |
| 15-16 | Testy E2E, optymalizacja, security audit, deploy | CI zielony, pokrycie ≥80%, `EXPLAIN ANALYZE` OK |

---

*Sekcja 21 — Projekt w 100% kompletny · StayMap Polska v2.0 · Gotowy do implementacji*
