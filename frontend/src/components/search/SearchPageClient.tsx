"use client";

import * as Dialog from "@radix-ui/react-dialog";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import { ListingCard } from "@/components/listings/ListingCard";
import { SkeletonCard } from "@/components/ui/SkeletonCard";
import { api, apiUrl } from "@/lib/api";
import { getAccessToken } from "@/lib/authStorage";
import {
  buildSearchQueryString,
  parseMapCenterFromSearchParams,
  parseSearchParamsToState,
} from "@/lib/searchQuery";
import { LOCATION_TAG_KEYS } from "@/lib/locationTags";
import { urlSearchParamsToQueryPayload } from "@/lib/searchUrl";
import type { MapBounds } from "@/lib/store/searchStore";
import type { MapPin, SearchListResponse, SearchListing } from "@/lib/searchTypes";
import { useSearchStore } from "@/lib/store/searchStore";
import { MODE_EMOJI, TRAVEL_MODE_LABELS } from "@/lib/travelModes";
import { cn } from "@/lib/utils";
import { HeroSearchBar } from "./HeroSearchBar";
import { MyLocationButton } from "./MyLocationButton";
import { PriceRangeFilter } from "./PriceRangeFilter";
import { SearchFiltersBar } from "./SearchFiltersBar";
import { SearchFiltersPanel } from "./SearchFiltersPanel";
import { SearchMobileBottomSheet } from "./SearchMobileBottomSheet";

const SearchMap = dynamic(
  () => import("./SearchMap").then((m) => ({ default: m.SearchMap })),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-3 text-text-muted">
          <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-brand-border border-t-brand" />
          <span className="text-sm font-medium">Ładowanie mapy…</span>
        </div>
      </div>
    ),
  },
);

export default function SearchPageClient() {
  const router = useRouter();
  const sp = useSearchParams();

  const params = useSearchStore((s) => s.params);
  const setParams = useSearchStore((s) => s.setParams);
  const results = useSearchStore((s) => s.results);
  const count = useSearchStore((s) => s.count);
  const mapPins = useSearchStore((s) => s.mapPins);
  const loading = useSearchStore((s) => s.loading);
  const hoveredId = useSearchStore((s) => s.hoveredListingId);
  const selectedId = useSearchStore((s) => s.selectedListingId);
  const mobileBottomSheetOpen = useSearchStore((s) => s.mobileBottomSheetOpen);
  const setResults = useSearchStore((s) => s.setResults);
  const setMapPins = useSearchStore((s) => s.setMapPins);
  const setLoading = useSearchStore((s) => s.setLoading);
  const setHovered = useSearchStore((s) => s.setHoveredListing);
  const setSelected = useSearchStore((s) => s.setSelectedListing);
  const setMobileBottomSheetOpen = useSearchStore((s) => s.setMobileBottomSheetOpen);
  const setMapBounds = useSearchStore((s) => s.setMapBounds);

  const mapCenter = useMemo(() => parseMapCenterFromSearchParams(sp), [sp]);

  const [nextUrl, setNextUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saveOpen, setSaveOpen] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [saveNotify, setSaveNotify] = useState(false);
  const [saveSubmitting, setSaveSubmitting] = useState(false);
  const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  const ordering = sp.get("ordering") ?? "recommended";

  const replaceParams = useSearchStore((s) => s.replaceParams);

  // Sync URL params → store (full replace so stale values are cleared)
  useEffect(() => {
    const q = new URLSearchParams(sp.toString());
    replaceParams(parseSearchParamsToState(q));
  }, [sp, replaceParams]);

  // Lock body scroll for search page
  useEffect(() => {
    const originalStyle = window.getComputedStyle(document.body).overflow;
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    return () => {
      document.documentElement.style.overflow = "";
      document.body.style.overflow = originalStyle;
    };
  }, []);

  // Fetch results
  const runSearch = useCallback(
    async (overrideSp?: URLSearchParams) => {
      setLoading(true);
      setError(null);
      const qs = overrideSp?.toString() ?? sp.toString();
      const listPath = qs ? `/api/v1/search/?${qs}` : `/api/v1/search/`;
      const mapPath = qs ? `/api/v1/search/map/?${qs}` : `/api/v1/search/map/`;
      try {
        const [listRes, mapRes] = await Promise.all([
          fetch(apiUrl(listPath), { cache: "no-store" }),
          fetch(apiUrl(mapPath), { cache: "no-store" }),
        ]);
        if (!listRes.ok) {
          const j = await listRes.json().catch(() => ({})) as { error?: { message?: string } };
          throw new Error(
            typeof j?.error?.message === "string" ? j.error.message : listRes.statusText,
          );
        }
        const listJson = (await listRes.json()) as SearchListResponse;
        const mapJson = (await mapRes.json()) as { data: MapPin[] };
        setResults(listJson.data, listJson.meta.count);
        setMapPins(mapJson.data);
        setNextUrl(listJson.meta.next);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Błąd sieci");
        setResults([], 0);
        setMapPins([]);
        setNextUrl(null);
      } finally {
        setLoading(false);
      }
    },
    [setLoading, setMapPins, setResults, sp],
  );

  useEffect(() => {
    void runSearch();
  }, [runSearch]);

  // Usuń bbox_* z URL przy każdym załadowaniu strony — stare parametry z poprzednich sesji
  // "Szukaj w tym obszarze" nie powinny blokować wyświetlania wszystkich pinezek
  useEffect(() => {
    const hasBbox =
      sp.has("bbox_south") || sp.has("bbox_west") || sp.has("bbox_north") || sp.has("bbox_east");
    if (hasBbox) {
      const q = new URLSearchParams(sp.toString());
      q.delete("bbox_south");
      q.delete("bbox_west");
      q.delete("bbox_north");
      q.delete("bbox_east");
      router.replace(`/search?${q.toString()}`);
    }
    // Run only on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleBoundsChange = useCallback(
    (bounds: MapBounds) => {
      setMapBounds(bounds);
    },
    [setMapBounds],
  );

  const changeOrdering = (o: string) => {
    const q = new URLSearchParams(sp.toString());
    q.set("ordering", o);
    router.replace(`/search?${q.toString()}`);
  };

  const handleFiltersChange = useCallback(
    (update: Partial<typeof params>) => {
      setParams(update);
    },
    [setParams],
  );

  const handleFiltersSearch = useCallback(() => {
    const newQ = buildSearchQueryString({ ...params });
    router.replace(`/search?${newQ}`);
  }, [params, router]);

  const handleLocationFound = useCallback(
    (lat: number, lng: number) => {
      // Przy geolokalizacji resetujemy filtry, które mogłyby blokować wyniki w nowym miejscu,
      // ale zachowujemy daty i gości jako parametry intencjonalne.
      const update: any = {
        lat,
        lng,
        radius_km: 300,
        location: "Moja lokalizacja",
        bbox_south: undefined,
        bbox_west: undefined,
        bbox_north: undefined,
        bbox_east: undefined,
        // Reset filtrów zawężających:
        listing_types: undefined,
        amenities: undefined,
        is_pet_friendly: undefined,
        travel_mode: undefined,
        min_price: undefined,
        max_price: undefined,
      };

      // Czyścimy tagi otoczenia
      for (const tag of LOCATION_TAG_KEYS) {
        update[tag] = undefined;
      }

      setParams(update);

      // Budujemy nextParams jawnie, aby uniknąć konfliktów ze starymi współrzędnymi w params
      const nextParams: any = {
        ...update,
        date_from: params.date_from,
        date_to: params.date_to,
        guests: params.guests,
        adults: params.adults,
        children: params.children,
        infants: params.infants,
        pets: params.pets,
      };

      const newQ = buildSearchQueryString(nextParams);
      router.replace(`/search?${newQ}`);
    },
    [params, setParams, router]
  );

  // Scroll to selected card
  useEffect(() => {
    if (!selectedId) return;
    const el = cardRefs.current.get(selectedId);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [selectedId]);

  const openSaveSearchModal = () => {
    if (typeof window === "undefined" || !getAccessToken()) {
      toast.error("Zaloguj się, aby zapisać wyszukiwanie.");
      return;
    }
    const loc = sp.get("location")?.trim();
    setSaveName(loc ?? "Moje wyszukiwanie");
    setSaveNotify(false);
    setSaveOpen(true);
  };

  const submitSavedSearch = async () => {
    const name = saveName.trim();
    if (!name) {
      toast.error("Podaj nazwę.");
      return;
    }
    setSaveSubmitting(true);
    const q = new URLSearchParams(sp.toString());
    const query_payload = urlSearchParamsToQueryPayload(q);
    try {
      await api.post("/api/v1/saved-searches/", {
        name,
        query_payload,
        notify_new_listings: saveNotify,
      });
      toast.success("Zapisano wyszukiwanie!");
      setSaveOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Nie udało się zapisać.");
    } finally {
      setSaveSubmitting(false);
    }
  };

  const loadMore = async () => {
    if (!nextUrl) return;
    setLoading(true);
    try {
      const res = await fetch(nextUrl, { cache: "no-store" });
      if (!res.ok) throw new Error(res.statusText);
      const listJson = (await res.json()) as SearchListResponse;
      const prev = useSearchStore.getState().results;
      setResults([...prev, ...listJson.data], listJson.meta.count);
      setNextUrl(listJson.meta.next);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Błąd");
    } finally {
      setLoading(false);
    }
  };

  const previewPayload = urlSearchParamsToQueryPayload(new URLSearchParams(sp.toString()));

  const getOfertyLabel = (n: number) => {
    const lastDigit = n % 10;
    const lastTwoDigits = n % 100;
    if (n === 1) return "oferta";
    if (lastDigit >= 2 && lastDigit <= 4 && (lastTwoDigits < 10 || lastTwoDigits >= 20)) {
      return "oferty";
    }
    return "ofert";
  };

  const ResultsList = (
    <>
      {error && (
        <div className="mx-4 mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading && results.length === 0 && (
        <div className="space-y-4 px-4 py-5">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-[110px] overflow-hidden rounded-[20px] bg-white border border-brand-surface/20 p-3 shadow-sm">
              <div className="flex gap-4 h-full">
                <div className="w-[86px] h-[86px] shrink-0 rounded-[14px] bg-brand-surface/20 animate-pulse" />
                <div className="flex-1 space-y-2.5 pt-1">
                   <div className="h-4 w-[85%] bg-brand-surface/20 rounded-full animate-pulse" />
                   <div className="h-3 w-[40%] bg-brand-surface/10 rounded-full animate-pulse" />
                   <div className="flex justify-between items-end mt-auto">
                     <div className="h-5 w-[60px] bg-brand-surface/20 rounded-full animate-pulse" />
                     <div className="h-8 w-[80px] bg-brand-surface/10 rounded-lg animate-pulse" />
                   </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && results.length === 0 && !error && (
        <div className="flex flex-col items-center gap-3 px-4 py-16 text-center">
          <span className="text-4xl" aria-hidden>
            🔍
          </span>
          <p className="text-base font-bold text-text">Brak wyników</p>
          <p className="text-sm text-text-muted">Zmień kryteria lub wyczyść filtry.</p>
          <Link
            href="/search"
            className="rounded-xl bg-brand-surface px-4 py-2 text-sm font-bold text-brand hover:bg-brand-muted"
          >
            Wyczyść filtry
          </Link>
        </div>
      )}

      <AnimatePresence mode="popLayout">
        <div className="space-y-3 px-4 py-4">
          {results.map((l: SearchListing, idx: number) => (
            <motion.div
              key={l.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{
                duration: 0.24,
                delay: Math.min(idx * 0.04, 0.4),
                ease: [0.16, 1, 0.3, 1],
              }}
              ref={(el) => {
                if (el) cardRefs.current.set(l.id, el as HTMLDivElement);
                else cardRefs.current.delete(l.id);
              }}
            >
              <ListingCard
                listing={l}
                variant="compact"
                highlighted={hoveredId === l.id || selectedId === l.id}
                selected={selectedId === l.id}
                onHover={(h) => setHovered(h ? l.id : null)}
                onClick={() => setSelected(selectedId === l.id ? null : l.id)}
              />
            </motion.div>
          ))}
        </div>
      </AnimatePresence>

      {nextUrl && (
        <div className="px-4 pb-4 pt-2">
          <button
            type="button"
            onClick={() => void loadMore()}
            disabled={loading}
            className="btn-secondary w-full rounded-xl py-2.5 text-sm disabled:opacity-60"
          >
            {loading ? "Ładowanie…" : "Załaduj więcej"}
          </button>
        </div>
      )}
    </>
  );

  return (
    <div
      className="flex bg-white"
      style={{ height: "calc(100dvh - 88px)", overflow: "hidden" }}
    >
      {/* ── LEFT — results rail (desktop only) ─────────────────────────── */}
      <aside
        className={cn(
          "hidden flex-col bg-white lg:flex",
          "w-[460px] shrink-0 shadow-[20px_0_40px_rgba(0,0,0,0.03)]",
          "overflow-hidden z-30 scrollbar-hide",
        )}
      >
        {/* Rail header */}
        <div className="flex items-center justify-between gap-4 border-b border-gray-100 bg-white px-6 py-5 relative overflow-hidden group/header">
          <div className="flex flex-col relative z-10">
            <div className="flex items-center gap-3 px-3.5 py-2.5 rounded-2xl bg-brand-surface border border-brand/10 shadow-sm group/stats transition-all hover:bg-brand-muted hover:border-brand/20">
              <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-brand text-white shadow-[0_4px_12px_-4px_rgba(22,163,74,0.3)] group-hover/stats:scale-110 transition-transform duration-300">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 6h16M4 12h16M4 18h7" />
                </svg>
              </div>
              <div className="flex flex-col -space-y-0.5">
                <span className="text-[18px] font-black text-brand-dark tracking-tighter leading-tight">
                  {loading && results.length === 0
                    ? "..."
                    : count.toLocaleString("pl-PL")}
                </span>
                <span className="text-[11px] font-bold text-brand-dark/40 uppercase tracking-widest leading-none">
                  {loading && results.length === 0 ? "Szukam" : getOfertyLabel(count)}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2.5 relative z-10">
            <div className="relative group/sort">
              <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-brand-dark/30 group-focus-within/sort:text-brand transition-colors pointer-events-none">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m3 16 4 4 4-4"/><path d="M7 20V4"/><path d="m21 8-4-4-4 4"/><path d="M17 4v16"/>
                </svg>
              </div>
              <select
                value={ordering}
                onChange={(e) => changeOrdering(e.target.value)}
                className="appearance-none rounded-[14px] border border-gray-200 bg-white pl-9 pr-10 py-2.5 text-[12.5px] font-black text-brand-dark outline-none transition-all hover:border-brand/30 hover:bg-brand-surface/20 focus:ring-4 focus:ring-brand-surface cursor-pointer shadow-sm"
              >
                <option value="recommended">Polecane</option>
                <option value="price_asc">Cena rosnąco</option>
                <option value="price_desc">Cena malejąco</option>
                <option value="newest">Najnowsze</option>
              </select>
              <div className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-brand-dark/30 group-hover:text-brand transition-colors">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </div>
            </div>
            <button
              type="button"
              onClick={openSaveSearchModal}
              className="group/save flex items-center justify-center gap-2 h-[42px] px-3.5 rounded-[14px] bg-brand-surface text-brand transition-all hover:bg-brand hover:text-white hover:shadow-[0_10px_25px_-8px_rgba(22,163,74,0.3)] active:scale-95 border border-brand/10 shadow-sm"
              title="Zapisz to wyszukiwanie"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="group-hover/save:scale-110 transition-transform">
                <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" />
                <polyline points="17 21 17 13 7 13 7 21" />
                <polyline points="7 3 7 8 15 8" />
              </svg>
              <span className="hidden xl:inline text-[13px] font-black tracking-tight">Zapisz</span>
            </button>
          </div>
        </div>

        {/* Scrollable results */}
        <div className="flex-1 overflow-y-auto overscroll-contain scrollbar-hide">
          {ResultsList}
        </div>
      </aside>

      {/* ── RIGHT — content area (map + filters) ────────────────────────── */}
      <div className="relative flex min-w-0 flex-1 flex-col overflow-hidden bg-brand-950">
        {/* Decorative glows */}
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-brand/20 blur-[120px] rounded-full pointer-events-none animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-emerald-400/10 blur-[120px] rounded-full pointer-events-none" />

        {/* Top search / filter bar */}
        <div className="z-20 flex flex-col items-center border-b border-white/5 bg-brand-950/40 backdrop-blur-xl overflow-x-auto scrollbar-hide relative overflow-hidden">
          <div className="relative z-10 flex min-w-max items-center justify-center gap-5 px-6 py-7 sm:px-10">
            <MyLocationButton
              onLocationFound={handleLocationFound}
              className="hidden lg:flex"
            />
            <PriceRangeFilter
              params={params}
              onChange={handleFiltersChange}
              onSearch={handleFiltersSearch}
              className="hidden lg:flex"
            />
            <HeroSearchBar variant="strip" />
            <SearchFiltersPanel
              params={params}
              onChange={handleFiltersChange}
              onSearch={handleFiltersSearch}
            />
          </div>

          {/* Active filter chips */}
          <SearchFiltersBar
            params={params}
            onRemove={(update) => {
              handleFiltersChange(update);
              const newParams = { ...params, ...update };
              const newQ = buildSearchQueryString(newParams);
              router.replace(`/search?${newQ}`);
            }}
            className="lg:justify-center px-6 pb-5 relative z-10"
          />
        </div>

        <main className="relative flex-1 overflow-hidden">
          {/* Map wrapper with padding/rounding on desktop */}
          <div className="h-full w-full p-0 lg:p-3">
            <div className="relative h-full w-full overflow-hidden rounded-none lg:rounded-[18px] lg:shadow-[0_4px_24px_rgba(0,0,0,.1)] bg-white">
              <SearchMap
                pins={mapPins}
                results={results}
                highlightId={hoveredId}
                selectedId={selectedId}
                onPinHover={setHovered}
                onPinSelect={setSelected}
                center={mapCenter}
                onBoundsChange={handleBoundsChange}
              />

              {/* Mobile: toggle bottom sheet button */}
              <button
                type="button"
                onClick={() => setMobileBottomSheetOpen(!mobileBottomSheetOpen)}
                className={cn(
                  "absolute bottom-6 left-1/2 z-[800] -translate-x-1/2",
                  "flex items-center gap-2 rounded-full px-5 py-3 text-[13px] font-bold text-white",
                  "shadow-[0_4px_20px_rgba(0,0,0,.28)] transition-all duration-200 active:scale-95",
                  "lg:hidden",
                  mobileBottomSheetOpen ? "bg-brand-dark" : "bg-brand",
                )}
                aria-label="Pokaż listę ofert"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                  <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                {count > 0 ? `${count.toLocaleString("pl-PL")} ${getOfertyLabel(count)}` : "Pokaż oferty"}
              </button>
            </div>
          </div>
        </main>
      </div>

      {/* ── Mobile bottom sheet ─────────────────────────────────────────── */}
      <SearchMobileBottomSheet
        isOpen={mobileBottomSheetOpen}
        onOpenChange={setMobileBottomSheetOpen}
        title="Oferty"
        count={count}
      >
      {/* Mobile header */}
      <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="h-5 w-[3px] rounded-full bg-brand" />
          <p className="text-[14px] font-black text-brand-dark tracking-tight">
            {count.toLocaleString("pl-PL")} {getOfertyLabel(count)}
          </p>
        </div>
        <div className="relative group">
          <select
            value={ordering}
            onChange={(e) => changeOrdering(e.target.value)}
            className="appearance-none rounded-lg border border-gray-200 bg-white pl-2 pr-7 py-1 text-[11px] font-bold text-text outline-none focus:border-brand focus:ring-2 focus:ring-brand/10"
          >
            <option value="recommended">Polecane</option>
            <option value="price_asc">Cena ↑</option>
            <option value="price_desc">Cena ↓</option>
            <option value="newest">Najnowsze</option>
          </select>
          <div className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-gray-400">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 9l6 6 6-6" />
            </svg>
          </div>
        </div>
      </div>
        {ResultsList}
      </SearchMobileBottomSheet>

      {/* ── Save search modal ───────────────────────────────────────────── */}
      <Dialog.Root open={saveOpen} onOpenChange={setSaveOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-[300] bg-black/50 backdrop-blur-sm" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-[301] w-[min(92vw,400px)] -translate-x-1/2 -translate-y-1/2 rounded-[20px] border border-gray-200 bg-white p-7 shadow-xl">
            <Dialog.Title className="text-lg font-extrabold text-brand-dark">
              Zapisz wyszukiwanie
            </Dialog.Title>
            <Dialog.Description className="mt-1 text-sm text-text-muted">
              Nadaj nazwę i opcjonalnie włącz powiadomienia.
            </Dialog.Description>
            <label className="mt-5 block text-xs font-bold text-text-secondary">
              Nazwa wyszukiwania
              <input
                className="input mt-1.5"
                value={saveName}
                onChange={(e) => setSaveName(e.target.value)}
                placeholder="np. Mazury sierpień"
              />
            </label>
            <button
              type="button"
              role="switch"
              aria-checked={saveNotify}
              onClick={() => setSaveNotify((v) => !v)}
              className="mt-4 flex w-full items-center justify-between gap-3 rounded-xl border border-gray-100 bg-gray-50 px-3 py-2.5 text-left text-sm font-medium text-text"
            >
              <span>🔔 Powiadamiaj o nowych ofertach</span>
              <span
                className={cn(
                  "relative h-[22px] w-10 shrink-0 rounded-full transition-colors",
                  saveNotify ? "bg-brand" : "bg-gray-300",
                )}
              >
                <span
                  className={cn(
                    "absolute top-0.5 h-[18px] w-[18px] rounded-full bg-white shadow transition-all",
                    saveNotify ? "right-0.5" : "left-0.5",
                  )}
                />
              </span>
            </button>
            <div className="mt-4">
              <p className="mb-2 text-xs font-bold text-text-muted">Podsumowanie filtrów</p>
              <div className="flex flex-wrap gap-1.5">
                {previewPayload.location ? (
                  <span className="rounded-md bg-brand-surface px-2 py-0.5 text-[11px] font-semibold text-brand-dark">
                    📍 {previewPayload.location}
                  </span>
                ) : null}
                {previewPayload.travel_mode ? (
                  <span className="rounded-md bg-brand-surface px-2 py-0.5 text-[11px] font-semibold text-brand-dark">
                    {MODE_EMOJI[previewPayload.travel_mode] ?? ""}{" "}
                    {TRAVEL_MODE_LABELS[previewPayload.travel_mode] ?? previewPayload.travel_mode}
                  </span>
                ) : null}
                {previewPayload.date_from && previewPayload.date_to ? (
                  <span className="rounded-md bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-text-secondary">
                    📅 {previewPayload.date_from} → {previewPayload.date_to}
                  </span>
                ) : null}
                {previewPayload.max_price != null ? (
                  <span className="rounded-md bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-text-secondary">
                    💰 do {previewPayload.max_price} zł
                  </span>
                ) : null}
                {previewPayload.guests != null ? (
                  <span className="rounded-md bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-text-secondary">
                    👥 {previewPayload.guests} os.
                  </span>
                ) : null}
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <Dialog.Close asChild>
                <button type="button" className="btn-secondary px-4 py-2 text-sm">
                  Anuluj
                </button>
              </Dialog.Close>
              <button
                type="button"
                disabled={saveSubmitting}
                onClick={() => void submitSavedSearch()}
                className="btn-primary px-4 py-2 text-sm disabled:opacity-60"
              >
                Zapisz
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
