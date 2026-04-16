# StayMap Polska — Dokumentacja Biznesowa Projektu

**Wersja:** 2.0 | **Data:** Kwiecień 2026 | **Status:** Projekt zrealizowany — gotowy do wdrożenia

> Platforma rezerwacji noclegów turystycznych w Polsce · Django 5 + Next.js 14 · PostGIS · Redis · AI

---

## Spis treści

1. [Streszczenie wykonawcze](#1-streszczenie-wykonawcze)
2. [Cel produktu i grupy użytkowników](#2-cel-produktu-i-grupy-użytkowników)
3. [Jak działa aplikacja — scenariusze użycia](#3-jak-działa-aplikacja--scenariusze-użycia)
4. [Architektura systemu](#4-architektura-systemu)
5. [Stack technologiczny](#5-stack-technologiczny)
6. [Moduły domenowe backendu](#6-moduły-domenowe-backendu)
7. [Funkcjonalności — opis szczegółowy](#7-funkcjonalności--opis-szczegółowy)
8. [Frontend — mapa aplikacji i widoki](#8-frontend--mapa-aplikacji-i-widoki)
9. [API — przegląd endpointów](#9-api--przegląd-endpointów)
10. [Bezpieczeństwo systemu](#10-bezpieczeństwo-systemu)
11. [Operacje i wdrożenie produkcyjne](#11-operacje-i-wdrożenie-produkcyjne)
12. [Testy i CI/CD](#12-testy-i-cicd)
13. [Zależności zewnętrzne](#13-zależności-zewnętrzne)
14. [Diagramy przepływów](#14-diagramy-przepływów)
15. [Spełnienie minimalnych wymagań projektu](#15-spełnienie-minimalnych-wymagań-projektu)
16. [Otwarte tematy i dalszy rozwój](#16-otwarte-tematy-i-dalszy-rozwój)
17. [Planowane funkcjonalności — Roadmap](#17-planowane-funkcjonalności--roadmap)
18. [StayMap Polska — szanse na sukces](#18-staymap-polska--szanse-na-sukces)
19. [Słowniczek pojęć](#19-słowniczek-pojęć)

---

## 1. Streszczenie wykonawcze

StayMap Polska to kompletna platforma rezerwacji noclegów turystycznych w Polsce, zbudowana z naciskiem na wygodę użytkownika, przejrzystość cen i nowoczesny UX. Centralnym elementem aplikacji jest interaktywna mapa — gość odkrywa, porównuje i rezerwuje noclegi w jednym spójnym interfejsie.

| Wskaźnik | Wartość |
|---|---|
| Moduły backend | 12 aplikacji Django |
| Widoki frontend | 44 strony Next.js |
| Pliki testowe | 25 plików testowych |
| Tryby podróży | 9 profili wyszukiwania |
| Docelowy rynek | Polska — turystyka krajowa |
| Waluta | Złoty polski (PLN) |
| Status projektu | Zrealizowany — gotowy do wdrożenia |
| Gotowość produkcyjna | Backend i frontend gotowe; Stripe przygotowany infrastrukturalnie |

### Kluczowe wyróżniki platformy

- **Map-first UX** — wyszukiwanie na mapie Leaflet z klasteryzacją markerów jako główny interfejs odkrywania noclegów
- **Dynamiczny cennik** — sezonowość, polskie święta ustawowe (GUS), niestandardowe szczyty turystyczne, dopłaty za gości i rabaty za długi pobyt
- **Asystent AI** — wyszukiwanie w języku naturalnym po polsku (OpenAI / Groq)
- **Czat WebSocket** — komunikacja w czasie rzeczywistym między gościem a gospodarzem (Django Channels)
- **Blind Release recenzji** — obie strony oceniają niezależnie przed upublicznieniem
- **Inteligencja lokalizacji** — automatyczny POI scoring z OpenStreetMap / Overpass API
- **9 trybów podróży** — romantic, family, pet, workation, slow, outdoor, lake, mountains, wellness
- **Porównywarka ofert** — do 3 ofert side-by-side dla anonimowych i zalogowanych użytkowników

---

## 2. Cel produktu i grupy użytkowników

Platforma odpowiada na konkretną lukę rynkową: brak w Polsce dedykowanego narzędzia do odkrywania noclegów turystycznych z mapą jako głównym interfejsem, dynamicznym cennikiem uwzględniającym polski kalendarz oraz wbudowaną komunikacją.

| Grupa | Potrzeby | Obsługa w systemie |
|---|---|---|
| **Gość (podróżny)** | Znalezienie noclegu, sprawdzenie ceny i dostępności, szybka rezerwacja, komunikacja z gospodarzem | Wyszukiwanie na mapie, karta oferty, widget rezerwacyjny, lista życzeń, czat, recenzje, porównywarka, asystent AI |
| **Gospodarz (właściciel)** | Publikacja oferty, zarządzanie kalendarzem i cennikiem, obsługa gości | Panel hosta, onboarding, CRUD ofert, reguły cenowe, kalendarz blokad, szablony wiadomości |
| **Administrator (moderator)** | Zapewnienie jakości i bezpieczeństwa treści | Kolejka PENDING, akcje zatwierdź/odrzuć z komentarzem, Django Admin |

### Założenia produktowe

- Polska lokalizacja interfejsu (język: pl, strefa czasowa: Europe/Warsaw)
- Obsługa polskich świąt ustawowych w silniku cen (GUS, zaszyte w kodzie)
- Geokodowanie przez OpenStreetMap (Nominatim) — adresy polskie
- Dane POI z Overpass API — atrakcje turystyczne charakterystyczne dla polskich regionów
- Waluta: PLN; szczyty: wakacje letnie, ferie zimowe, długie weekendy majowe, Boże Narodzenie, Nowy Rok

---

## 3. Jak działa aplikacja — scenariusze użycia

### 3.1 Scenariusze gościa

#### Scenariusz A — Odkrycie i rezerwacja noclegu

| Krok | Aktor | Akcja |
|---|---|---|
| 1 | Gość | Wpisuje w wyszukiwarce: „Mazury, 3–7 sierpnia, 2 osoby" |
| 2 | System | Geokoduje lokalizację przez Nominatim → wyświetla mapę Leaflet z markerami |
| 3 | Gość | Wybiera tryb podróży `lake` → TravelModeRanker przelicza scoring |
| 4 | Gość | Klika ofertę → karta ze zdjęciami, opisem, POI, widżetem rezerwacji |
| 5 | Gość | Wybiera daty → `POST /bookings/quote/` → rozbicie ceny na żywo |
| 6 | Gość | Klika Zarezerwuj → rezerwacja `PENDING → AWAITING_PAYMENT` |
| 7 | System | Celery wysyła e-mail potwierdzający do gościa i gospodarza |
| 8 | Gość | Opłaca → status `CONFIRMED` |

#### Scenariusz B — Wyszukiwanie przez Asystenta AI

| Krok | Aktor | Akcja |
|---|---|---|
| 1 | Gość | Na `/ai` wpisuje: „Spokojny domek z sauną dla 4 osób, do 300 zł/noc, sierpień" |
| 2 | AI | Pierwszy call LLM → parsuje: tryb=slow+wellness, goście=4, amenity=sauna, max_price=300 |
| 3 | System | SearchOrchestrator uruchamia geo-filtrowanie + scoring trybów (zawsze świeże dane) |
| 4 | AI | Drugi call LLM → wyjaśnienie dopasowania po polsku dla każdej oferty |
| 5 | Gość | Widzi karty: „Ten domek spełnia Twoje oczekiwania, ponieważ posiada saunę..." |
| 6 | Gość | Zadaje follow-up: „A czy są opcje z basenem?" → kontynuacja w tej samej sesji |

#### Scenariusz C — Porównanie ofert i recenzja po pobycie

| Krok | Aktor | Akcja |
|---|---|---|
| 1 | Gość | Klika „Dodaj do porównania" na karcie oferty (maks. 3 oferty, sesja 48h) |
| 2 | System | CompareSession — działa dla anonimowych i zalogowanych |
| 3 | Gość | Na `/compare` widzi tabelę side-by-side: cena, lokalizacja, amenities, oceny |
| 4 | Po pobycie | Celery wysyła e-mail 7 dni po wymeldowaniu |
| 5 | Gość | Wystawia ocenę (1–5 ★) + subskory: czystość, lokalizacja, komunikacja |
| 6 | System | Recenzja `is_public=False` — czeka na recenzję gospodarza (blind release) |
| 7 | System | Gdy obie strony ocenią → atomowe ujawnienie obu recenzji jednocześnie |

### 3.2 Scenariusze gospodarza

#### Scenariusz D — Publikacja pierwszej oferty

| Krok | Aktor | Akcja |
|---|---|---|
| 1 | Gospodarz | Rejestruje się → onboarding `POST /host/onboarding/start/` → rola hosta |
| 2 | Gospodarz | Tworzy ofertę: tytuł, opis, lokalizacja GPS, typ noclegu, tagi geo |
| 3 | Gospodarz | Dodaje zdjęcia (upload z walidacją MIME przez Pillow + python-magic) |
| 4 | Gospodarz | Konfiguruje cennik: cena bazowa, sezonowe mnożniki, rabat za długi pobyt |
| 5 | Gospodarz | Klika „Wyślij do moderacji" → status `DRAFT → PENDING` |
| 6 | Admin | Weryfikuje ofertę → `APPROVED` |
| 7 | System | Oferta pojawia się w wynikach wyszukiwania i na mapie |

#### Scenariusz E — Obsługa rezerwacji i komunikacja z gościem

| Krok | Aktor | Akcja |
|---|---|---|
| 1 | System | Gość wysłał prośbę (tryb REQUEST) → powiadomienie w panelu hosta |
| 2 | Gospodarz | Na `/host/bookings/pending` widzi prośbę z datami i cenowym breakdown |
| 3 | Gospodarz | Ma okno 24h; klika Akceptuj → `PENDING → AWAITING_PAYMENT` |
| 4 | Gość | Opłaca → `CONFIRMED`; gospodarz widzi rezerwację w kalendarzu |
| 5 | Gospodarz | Wysyła wiadomość powitalną z szablonu `{{guest_name}}` |
| 6 | Czat | Wiadomości przez WebSocket — gość widzi natychmiastowo |
| 7 | Gospodarz | Po wymeldowaniu wystawia recenzję gościa → blind release aktywuje się |

### 3.3 Scenariusz administratora

#### Scenariusz F — Moderacja ofert i zarządzanie platformą

| Krok | Aktor | Akcja |
|---|---|---|
| 1 | Admin | Loguje się z `is_admin=True`; widzi kolejkę PENDING |
| 2 | Admin | Na `/admin/moderation/listings/` sprawdza zdjęcia, opis, lokalizację |
| 3 | Admin | Zatwierdza → `APPROVED` lub odrzuca z komentarzem → `REJECTED` |
| 4 | Admin | Zarządza kolekcjami kuratorowanymi (DiscoveryCollection) dla strony głównej |
| 5 | Admin | Aktywuje dodatkowe szczyty cenowe (Andrzejki, Dzień Kobiet) |
| 6 | System | Celery Beat co miesiąc generuje raport kosztów OpenAI API |

---

## 4. Architektura systemu

### 4.1 Warstwy systemu

| Warstwa | Technologia | Odpowiedzialność |
|---|---|---|
| Prezentacji | Next.js 14 (React 18, TypeScript) | SSR, CSR, ISR, App Router, BFF proxy |
| API | Django REST Framework + Daphne ASGI | Endpointy REST, WebSocket, JWT, throttling |
| Logiki | Django services + Celery + Channels | Logika biznesowa, zadania async, broadcasting |
| Danych | PostgreSQL 16 + PostGIS 3.4 + Redis 7 | Persystencja, zapytania geo (GiST), cache, broker |

### 4.2 Diagram zależności komponentów

```
PRZEGLĄDARKA / MOBILE WEB
        ↕ HTTPS
Next.js 14 (SSR + CSR)
Route Handler /api/v1/... (BFF proxy)
        ↕ HTTP REST              ↕ WebSocket
            Daphne ASGI
Django REST Framework | Django Channels
        ↕ ORM/PostGIS   ↕ Channel layer   ↕ Cache/Queue
PostgreSQL+PostGIS  |  Redis 7  |  Celery Worker + Beat
        ↕ HTTP API
Nominatim (geo) | Overpass (POI) | OpenAI (AI) | Google OAuth | SMTP
```

### 4.3 Przepływ typowego żądania REST

1. Użytkownik wykonuje akcję w przeglądarce (np. klika Szukaj)
2. Next.js kieruje żądanie do Route Handlera (BFF) pod `/api/v1/...`
3. BFF przekazuje żądanie do Django (`INTERNAL_API_URL`)
4. Daphne przyjmuje żądanie, middleware JWT weryfikuje token
5. Django sprawdza uprawnienia (`IsAuthenticated`, `IsHost`, `IsAdmin`) i throttling
6. Serwis wywołuje model/ORM, odpytuje Redis (cache) lub kolejkuje zadanie Celery
7. Odpowiedź JSON wraca przez Daphne → BFF → Next.js → przeglądarka

> **Dlaczego BFF?** Warstwa Backend-for-Frontend unika wystawiania wewnętrznego adresu Django do przeglądarki, upraszcza obsługę błędów sieciowych i umożliwia spójne SSR bez problemów z CORS w środowisku Docker.

### 4.4 Komunikacja WebSocket

| Parametr | Wartość |
|---|---|
| Adres | `ws[s]://host/ws/conversations/{uuid}/` |
| Autoryzacja | Token JWT w query string: `?token=` |
| Zdarzenia klienta → serwer | `message.send`, `typing.start`, `typing.stop`, `message.read` |
| Zdarzenia serwer → klient | `message.new`, `typing.start`, `typing.stop`, `message.read` |
| Warstwa kanałów | Redis 7 (channels-redis) |
| Serwer ASGI | Daphne — HTTP i WebSocket jednocześnie |

### 4.5 Zadania asynchroniczne (Celery)

| Harmonogram | Zadanie |
|---|---|
| Co 12 minut | `cleanup_expired_ai_sessions` — sprzątanie wygasłych sesji AI |
| Co 22 minuty | `cleanup_expired_compare_sessions` — sesje porównywarki |
| Co 30 minut | Auto-anulowanie porzuconych rezerwacji `AWAITING_PAYMENT → ABANDONED` |
| Co godzinę | Auto-odrzucenie prośb hosta po przekroczeniu okna decyzyjnego → `REJECTED` |
| Codziennie 10:00 | Przypomnienia e-mail o recenzji (7 dni po wymeldowaniu) |
| Codziennie 03:05 | Odświeżanie cache POI z Overpass API (dane starsze niż 24h) |
| Codziennie 04:10 | Odświeżanie podsumowań tekstowych obszarów (dane starsze niż 7 dni) |
| 1. dnia miesiąca | Raport kosztów API OpenAI (transparentność operacyjna) |
| Na żądanie (async) | Wysyłka e-maili, przeliczenie average_rating, blind release recenzji |

---

## 5. Stack technologiczny

### 5.1 Backend

| Obszar | Technologia | Opis |
|---|---|---|
| Język | Python 3.12 | Zgodność z obrazem Docker; CI używa Python 3.12 |
| Framework | Django 5.1.4 | ORM, administracja, system uprawnień, signals |
| REST API | Django REST Framework 3.x | Widoki API, serializery, paginacja cursorowa, throttling |
| Dokumentacja API | drf-spectacular | OpenAPI 3.0 + Swagger UI pod `/api/schema/swagger-ui/` |
| GIS | GeoDjango + PostGIS 3.4 | PointField, indeksy GiST, zapytania przestrzenne |
| Autentykacja | SimpleJWT + Google OAuth | JWT: access 60 min (HTTP-only cookie) + refresh 30 dni z rotacją |
| Realtime | Django Channels + Daphne | WebSocket czatu, consumer asynchroniczny |
| Zadania async | Celery 5 + django-celery-beat | Worker + harmonogram Beat; broker Redis |
| Cache | django-redis + Redis 7 | Cache zapytań (5 min TTL), sesje porównywarki, limity AI |
| Storage | boto3 + django-storages | Opcjonalny S3 (`USE_S3=True`); lokalnie MEDIA_ROOT |
| Walidacja plików | Pillow + python-magic | Sprawdzanie typów MIME (nie tylko rozszerzenie) |
| Monitoring | sentry-sdk[django] | Raportowanie błędów do Sentry (produkcja) |
| Testy | pytest + pytest-django + Faker 30.8.1 | 25 plików testowych; testy z bazą PostGIS |
| Linting | ruff | Szybki linter i formatter zgodny z PEP 8 |

### 5.2 Frontend

| Obszar | Technologia | Opis |
|---|---|---|
| Framework | Next.js 14 (App Router) | SSR, ISR, RSC; React 18; TypeScript |
| Stylowanie | Tailwind CSS | Utility-first CSS; projekt responsywny |
| Komponenty UI | Radix UI | Dostępne prymitywy (dialog, popover, select) |
| Mapy | Leaflet + react-leaflet + markercluster | Interaktywna mapa wyszukiwania z klasteryzacją |
| Formularze | react-hook-form + zod | Walidacja po stronie klienta, typowana z TypeScript |
| Stan globalny | Zustand | Lekki store bez boilerplate Redux |
| JWT frontend | jose | Weryfikacja tokenów w Next.js middleware |
| Animacje | framer-motion | Przejścia między stronami, animacje UI |
| Notyfikacje | react-hot-toast | Toast notifications |
| Testy E2E | Playwright | Testy end-to-end w Chromium/Firefox/WebKit |

### 5.3 Infrastruktura

| Narzędzie | Opis |
|---|---|
| Docker Compose | Stack lokalny: postgis:16-3.4, redis:7-alpine, backend (Daphne), frontend (Node 20) |
| Makefile | Skróty: `make dev`, `make migrate`, `make seed`, `make test`, `make lint` |
| GitHub Actions | CI: ruff + pytest z usługami PostGIS i Redis; Playwright E2E na main/develop |
| Seed data | `manage.py seed_db` / `seed_polska` / `seed_mass_listings` — dane demo z Faker |

---

## 6. Moduły domenowe backendu

Backend podzielony na 12 aplikacji Django. Wzorzec: **widok → serializer → serwis → model**.

| Moduł | Domena | Zakres odpowiedzialności |
|---|---|---|
| `users` | Użytkownicy | Model User (AbstractBaseUser, e-mail jako login), UserProfile, WishlistItem, SavedSearch. Rejestracja e-mail/hasło i Google OAuth. Soft delete, UUID PK. |
| `common` | Wspólne komponenty | BaseModel (UUID, soft delete, timestamps), AuditLog, wyjątki API ze standardowymi kodami, EmailService, health check. |
| `listings` | Oferty noclegowe | Listing (DRAFT→PENDING→APPROVED/REJECTED/ARCHIVED), ListingLocation (PointField + tagi geo), ListingImage, BlockedDate, destination_score_cache. |
| `pricing` | Silnik cenowy | CustomDatePrice, SeasonalPricingRule, HolidayPricingRule, LongStayDiscountRule. PricingService oblicza pełny breakdown dla podanych dat i gości. |
| `bookings` | Rezerwacje | Booking (7 statusów), pricing_breakdown (JSON snapshot), BookingStatusHistory, Payment, StripeWebhookEvent. |
| `search` | Wyszukiwanie | SearchOrchestrator z geo-filtrowaniem PostGIS, TravelModeRanker, 5-minutowy cache Redis. Geokodowanie przez Nominatim. |
| `host` | Panel gospodarza | Onboarding, CRUD ofert, upload zdjęć z throttlingiem, moderacja, rezerwacje, cennik, powiadomienia, statystyki. |
| `moderation` | Moderacja treści | Kolejka PENDING; akcje approve/reject z komentarzem. Dostęp tylko dla `is_admin=True`. |
| `reviews` | Recenzje | Blind Release, subskory (czystość, lokalizacja, komunikacja, dokładność), odpowiedź hosta, Celery przeliczenie average_rating. |
| `messaging` | Czat | Conversation (1:1 per listing-gość), Message z read_at, MessageTemplate z podstawianiem zmiennych, WebSocket consumer. |
| `ai_assistant` | Asystent AI | AiTravelSession (TTL 24h), AiTravelPrompt, AiFilterInterpretation, AiRecommendation. OpenAI i kompatybilne (Groq). |
| `discovery` | Odkrywanie | DiscoveryCollection (kuratorowane kolekcje), CompareSession (maks. 3 oferty, TTL 48h). |
| `location_intelligence` | Inteligencja lokalizacji | NearbyPlaceCache (TTL 24h), AreaSummaryCache (TTL 7 dni). Destination Score 0–100 per tryb podróży. |

### Model bazowy i soft delete

Każdy model dziedziczy po `BaseModel` z `apps/common/`. Klucz główny to **UUID** — eliminuje ryzyko przewidywalnych ID w API. Pole `deleted_at` implementuje soft delete. Domyślny manager `objects` filtruje `deleted_at IS NULL`; manager `all_objects` udostępnia pełny zbiór (dla administracji i audytu).

---

## 7. Funkcjonalności — opis szczegółowy

### 7.1 Konta i uwierzytelnianie użytkowników

- **Rejestracja e-mail** — unikalny adres e-mail jako login; hasło hashowane PBKDF2 SHA256
- **Google OAuth 2.0** — token weryfikowany przez google-auth; auto-tworzenie lub powiązanie konta
- **JWT** — access token (60 min, HTTP-only cookie) + refresh (30 dni z rotacją)
- **Role** — ten sam użytkownik może być gościem i gospodarzem (flagi `is_host`, `is_admin`)
- **Lista życzeń** (WishlistItem) — gość zapisuje interesujące oferty
- **Zapisane wyszukiwania** (SavedSearch) — parametry wyszukiwania z opcją powiadomień
- **AuthCrossTabSync** — wylogowanie w jednej karcie przeglądarki wylogowuje wszystkie

### 7.2 Oferty i wyszukiwanie

#### Cykl życia oferty

| Status | Znaczenie |
|---|---|
| `DRAFT` | Szkic tworzony przez hosta; niewidoczny publicznie |
| `PENDING` | Po wysłaniu do moderacji; oczekuje na zatwierdzenie admina |
| `APPROVED` | Zaakceptowana; widoczna w wyszukiwarce i na mapie |
| `REJECTED` | Odrzucona z komentarzem; host może edytować i wysłać ponownie |
| `ARCHIVED` | Wycofana przez hosta; zachowana w historii |

#### Tryby podróży i scoring

| Tryb | Charakterystyka |
|---|---|
| `romantic` | Pary — cisza, prywatność, kominek, jacuzzi |
| `family` | Rodziny z dziećmi — bezpieczna przestrzeń, plac zabaw |
| `pet` | Podróże ze zwierzętami — duży ogród, tereny zielone |
| `workation` | Praca zdalna — szybkie Wi-Fi, biurko, cisza |
| `slow` | Slow travel — cisza, natura, detox od miasta |
| `outdoor` | Aktywny wypoczynek — szlaki, rowery, kajaki |
| `lake` | Mazury i jeziora — dostęp do wody, łódki |
| `mountains` | Góry — widoki, szlaki górskie, kolej linowa |
| `wellness` | Wellness — sauna, basen, spa, masaże |

### 7.3 Silnik cen i rezerwacje

#### Wzór kalkulacji ceny pobytu

| Krok | Składnik | Obliczenie |
|---|---|---|
| 1 | Cena za noc | `cena_bazowa × mnożnik_sezonowy × mnożnik_świąteczny` |
| 2 | Suma noclegów | `Σ(cena_za_noc)` dla każdej nocy |
| 3 | Dopłaty za gości | `Σ(cena_noc × dodatkowi_dorośli × 10%)` + `Σ(cena_noc × dzieci × 5%)` |
| 4 | Suma pośrednia | Noclegi + dopłaty |
| 5 | Rabat long-stay | `suma_pośrednia × procent_rabatu` (gdy nocy ≥ próg) |
| 6 | Sprzątanie | Stała kwota hosta |
| 7 | Prowizja | `(suma_po_rabacie + sprzątanie) × 15%` |
| **SUMA** | **Razem do zapłaty** | `suma_po_rabacie + sprzątanie + prowizja` |

#### Obsługa polskich świąt

| Typ | Opis |
|---|---|
| Ustawowe dni wolne (GUS) | Automatyczne — zaszyte w kodzie, bez konfiguracji |
| Dodatkowe szczyty | Opcjonalne — Dzień Kobiet (8 mar), Andrzejki (30 lis), Wszystkich Świętych (1 lis) |
| Reguły sezonowe hosta | SeasonalPricingRule — zakres dat + mnożnik (np. lato 1.12×) |
| Niestandardowe daty hosta | HolidayPricingRule — własne specjalne daty z mnożnikiem |
| Nadpisanie konkretnego dnia | CustomDatePrice — stała cena ignorująca wszystkie mnożniki |

#### Tryby rezerwacji

| Tryb | Przepływ |
|---|---|
| `INSTANT` | `PENDING → AWAITING_PAYMENT`; po opłaceniu → `CONFIRMED`; auto-anulowanie po 1h |
| `REQUEST` | `PENDING`; host ma 24h na decyzję; brak odpowiedzi → auto-odrzucenie przez Celery Beat |

> **Snapshot cenowy:** W momencie tworzenia rezerwacji pełny breakdown jest zapisywany jako JSON (`pricing_breakdown`). Zmiana cennika przez hosta nie wpływa na zatwierdzone pobyty.

### 7.4 Panel gospodarza i onboarding

- **Onboarding** — jednorazowe uruchomienie profilu hosta (`POST /host/onboarding/start/`)
- **Zarządzanie ofertami** — CRUD, upload zdjęć z walidacją MIME, wysłanie do moderacji
- **Reguły cenowe** — sezonowe, świąteczne, long-stay discount
- **Kalendarz dostępności** — blokowanie dat (BlockedDate), podgląd rezerwacji
- **Zarządzanie rezerwacjami** — akceptacja/odrzucenie (tryb REQUEST)
- **Szablony wiadomości** — zmienne `{{guest_name}}`, `{{listing_title}}`
- **Statystyki zarobków** — endpoint `/host/earnings/`

### 7.5 Moderacja treści

Administrator widzi kolejkę `PENDING`. Może **zatwierdzić** (→ `APPROVED`, natychmiastowa widoczność) lub **odrzucić** z komentarzem (→ `REJECTED`). Host może edytować i ponownie wysłać. Endpointy moderacji zabezpieczone `is_admin=True`.

### 7.6 System recenzji — mechanizm ślepego ujawnienia

1. Gość ocenia pobyt (`reviewer_role=GUEST`, `is_public=False`)
2. Host ocenia gościa niezależnie (`reviewer_role=HOST`, `is_public=False`)
3. Gdy obie strony złożyły recenzje → Celery `release_blind_review_task` → atomowe ujawnienie (`is_public=True`)
4. Jeśli minie `blind_release_at` i jedna strona nie oceniła → ujawnienie istniejącej recenzji

Subskory: czystość, lokalizacja, komunikacja, zgodność z opisem. Gospodarz może raz odpowiedzieć na recenzję gościa.

### 7.7 Komunikacja i czat WebSocket

- Konwersacja tworzona automatycznie przy pierwszym kontakcie gościa z ofertą
- REST API: lista konwersacji z licznikiem nieprzeczytanych, historia wiadomości
- WebSocket: nowe wiadomości natychmiastowo bez odświeżania strony
- Wskaźniki pisania (`typing.start`/`stop`) i potwierdzenia przeczytania (`message.read`)
- Licznik nieprzeczytanych wiadomości w nawigacji

### 7.8 Asystent AI — wyszukiwanie w języku naturalnym

| Etap | Opis |
|---|---|
| Zapytanie | „Spokojny domek dla 4 osób na Mazurach z sauną, do 300 zł/noc" |
| Parsowanie | LLM wydobywa: lokalizacja=Mazury, tryb=lake+slow, goście=4, amenity=sauna, max_price=300 |
| Wyszukiwanie | SearchOrchestrator z AiFilterInterpretation — bez cache (zawsze świeże) |
| Wyjaśnienie | Drugi call LLM → 2–3 zdania po polsku: „Ten domek spełnia Twoje oczekiwania, ponieważ..." |

Sesje AI mają TTL 24h. Obsługa OpenAI i kompatybilnych (Groq z Llama — tańsza opcja).

### 7.9 Odkrywanie ofert i porównywarka

- **Kolekcje kuratorowane** (DiscoveryCollection) — tematyczne zestawy na stronie głównej
- **Oferty last-minute** — dynamiczny feed z krótkim terminem dostępności
- **Porównywarka** — do 3 ofert, TTL 48h, działa dla anonimowych i zalogowanych; tabela side-by-side

### 7.10 Inteligencja lokalizacji (POI & scoring)

| Kategoria POI | Przykłady |
|---|---|
| `eat_drink` | Restauracje, kawiarnie, bary |
| `nature_leisure` | Parki, rezerwaty, tereny rekreacyjne |
| `family` | Atrakcje dla dzieci, aquaparki |
| `culture` | Muzea, zabytki, galerie |
| `outdoor` | Szlaki turystyczne, wypożyczalnie rowerów |
| `transport` | Stacje kolejowe, przystanki |
| `services` | Sklepy, apteki, bankomaty |

Wyniki cache'owane 24h (NearbyPlaceCache), odświeżane nocą przez Celery. Destination Score (0–100 per tryb podróży) wpływa na ranking ofert.

---

## 8. Frontend — mapa aplikacji i widoki

### 8.1 Grupy tras

| Grupa | Przykładowe URL | Charakter |
|---|---|---|
| `(auth)` | `/login`, `/register` | Autentykacja; niezalogowani only |
| `(main)` | `/`, `/search`, `/listing/[slug]`, `/bookings`, `/account`, `/messages`, `/compare`, `/ai`, `/discovery`, `/noclegi/[region]`, `/travel/[mode]` | Główna witryna gościa; SSR dla SEO |
| `(host)` | `/host/dashboard`, `/host/listings`, `/host/bookings`, `/host/pricing`, `/host/messages`, `/host/reviews`, `/host/earnings`, `/host/calendar` | Panel gospodarza; wymaga `is_host=True` |

### 8.2 Kluczowe widoki

**Strona główna (`/`):** Hero z wyszukiwarką, kafle regionów i trybów podróży, teaser AI, kuratorowane kolekcje, 3D carousel last-minute.

**Wyszukiwanie (`/search`):** Mapa Leaflet z klasteryzacją, panel filtrów (lokalizacja, daty, goście, tryb, cena, amenities), infinite scroll, GeoJSON overlay województw.

**Karta oferty (`/listing/[slug]`):** Galeria zdjęć, opis + amenities, widget rezerwacyjny z live pricing, recenzje z podskores, opis okolicy + mapa POI, kalendarz cen.

**Asystent AI (`/ai`):** Pole tekstowe zapytania naturalnego, wyniki z wyjaśnieniami dopasowania, historia sesji (`/ai/history`).

**Porównywarka (`/compare`):** Tabela side-by-side, sesja persystentna (anonimowa i zalogowana).

**Panel hosta (`/host/*`):** Dashboard z powiadomieniami, CRUD ofert, kreator nowej oferty, zarządzanie rezerwacjami, kreator cennika, czat z gośćmi, recenzje, statystyki zarobków, payouty.

### 8.3 BFF — Backend for Frontend

`frontend/src/app/api/v1/[...path]/route.ts` — cienka warstwa proxy. Obsługuje GET/POST/PUT/PATCH/DELETE/HEAD, JSON i multipart/form-data, zwraca HTTP 503 z kodem `UPSTREAM_UNAVAILABLE` jeśli Django jest nieosiągalne, zachowuje nagłówki Rate-Limit.

---

## 9. API — przegląd endpointów

| Grupa | Kluczowe endpointy | Co realizuje |
|---|---|---|
| Autentykacja | `POST /auth/register/` · `POST /auth/token/` · `POST /auth/token/refresh/` · `POST /auth/google/` · `GET/PATCH /auth/me/` | Rejestracja, logowanie (e-mail + Google), JWT |
| Oferty | `GET /listings/search/` · `GET /listings/{slug}/` · `GET /listings/{slug}/price-calendar/` | Wyszukiwanie geo, szczegóły oferty, kalendarz cen |
| Rezerwacje | `POST /bookings/quote/` · `POST /bookings/` · `GET /bookings/me/` · `DELETE /bookings/{uuid}/` | Wycena, rezerwacja, lista, anulowanie |
| Recenzje | `POST /reviews/` · `PATCH /reviews/{uuid}/host-response/` | Wystawienie recenzji, odpowiedź hosta |
| Wiadomości | `GET/POST /conversations/` · `GET/POST /conversations/{uuid}/messages/` · `WS /ws/conversations/{uuid}/` | Lista konwersacji, historia, WebSocket |
| Panel hosta | `POST /host/onboarding/start/` · `GET/POST /host/listings/` · `POST /host/listings/{uuid}/images/` · `POST .../submit-for-review/` · `PATCH /host/bookings/{uuid}/status/` | CRUD ofert, moderacja, rezerwacje |
| Moderacja | `GET /admin/moderation/listings/` · `POST .../approve/` · `POST .../reject/` | Kolejka PENDING — tylko `is_admin=True` |
| Discovery & Compare | `GET /discovery/` · `GET/POST /compare/` · `POST /compare/listings/` | Feed główna, sesja porównawcza |
| AI & Search | `POST /ai/search/` · `GET /ai/search/{session_id}/` · `POST .../prompt/` | Sesja AI, follow-up prompts |
| System | `GET /health/` · `GET /api/schema/swagger-ui/` | Health check, Swagger UI |

**Standardy API:** ujednolicony format JSON, kody błędów (`BOOKING_CONFLICT`, `LISTING_NOT_APPROVED`...), paginacja cursorowa, UUID jako wszystkie ID.

---

## 10. Bezpieczeństwo systemu

| Obszar | Mechanizm | Wartość |
|---|---|---|
| Autentykacja | JWT w HTTP-only cookie; rotacja refresh tokenów | XSS mitigation; minimalizacja ryzyka przejęcia tokenu |
| Autoryzacja | `IsAuthenticated`, `IsHost`, `IsAdmin`; izolacja danych | Gość nie edytuje cudzych ofert; host nie widzi rezerwacji innych |
| Soft delete | Rekordy oznaczane `deleted_at` | Ochrona przed utratą danych; przywracanie przez admina |
| Audit Log | `AuditLog` z `user_id`, `action_type`, `timestamp` | Ślad dla compliance; diagnostyka incydentów |
| Walidacja plików | Pillow + python-magic (rzeczywisty typ MIME) | Ochrona przed szkodliwymi plikami pod `*.jpg` |
| Throttling | Limity na auth, upload, AI | Brute-force protection; kontrola kosztów OpenAI |
| Sentry | Automatyczne przechwytywanie wyjątków | Szybka diagnostyka produkcyjna |
| AuthCrossTabSync | Wylogowanie wszystkich kart przeglądarki | Ochrona na współdzielonym komputerze |
| UUID jako PK | Globalnie unikalne identyfikatory | IDOR mitigation; brak przewidywalnych ID |

> **Uwaga krytyczna:** `JWT_SECRET` po stronie Next.js musi być identyczny z Django `SECRET_KEY`. Niespójność powoduje błędy 500 przy SSR.

---

## 11. Operacje i wdrożenie produkcyjne

### 11.1 Komponenty wymagane na produkcji

| Komponent | Uwagi |
|---|---|
| PostgreSQL 16 + PostGIS | Wymaga rozszerzenia `postgis` i `btree_gist`; zalecane managed DB |
| Redis 7 | Cache + broker Celery + channel layer WebSocket; Redis Sentinel dla HA |
| Celery Worker | Min. jeden worker; skalowanie horyzontalne |
| Celery Beat | **Singleton** — więcej niż jeden Beat = duplikaty zadań |
| Daphne / Gunicorn | Dev: Daphne HTTP+WS. Prod: Gunicorn (HTTP) + Daphne (WS) |
| Nginx | TLS termination, pliki statyczne, proxy |
| SMTP | Gmail App Password lub SendGrid |
| S3 (opcjonalnie) | `USE_S3=True`; lokalne `MEDIA_ROOT` jako fallback |

### 11.2 Kluczowe zmienne środowiskowe

| Zmienna | Opis |
|---|---|
| `SECRET_KEY` | Silny klucz Django; identyczny z `JWT_SECRET` w Next.js |
| `DATABASE_URL` | `postgres://user:pass@host:5432/dbname` — z PostGIS |
| `REDIS_URL` | `redis://:pass@host:6379/0` |
| `OPENAI_API_KEY` | OpenAI lub kompatybilny (Groq) |
| `OPENAI_BASE_URL` | Puste dla OpenAI; `https://api.groq.com/openai/v1` dla Groq |
| `GOOGLE_OAUTH_CLIENT_ID` | Z Google Cloud Console |
| `USE_S3` / `AWS_*` | `USE_S3=True` aktywuje S3 |
| `EMAIL_HOST` / `EMAIL_HOST_PASSWORD` | SMTP (Gmail: 16-znakowe App Password) |
| `PLATFORM_SERVICE_FEE_PERCENT` | Prowizja platformy (domyślnie 15) |
| `HOST_REQUEST_ACCEPT_HOURS` | Okno decyzyjne hosta w trybie REQUEST (domyślnie 24h) |
| `AI_SESSION_TTL_HOURS` | TTL sesji AI (domyślnie 24h) |

### 11.3 Kroki wdrożenia

1. Sklonuj repozytorium, skopiuj `.env.example` do `.env`, uzupełnij wartości
2. `docker compose -f docker-compose.prod.yml build`
3. `docker compose run --rm backend python manage.py migrate`
4. `python manage.py collectstatic --noinput`
5. `docker compose up -d` (z profilem `celery` dla workerów)
6. `npm run build && npm start` (lub przez PM2/Docker)
7. Skonfiguruj Nginx z TLS (Let's Encrypt / certbot)
8. Zweryfikuj: `GET /health/` → HTTP 200
9. Sprawdź Sentry — wyślij testowy wyjątek
10. Stwórz konto admina: `python manage.py superuser`

---

## 12. Testy i CI/CD

### 12.1 Backend — pytest

- **25 plików testowych** w modułach domenowych
- Testy jednostkowe serwisów: PricingService (polska sezonowość, święta), BookingService (konflikty, anulowania), AISearchService
- Testy integracyjne endpointów: TestClient DRF, weryfikacja statusów HTTP i struktur JSON
- Testy modeli: tworzenie, relacje, soft delete, UUID jako PK
- Fixtures w `conftest.py`: `listing`, `approved_listing`, `guest_user`, `host_user`, `host_profile`
- `pytest -q --cov` — raport pokrycia w CI

### 12.2 Frontend — Playwright E2E

- Logowanie i rejestracja (e-mail + Google OAuth)
- Wyszukiwanie ofert z filtrami
- Przepływ rezerwacji (quote → booking → success)
- Tworzenie oferty przez hosta
- Wysyłanie wiadomości przez WebSocket

### 12.3 Pipeline CI/CD (GitHub Actions)

| Aspekt | Szczegóły |
|---|---|
| Wyzwalacz | Push/PR do `main` / `develop` |
| Usługi CI | `postgis:16-3.4` + `redis:7` automatycznie |
| Job Backend | `ruff check` → `pytest -q --cov` (Python 3.12, GDAL, libmagic) |
| Job Frontend | `npm ci` → `playwright install` → `playwright test` |
| Brama jakości | Merge zablokowany przy błędach testów lub lintingu |
| Czas pipeline | ~3–5 minut dla typowego PR |

---

## 13. Zależności zewnętrzne

| Usługa | Rola | Uwagi operacyjne |
|---|---|---|
| OpenStreetMap / Nominatim | Geokodowanie (adres → GPS) | Bezpłatny; limit 1 req/s; wymagany User-Agent |
| Overpass API (OSM) | Pobieranie POI w okolicy oferty | Bezpłatny; latencja 1–5s; cache 24h kluczowy |
| OpenAI API (lub kompatybilny) | Parsowanie zapytań naturalnych, wyjaśnienia | Koszt per token; monitoring przez `tokens_used` |
| Google OAuth 2.0 | Logowanie kontem Google | Wymaga `GOOGLE_OAUTH_CLIENT_ID` |
| Stripe (przygotowany) | Płatności online | Infrastruktura gotowa; wymaga konfiguracji konta |
| SMTP | E-maile transakcyjne | Gmail App Password lub SendGrid |

---

## 14. Diagramy przepływów

### 14.1 Rezerwacja — tryb INSTANT

```
Gość        → Wybiera daty, klika Zarezerwuj
Frontend    → POST /bookings/quote/ → rozbicie ceny
Gość        → Potwierdza rezerwację
Frontend    → POST /bookings/ → tworzy rezerwację
Backend     → AvailabilityService sprawdza konflikty
Backend     → Status: PENDING → AWAITING_PAYMENT
Celery      → E-mail potwierdzający do gościa i hosta
Gość        → Opłaca rezerwację
Backend     → AWAITING_PAYMENT → CONFIRMED
Celery      → Auto-anulowanie jeśli brak płatności w 1h
Celery      → 7 dni po COMPLETED: przypomnienie o recenzji
```

### 14.2 Rezerwacja — tryb REQUEST

```
Gość        → Tworzy prośbę o rezerwację
Backend     → Status: PENDING; ustawia host_response_deadline (teraz +24h)
Host        → Widzi prośbę w panelu; okno 24h na decyzję
Host        → Akceptuje → PENDING → AWAITING_PAYMENT
Host        → Odrzuca  → PENDING → REJECTED + powiadomienie
Celery Beat → Co godzinę: auto-odrzucenie po deadline
```

### 14.3 Moderacja oferty

```
Host   → Tworzy ofertę (DRAFT) → klika Wyślij do moderacji → PENDING
Admin  → Sprawdza ofertę w kolejce
Admin  → Zatwierdza → APPROVED (oferta widoczna w wyszukiwarce)
Admin  → Odrzuca   → REJECTED + komentarz → host może poprawić i wysłać ponownie
```

### 14.4 Blind Release recenzji

```
Gość   → Wystawia recenzję (is_public=False)
Host   → Wystawia recenzję niezależnie (is_public=False)
Celery → Obie recenzje istnieją? → atomowe ujawnienie obu (is_public=True)
Celery → Jeśli minie blind_release_at i jedna strona nie oceniła → ujawnienie istniejącej
```

### 14.5 Wyszukiwanie AI

```
Użytkownik → Wpisuje zapytanie po polsku
Frontend   → POST /ai/search/ → tworzy AiTravelSession (TTL 24h)
Backend    → Pierwszy call LLM → AiFilterInterpretation (lokalizacja, daty, tryb, amenities)
Backend    → SearchOrchestrator → lista ofert (bez cache)
Backend    → Drugi call LLM → AiRecommendation (wyjaśnienie po polsku)
Frontend   → Wyświetla karty z wyjaśnieniami
Użytkownik → Follow-up → POST /ai/search/{session_id}/prompt/
```

---

## 15. Spełnienie minimalnych wymagań projektu

### 15.1 ✅ Rejestracja i uwierzytelnianie — `django.contrib.auth`

- Model `User` dziedziczy po `AbstractBaseUser` i `PermissionsMixin`
- `AUTH_USER_MODEL = "users.User"` w `settings/base.py`
- Rejestracja e-mail: `UserManager.create_user()`, hasło hashowane PBKDF2 SHA256
- JWT przez SimpleJWT: access token (60 min, HTTP-only cookie) + refresh (30 dni z rotacją)
- Google OAuth: token weryfikowany przez `google-auth`, auto-tworzenie konta
- 4 walidatory hasła Django: UserAttributeSimilarity, MinimumLength, CommonPassword, Numeric

**Plik:** `backend/apps/users/models.py`

### 15.2 ✅ Rozbudowany panel admina

Pliki `admin.py` we wszystkich 11 aplikacjach domenowych:

| Plik | Model | search_fields | list_filter | inlines |
|---|---|---|---|---|
| `listings/admin.py` | ListingAdmin | ✓ title, slug, email | ✓ status, booking_mode | ✓ LocationInline + ImageInline |
| `bookings/admin.py` | BookingAdmin | ✓ email gościa, tytuł | ✓ status, currency | ✓ StatusHistoryInline |
| `users/admin.py` | UserAdmin | ✓ email, first_name, phone | ✓ is_host, is_admin, is_active | — |
| `messaging/admin.py` | ConversationAdmin | — | — | ✓ MessageInline |
| `reviews/admin.py` | ReviewAdmin | ✓ listing__title | ✓ reviewer_role, is_public | — |
| `ai_assistant/admin.py` | AiTravelSessionAdmin | ✓ user__email | ✓ status | — |

Własne metody `list_display`:
- `location_short()` — `@admin.display(description='Miasto', ordering='location__city')`
- `image_count()` — `@admin.display(description='Zdjęcia', ordering='_image_count')`
- `get_queryset()` — `select_related` + `annotate` dla optymalizacji (N+1 prevention)

### 15.3 ✅ Generowanie danych testowych — Faker + komenda `seed_db`

| Element | Lokalizacja |
|---|---|
| `Faker==30.8.1` | `backend/requirements/development.txt` |
| `factory-boy==3.3.1` | `backend/requirements/development.txt` |
| `manage.py seed_db` | `backend/apps/common/management/commands/seed_db.py` |
| `manage.py seed_polska` | `backend/apps/common/management/commands/seed_polska.py` |
| `manage.py seed_mass_listings` | `backend/apps/common/management/commands/seed_mass_listings.py` |

`seed_polska` używa `Faker('pl_PL')` do generowania polskich opisów ofert per region i typ noclegu.

### 15.4 ✅ Testy jednostkowe

25 plików testowych, framework: `pytest` + `pytest-django`.

```
backend/apps/
├── common/tests/test_health.py
├── users/tests/test_auth_api.py, test_profile_api.py
├── pricing/tests/test_pricing_service.py, test_polish_holidays.py
├── bookings/tests/test_booking_service.py, test_booking_api.py
├── search/tests/test_search_api.py, test_geocode_api.py
├── discovery/tests/test_discovery_api.py
└── ... (15 kolejnych plików)
```

Przykładowe testy:
```python
@pytest.mark.django_db
class TestPricingService:
    def test_basic_three_nights(self, listing):
        # weryfikacja kalkulacji 3 nocy z prowizją 15%
    def test_extra_adults_and_children_surcharge(self, listing):
        # weryfikacja dopłat: dorośli 10%, dzieci 5%
    def test_long_stay_discount(self, listing):
        # weryfikacja rabatu za długi pobyt
```

---

## 16. Otwarte tematy i dalszy rozwój

| Temat | Priorytet | Opis |
|---|---|---|
| Płatności online (Stripe) | 🔴 WYSOKI | Infrastruktura gotowa (modele Payment, StripeWebhookEvent). Wymaga konfiguracji konta i decyzji: capture po pobycie vs. przy rezerwacji. |
| Konfiguracja SMTP | 🔴 WYSOKI | Bez SMTP e-maile nie są wysyłane. Zalecane: Gmail App Password lub SendGrid. |
| Konfiguracja Sentry DSN | 🟡 ŚREDNI | Konfiguracja 15 minut — warto ustawić przed wdrożeniem. |
| Testy obciążeniowe | 🟡 ŚREDNI | Szczególnie wyszukiwanie geo (PostGIS) i WebSocket (równoległe połączenia). |
| Moduł wypłat dla hosta | 🟡 ŚREDNI | Endpoint `/host/earnings/` istnieje; logika wypłat (Stripe Connect) do zaprojektowania. |
| Powiadomienia push | 🟢 NISKI | WebSocket działa; push dla użytkownika w tle → FCM/APNs. |
| Analityka użytkowania | 🟢 NISKI | Google Analytics, Plausible lub Mixpanel na poziomie Next.js. |

> **Rekomendacja:** Krok 1 (2h): SMTP + Sentry. Krok 2 (1 dzień): testy obciążeniowe. Krok 3 (beta): płatności Stripe z ograniczoną liczbą użytkowników.

---

## 17. Planowane funkcjonalności — Roadmap

### 17.1 ✨ AI „Kiedy jechać?" — optymalny termin dla Twoich preferencji

**Priorytet: WYSOKI** | Kategoria: AI

Użytkownik opisuje czego szuka naturalnym językiem — AI analizuje dane sezonowe z `SeasonalPricingRule` i sugeruje najlepszy miesiąc wraz z uzasadnieniem i prognozą ceny.

**Jak to działa:**
- Użytkownik wpisuje: „Chcę ciszy, braku tłumów, dobrej pogody i niskich cen na Mazurach"
- LLM analizuje preferencje → wydobywa parametry: cisza=True, brak_tłumu=True, max_cena=niższy_kwartyl
- Backend odpytuje `SeasonalPricingRule` dla regionu — historia mnożników per miesiąc
- AI nakłada filtry: miesiące poza szczytem (brak tłumu), niskie mnożniki, dane pogodowe z zewnętrznego API
- Odpowiedź: „Najlepszy termin to wrzesień — ceny o 25% niższe niż w lipcu, jeszcze ciepło, mniej turystów"
- Frontend pokazuje **calendar heatmap** z kolorami cen per miesiąc i wyjaśnieniem AI
- Integracja z istniejącym modułem `AiTravelSession` — rozszerzenie bez budowania od zera

---

### 17.2 ◎ „W X godzin" — wyszukiwanie izochron od punktu startowego

**Priorytet: WYSOKI** | Kategoria: GEO

Użytkownik wpisuje swoje miasto i czas dojazdu — mapa pokazuje tylko oferty w zasięgu. Myślenie podróżnicze zamiast geograficznego.

**Jak to działa:**
- Użytkownik wpisuje: „Warszawa" jako punkt startowy, wybiera „max 3 godziny jazdy"
- Backend wywołuje **OpenRouteService API** — generuje izochronę (wielokąt dojazdu) dla 3h jazdy
- `PostGIS ST_Within()` filtruje oferty których `PointField` leży wewnątrz izochrony
- Leaflet renderuje izochronę jako gradient na mapie + markery ofert w zasięgu
- Tryby transportu: samochód, rower, kolej — dzięki ORS multi-modal routing
- Możliwość wyszukiwania „z mojej lokalizacji" — geolokalizacja przeglądarki jako punkt startowy
- **Infrastruktura PostGIS już gotowa** — wystarczy nowy endpoint i overlay Leaflet

---

### 17.3 ▣ „Pamiętnik z podróży" — zdjęcia gości po pobycie

**Priorytet: ŚREDNI** | Kategoria: SOCIAL

Po zakończeniu rezerwacji gość może dodać zdjęcia z pobytu — autentyczne, bez retuszu. Mechanizm jak TripAdvisor dla polskiego rynku.

**Jak to działa:**
- Po zmianie statusu na `COMPLETED` — gość otrzymuje e-mail z zaproszeniem do dodania zdjęć
- Nowy model `GuestPhoto` (relacja do `Booking`): `image`, `caption`, `taken_at`, `is_approved`
- Upload przez istniejący mechanizm (Pillow + python-magic) z walidacją MIME
- Karta oferty: osobna sekcja **„Zdjęcia Gości"** poniżej galerii głównej hosta — wyraźnie oznaczona
- Moderacja opcjonalna — gospodarz może zgłosić zdjęcie do usunięcia (naruszenie prywatności)
- Integracja z Blind Release — zdjęcia widoczne dopiero po zakończeniu okresu recenzji

---

### 17.4 ◆ Karta podarunkowa „Zarezerwuj komuś nocleg"

**Priorytet: ŚREDNI** | Kategoria: BIZNES

Kup voucher dla kogoś — wyślij e-mailem lub wydrukuj. Odbiorca wybiera termin i rezerwuje. Idealny prezent urodzinowy, ślubny, na Mikołaja — Stripe już jest w projekcie.

**Jak to działa:**
- Nowy model `GiftCard`: `uuid`, `value_pln`, `issued_to_email`, `redeemed_by_booking`, `expiry_date`, `stripe_payment_id`
- Nadawca kupuje voucher przez Stripe — płacąc wartość nominalną (np. 500 zł)
- Odbiorca dostaje unikalny link `/gift/{uuid}` — przegląda oferty i aplikuje voucher przy rezerwacji
- Widget rezerwacyjny: pole **„Kod podarunkowy"** — system odlicza wartość od total, nadpłata przez Stripe
- PDF do wydruku: nazwa platformy, wartość, data ważności, unikalny **kod QR**
- Personalizowany komunikat od nadawcy na karcie podarunkowej
- Dodatkowy kanał przychodu: prowizja od wartości vouchera przy zakupie

---

### 17.5 ● „Mapa wspomnień" — interaktywna historia podróży użytkownika

**Priorytet: NISKI** | Kategoria: UX

Na profilu użytkownika interaktywna mapa Polski z pinezkami wszystkich miejsc gdzie mieszkał przez StayMap. Travel journal, który tworzy się automatycznie.

**Jak to działa:**
- Dane są już w systemie: `Booking.listing.location.coordinates` + daty + ocena — **zero nowego backendu**
- Frontend: nowa zakładka **„Moje Podróże"** na `/account` z Leaflet mapą pełnoekranową
- Każda pinezka: miniatura zdjęcia oferty, nazwa miejsca, daty pobytu, wystawiona ocena (gwiazdki)
- Po kliknięciu pinu — popup z kartą: zdjęcie, adres, „Zarezerwowałem X nocy", link do oferty
- Statystyki na górze mapy: liczba podróży, łączna liczba nocy, odwiedzone województwa
- Opcja udostępnienia: publiczny link do profilu podróży (opt-in)
- **Gamifikacja:** odznaki — „Zwiedzacz" za 5 różnych regionów, „Maraton" za 10 rezerwacji

---

## 18. StayMap Polska — szanse na sukces

### 18.1 Luka rynkowa — dlaczego teraz i dlaczego Polska

Polski rynek turystyki krajowej przeżywa systematyczny wzrost — Polacy realizują rocznie ponad 50 milionów podróży krajowych. Tymczasem dostępne platformy to albo globalne agregatory (Booking.com, Airbnb) niedostosowane do polskiej specyfiki, albo przestarzałe lokalne serwisy bez nowoczesnego UX. StayMap Polska celuje precyzyjnie w tę lukę.

| ❌ Co brakuje na rynku | ✅ Co StayMap dostarcza |
|---|---|
| Booking.com nie rozumie polskich świąt i sezonowości | Polski kalendarz świąt wbudowany w silnik cen |
| Airbnb nie ma polskich typów noclegów (agroturystyka, leśniczówka) | Kategorie i tagi specyficzne dla polskiej turystyki |
| Żadna platforma nie ma mapy jako głównego interfejsu | Map-first UX jako centralny element odkrywania |
| Brak myślenia „z Warszawy na weekend w 3h jazdy" | Izochrony „W X godzin" w roadmapie (ORS API) |
| Prowizje globalnych graczy (15–20%) bez modelu lokalnego | Konfigurowalna prowizja 15%, niższa niż u globalnych |

### 18.2 Wyróżniki technologiczne

**Silnik cen uwzględniający polską specyfikę**
PricingService łączy sezonowość, polskie święta ustawowe (GUS), szczyty turystyczne definiowane przez admina, reguły hosta i rabaty długoterminowe. Snapshot ceny zamraża wycenę w momencie rezerwacji. Globalny gracz tego nie wdroży w 6 miesięcy.

**AI rozumiejące potrzeby, nie tylko słowa kluczowe**
Podczas gdy większość platform oferuje filtry, StayMap rozumie intencję: „cichy dom dla rodziny z psem, nie za daleko od Krakowa, początek października" to kompletne zapytanie. Modularność (OpenAI/Groq) daje pełną kontrolę nad kosztami operacyjnymi.

**Mechanizm Blind Release buduje zaufanie w ekosystemie**
Recenzje ślepe to nie ficik — to fundament jakości. Gdy obie strony oceniają niezależnie, recenzje są szczere. Na polskim rynku, gdzie zaufanie do platform rezerwacyjnych bywa niskie, to wyróżnik pierwszego rzędu.

**Inteligencja lokalizacji jako automatyczna wartość dla hosta**
Gospodarz nie musi opisywać okolicy — system robi to za niego. POI z OpenStreetMap, Destination Score, tekstowe podsumowanie obszaru. To obniża barierę wejścia dla hosta i podnosi jakość oferty.

### 18.3 Model biznesowy i skalowalność

| Strumień przychodu | Status | Potencjał |
|---|---|---|
| Prowizja od rezerwacji (domyślnie 15%) | ✅ Gotowe | Główne źródło — skaluje się liniowo z liczbą rezerwacji |
| Karty podarunkowe (vouchery) | 📋 Planowane | Prowizja od wartości + efekt marketingowy |
| Wyróżnienie ofert hosta (boost) | 💡 Do zaprojektowania | Subskrypcja lub płatność jednorazowa za pierwszą pozycję |
| Plan Premium dla hosta | 💡 Do zaprojektowania | Zaawansowana analityka, więcej zdjęć, priorytetowa moderacja |
| Dane analityczne B2B | 🔮 Dalszy horyzont | Zanonimizowane dane sezonowe dla branży turystycznej |

### 18.4 Strategia wejścia na rynek

| Faza | Zakres | Kluczowe działania |
|---|---|---|
| **Faza 1** | Pilot — 2 regiony | Mazury + Zakopane, 200–500 ofert. Zero prowizji przez 6 miesięcy dla hosta. Walidacja UX z prawdziwymi użytkownikami. |
| **Faza 2** | Rozszerzenie PL | Dolny Śląsk, Bałtyk, Podlasie, Roztocze. Aktywacja Stripe. Kampania influencer travel. |
| **Faza 3** | Pełna skala | Pełne pokrycie Polski. Wdrożenie Roadmap. B2B: pakiety dla agencji turystycznych. |

### 18.5 Dlaczego StayMap wygra

| Głębokość lokalnego kontekstu | Jakość architektury i danych | Zaufanie obu stron transakcji |
|---|---|---|
| Polskie święta, polskie regiony, polskie kategorie noclegów, język naturalny po polsku — tego globalny gracz nie wdroży w 6 miesięcy. | PostGIS, WebSocket, Celery, Blind Release, AI — to nie MVP, to produkcyjna platforma. Techddług jest minimalny od dnia zerowego. | Moderacja, Blind Release, snapshot ceny, AuditLog — każdy mechanizm zaprojektowany tak, żeby żadna ze stron nie czuła się oszukana. |

---

> **StayMap Polska to nie kolejny klon Booking.com.**
>
> To pierwsza platforma noclegowa zaprojektowana od podstaw dla polskiego podróżnego — z mapą w centrum, inteligencją AI, uczciwym systemem recenzji i silnikiem cen, który zna Wszystkich Świętych i ferie zimowe.
>
> **Infrastruktura jest gotowa. Czas na rynek.**

---

## 19. Słowniczek pojęć

| Termin | Definicja |
|---|---|
| **ASGI** | Asynchronous Server Gateway Interface — standard serwera Python obsługujący jednocześnie HTTP i WebSocket; wdrożony przez Daphne |
| **BFF** | Backend-for-Frontend — cienka warstwa w Next.js proxy'ująca żądania do Django; upraszcza SSR i konfigurację CORS |
| **Celery** | Biblioteka Python do asynchronicznych i cyklicznych zadań; broker: Redis |
| **Celery Beat** | Scheduler Celery do zadań cyklicznych (odpowiednik crona); musi być singletonem w produkcji |
| **CI/CD** | Continuous Integration / Continuous Deployment — automatyczne testy i wdrożenia po każdej zmianie kodu |
| **Django Channels** | Rozszerzenie Django dodające obsługę WebSocket; używane do czatu w czasie rzeczywistym |
| **GeoJSON** | Format danych geograficznych oparty na JSON; granice Polski i województw na mapie frontu |
| **GeoDjango / PostGIS** | Rozszerzenia Django i PostgreSQL do geograficznych zapytań; filtrowanie po odległości |
| **Izochron** | Obszar geograficzny osiągalny w określonym czasie jazdy — używany w funkcji „W X godzin" |
| **JWT** | JSON Web Token — token dostępu bez sesji serwerowej; access (60 min) + refresh (30 dni z rotacją) |
| **LLM** | Large Language Model — duży model językowy (np. GPT-4o-mini); interpretacja zapytań w AI |
| **Nominatim** | Silnik geokodowania OpenStreetMap; zamienia nazwę miejsca na współrzędne GPS |
| **OpenAI-compatible API** | Interfejs API kompatybilny z OpenAI; pozwala użyć Groq z Llama bez zmiany kodu |
| **Overpass API** | API do odpytywania danych OpenStreetMap o POI w zadanym obszarze |
| **POI** | Point of Interest — punkt zainteresowania (restauracja, szlak, muzeum) w okolicy oferty |
| **Redis** | Baza klucz-wartość w pamięci; cache zapytań, broker Celery, channel layer WebSocket |
| **REST API** | Architektura API oparta na HTTP; endpointy zwracają JSON |
| **Sentry** | Platforma monitorowania błędów; przechwytuje wyjątki produkcyjne z pełnym stack trace |
| **Snapshot cenowy** | Zapis pełnego breakdownu ceny w momencie rezerwacji (JSON) — chroni przed zmianami cennika |
| **Soft delete** | Oznaczenie rekordu jako usunięty (`deleted_at`) zamiast fizycznego kasowania |
| **SSR** | Server-Side Rendering — renderowanie stron HTML na serwerze Next.js; lepsze SEO |
| **Stripe** | Płatność online; infrastruktura (modele, idempotency keys) przygotowana, oczekuje konfiguracji |
| **Throttling** | Ograniczenie liczby zapytań do API w jednostce czasu; ochrona przed brute-force |
| **TTL** | Time to Live — czas życia rekordu w cache; po upływie dane uznawane za przestarzałe |
| **UUID** | Universally Unique Identifier — klucz główny wszystkich modeli; eliminuje przewidywalne ID |
| **WebSocket** | Protokół komunikacji dwukierunkowej w czasie rzeczywistym; czat gość–gospodarz |

---

*StayMap Polska · Dokumentacja Biznesowa v2.0 · Kwiecień 2026*
