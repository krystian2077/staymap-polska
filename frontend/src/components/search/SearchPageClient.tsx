"use client";

import * as Dialog from "@radix-ui/react-dialog";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import { ListingCard } from "@/components/listings/ListingCard";
import { SkeletonCard } from "@/components/ui/SkeletonCard";
import { api, apiUrl } from "@/lib/api";
import {
  buildSearchQueryString,
  parseMapCenterFromSearchParams,
  parseSearchParamsToState,
} from "@/lib/searchQuery";
import { urlSearchParamsToQueryPayload } from "@/lib/searchUrl";
import type { MapBounds } from "@/lib/store/searchStore";
import type { MapPin, SearchListResponse, SearchListing } from "@/lib/searchTypes";
import { useSearchStore } from "@/lib/store/searchStore";
import { MODE_EMOJI, TRAVEL_MODE_LABELS } from "@/lib/travelModes";
import { cn } from "@/lib/utils";
import { HeroSearchBar } from "./HeroSearchBar";
import { SearchFiltersBar } from "./SearchFiltersBar";
import { SearchFiltersPanel } from "./SearchFiltersPanel";
import { SearchMobileBottomSheet } from "./SearchMobileBottomSheet";

const SearchMap = dynamic(
  () => import("./SearchMap").then((m) => ({ default: m.SearchMap })),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center bg-brand-surface">
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

  // Scroll to selected card
  useEffect(() => {
    if (!selectedId) return;
    const el = cardRefs.current.get(selectedId);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [selectedId]);

  const openSaveSearchModal = () => {
    if (typeof window === "undefined" || !localStorage.getItem("access")) {
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

  const ResultsList = (
    <>
      {error && (
        <div className="mx-4 mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading && results.length === 0 && (
        <div className="space-y-2.5 px-4 py-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-[100px] overflow-hidden rounded-[14px]">
              <SkeletonCard />
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

      <div className="space-y-0 px-4 py-2">
        {results.map((l: SearchListing) => (
          <div
            key={l.id}
            ref={(el) => {
              if (el) cardRefs.current.set(l.id, el);
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
          </div>
        ))}
      </div>

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
      className="flex flex-col bg-[#f8f9fb]"
      style={{ height: "calc(100dvh - 4rem)", overflow: "hidden" }}
    >
      {/* ── Top search / filter bar ────────────────────────────────────── */}
      <div className="z-20 shrink-0 border-b border-gray-100/80 bg-gradient-to-b from-white to-gray-50/50 shadow-[0_2px_16px_rgba(0,0,0,.06)]">
        <div className="flex items-center justify-center gap-2.5 px-3 py-2.5 sm:px-5">
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
          className="justify-center px-5 pb-2"
        />
      </div>

      {/* ── Main split area ────────────────────────────────────────────── */}
      <div className="flex min-h-0 flex-1">

        {/* LEFT — results rail (desktop only) */}
        <aside
          className={cn(
            "hidden flex-col bg-white lg:flex",
            "w-[380px] shrink-0 border-r border-gray-100",
            "overflow-hidden",
          )}
        >
          {/* Rail header */}
          <div className="flex items-center justify-between gap-2 border-b border-gray-100 px-4 py-3">
            <div className="flex items-center gap-2">
              <p className="text-[13px] font-bold text-text">
                {loading && results.length === 0
                  ? "Szukam…"
                  : `${count.toLocaleString("pl-PL")} ofert`}
              </p>
              {loading && results.length > 0 && (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-brand-border border-t-brand" />
              )}
            </div>
            <div className="flex items-center gap-1.5">
              <select
                value={ordering}
                onChange={(e) => changeOrdering(e.target.value)}
                className="rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-[12px] font-medium text-text outline-none focus:border-brand"
              >
                <option value="recommended">Polecane</option>
                <option value="price_asc">Cena ↑</option>
                <option value="price_desc">Cena ↓</option>
                <option value="newest">Najnowsze</option>
              </select>
              <button
                type="button"
                onClick={openSaveSearchModal}
                title="Zapisz wyszukiwanie"
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-sm text-text-secondary transition-colors hover:border-brand hover:text-brand"
              >
                💾
              </button>
            </div>
          </div>

          {/* Scrollable results */}
          <div className="flex-1 overflow-y-auto overscroll-contain">
            {ResultsList}
          </div>
        </aside>

        {/* RIGHT — map (full width on mobile) */}
        <main className="relative flex-1 overflow-hidden">
          {/* Map wrapper with padding/rounding on desktop */}
          <div className="h-full w-full p-0 lg:p-3">
            <div className="relative h-full w-full overflow-hidden rounded-none lg:rounded-[18px] lg:shadow-[0_4px_24px_rgba(0,0,0,.1)]">
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
                {count > 0 ? `${count} ofert` : "Oferty"}
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
        <div className="flex items-center justify-between border-b border-gray-100 px-4 py-2">
          <p className="text-[12px] font-bold text-text">
            {count.toLocaleString("pl-PL")} wyników
          </p>
          <select
            value={ordering}
            onChange={(e) => changeOrdering(e.target.value)}
            className="rounded-lg border border-gray-200 bg-white px-2 py-1 text-[11px] font-medium text-text outline-none focus:border-brand"
          >
            <option value="recommended">Polecane</option>
            <option value="price_asc">Cena ↑</option>
            <option value="price_desc">Cena ↓</option>
            <option value="newest">Najnowsze</option>
          </select>
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
