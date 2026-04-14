# StayMap Polska — Przewodnik implementacji ulepszeń

> Wersja 1.0 · Kwiecień 2026  
> Dokumentacja zawiera szczegółowe instrukcje krok po kroku dla 9 zaplanowanych ulepszeń projektu.

---

## Spis treści

1. [Mapa zasięgu podróży (Izochrone)](#1-mapa-zasięgu-podróży-izochrone)
2. [Tryb Spontan — losowanie oferty](#2-tryb-spontan--losowanie-oferty)
3. [Dynamiczne strony regionów (SEO)](#3-dynamiczne-strony-regionów-seo)
4. [Podscory w recenzjach](#4-podscory-w-recenzjach)
5. [Szablony wiadomości hosta](#5-szablony-wiadomości-hosta)
6. [Kalkulator podziału kosztów](#6-kalkulator-podziału-kosztów)
7. [Strony trybów podróży (SEO)](#7-strony-trybów-podróży-seo)
8. [Dark mode](#8-dark-mode)
9. [Historia sesji AI](#9-historia-sesji-ai)

---

## 1. Mapa zasięgu podróży (Izochrone)

**Tagi:** Backend · Frontend · Openrouteservice API

Zamiast prostego okręgu `radius_km`, pokazuj realny zasięg podróży (np. 1h jazdy samochodem) jako wielokąt na mapie wyszukiwania. Integracja z darmowym API Openrouteservice — rejestracja na openrouteservice.org daje 2000 zapytań dziennie za darmo.

**Pliki do modyfikacji:**
- `backend/apps/search/views.py`
- `backend/apps/search/urls.py`
- `backend/config/settings/base.py`
- `frontend/src/hooks/useIsochrone.ts` *(nowy)*
- `frontend/src/components/search/SearchMap.tsx`
- `frontend/src/components/search/SearchFiltersBar.tsx`

### Krok 1 — Nowy endpoint backendu `/api/v1/search/isochrone/`

```python
# backend/apps/search/views.py
import requests
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny

class IsochroneView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        lat     = request.query_params.get("lat")
        lng     = request.query_params.get("lng")
        minutes = int(request.query_params.get("minutes", 60))
        profile = request.query_params.get("profile", "driving-car")
        # profile: driving-car | cycling-regular | foot-walking

        if not lat or not lng:
            return Response({"error": "Podaj lat i lng"}, status=400)

        ors_key = getattr(settings, "OPENROUTESERVICE_API_KEY", "")
        url     = f"https://api.openrouteservice.org/v2/isochrones/{profile}"
        payload = {
            "locations":  [[float(lng), float(lat)]],
            "range":      [minutes * 60],
            "range_type": "time",
            "smoothing":  0.5,
        }
        try:
            resp = requests.post(url, json=payload,
                headers={"Authorization": ors_key}, timeout=8)
            resp.raise_for_status()
            return Response(resp.json())
        except requests.RequestException as e:
            return Response({"error": str(e)}, status=502)
```

```python
# backend/apps/search/urls.py — dodaj:
path("isochrone/", IsochroneView.as_view(), name="isochrone"),
```

```python
# backend/config/settings/base.py — dodaj:
OPENROUTESERVICE_API_KEY = env("OPENROUTESERVICE_API_KEY", default="")
```

```bash
# .env — dodaj (klucz bezpłatny z openrouteservice.org):
OPENROUTESERVICE_API_KEY=twoj_klucz_api
```

### Krok 2 — Hook frontendowy `useIsochrone.ts`

```typescript
// frontend/src/hooks/useIsochrone.ts  (nowy plik)
import { useState, useCallback } from "react";

export type IsochroneGeoJSON = {
  type: "FeatureCollection";
  features: Array<{
    type: "Feature";
    geometry: { type: "Polygon"; coordinates: number[][][] };
    properties: { value: number };
  }>;
};

export function useIsochrone() {
  const [geojson, setGeojson] = useState<IsochroneGeoJSON | null>(null);
  const [loading, setLoading] = useState(false);

  const fetch = useCallback(
    async (lat: number, lng: number, minutes = 60, profile = "driving-car") => {
      setLoading(true);
      try {
        const res  = await window.fetch(
          `/api/v1/search/isochrone/?lat=${lat}&lng=${lng}&minutes=${minutes}&profile=${profile}`
        );
        const data = await res.json();
        setGeojson(data);
      } finally {
        setLoading(false);
      }
    }, []
  );

  const clear = useCallback(() => setGeojson(null), []);
  return { geojson, loading, fetch, clear };
}
```

### Krok 3 — Warstwa GeoJSON w `SearchMap.tsx`

```typescript
// frontend/src/components/search/SearchMap.tsx
import { GeoJSON } from "react-leaflet";
import { useIsochrone } from "@/hooks/useIsochrone";

const { geojson, fetch: fetchIsochrone } = useIsochrone();

// Pobierz izochrone gdy zmienia się centrum mapy lub tryb podróży:
useEffect(() => {
  if (!center?.lat || !center?.lng) return;
  const profile =
    travelMode === "outdoor" ? "cycling-regular" :
    travelMode === "slow"    ? "foot-walking"    : "driving-car";
  fetchIsochrone(center.lat, center.lng, 60, profile);
}, [center, travelMode]);

// W JSX wewnątrz <MapContainer>:
{geojson && (
  <GeoJSON
    data={geojson}
    style={{
      color:       "#16a34a",
      weight:      2,
      fillColor:   "#16a34a",
      fillOpacity: 0.08,
      dashArray:   "6 4",
    }}
  />
)}
```

### Krok 4 — Selector czasu dojazdu w `SearchFiltersBar.tsx`

```typescript
const TIME_OPTIONS = [
  { label: "30 min",  value: 30  },
  { label: "1 godz.", value: 60  },
  { label: "2 godz.", value: 120 },
];

<select
  value={isochroneMinutes}
  onChange={(e) => setIsochroneMinutes(Number(e.target.value))}
  className="rounded-xl border border-brand-border bg-white px-3 py-2 text-sm"
>
  {TIME_OPTIONS.map((o) => (
    <option key={o.value} value={o.value}>{o.label} dojazdu</option>
  ))}
</select>
```

---

## 2. Tryb Spontan — losowanie oferty

**Tagi:** Frontend only · ~2h implementacji · 0 zmian w backendzie

Przycisk na stronie głównej animuje losowanie przez 1.5 sekundy (zmiana emoji co 120ms), pobiera top 30 ofert z istniejącego API i przekierowuje na losowo wybraną ofertę.

**Pliki do modyfikacji:**
- `frontend/src/components/home/SpontanButton.tsx` *(nowy)*
- `frontend/src/components/home/HeroSearchBar.tsx`

### Krok 1 — Komponent `SpontanButton.tsx`

```typescript
// frontend/src/components/home/SpontanButton.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

const SPIN_EMOJIS = ["🏔️", "🌊", "🌲", "🏖️", "🧖", "💑", "🐕", "💻", "🌿"];

export function SpontanButton() {
  const router             = useRouter();
  const [spinning, setSpinning] = useState(false);
  const [emoji,    setEmoji]    = useState("🎲");

  const handleClick = async () => {
    if (spinning) return;
    setSpinning(true);

    let tick = 0;
    const interval = setInterval(
      () => setEmoji(SPIN_EMOJIS[tick++ % SPIN_EMOJIS.length]), 120
    );

    try {
      const res     = await fetch("/api/v1/search/?ordering=recommended&page_size=30");
      const data    = await res.json();
      const results: Array<{ slug: string }> = data?.results ?? [];

      await new Promise((r) => setTimeout(r, 1500));
      clearInterval(interval);

      if (results.length > 0) {
        const pick = results[Math.floor(Math.random() * results.length)];
        router.push(`/listing/${pick.slug}`);
      } else {
        setSpinning(false);
        setEmoji("🎲");
      }
    } catch {
      clearInterval(interval);
      setSpinning(false);
      setEmoji("🎲");
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={spinning}
      className={cn(
        "flex items-center gap-2 rounded-2xl border-2 border-dashed",
        "border-brand/40 bg-brand-surface px-5 py-3 text-sm font-bold",
        "text-brand-dark transition-all hover:border-brand hover:bg-brand-muted",
        "disabled:cursor-wait"
      )}
    >
      <span
        className={cn("text-xl", spinning && "animate-spin")}
        style={spinning ? { animationDuration: "0.3s" } : undefined}
      >
        {emoji}
      </span>
      <span>{spinning ? "Szukam niespodzianki..." : "Tryb Spontan"}</span>
    </button>
  );
}
```

### Krok 2 — Dodanie do `HeroSearchBar.tsx`

```typescript
// frontend/src/components/home/HeroSearchBar.tsx
import { SpontanButton } from "./SpontanButton";

// Pod głównym formularzem wyszukiwania:
<div className="mt-4 flex justify-center">
  <SpontanButton />
</div>
```

---

## 3. Dynamiczne strony regionów (SEO)

**Tagi:** Backend · Next.js SSG · SEO

Statycznie generowane strony `/noclegi/[region]` z opisami, top 6 ofert i metadanymi OpenGraph. Dane odświeżane co godzinę (`revalidate: 3600`).

**Pliki do stworzenia/modyfikacji:**
- `backend/apps/search/views.py`
- `backend/apps/search/urls.py`
- `frontend/src/app/(main)/noclegi/[region]/page.tsx` *(nowy)*
- `frontend/src/app/(main)/noclegi/[region]/RegionPageClient.tsx` *(nowy)*

### Krok 1 — Endpoint `RegionDetailView`

```python
# backend/apps/search/views.py — dodaj:
REGION_META = {
    "mazury": {
        "title":       "Mazury",
        "description": "Kraina Wielkich Jezior — noclegi nad wodą, kajaki, domki z pomostem.",
        "search_params": {
            "near_lake": True, "location": "Mazury",
            "latitude": 53.8, "longitude": 21.5, "radius_km": 100,
        },
    },
    "tatry": {
        "title":       "Tatry i Zakopane",
        "description": "Góralskie domki, widok na szczyty, sauna po dniu na szlaku.",
        "search_params": {
            "near_mountains": True, "location": "Zakopane",
            "latitude": 49.2992, "longitude": 19.9496, "radius_km": 60,
        },
    },
    "bieszczady": {
        "title":       "Bieszczady",
        "description": "Dzika przyroda, cisza i domki z dala od cywilizacji.",
        "search_params": {
            "near_mountains": True, "near_forest": True,
            "location": "Bieszczady", "latitude": 49.05, "longitude": 22.5, "radius_km": 80,
        },
    },
    "baltyk": {
        "title":       "Bałtyk",
        "description": "Apartamenty przy plaży, domki z widokiem na morze.",
        "search_params": {
            "near_sea": True, "location": "Sopot",
            "latitude": 54.45, "longitude": 18.67, "radius_km": 120,
        },
    },
    "karkonosze": {
        "title":       "Karkonosze i Szklarska Poręba",
        "description": "Domki w Sudetach — idealne na narty zimą, wędrówki latem.",
        "search_params": {
            "near_mountains": True, "location": "Szklarska Poręba",
            "latitude": 50.83, "longitude": 15.52, "radius_km": 50,
        },
    },
}

class RegionDetailView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, region_slug):
        meta = REGION_META.get(region_slug)
        if not meta:
            return Response({"error": "Region nie istnieje"}, status=404)

        ids      = SearchOrchestrator.get_ordered_ids(
            {**meta["search_params"], "ordering": "recommended"})
        listings = (Listing.objects
            .filter(id__in=ids[:6], status=Listing.Status.APPROVED)
            .prefetch_related("images", "location"))
        listing_map = {str(l.id): l for l in listings}
        ordered     = [listing_map[str(i)] for i in ids[:6] if str(i) in listing_map]

        ser = ListingSearchSerializer(ordered, many=True, context={"request": request})
        return Response({
            "slug":          region_slug,
            "title":         meta["title"],
            "description":   meta["description"],
            "listing_count": len(ids),
            "top_listings":  ser.data,
            "search_params": meta["search_params"],
        })
```

```python
# backend/apps/search/urls.py — dodaj:
path("regions/<str:region_slug>/", RegionDetailView.as_view(), name="region-detail"),
```

### Krok 2 — Strona Next.js z SSG

```typescript
// frontend/src/app/(main)/noclegi/[region]/page.tsx
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import RegionPageClient from "./RegionPageClient";

const REGIONS = ["mazury", "tatry", "bieszczady", "baltyk", "karkonosze"];

export function generateStaticParams() {
  return REGIONS.map((region) => ({ region }));
}

export async function generateMetadata({
  params,
}: {
  params: { region: string };
}): Promise<Metadata> {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/api/v1/search/regions/${params.region}/`,
    { next: { revalidate: 3600 } }
  );
  if (!res.ok) return {};
  const data = await res.json();
  return {
    title:       `Noclegi ${data.title} — domki, apartamenty | StayMap`,
    description:  data.description,
    openGraph: {
      title:       `Noclegi ${data.title} | StayMap Polska`,
      description:  data.description,
    },
  };
}

export default async function RegionPage({
  params,
}: {
  params: { region: string };
}) {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/api/v1/search/regions/${params.region}/`,
    { next: { revalidate: 3600 } }
  );
  if (!res.ok) notFound();
  const data = await res.json();
  return <RegionPageClient data={data} region={params.region} />;
}
```

```typescript
// frontend/src/app/(main)/noclegi/[region]/RegionPageClient.tsx
"use client";

import Link from "next/link";
import { ListingCard } from "@/components/listings/ListingCard";

type RegionData = {
  title:         string;
  description:   string;
  listing_count: number;
  top_listings:  any[];
  search_params: Record<string, unknown>;
};

export default function RegionPageClient({
  data,
  region,
}: {
  data:   RegionData;
  region: string;
}) {
  const searchHref =
    "/search?" +
    new URLSearchParams(
      Object.fromEntries(
        Object.entries(data.search_params).map(([k, v]) => [k, String(v)])
      )
    ).toString();

  return (
    <main className="mx-auto max-w-[1280px] px-4 py-16 sm:px-6 lg:px-10">
      <h1 className="mb-3 text-4xl font-black tracking-tight text-brand-dark">
        Noclegi — {data.title}
      </h1>
      <p className="mb-2 text-lg text-text2">{data.description}</p>
      <p className="mb-10 text-sm text-text3">{data.listing_count} ofert dostępnych</p>

      <div className="mb-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {data.top_listings.map((listing) => (
          <ListingCard key={listing.id} listing={listing} />
        ))}
      </div>

      <Link
        href={searchHref}
        className="inline-flex rounded-2xl bg-brand px-8 py-3 font-bold text-white hover:bg-brand-dark"
      >
        Zobacz wszystkie oferty w regionie →
      </Link>
    </main>
  );
}
```

---

## 4. Podscory w recenzjach

**Tagi:** Backend · Frontend · `subscores` JSONField już istnieje

Model `Review` ma już pole `subscores` (JSONField). Brakuje UI: 4 slidery w formularzu recenzji oraz pasków postępu na stronie oferty.

**Pliki do modyfikacji:**
- `backend/apps/listings/models.py`
- `backend/apps/reviews/signals.py`
- `frontend/src/components/listings/ListingReviews.tsx`
- formularz recenzji w `BookingsPageClient.tsx`

### Krok 1 — Pole `average_subscores` w modelu `Listing`

```python
# backend/apps/listings/models.py — dodaj:
average_subscores = models.JSONField(
    null=True,
    blank=True,
    help_text='Cache: {"cleanliness":4.8,"location":4.9,"communication":4.7,"accuracy":4.8}',
)
```

```bash
docker compose exec backend python manage.py makemigrations listings --name add_average_subscores
docker compose exec backend python manage.py migrate
```

### Krok 2 — Sygnał Django agregujący podscory

```python
# backend/apps/reviews/signals.py — dodaj:
def _recalculate_subscores(listing_id):
    reviews = Review.objects.filter(
        listing_id=listing_id,
        is_public=True,
        reviewer_role=Review.ReviewerRole.GUEST,
        subscores__isnull=False,
    )
    keys = ["cleanliness", "location", "communication", "accuracy"]
    agg  = {}
    for key in keys:
        vals = [
            r.subscores[key]
            for r in reviews
            if isinstance(r.subscores, dict) and key in r.subscores
        ]
        if vals:
            agg[key] = round(sum(vals) / len(vals), 2)
    if agg:
        Listing.objects.filter(id=listing_id).update(average_subscores=agg)

# Wywołaj na końcu istniejącego sygnału post_save dla Review:
# _recalculate_subscores(instance.listing_id)
```

### Krok 3 — 4 slidery w formularzu recenzji

```typescript
const SUBSCORE_LABELS = {
  cleanliness:   "Czystość",
  location:      "Lokalizacja",
  communication: "Komunikacja",
  accuracy:      "Zgodność z opisem",
};

function SubscoreSliders({
  value,
  onChange,
}: {
  value:    Record<string, number>;
  onChange: (v: Record<string, number>) => void;
}) {
  return (
    <div className="space-y-4">
      <p className="font-bold text-brand-dark">Oceny szczegółowe</p>
      {Object.entries(SUBSCORE_LABELS).map(([key, label]) => (
        <div key={key} className="flex items-center gap-4">
          <span className="w-44 text-sm text-text2">{label}</span>
          <input
            type="range" min={1} max={5} step={0.5}
            value={value[key] ?? 5}
            onChange={(e) => onChange({ ...value, [key]: parseFloat(e.target.value) })}
            className="flex-1 accent-brand"
          />
          <span className="w-8 text-right text-sm font-bold text-brand">
            {(value[key] ?? 5).toFixed(1)}
          </span>
        </div>
      ))}
    </div>
  );
}
```

### Krok 4 — Paski postępu na stronie oferty

```typescript
// frontend/src/components/listings/ListingReviews.tsx
function SubscoreBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-40 text-sm text-text2">{label}</span>
      <div className="flex-1 overflow-hidden rounded-full bg-brand-muted">
        <div
          className="h-2 rounded-full bg-brand transition-all"
          style={{ width: `${(value / 5) * 100}%` }}
        />
      </div>
      <span className="w-8 text-right text-sm font-bold">{value.toFixed(1)}</span>
    </div>
  );
}

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

---

## 5. Szablony wiadomości hosta

**Tagi:** Backend · Frontend · nowy model `MessageTemplate`

Host tworzy szablony wiadomości (powitanie, instrukcje check-in, wskazówki dojazdu). W oknie czatu dropdown wstawia treść jednym kliknięciem.

**Pliki do stworzenia/modyfikacji:**
- `backend/apps/messaging/models.py`
- `backend/apps/messaging/serializers.py`
- `backend/apps/messaging/views.py`
- `backend/apps/messaging/urls.py`
- `frontend/src/app/(host)/host/messages/page.tsx`

### Krok 1 — Model `MessageTemplate`

```python
# backend/apps/messaging/models.py — dodaj:
class MessageTemplate(BaseModel):
    id         = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    host       = models.ForeignKey(
                     "host.HostProfile", on_delete=models.CASCADE,
                     related_name="message_templates")
    title      = models.CharField(max_length=100,
                     help_text="Np. 'Powitanie', 'Instrukcje check-in'")
    body       = models.TextField(
                     help_text="Użyj {{guest_name}} i {{listing_title}} jako zmiennych.")
    sort_order = models.PositiveSmallIntegerField(default=0)

    class Meta:
        ordering = ["sort_order", "created_at"]
```

```bash
docker compose exec backend python manage.py makemigrations messaging --name add_message_template
docker compose exec backend python manage.py migrate
```

### Krok 2 — Serializer, ViewSet, URL

```python
# backend/apps/messaging/serializers.py
class MessageTemplateSerializer(serializers.ModelSerializer):
    class Meta:
        model  = MessageTemplate
        fields = ["id", "title", "body", "sort_order", "created_at"]

# backend/apps/messaging/views.py
class MessageTemplateViewSet(ModelViewSet):
    serializer_class   = MessageTemplateSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        host = get_object_or_404(HostProfile, user=self.request.user)
        return MessageTemplate.objects.filter(host=host)

    def perform_create(self, serializer):
        host = get_object_or_404(HostProfile, user=self.request.user)
        serializer.save(host=host)

# backend/apps/messaging/urls.py
router.register("host/message-templates", MessageTemplateViewSet, basename="message-template")
# GET/POST   /api/v1/host/message-templates/
# PATCH/DELETE /api/v1/host/message-templates/{id}/
```

### Krok 3 — Dropdown szablonów w oknie czatu

```typescript
function TemplateDropdown({
  onSelect,
  guestName,
  listingTitle,
}: {
  onSelect:      (text: string) => void;
  guestName?:    string;
  listingTitle?: string;
}) {
  const { data } = useJsonGet<{ results: MessageTemplate[] }>(
    "/api/v1/host/message-templates/"
  );
  const [open, setOpen] = useState(false);

  const insert = (template: MessageTemplate) => {
    const text = template.body
      .replace("{{guest_name}}",    guestName    ?? "Gościu")
      .replace("{{listing_title}}", listingTitle ?? "");
    onSelect(text);
    setOpen(false);
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="rounded-xl border border-brand-border bg-brand-surface px-3 py-2 text-xs font-bold text-brand-dark"
      >
        ⚡ Szybka odpowiedź
      </button>
      {open && data?.results && (
        <div className="absolute bottom-10 left-0 z-20 w-72 rounded-2xl border border-border bg-white p-2 shadow-xl">
          {data.results.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => insert(t)}
              className="block w-full rounded-xl px-3 py-2 text-left text-sm hover:bg-brand-surface"
            >
              <span className="font-bold">{t.title}</span>
              <span className="ml-2 text-xs text-text3 line-clamp-1">{t.body}</span>
            </button>
          ))}
          {data.results.length === 0 && (
            <p className="p-3 text-xs text-text3">
              Brak szablonów. Dodaj je w ustawieniach.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
```

---

## 6. Kalkulator podziału kosztów

**Tagi:** Frontend only · ~1h implementacji · 0 zmian w backendzie

Na stronie podsumowania rezerwacji: slider liczby osób, wynik „każda osoba płaci X zł", przycisk kopiowania do schowka.

**Pliki do modyfikacji:**
- `frontend/src/components/booking/PriceBreakdown.tsx`

### Implementacja

```typescript
// frontend/src/components/booking/PriceBreakdown.tsx — dodaj na końcu:

function CostSplitCalculator({
  totalAmount,
  defaultGuests,
}: {
  totalAmount:   number;
  defaultGuests: number;
}) {
  const [splitCount, setSplitCount] = useState(defaultGuests);
  const perPerson = totalAmount / splitCount;

  return (
    <div className="mt-6 rounded-2xl border border-brand-border bg-brand-surface p-5">
      <h3 className="mb-3 font-bold text-brand-dark">💸 Podziel koszt</h3>

      <div className="flex items-center gap-4">
        <label className="text-sm text-text2">Liczba osób</label>
        <input
          type="range" min={1} max={10}
          value={splitCount}
          onChange={(e) => setSplitCount(Number(e.target.value))}
          className="flex-1 accent-brand"
        />
        <span className="w-6 text-center font-bold">{splitCount}</span>
      </div>

      <div className="mt-4 text-center">
        <span className="text-3xl font-black text-brand">
          {perPerson.toLocaleString("pl-PL", {
            style:                 "currency",
            currency:              "PLN",
            maximumFractionDigits: 0,
          })}
        </span>
        <span className="ml-2 text-sm text-text3">/ osobę</span>
      </div>

      <button
        type="button"
        onClick={() =>
          navigator.clipboard?.writeText(
            `${splitCount} os. × ${perPerson.toFixed(0)} zł = ${totalAmount.toFixed(0)} zł`
          )
        }
        className="mt-3 w-full rounded-xl border border-brand-border py-2 text-xs font-bold text-brand-dark hover:bg-brand-muted"
      >
        📋 Skopiuj do podziału
      </button>
    </div>
  );
}

// Użycie:
<CostSplitCalculator
  totalAmount={pricing.final_amount}
  defaultGuests={booking.guests_count}
/>
```

---

## 7. Strony trybów podróży (SEO)

**Tagi:** Next.js SSG · 9 stron · `generateStaticParams`

9 statycznie generowanych stron `/travel/[mode]`. Dane odświeżane co 30 minut.

**Pliki do stworzenia:**
- `frontend/src/app/(main)/travel/[mode]/page.tsx` *(nowy)*

### Implementacja

```typescript
// frontend/src/app/(main)/travel/[mode]/page.tsx
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ListingCard } from "@/components/listings/ListingCard";

const MODES: Record<string, { emoji: string; headline: string; description: string }> = {
  romantic:  {
    emoji: "💑", headline: "Noclegi dla par",
    description: "Kameralne domki z jacuzzi i kominkiem — na rocznicę lub spontaniczny wypad we dwoje.",
  },
  family: {
    emoji: "👨‍👩‍👧", headline: "Noclegi dla rodzin z dziećmi",
    description: "Przestronne domki z placem zabaw przy jeziorze lub w górach. Bezpieczne i duże.",
  },
  pet: {
    emoji: "🐕", headline: "Noclegi przyjazne zwierzętom",
    description: "Obiekty gdzie Twój pies jest mile widziany — ogrodzone tereny, lasy, swoboda.",
  },
  workation: {
    emoji: "💻", headline: "Praca zdalna w pięknym miejscu",
    description: "Szybki internet, biurko, spokój do skupienia — i widok który inspiruje.",
  },
  slow: {
    emoji: "🌿", headline: "Noclegi do oddechu i relaksu",
    description: "Agroturystyki, leśne domki, głęboka cisza i brak zasięgu jako feature.",
  },
  outdoor: {
    emoji: "🚵", headline: "Noclegi dla aktywnych",
    description: "Baza wypadowa na szlaki, trasy rowerowe, kajaki. Garaże na rowery.",
  },
  lake: {
    emoji: "🌊", headline: "Domki i apartamenty nad jeziorem",
    description: "Własny pomost, kajak przy domu, wschód słońca nad wodą. Mazury, Kaszuby.",
  },
  mountains: {
    emoji: "🏔️", headline: "Noclegi w polskich górach",
    description: "Tatry, Beskidy, Bieszczady, Karkonosze — domki z widokiem, sauna po szlaku.",
  },
  wellness: {
    emoji: "🧖", headline: "Noclegi z sauną i jacuzzi",
    description: "Prywatna bania, jacuzzi, masaże — prawdziwy reset bez wychodzenia z domku.",
  },
};

export function generateStaticParams() {
  return Object.keys(MODES).map((mode) => ({ mode }));
}

export function generateMetadata({ params }: { params: { mode: string } }): Metadata {
  const m = MODES[params.mode];
  if (!m) return {};
  return {
    title:       `${m.headline} | StayMap Polska`,
    description:  m.description,
    openGraph: { title: `${m.headline} | StayMap Polska`, description: m.description },
  };
}

export default async function TravelModePage({ params }: { params: { mode: string } }) {
  const meta = MODES[params.mode];
  if (!meta) notFound();

  const apiUrl   = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
  const res      = await fetch(
    `${apiUrl}/api/v1/search/?travel_mode=${params.mode}&ordering=recommended&page_size=6`,
    { next: { revalidate: 1800 } }
  );
  const listings = (await res.json())?.results ?? [];

  return (
    <main className="mx-auto max-w-[1280px] px-4 py-16 sm:px-6 lg:px-10">
      <div className="mb-12 text-center">
        <span className="text-6xl">{meta.emoji}</span>
        <h1 className="mt-4 text-4xl font-black tracking-tight text-brand-dark">
          {meta.headline}
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-lg text-text2">{meta.description}</p>
      </div>

      <div className="mb-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {listings.map((listing: any) => (
          <ListingCard key={listing.id} listing={listing} />
        ))}
      </div>

      <div className="text-center">
        <Link
          href={`/search?travel_mode=${params.mode}&ordering=recommended`}
          className="inline-flex rounded-2xl bg-brand px-8 py-3 font-bold text-white hover:bg-brand-dark"
        >
          Zobacz wszystkie oferty →
        </Link>
      </div>
    </main>
  );
}
```

---

## 8. Dark mode

**Tagi:** CSS variables · Tailwind `dark:` · `globals.css`

Projekt używa Tailwind ale nie ma żadnych klas `dark:`. 43% użytkowników mobilnych korzysta z dark mode. Wdrażaj stopniowo.

**Pliki do modyfikacji:**
- `frontend/src/app/globals.css`
- `frontend/tailwind.config.ts`
- Komponenty (stopniowo)

### Krok 1 — CSS variables w `globals.css`

```css
/* frontend/src/app/globals.css — dodaj po sekcji :root */
@media (prefers-color-scheme: dark) {
  :root {
    --brand:         #4ade80;
    --brand-dark:    #86efac;
    --brand-light:   #bbf7d0;
    --brand-surface: #052e16;
    --brand-muted:   #14532d;
    --brand-border:  #166534;

    --text:       #f0fdf4;
    --text2:      #bbf7d0;
    --text3:      #4ade80;
    --border:     #166534;
    --background: #030a05;
    --foreground: #f0fdf4;
    --bg:         #030a05;
    --bg2:        #0a1a0e;
    --bg3:        #0f2414;
    --ink:        #f0fdf4;
    --ink2:       #bbf7d0;
    --ink3:       #86efac;
    --ink4:       #4ade80;
    --bd:         #166534;
  }
}
```

### Krok 2 — Konfiguracja Tailwind

```typescript
// frontend/tailwind.config.ts
const config: Config = {
  darkMode: "media",  // lub "class" jeśli chcesz toggle przyciskiem
  // reszta bez zmian
};
```

### Krok 3 — Wzorzec klas `dark:` (do powielania)

```tsx
// PRZED:
<div className="bg-white border border-gray-200 rounded-2xl p-6">
  <h2 className="text-gray-900 font-bold">Tytuł</h2>
  <p  className="text-gray-600">Opis</p>
</div>

// PO:
<div className="bg-white dark:bg-bg2 border border-gray-200 dark:border-brand-border rounded-2xl p-6">
  <h2 className="text-gray-900 dark:text-white font-bold">Tytuł</h2>
  <p  className="text-gray-600 dark:text-text3">Opis</p>
</div>
```

### Kolejność komponentów do zaktualizowania

| Priorytet | Plik | Główne zmiany |
|-----------|------|---------------|
| 1 | `Navbar.tsx` | `bg-white` → `dark:bg-bg2`, linki, przyciski |
| 2 | `layout.tsx` | `body` background + foreground |
| 3 | `ListingCard.tsx` | białe karty ofert w wynikach |
| 4 | `SearchPageClient.tsx` | panel listy + filtry |
| 5 | `ListingDetailClient.tsx` | strona oferty — główna treść |
| 6 | `BookingWidget.tsx` | widget rezerwacji — ceny, formularz |

---

## 9. Historia sesji AI

**Tagi:** Backend · Frontend · `AiTravelSession` już istnieje

Model `AiTravelSession` zapisuje wszystkie sesje z promptami i wynikami. Brakuje strony `/ai/history`.

**Pliki do stworzenia/modyfikacji:**
- `backend/apps/ai_assistant/views.py`
- `backend/apps/ai_assistant/urls.py`
- `frontend/src/app/(main)/ai/history/page.tsx` *(nowy)*
- `frontend/src/app/(main)/account/AccountPageClient.tsx`

### Krok 1 — Endpoint `AiSessionHistoryView`

```python
# backend/apps/ai_assistant/views.py — dodaj:
class AiSessionHistoryView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        sessions = (
            AiTravelSession.objects
            .filter(user=request.user, status="complete")
            .prefetch_related("prompts__interpretations")
            .order_by("-created_at")[:20]
        )
        result = []
        for session in sessions:
            prompt = session.prompts.order_by("-created_at").first()
            interp = (
                AiFilterInterpretation.objects
                .filter(prompt=prompt).first()
            ) if prompt else None

            result.append({
                "session_id":   str(session.id),
                "prompt":       prompt.raw_text[:200] if prompt else "",
                "summary_pl":   interp.summary_pl[:300] if interp else "",
                "result_count": session.result_total_count,
                "created_at":   session.created_at.isoformat(),
            })
        return Response({"results": result})
```

```python
# backend/apps/ai_assistant/urls.py — dodaj:
path("ai/sessions/history/", AiSessionHistoryView.as_view(), name="ai-session-history"),
```

### Krok 2 — Strona `/ai/history`

```typescript
// frontend/src/app/(main)/ai/history/page.tsx
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getAccessToken } from "@/lib/authStorage";

type SessionSummary = {
  session_id:   string;
  prompt:       string;
  summary_pl:   string;
  result_count: number;
  created_at:   string;
};

export default function AiHistoryPage() {
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    const token = getAccessToken();
    if (!token) return;
    fetch("/api/v1/ai/sessions/history/", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((d) => setSessions(d.results ?? []))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-16 text-center text-text3">Ładowanie...</div>;

  return (
    <main className="mx-auto max-w-2xl px-4 py-16">
      <h1 className="mb-8 text-3xl font-black text-brand-dark">
        🤖 Historia wyszukiwań AI
      </h1>

      {sessions.length === 0 && (
        <p className="text-text3">
          Brak historii.{" "}
          <Link href="/ai" className="text-brand underline">
            Zacznij pierwsze wyszukiwanie →
          </Link>
        </p>
      )}

      <div className="space-y-4">
        {sessions.map((s) => (
          <Link
            key={s.session_id}
            href={`/ai?session_id=${s.session_id}`}
            className="block rounded-2xl border border-border bg-white p-5 transition hover:border-brand hover:shadow-sm"
          >
            <p className="mb-1 font-bold text-brand-dark line-clamp-1">
              "{s.prompt}"
            </p>
            <p className="mb-3 text-sm text-text3 line-clamp-2">{s.summary_pl}</p>
            <div className="flex items-center justify-between text-xs text-text3">
              <span>{s.result_count} ofert</span>
              <span>{new Date(s.created_at).toLocaleDateString("pl-PL")}</span>
            </div>
          </Link>
        ))}
      </div>

      <div className="mt-8 text-center">
        <Link
          href="/ai"
          className="inline-flex rounded-2xl bg-brand px-6 py-3 font-bold text-white hover:bg-brand-dark"
        >
          + Nowe wyszukiwanie AI
        </Link>
      </div>
    </main>
  );
}
```

### Krok 3 — Link w koncie użytkownika

```typescript
// frontend/src/app/(main)/account/AccountPageClient.tsx — dodaj:
<Link href="/ai/history"
  className="flex items-center gap-2 rounded-xl px-4 py-3 hover:bg-brand-surface">
  🤖 Historia wyszukiwań AI
</Link>
```

---

## Podsumowanie priorytetów

| # | Funkcja | Trudność | Wpływ | Szacowany czas |
|---|---------|----------|-------|----------------|
| 6 | Kalkulator podziału kosztów | Niska | Wysoki | 1h |
| 2 | Tryb Spontan | Niska | Wysoki | 2h |
| 9 | Historia sesji AI | Niska | Wysoki | 3h |
| 4 | Podscory w recenzjach | Średnia | Wysoki | 4h |
| 5 | Szablony wiadomości hosta | Średnia | Wysoki | 4h |
| 7 | Strony trybów podróży (SEO) | Niska | Wysoki (SEO) | 3h |
| 3 | Strony regionów (SEO) | Średnia | Bardzo wysoki | 6h |
| 8 | Dark mode | Średnia | Wysoki | 8h |
| 1 | Mapa zasięgu (Izochrone) | Wysoka | Bardzo wysoki | 6h |

---

*Dokumentacja wygenerowana na podstawie analizy kodu projektu StayMap Polska.*  
*Stack: Django 5 + GeoDjango (PostGIS) + Next.js 14 + TypeScript.*
