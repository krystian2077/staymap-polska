# StayMap Polska — Prompt dla GitHub Copilot

> Wklej ten prompt do GitHub Copilot Chat (lub Copilot Edits) przed rozpoczęciem pracy nad każdą funkcją.
> Prompt zawiera pełny kontekst projektu + szczegółowe instrukcje dla każdego z 9 ulepszeń.

---

## KONTEKST PROJEKTU — przeczytaj zanim zaczniesz

Pracujesz na projekcie **StayMap Polska** — platformie rezerwacji noclegów blisko natury w Polsce (domki, glamping, pensjonaty). Projekt to **monorepo** z dwoma częściami:

### Backend — Django 5 + GeoDjango
- **Lokalizacja:** `backend/`
- **Framework:** Django 5, Django REST Framework, GeoDjango (PostGIS), Celery, Redis
- **Baza danych:** PostgreSQL + PostGIS (zapytania geograficzne przez `PointField`)
- **Autentykacja:** JWT (SimpleJWT), custom `User` model z `AbstractBaseUser`
- **Struktura aplikacji Django:** `apps/listings/`, `apps/bookings/`, `apps/users/`, `apps/search/`, `apps/reviews/`, `apps/messaging/`, `apps/host/`, `apps/pricing/`, `apps/ai_assistant/`, `apps/location_intelligence/`, `apps/discovery/`
- **Wzorzec kodu:** Views → Serializers → Services → Models. Logika biznesowa zawsze w `services.py`, nie w widokach.
- **Modele dziedziczą z `BaseModel`** z `apps/common/models.py` — zawiera `id` (UUID), `created_at`, `updated_at`, `deleted_at` (soft delete)
- **Uruchamianie migracji:** zawsze przez `docker compose exec backend python manage.py makemigrations` i `migrate`
- **Celery:** zadania asynchroniczne w `tasks.py` każdej aplikacji, harmonogram w `config/celery.py`

### Frontend — Next.js 14 + TypeScript
- **Lokalizacja:** `frontend/`
- **Framework:** Next.js 14 (App Router), TypeScript, Tailwind CSS
- **Grupy tras:** `(main)` — strony publiczne, `(auth)` — logowanie/rejestracja, `(host)` — panel hosta
- **Zarządzanie stanem:** Zustand (store w `src/lib/store/`)
- **Zapytania API:** własny hook `useJsonGet` + funkcja `api` z `src/lib/api.ts`
- **Kolory brand:** `brand` = `#16a34a` (zielony), `brand-dark` = `#0a2e1a`, dostępne jako klasy Tailwind (`bg-brand`, `text-brand-dark` itp.)
- **CSS variables:** zdefiniowane w `globals.css` — `--brand`, `--text`, `--text2`, `--text3`, `--border`, `--bg`, `--bg2` itp.
- **Komponenty:** `ListingCard` w `src/components/listings/`, `SearchMap` w `src/components/search/`
- **Typy:** zdefiniowane w `src/types/` — `Listing`, `Booking`, `Review`, `ListingImage` itp.

### Ważne konwencje których MUSISZ przestrzegać:
1. Wszystkie nowe modele Django **muszą dziedziczyć z `BaseModel`**
2. Wszystkie nowe pola UUID **muszą używać `default=uuid.uuid4, editable=False`**
3. Migracje **zawsze z opisową nazwą** (`--name add_nazwa_pola`)
4. Komponenty React **zawsze z `"use client"`** jeśli używają hooków lub event handlerów
5. Typy TypeScript **zawsze jawnie zdefiniowane**, nie używaj `any` tam gdzie można uniknąć
6. API endpointy **zawsze z `permission_classes`** — publiczne z `[AllowAny]`, chronione z `[IsAuthenticated]`
7. Nowe URL-e w `backend/apps/{app}/urls.py` — nie w `config/urls.py` bezpośrednio
8. W frontendzie używaj `cn()` z `src/lib/utils` do warunkowych klas Tailwind

---

## FUNKCJA 1 — Mapa zasięgu podróży (Izochrone)

### Co to jest i jak ma działać:
Izochrone to wielokąt na mapie pokazujący wszystkie miejsca osiągalne w zadanym czasie podróży (np. 1 godzina jazdy samochodem). Zamiast sztucznego okręgu o promieniu X km, użytkownik widzi realny kształt zasięgu — uwzględniający drogi, autostrady, bariery geograficzne. Kształt zmienia się dynamicznie gdy użytkownik przesuwa środek mapy lub zmienia tryb podróży (samochód/rower/pieszo).

**Przepływ działania:**
1. Użytkownik otwiera `/search` i widzi mapę z pinezkami ofert
2. Gdy centrum mapy się zmieni (lub zmieni się tryb podróży), frontend **automatycznie** wywołuje nasz nowy endpoint `/api/v1/search/isochrone/`
3. Backend przekazuje zapytanie do zewnętrznego API Openrouteservice i zwraca GeoJSON z wielokątem
4. Frontend renderuje wielokąt na mapie Leaflet jako zieloną, półprzezroczystą warstwę z przerywaną obwódką
5. Użytkownik może wybrać czas dojazdu (30 min / 1h / 2h) przez dropdown w pasku filtrów

### Krok 1 — Klucz API (zacznij od tego)
Zarejestruj się na https://openrouteservice.org/ i pobierz darmowy klucz API (2000 zapytań/dzień za darmo).

Dodaj do `.env`:
```
OPENROUTESERVICE_API_KEY=twoj_klucz_tutaj
```

Dodaj do `backend/config/settings/base.py`:
```python
OPENROUTESERVICE_API_KEY = env("OPENROUTESERVICE_API_KEY", default="")
```

### Krok 2 — Endpoint backendu
**Plik:** `backend/apps/search/views.py`

Utwórz nową klasę `IsochroneView`. Jej jedynym zadaniem jest:
- przyjąć parametry `lat`, `lng`, `minutes` (domyślnie 60), `profile` (domyślnie `driving-car`)
- zwalidować że `lat` i `lng` są podane
- wysłać zapytanie POST do `https://api.openrouteservice.org/v2/isochrones/{profile}` z kluczem API z ustawień
- zwrócić GeoJSON który dostała od Openrouteservice bezpośrednio do frontendu
- obsłużyć błędy sieciowe zwracając status 502

Profile Openrouteservice które obsługujemy:
- `driving-car` — dla trybów: domyślny, romantic, family, lake, mountains, wellness, workation
- `cycling-regular` — dla trybu `outdoor` (aktywny, rowerowy)
- `foot-walking` — dla trybu `slow` (pieszy, spokojny)

Payload do Openrouteservice (format ich API wymaga `lon` przed `lat` w tablicy!):
```python
{
    "locations": [[float(lng), float(lat)]],  # UWAGA: lon, lat — odwrotna kolejność!
    "range": [minutes * 60],                  # sekundy, nie minuty
    "range_type": "time",
    "smoothing": 0.5,                         # wygładza kształt wielokąta
}
```

Nagłówki: `Authorization: twoj_klucz_api`, `Content-Type: application/json`

Po dodaniu klasy, zarejestruj URL w `backend/apps/search/urls.py`:
```python
path("isochrone/", IsochroneView.as_view(), name="isochrone"),
```

### Krok 3 — Hook frontendowy
**Plik:** `frontend/src/hooks/useIsochrone.ts` (nowy plik)

Utwórz hook `useIsochrone()` który:
- trzyma w stanie: `geojson` (typ `IsochroneGeoJSON | null`) i `loading` (boolean)
- eksportuje funkcję `fetch(lat, lng, minutes, profile)` która robi GET na nasz endpoint i zapisuje wynik w stanie
- eksportuje funkcję `clear()` która ustawia `geojson` na `null`
- obsługuje błędy (try/catch, finally na setLoading)

Zdefiniuj typ `IsochroneGeoJSON`:
```typescript
type IsochroneGeoJSON = {
  type: "FeatureCollection";
  features: Array<{
    type: "Feature";
    geometry: { type: "Polygon"; coordinates: number[][][] };
    properties: { value: number };
  }>;
};
```

### Krok 4 — Warstwa na mapie
**Plik:** `frontend/src/components/search/SearchMap.tsx`

W istniejącym komponencie `SearchMap`:
1. Zaimportuj hook `useIsochrone` i komponent `GeoJSON` z `react-leaflet`
2. Wywołaj hook i pobierz `{ geojson, fetch: fetchIsochrone, clear: clearIsochrone }`
3. Dodaj `useEffect` który reaguje na zmiany `center` i `travelMode` — gdy się zmieniają, wywołaj `fetchIsochrone` z odpowiednim profilem (logika wyboru profilu na podstawie travelMode opisana w Kroku 2)
4. Wewnątrz `<MapContainer>` dodaj warunkowo `<GeoJSON>` gdy `geojson !== null`:
   - kolor obwódki: `#16a34a` (brand green), grubość: `2`
   - kolor wypełnienia: `#16a34a`, przezroczystość: `0.08` (bardzo subtelne)
   - linia przerywana: `dashArray: "6 4"`

### Krok 5 — Selector czasu dojazdu
**Plik:** `frontend/src/components/search/SearchFiltersBar.tsx`

Dodaj `<select>` z trzema opcjami (30 min / 1 godz. / 2 godz.) który kontroluje parametr `minutes` przekazywany do `fetchIsochrone`. Podepnij pod stan lokalny `isochroneMinutes` (domyślnie 60).

---

## FUNKCJA 2 — Tryb Spontan

### Co to jest i jak ma działać:
Przycisk na stronie głównej który losuje jedną ofertę i przekierowuje na jej stronę. Zamiast od razu przekierowywać, pokazuje animację przez 1.5 sekundy — emoji zmienia się co 120ms imitując "kręcenie ruletką". Cel: zatrzymanie użytkowników eksplorujących bez konkretnego planu — bardzo popularny segment na platformach podróżniczych.

**Przepływ działania:**
1. Użytkownik klika przycisk "Tryb Spontan" na stronie głównej
2. Przycisk przechodzi w stan `spinning=true` — tekst zmienia się na "Szukam niespodzianki..."
3. Jednocześnie startuje interwał co 120ms zmieniający wyświetlane emoji na losowe z tablicy SPIN_EMOJIS
4. W tle wykonywane jest zapytanie GET na `/api/v1/search/?ordering=recommended&page_size=30`
5. Po upłynięciu 1.5 sekundy (niezależnie od czasu odpowiedzi API) interwał jest czyszczony
6. Losowany jest jeden wynik z tablicy wyników (Math.random())
7. Następuje przekierowanie `router.push("/listing/" + pick.slug)`
8. Jeśli API zwróci pustą tablicę lub wystąpi błąd — przycisk wraca do stanu początkowego

**Dlaczego 1.5 sekundy a nie natychmiast?** Animacja buduje oczekiwanie i ekscytację — natychmiastowe przekierowanie byłoby niesatysfakcjonujące.

### Krok 1 — Komponent SpontanButton
**Plik:** `frontend/src/components/home/SpontanButton.tsx` (nowy plik)

```
"use client"
Importy: useState, useRouter, cn z @/lib/utils

const SPIN_EMOJIS = ["🏔️", "🌊", "🌲", "🏖️", "🧖", "💑", "🐕", "💻", "🌿"]
  — reprezentują różne typy noclegów i trybów podróży

Stan:
  - spinning: boolean — czy animacja trwa
  - emoji: string — aktualnie wyświetlane emoji (domyślnie "🎲")

Funkcja handleClick:
  1. Guard: jeśli spinning === true, return (nie odpala się ponownie)
  2. setSpinning(true)
  3. let tick = 0
  4. const interval = setInterval(() => setEmoji(SPIN_EMOJIS[tick++ % SPIN_EMOJIS.length]), 120)
  5. try:
     a. fetch("/api/v1/search/?ordering=recommended&page_size=30")
     b. const results = data?.results ?? []
     c. await new Promise(r => setTimeout(r, 1500))  — czekaj na koniec animacji
     d. clearInterval(interval)
     e. jeśli results.length > 0: router.push(`/listing/${pick.slug}`)
     f. jeśli results.length === 0: reset stanu
  6. catch: clearInterval + reset stanu

JSX:
  <button disabled={spinning}>
    <span className={spinning ? "animate-spin" : ""} style={spinning ? {animationDuration:"0.3s"} : undefined}>
      {emoji}
    </span>
    <span>{spinning ? "Szukam niespodzianki..." : "Tryb Spontan"}</span>
  </button>

Klasy Tailwind dla przycisku:
  flex items-center gap-2 rounded-2xl border-2 border-dashed
  border-brand/40 bg-brand-surface px-5 py-3 text-sm font-bold
  text-brand-dark transition-all hover:border-brand hover:bg-brand-muted
  disabled:cursor-wait
```

### Krok 2 — Integracja w HeroSearchBar
**Plik:** `frontend/src/components/home/HeroSearchBar.tsx` lub `frontend/src/components/home/HomeHero.tsx`

Zaimportuj `SpontanButton` i dodaj pod głównym formularzem wyszukiwania:
```tsx
<div className="mt-4 flex justify-center">
  <SpontanButton />
</div>
```

---

## FUNKCJA 3 — Dynamiczne strony regionów (SEO)

### Co to jest i jak ma działać:
Statycznie generowane strony dla 5 regionów Polski — `/noclegi/mazury`, `/noclegi/tatry`, `/noclegi/bieszczady`, `/noclegi/baltyk`, `/noclegi/karkonosze`. Każda strona ma:
- unikalny tytuł i opis dla SEO (generowany przez `generateMetadata`)
- top 6 najlepiej ocenianych ofert z danego regionu
- link CTA do pełnych wyników wyszukiwania
- dane odświeżane co godzinę (`revalidate: 3600`)

**Dlaczego SSG a nie SSR?** Treść zmienia się rzadko — maksymalnie co godzinę przy revalidate. SSG generuje HTML przy buildzie i serwuje ze cache, co daje najlepszy czas ładowania i najlepszy wynik SEO.

**Przepływ danych:**
1. Next.js przy buildzie wywołuje `generateStaticParams()` → generuje 5 stron
2. Dla każdej strony wywołuje `generateMetadata()` → ustawia title/description/openGraph
3. Komponent page wywołuje fetch do backendu → otrzymuje dane regionu + top 6 ofert
4. Dane trafiają do `RegionPageClient` który renderuje stronę
5. Po godzinie Next.js odświeża dane w tle (Incremental Static Regeneration)

### Krok 1 — Endpoint backendu
**Plik:** `backend/apps/search/views.py`

Utwórz słownik `REGION_META` na poziomie modułu (nie w klasie) z konfiguracją dla 5 regionów. Każdy wpis zawiera:
- `title` — wyświetlana nazwa regionu po polsku
- `description` — opis do SEO (1-2 zdania, zawiera słowa kluczowe)
- `search_params` — słownik parametrów przekazywanych do `SearchOrchestrator.get_ordered_ids()` — takie same jak parametry wyszukiwania na mapie

Utwórz klasę `RegionDetailView(APIView)`:
- `permission_classes = [AllowAny]` — strony są publiczne
- metoda `get(self, request, region_slug)`:
  1. Pobierz `meta = REGION_META.get(region_slug)` — jeśli brak, zwróć 404
  2. Wywołaj `SearchOrchestrator.get_ordered_ids({**meta["search_params"], "ordering": "recommended"})` → lista UUID-ów posortowanych według trafności
  3. Pobierz `Listing.objects.filter(id__in=ids[:6], status=Listing.Status.APPROVED).prefetch_related("images", "location")`
  4. Zachowaj kolejność z wyszukiwania (zbuduj `listing_map = {str(l.id): l for l in listings}` i iteruj po `ids[:6]`)
  5. Serializuj przez `ListingSearchSerializer` z `context={"request": request}` (potrzebne do absolutnych URL-i zdjęć)
  6. Zwróć: slug, title, description, listing_count (łączna liczba wyników, nie tylko 6), top_listings, search_params

Zarejestruj URL: `path("regions/<str:region_slug>/", RegionDetailView.as_view(), name="region-detail")`

### Krok 2 — Strona Next.js
**Pliki:**
- `frontend/src/app/(main)/noclegi/[region]/page.tsx` — Server Component z SSG
- `frontend/src/app/(main)/noclegi/[region]/RegionPageClient.tsx` — Client Component (jeśli potrzebny interaktywny element)

**page.tsx** (Server Component — NIE dodawaj `"use client"`):

`generateStaticParams()` — zwróć tablicę `[{region: "mazury"}, {region: "tatry"}, ...]` dla 5 regionów. Next.js wygeneruje strony statycznie przy buildzie.

`generateMetadata({ params })` — wywołaj fetch do backendu, zwróć obiekt `Metadata` z:
- `title`: `Noclegi ${data.title} — domki, apartamenty | StayMap`
- `description`: `data.description`
- `openGraph.title` i `openGraph.description` — dla udostępniania w social media

Domyślna funkcja eksportowana — Server Component który:
1. Robi fetch: `${process.env.NEXT_PUBLIC_API_URL}/api/v1/search/regions/${params.region}/` z `{ next: { revalidate: 3600 } }`
2. Jeśli `!res.ok` → wywołuje `notFound()` z `next/navigation`
3. Renderuje `<RegionPageClient data={data} region={params.region} />`

**RegionPageClient.tsx** — renderuje:
- `<h1>` z nazwą regionu
- `<p>` z opisem
- licznik ofert (`data.listing_count ofert dostępnych`)
- grid 3 kolumny z `<ListingCard>` dla każdej z `data.top_listings`
- `<Link>` do `/search?` z parametrami z `data.search_params` (zbuduj URLSearchParams)

---

## FUNKCJA 4 — Podscory w recenzjach

### Co to jest i jak ma działać:
Model `Review` w `backend/apps/reviews/models.py` ma już pole `subscores = models.JSONField(null=True, blank=True)` które przechowuje słownik z 4 ocenami składowymi. Pole istnieje ale **nigdzie nie jest używane** — nie ma UI do wpisywania ani wyświetlania.

Struktura `subscores`:
```json
{
  "cleanliness": 4.5,
  "location": 5.0,
  "communication": 4.0,
  "accuracy": 4.5
}
```

**Przepływ działania (wystawianie recenzji):**
1. Gość po zakończeniu pobytu wchodzi do formularza recenzji (istniejący formularz w bookings)
2. Obok głównej oceny gwiazdkowej widzi **4 slidery** — po jednym na każdy podscore
3. Każdy slider ma zakres 1.0–5.0 z krokiem 0.5, z etykietą i wartością numeryczną
4. Przy zapisaniu recenzji `subscores` trafia w body requestu do `POST /api/v1/reviews/`

**Przepływ działania (wyświetlanie):**
1. Backend po zapisaniu recenzji uruchamia sygnał Django który przelicza średnie
2. Średnie zapisywane są w polu `average_subscores` w modelu `Listing` (cache)
3. Na stronie oferty wyświetlane są 4 paski postępu z wartościami

**Dlaczego cache w Listing a nie przeliczać na żywo?** Strona oferty jest ładowana często — przeliczanie średniej przy każdym załadowaniu byłoby zbyt kosztowne.

### Krok 1 — Dodaj pole cache do modelu Listing
**Plik:** `backend/apps/listings/models.py`

Do klasy `Listing` dodaj pole:
```python
average_subscores = models.JSONField(
    null=True,
    blank=True,
    help_text='Cache agregatu: {"cleanliness":4.8,"location":4.9,"communication":4.7,"accuracy":4.8}',
)
```

Utwórz migrację: `makemigrations listings --name add_average_subscores`

### Krok 2 — Sygnał przeliczający podscory
**Plik:** `backend/apps/reviews/signals.py`

Dodaj funkcję `_recalculate_subscores(listing_id)`:
```
1. Pobierz wszystkie publiczne recenzje gości dla listing_id które mają subscores != None
   (filtr: is_public=True, reviewer_role=ReviewerRole.GUEST, subscores__isnull=False)
2. Dla każdego z 4 kluczy ["cleanliness", "location", "communication", "accuracy"]:
   a. Zbierz wartości ze wszystkich recenzji gdzie r.subscores jest dict i klucz istnieje
   b. Jeśli lista nie jest pusta — oblicz średnią i zaokrąglij do 2 miejsc po przecinku
3. Jeśli słownik agg nie jest pusty — zaktualizuj Listing.average_subscores przez .update()
   (użyj .update() zamiast .save() żeby nie triggerować innych sygnałów)
```

W istniejącym sygnale `post_save` dla modelu `Review` (lub utwórz nowy) wywołaj `_recalculate_subscores(instance.listing_id)`.

### Krok 3 — Serializer recenzji
**Plik:** `backend/apps/reviews/serializers.py`

Upewnij się że pole `subscores` jest w `fields` serializer-a `ReviewSerializer`. Pole jest opcjonalne (może być None dla starych recenzji).

### Krok 4 — Slidery w formularzu recenzji
Znajdź istniejący formularz recenzji w frontendzie (szukaj w `BookingsPageClient.tsx` lub dedykowanym komponencie recenzji).

Dodaj komponent `SubscoreSliders({ value, onChange })`:
```
Props:
  - value: Record<string, number> — aktualny stan ({"cleanliness": 5, ...})
  - onChange: (v: Record<string, number>) => void — callback przy zmianie

Renders:
  Dla każdego z 4 kluczy (cleanliness, location, communication, accuracy):
  - <label> z polską nazwą:
    cleanliness    → "Czystość"
    location       → "Lokalizacja"
    communication  → "Komunikacja"
    accuracy       → "Zgodność z opisem"
  - <input type="range" min={1} max={5} step={0.5}> podpięty pod value[key]
    onChange wywołuje onChange({ ...value, [key]: parseFloat(e.target.value) })
  - <span> wyświetlający wartość z .toFixed(1)

Klasa slidera: className="flex-1 accent-brand"
```

W formularzu recenzji:
- Dodaj stan `const [subscores, setSubscores] = useState({cleanliness:5, location:5, communication:5, accuracy:5})`
- Dodaj `<SubscoreSliders value={subscores} onChange={setSubscores} />`
- Przy wysyłaniu formularza dodaj `subscores` do body requestu

### Krok 5 — Paski postępu na stronie oferty
**Plik:** `frontend/src/components/listings/ListingReviews.tsx`

Dodaj komponent `SubscoreBar({ label, value })`:
```
Renders: wiersz z etykietą, paskiem postępu i wartością numeryczną
- <span className="w-40 text-sm"> z label
- <div> kontener paska (bg-brand-muted, rounded-full, overflow-hidden)
  - <div> wypełnienie: szerokość = (value / 5) * 100 + "%" (bg-brand, transition-all)
- <span className="w-8 text-right font-bold"> z value.toFixed(1)
```

W głównym renderze `ListingReviews` — **przed listą recenzji** dodaj sekcję z podscorami:
```tsx
{listing.average_subscores && (
  <div className="mb-8 rounded-2xl border border-brand-border bg-brand-surface p-6">
    <h3 className="mb-4 font-bold text-brand-dark">Oceny szczegółowe</h3>
    <div className="space-y-3">
      <SubscoreBar label="Czystość"          value={listing.average_subscores.cleanliness} />
      <SubscoreBar label="Lokalizacja"       value={listing.average_subscores.location} />
      <SubscoreBar label="Komunikacja"       value={listing.average_subscores.communication} />
      <SubscoreBar label="Zgodność z opisem" value={listing.average_subscores.accuracy} />
    </div>
  </div>
)}
```

Sprawdź czy typ `Listing` w `src/types/listing.ts` ma pole `average_subscores?: Record<string, number>` — jeśli nie, dodaj.

---

## FUNKCJA 5 — Szablony wiadomości hosta

### Co to jest i jak ma działać:
Host może tworzyć własne szablony wiadomości — np. "Powitanie", "Instrukcje check-in", "Wskazówki dojazdu". W oknie czatu z gościem pojawia się przycisk "⚡ Szybka odpowiedź" który otwiera dropdown z listą szablonów hosta. Kliknięcie wstawia tekst szablonu do pola wiadomości (z podstawionymi zmiennymi jak imię gościa).

**Przepływ działania:**
1. Host wchodzi w ustawienia → zakładka "Szablony wiadomości" → dodaje/edytuje szablony przez UI (standard CRUD)
2. Gdy host jest w oknie czatu z gościem, widzi przycisk "⚡ Szybka odpowiedź"
3. Klik otwiera dropdown z listą szablonów (pobranych przez GET)
4. Klik w szablon: tekst jest wstawiany do pola input z podstawionymi zmiennymi:
   - `{{guest_name}}` → imię gościa z konwersacji
   - `{{listing_title}}` → tytuł oferty której dotyczy rezerwacja
5. Host może jeszcze edytować tekst przed wysłaniem

### Krok 1 — Model
**Plik:** `backend/apps/messaging/models.py`

Utwórz klasę `MessageTemplate(BaseModel)` z polami:
- `id` — UUIDField, primary_key=True, default=uuid.uuid4, editable=False
- `host` — ForeignKey do `"host.HostProfile"`, on_delete=CASCADE, related_name="message_templates"
- `title` — CharField max_length=100 (np. "Powitanie", "Instrukcje check-in")
- `body` — TextField (treść szablonu, może zawierać `{{guest_name}}` i `{{listing_title}}`)
- `sort_order` — PositiveSmallIntegerField default=0

Meta: `ordering = ["sort_order", "created_at"]`

Utwórz migrację: `makemigrations messaging --name add_message_template`

### Krok 2 — API CRUD dla szablonów
**Plik:** `backend/apps/messaging/serializers.py`

Utwórz `MessageTemplateSerializer(ModelSerializer)` z fields: `["id", "title", "body", "sort_order", "created_at"]`

**Plik:** `backend/apps/messaging/views.py`

Utwórz `MessageTemplateViewSet(ModelViewSet)`:
- `serializer_class = MessageTemplateSerializer`
- `permission_classes = [IsAuthenticated]`
- `get_queryset()` — filtruje po `host` powiązanym z `request.user` (użyj `get_object_or_404(HostProfile, user=request.user)`)
- `perform_create(serializer)` — ustawia `host` przed zapisem

**Plik:** `backend/apps/messaging/urls.py`

Zarejestruj przez router: `router.register("host/message-templates", MessageTemplateViewSet, basename="message-template")`

To da endpointy:
- `GET/POST /api/v1/host/message-templates/`
- `GET/PATCH/DELETE /api/v1/host/message-templates/{id}/`

### Krok 3 — Dropdown w oknie czatu hosta
**Plik:** `frontend/src/app/(host)/host/messages/page.tsx`

Utwórz komponent `TemplateDropdown({ onSelect, guestName?, listingTitle? })`:

```
Stan: [open, setOpen] = useState(false)
Dane: useJsonGet("/api/v1/host/message-templates/") — pobiera listę szablonów

Funkcja insert(template):
  1. Podstaw zmienne w template.body:
     text = template.body
       .replace("{{guest_name}}", guestName ?? "Gościu")
       .replace("{{listing_title}}", listingTitle ?? "")
  2. Wywołaj onSelect(text) — rodzic wstawi tekst do pola input
  3. setOpen(false)

JSX:
  <div className="relative">
    <button onClick={() => setOpen(!open)}>⚡ Szybka odpowiedź</button>
    {open && (
      <div className="absolute bottom-10 left-0 z-20 w-72 rounded-2xl border bg-white p-2 shadow-xl">
        {szablony.map(t => <button key={t.id} onClick={() => insert(t)}>
          <span className="font-bold">{t.title}</span>
          <span className="text-xs text-text3 line-clamp-1">{t.body}</span>
        </button>)}
        {brak szablonów → informacja "Brak szablonów. Dodaj je w ustawieniach."}
      </div>
    )}
  </div>
```

W rodzicu (okno czatu): przekaż `onSelect={(text) => setMessageInput(text)}` — to wstawi tekst do istniejącego pola wiadomości.

---

## FUNKCJA 6 — Kalkulator podziału kosztów

### Co to jest i jak ma działać:
Na stronie podsumowania rezerwacji pojawia się dodatkowa sekcja "Podziel koszt". Zawiera slider liczby osób (1–10) i wyświetla wynik "każda osoba płaci X zł". Jest też przycisk "Skopiuj do podziału" który kopiuje tekst do schowka (np. "4 os. × 375 zł = 1500 zł") — idealny do wklejenia do grupy na WhatsApp.

**Szczegóły działania:**
- Slider zaczyna od wartości `booking.guests_count` (liczba gości z rezerwacji)
- Wartość per osoba = `final_amount / splitCount` — obliczana na żywo przy każdej zmianie slidera
- Wyświetlana kwota formatowana przez `toLocaleString("pl-PL", {style: "currency", currency: "PLN"})` — daje format "375 zł"
- Przycisk kopiowania używa `navigator.clipboard.writeText()` — obsłuż brak wsparcia (nie wszystkie przeglądarki go mają)
- **Zero zmian w backendzie** — cała logika jest w frontendzie

### Implementacja
**Plik:** `frontend/src/components/booking/PriceBreakdown.tsx`

Na końcu pliku (przed ostatnim `export`) dodaj komponent:

```typescript
function CostSplitCalculator({
  totalAmount,
  defaultGuests,
}: {
  totalAmount: number;
  defaultGuests: number;
}) {
  const [splitCount, setSplitCount] = useState(defaultGuests);
  const perPerson = totalAmount / splitCount;

  // Struktura JSX:
  // Kontener: mt-6 rounded-2xl border border-brand-border bg-brand-surface p-5
  //   <h3> "💸 Podziel koszt"
  //   Wiersz z sliderem:
  //     <label> "Liczba osób"
  //     <input type="range" min=1 max=10 value=splitCount onChange=...>
  //     <span> {splitCount}
  //   Wynik:
  //     <span className="text-3xl font-black text-brand"> {perPerson w formacie PLN}
  //     <span className="text-sm text-text3"> "/ osobę"
  //   Przycisk kopiowania:
  //     onClick: navigator.clipboard?.writeText(`${splitCount} os. × ${perPerson.toFixed(0)} zł = ${totalAmount.toFixed(0)} zł`)
  //     tekst: "📋 Skopiuj do podziału"
}
```

Znajdź miejsce w `PriceBreakdown.tsx` gdzie renderowana jest końcowa kwota i **po niej** dodaj:
```tsx
<CostSplitCalculator
  totalAmount={/* final_amount z pricing lub props */}
  defaultGuests={/* guests_count z booking */}
/>
```

Sprawdź jak props są przekazywane do `PriceBreakdown` i dostosuj.

---

## FUNKCJA 7 — Strony trybów podróży (SEO)

### Co to jest i jak ma działać:
9 statycznych stron pod adresami `/travel/romantic`, `/travel/family`, `/travel/pet`, `/travel/workation`, `/travel/slow`, `/travel/outdoor`, `/travel/lake`, `/travel/mountains`, `/travel/wellness`. Każda strona:
- ma unikalny tytuł H1, opis i emoji reprezentujące tryb
- pokazuje top 6 ofert dopasowanych do danego trybu (z istniejącego search API z parametrem `travel_mode`)
- ma CTA link do pełnych wyników na `/search?travel_mode=X`
- ma `generateMetadata` z tytułem i opisem zoptymalizowanym pod SEO

**Dlaczego to jest ważne dla SEO?** Frazy long-tail jak "romantyczny nocleg Polska", "noclegi z psem Mazury", "workation Tatry" mają tysiące wyszukiwań miesięcznie. Dedykowane strony rankują znacznie lepiej niż strona wyszukiwania z parametrami URL.

**Przepływ danych:**
1. `generateStaticParams()` zwraca 9 obiektów `{mode: "romantic"}` itd.
2. Next.js przy buildzie generuje 9 stron HTML
3. Każda strona fetchuje `/api/v1/search/?travel_mode={mode}&ordering=recommended&page_size=6`
4. Dane odświeżane co 30 minut (`revalidate: 1800`)

### Implementacja
**Plik:** `frontend/src/app/(main)/travel/[mode]/page.tsx` (nowy plik)

Jest to **jeden plik** obsługujący wszystkie 9 trybów.

**Słownik MODES** na poziomie modułu:
```typescript
const MODES: Record<string, { emoji: string; headline: string; description: string }> = {
  romantic:  { emoji: "💑", headline: "Noclegi dla par",
    description: "Kameralne domki z jacuzzi i kominkiem — na rocznicę lub spontaniczny wypad we dwoje." },
  family:    { emoji: "👨‍👩‍👧", headline: "Noclegi dla rodzin z dziećmi",
    description: "Przestronne domki z placem zabaw przy jeziorze lub w górach. Bezpieczne i duże." },
  pet:       { emoji: "🐕", headline: "Noclegi przyjazne zwierzętom",
    description: "Obiekty gdzie Twój pies jest mile widziany — ogrodzone tereny, lasy, swoboda." },
  workation: { emoji: "💻", headline: "Praca zdalna w pięknym miejscu",
    description: "Szybki internet, biurko, spokój do skupienia — i widok który inspiruje." },
  slow:      { emoji: "🌿", headline: "Noclegi do oddechu i relaksu",
    description: "Agroturystyki, leśne domki, głęboka cisza i brak zasięgu jako feature." },
  outdoor:   { emoji: "🚵", headline: "Noclegi dla aktywnych",
    description: "Baza wypadowa na szlaki, trasy rowerowe, kajaki. Garaże na rowery." },
  lake:      { emoji: "🌊", headline: "Domki i apartamenty nad jeziorem",
    description: "Własny pomost, kajak przy domu, wschód słońca nad wodą. Mazury, Kaszuby." },
  mountains: { emoji: "🏔️", headline: "Noclegi w polskich górach",
    description: "Tatry, Beskidy, Bieszczady, Karkonosze — domki z widokiem, sauna po szlaku." },
  wellness:  { emoji: "🧖", headline: "Noclegi z sauną i jacuzzi",
    description: "Prywatna bania, jacuzzi, masaże — prawdziwy reset bez wychodzenia z domku." },
};
```

**generateStaticParams():** `return Object.keys(MODES).map(mode => ({ mode }))`

**generateMetadata({ params }):**
```typescript
const m = MODES[params.mode];
return {
  title: `${m.headline} | StayMap Polska`,
  description: m.description,
  openGraph: { title: `${m.headline} | StayMap Polska`, description: m.description },
};
```

**Domyślna funkcja strony (Server Component):**
```typescript
export default async function TravelModePage({ params }) {
  const meta = MODES[params.mode];
  if (!meta) notFound();

  const res = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/api/v1/search/?travel_mode=${params.mode}&ordering=recommended&page_size=6`,
    { next: { revalidate: 1800 } }
  );
  const listings = (await res.json())?.results ?? [];

  return (
    <main className="mx-auto max-w-[1280px] px-4 py-16 sm:px-6 lg:px-10">
      {/* Nagłówek: emoji (text-6xl), h1 (font-black), p z description */}
      {/* Grid 3 kolumny: {listings.map(l => <ListingCard key={l.id} listing={l} />)} */}
      {/* CTA: <Link href={`/search?travel_mode=${params.mode}`}>Zobacz wszystkie oferty →</Link> */}
    </main>
  );
}
```

---

## FUNKCJA 8 — Dark mode

### Co to jest i jak ma działać:
System dark mode dostosowujący kolory strony do preferencji systemowych użytkownika. Tailwind jest już skonfigurowany w projekcie ale **żaden komponent nie używa klas `dark:`**. Wdrożenie jest dwuetapowe:
1. Najpierw CSS variables — definiują ciemny wariant każdego koloru w `globals.css`
2. Potem stopniowe dodawanie klas `dark:` do komponentów

**Strategia `"media"` vs `"class"`:**
- `"media"` — reaguje automatycznie na ustawienia systemowe, zero JS, prostszy
- `"class"` — wymaga JS do przełączania (zapisywanie w localStorage, dodawanie klasy `dark` do `<html>`), ale daje przycisk toggle

Zacznij od `"media"` — jest prostszy i daje efekt dla 43% użytkowników od razu.

### Krok 1 — CSS variables dla dark mode
**Plik:** `frontend/src/app/globals.css`

Po istniejącej sekcji `:root { ... }` dodaj:
```css
@media (prefers-color-scheme: dark) {
  :root {
    /* Brand colors — jaśniejsze w dark mode żeby zachować kontrast na ciemnym tle */
    --brand:         #4ade80;   /* jaśniejszy zielony */
    --brand-dark:    #86efac;   /* jeszcze jaśniejszy dla nagłówków */
    --brand-light:   #bbf7d0;
    --brand-surface: #052e16;   /* bardzo ciemny zielony jako tło sekcji */
    --brand-muted:   #14532d;
    --brand-border:  #166534;   /* border na ciemnym tle */

    /* Tekst — odwrócona hierarchia */
    --text:  #f0fdf4;   /* główny tekst — prawie biały */
    --text2: #bbf7d0;   /* drugorzędny — jasnozielony */
    --text3: #4ade80;   /* trzeciorzędny — zielony */

    /* Tła */
    --background: #030a05;   /* tło strony — bardzo ciemne */
    --foreground: #f0fdf4;
    --bg:  #030a05;
    --bg2: #0a1a0e;   /* tło kart, paneli */
    --bg3: #0f2414;   /* tło hover, aktywnych elementów */

    /* Inne */
    --border: #166534;
    --ink:    #f0fdf4;
    --ink2:   #bbf7d0;
    --ink3:   #86efac;
    --ink4:   #4ade80;
    --bd:     #166534;
  }
}
```

### Krok 2 — Konfiguracja Tailwind
**Plik:** `frontend/tailwind.config.ts`

Dodaj `darkMode: "media"` jako pierwsze pole konfiguracji:
```typescript
const config: Config = {
  darkMode: "media",
  content: [...],
  // reszta bez zmian
};
```

### Krok 3 — Aktualizacja komponentów (wzorzec)

**Wzorzec zamiany** — każda klasa koloru dostaje dark wariant:
```
bg-white          → bg-white dark:bg-bg2
bg-gray-50        → bg-gray-50 dark:bg-bg3
border-gray-200   → border-gray-200 dark:border-brand-border
text-gray-900     → text-gray-900 dark:text-white
text-gray-600     → text-gray-600 dark:text-text3
text-gray-500     → text-gray-500 dark:text-text3
text-gray-400     → text-gray-400 dark:text-text3
```

**Kolejność plików do aktualizacji (od najważniejszego):**

1. **`frontend/src/components/layout/Navbar.tsx`** — header widoczny na każdej stronie
   - tło nawigacji, kolor linków, przycisk hamburger menu

2. **`frontend/src/app/layout.tsx`** — root layout, tło całej strony body

3. **`frontend/src/components/listings/ListingCard.tsx`** — karty ofert wyświetlane wszędzie
   - białe karty, tekst tytułu, tekst ceny, obramowanie

4. **`frontend/src/components/search/SearchPageClient.tsx`** — strona wyszukiwania
   - panel listy, tło, filtry

5. **`frontend/src/components/listings/ListingDetailClient.tsx`** — strona oferty
   - główna treść, sekcje opisów, host card

6. **`frontend/src/components/booking/BookingWidget.tsx`** — widget rezerwacji
   - tło, pola formularza, przyciski

---

## FUNKCJA 9 — Historia sesji AI

### Co to jest i jak ma działać:
Model `AiTravelSession` w `backend/apps/ai_assistant/models.py` zapisuje wszystkie sesje wyszukiwania AI — każda sesja zawiera prompt użytkownika, interpretację parametrów przez LLM i listę dopasowanych ofert. Problem: nie ma żadnego widoku umożliwiającego przeglądanie historii.

**Przepływ działania:**
1. Zalogowany użytkownik wchodzi na `/ai/history`
2. Strona pobiera ostatnie 20 zakończonych sesji (`status="complete"`) przez nowy endpoint
3. Każda sesja pokazana jako karta z: oryginalnym promptem, podsumowaniem AI (`summary_pl`), liczbą znalezionych ofert, datą
4. Kliknięcie w kartę przekierowuje na `/ai?session_id=X` — strona AI ładuje wyniki tej sesji
5. Link do historii jest dostępny na stronie `/account`

**Dlaczego fetchujemy w useEffect a nie jako Server Component?** Strona wymaga tokenu JWT do autoryzacji — token jest w localStorage (po stronie klienta), więc musi to być Client Component.

### Krok 1 — Endpoint historii
**Plik:** `backend/apps/ai_assistant/views.py`

Utwórz klasę `AiSessionHistoryView(APIView)`:
- `permission_classes = [IsAuthenticated]`
- metoda `get(self, request)`:
  1. Pobierz sesje: `AiTravelSession.objects.filter(user=request.user, status="complete").order_by("-created_at")[:20]`
  2. Dla każdej sesji pobierz najnowszy prompt (`session.prompts.order_by("-created_at").first()`)
  3. Dla tego promptu pobierz interpretację (`AiFilterInterpretation.objects.filter(prompt=prompt).first()`)
  4. Zbuduj słownik: `session_id`, `prompt` (max 200 znaków), `summary_pl` (max 300 znaków), `result_count`, `created_at` (isoformat)
  5. Zwróć `Response({"results": result})`

Zarejestruj: `path("ai/sessions/history/", AiSessionHistoryView.as_view(), name="ai-session-history")`

**Uwaga:** Importy które będą potrzebne: `AiTravelSession`, `AiFilterInterpretation` z `apps.ai_assistant.models`

### Krok 2 — Strona historii w Next.js
**Plik:** `frontend/src/app/(main)/ai/history/page.tsx` (nowy plik)

```typescript
"use client"

Imports:
  - Link from "next/link"
  - useState, useEffect from "react"
  - getAccessToken from "@/lib/authStorage"

Type SessionSummary:
  session_id, prompt, summary_pl, result_count: number, created_at: string

useState:
  - sessions: SessionSummary[] — lista sesji (domyślnie [])
  - loading: boolean — czy trwa ładowanie (domyślnie true)

useEffect (wywołaj raz po mount):
  1. const token = getAccessToken()
  2. Jeśli brak tokenu: setLoading(false), return
  3. fetch("/api/v1/ai/sessions/history/", { headers: { Authorization: `Bearer ${token}` } })
  4. .then(r => r.json()).then(d => setSessions(d.results ?? []))
  5. .finally(() => setLoading(false))

Render:
  Jeśli loading: spinner/tekst "Ładowanie..."
  Jeśli sessions.length === 0: informacja + link do /ai
  Dla każdej sesji: <Link href={`/ai?session_id=${s.session_id}`}>
    <p className="font-bold line-clamp-1">"{s.prompt}"</p>
    <p className="text-sm text-text3 line-clamp-2">{s.summary_pl}</p>
    <div flex justify-between text-xs text-text3>
      <span>{s.result_count} ofert</span>
      <span>{new Date(s.created_at).toLocaleDateString("pl-PL")}</span>
    </div>
  </Link>
  Na dole: <Link href="/ai"> + Nowe wyszukiwanie AI </Link>
```

### Krok 3 — Link w koncie użytkownika
**Plik:** `frontend/src/app/(main)/account/AccountPageClient.tsx`

Znajdź sekcję z linkami nawigacyjnymi konta i dodaj:
```tsx
<Link href="/ai/history"
  className="flex items-center gap-2 rounded-xl px-4 py-3 hover:bg-brand-surface">
  🤖 Historia wyszukiwań AI
</Link>
```

---

## KOLEJNOŚĆ IMPLEMENTACJI — od czego zacząć

Poniższa kolejność minimalizuje ryzyko i daje szybkie wins na początku:

| Kolejność | Funkcja | Uzasadnienie |
|-----------|---------|--------------|
| **1.** | Kalkulator podziału kosztów (F6) | Tylko frontend, zero ryzyka, 1 godzina — idealny rozgrzewka |
| **2.** | Tryb Spontan (F2) | Tylko frontend, zero backendu, widoczny efekt |
| **3.** | Historia sesji AI (F9) | Prosty endpoint + prosta strona, model już istnieje |
| **4.** | Strony trybów podróży (F7) | Tylko frontend SSG, zero backendu |
| **5.** | Strony regionów (F3) | Backend + frontend SSG, umiarkowana złożoność |
| **6.** | Podscory recenzji (F4) | Migracja + sygnał + UI, zacznij od backendu |
| **7.** | Szablony wiadomości (F5) | Migracja + CRUD API + UI |
| **8.** | Dark mode (F8) | Wdrażaj stopniowo, nie blokuj innych funkcji |
| **9.** | Mapa zasięgu Izochrone (F1) | Najtrudniejsza — wymaga zewnętrznego API i zmian w mapie |

---

## CHECKLIST przed każdą funkcją

Przed rozpoczęciem pracy nad każdą funkcją upewnij się że:

- [ ] Przeczytałem opis "Co to jest i jak ma działać" dla tej funkcji
- [ ] Znam pliki które będę modyfikować
- [ ] Dla zmian backendu: wiem jakie modele/serializers/views/urls będę tworzyć
- [ ] Dla zmian frontendu: wiem w których komponentach i gdzie dokładnie dodaję kod
- [ ] Dla migracji: mam przygotowaną komendę z opisową nazwą (`--name`)

## CHECKLIST po każdej funkcji

Po ukończeniu każdej funkcji sprawdź:

- [ ] Backend: migracja wykonana i nie ma błędów
- [ ] Backend: nowy URL zarejestrowany i zwraca poprawny status
- [ ] Backend: endpoint działa z poprawnym tokenem JWT
- [ ] Frontend: komponent renderuje się bez błędów TypeScript
- [ ] Frontend: zachowanie jest zgodne z opisem "jak ma działać"
- [ ] Frontend: nie ma regresji w istniejących funkcjach
