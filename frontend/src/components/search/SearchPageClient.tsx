"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { apiUrl } from "@/lib/api";
import { geocodePoland } from "@/lib/geocodeApi";
import type { HeroSearchValues } from "./HeroSearchBar";
import { HeroSearchBar } from "./HeroSearchBar";
import { ListingCard } from "./ListingCard";
import type { MapPin, SearchListResponse, SearchListing } from "@/lib/searchTypes";

const SearchMap = dynamic(
  () => import("./SearchMap").then((m) => ({ default: m.SearchMap })),
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-[320px] items-center justify-center rounded-xl border border-neutral-200 bg-neutral-100 text-sm text-neutral-500 dark:border-neutral-700 dark:bg-neutral-900">
        Ładowanie mapy…
      </div>
    ),
  }
);

function paramsFromSearch(sp: URLSearchParams): HeroSearchValues {
  return {
    location: sp.get("location") ?? "",
    latitude: sp.get("latitude") ?? "",
    longitude: sp.get("longitude") ?? "",
    radiusKm: sp.get("radius_km") ?? "50",
    guests: sp.get("guests") ?? "",
    travelMode: sp.get("travel_mode") ?? "",
  };
}

function toApiQuery(v: HeroSearchValues): URLSearchParams {
  const q = new URLSearchParams();
  const loc = v.location.trim();
  if (loc) q.set("location", loc);
  const lat = v.latitude.trim();
  const lng = v.longitude.trim();
  if (lat && lng) {
    q.set("latitude", lat);
    q.set("longitude", lng);
  }
  const rk = v.radiusKm.trim();
  if (rk) q.set("radius_km", rk);
  const g = v.guests.trim();
  if (g) q.set("guests", g);
  if (v.travelMode) q.set("travel_mode", v.travelMode);
  return q;
}

export default function SearchPageClient() {
  const router = useRouter();
  const sp = useSearchParams();
  const initial = useMemo(() => paramsFromSearch(sp), [sp]);

  const [listings, setListings] = useState<SearchListing[]>([]);
  const [pins, setPins] = useState<MapPin[]>([]);
  const [nextUrl, setNextUrl] = useState<string | null>(null);
  const [count, setCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [geoStatus, setGeoStatus] = useState<string | null>(null);
  const [hoverId, setHoverId] = useState<string | null>(null);

  const runSearch = useCallback(async (apiQs: URLSearchParams, append: boolean) => {
    setLoading(true);
    setError(null);
    try {
      const qs = apiQs.toString();
      const listPath = qs ? `/api/v1/search/?${qs}` : `/api/v1/search/`;
      const mapPath = qs ? `/api/v1/search/map/?${qs}` : `/api/v1/search/map/`;

      const [listRes, mapRes] = await Promise.all([
        fetch(apiUrl(listPath), { cache: "no-store" }),
        fetch(apiUrl(mapPath), { cache: "no-store" }),
      ]);

      if (!listRes.ok) {
        const j = await listRes.json().catch(() => ({}));
        const msg =
          typeof j?.error?.message === "string" ? j.error.message : listRes.statusText;
        throw new Error(msg);
      }
      if (!mapRes.ok) {
        throw new Error("Błąd ładowania pinów mapy");
      }

      const listJson = (await listRes.json()) as SearchListResponse;
      const mapJson = (await mapRes.json()) as { data: MapPin[] };

      setListings((prev) => (append ? [...prev, ...listJson.data] : listJson.data));
      if (!append) setPins(mapJson.data);
      setNextUrl(listJson.meta.next);
      setCount(listJson.meta.count);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Błąd sieci");
      if (!append) {
        setListings([]);
        setPins([]);
        setNextUrl(null);
        setCount(null);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const apiQs = toApiQuery(paramsFromSearch(sp));
    void runSearch(apiQs, false);
  }, [sp, runSearch]);

  async function handleSubmit(values: HeroSearchValues) {
    setError(null);
    setGeoStatus(null);

    let lat = values.latitude.trim();
    let lng = values.longitude.trim();
    const loc = values.location.trim();

    if (loc && (!lat || !lng)) {
      const hit = await geocodePoland(loc);
      if (!hit) {
        setError(
          `Nie udało zlokalizować „${loc}”. Spróbuj innej nazwy (np. miasto + województwo) lub podaj współrzędne.`
        );
        return;
      }
      lat = String(Number(hit.lat.toFixed(5)));
      lng = String(Number(hit.lng.toFixed(5)));
      setGeoStatus(`Geokodowanie: ${hit.placeName}`);
    }

    const q = toApiQuery({
      ...values,
      latitude: lat,
      longitude: lng,
    });
    router.push(`/search?${q.toString()}`);
  }

  async function loadMore() {
    if (!nextUrl) return;
    setLoading(true);
    try {
      const res = await fetch(nextUrl, { cache: "no-store" });
      if (!res.ok) throw new Error(res.statusText);
      const listJson = (await res.json()) as SearchListResponse;
      setListings((prev) => [...prev, ...listJson.data]);
      setNextUrl(listJson.meta.next);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Błąd ładowania kolejnej strony");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
      <div className="border-b border-neutral-200 bg-gradient-to-b from-emerald-50/80 to-transparent px-4 py-6 dark:border-neutral-800 dark:from-emerald-950/30">
        <div className="mx-auto max-w-[1600px] space-y-4">
          <nav className="text-sm">
            <Link href="/" className="text-emerald-800 underline dark:text-emerald-400">
              ← Strona główna
            </Link>
          </nav>
          <HeroSearchBar
            initial={initial}
            onSubmit={handleSubmit}
            statusMessage={geoStatus}
          />
        </div>
      </div>

      <div className="mx-auto grid max-w-[1600px] gap-4 px-4 py-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:gap-6">
        <section className="order-2 flex flex-col gap-4 lg:order-1">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
              Wyniki
              {count != null && (
                <span className="ml-2 text-sm font-normal text-neutral-500">
                  ({count})
                </span>
              )}
            </h2>
            {loading && (
              <span className="text-sm text-neutral-500">Ładowanie…</span>
            )}
          </div>
          {error && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900 dark:border-red-900 dark:bg-red-950/40 dark:text-red-100">
              {error}
            </p>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            {listings.map((l) => (
              <div
                key={l.id}
                onMouseEnter={() => setHoverId(l.id)}
                onMouseLeave={() => setHoverId(null)}
              >
                <ListingCard listing={l} />
              </div>
            ))}
          </div>
          {!loading && listings.length === 0 && !error && (
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              Brak wyników — zmień kryteria lub dodaj zatwierdzone oferty w API.
            </p>
          )}
          {nextUrl && (
            <button
              type="button"
              onClick={() => void loadMore()}
              disabled={loading}
              className="rounded-full border border-neutral-300 px-4 py-2 text-sm font-medium hover:bg-neutral-100 disabled:opacity-50 dark:border-neutral-600 dark:hover:bg-neutral-900"
            >
              Załaduj więcej
            </button>
          )}
        </section>

        <section className="order-1 min-h-[360px] lg:order-2 lg:min-h-[calc(100vh-12rem)] lg:sticky lg:top-6 lg:self-start">
          <SearchMap pins={pins} highlightId={hoverId} />
        </section>
      </div>
    </div>
  );
}
