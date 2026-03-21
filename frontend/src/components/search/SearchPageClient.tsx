"use client";

import * as Dialog from "@radix-ui/react-dialog";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { ListingCard } from "@/components/listings/ListingCard";
import { SkeletonCard } from "@/components/ui/SkeletonCard";
import { api, apiUrl } from "@/lib/api";
import { parseSearchParamsToState } from "@/lib/searchQuery";
import { urlSearchParamsToQueryPayload } from "@/lib/searchUrl";
import type { MapPin, SearchListResponse, SearchListing } from "@/lib/searchTypes";
import { useSearchStore } from "@/lib/store/searchStore";
import { MODE_EMOJI, TRAVEL_MODE_LABELS } from "@/lib/travelModes";
import { HeroSearchBar } from "./HeroSearchBar";

const SearchMap = dynamic(
  () => import("./SearchMap").then((m) => ({ default: m.SearchMap })),
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-[320px] items-center justify-center rounded-xl border border-gray-200 bg-brand-surface text-sm text-text-muted">
        Ładowanie mapy…
      </div>
    ),
  }
);

export default function SearchPageClient() {
  const router = useRouter();
  const sp = useSearchParams();
  const setParams = useSearchStore((s) => s.setParams);
  const results = useSearchStore((s) => s.results);
  const count = useSearchStore((s) => s.count);
  const mapPins = useSearchStore((s) => s.mapPins);
  const loading = useSearchStore((s) => s.loading);
  const hoveredId = useSearchStore((s) => s.hoveredListingId);
  const setResults = useSearchStore((s) => s.setResults);
  const setMapPins = useSearchStore((s) => s.setMapPins);
  const setLoading = useSearchStore((s) => s.setLoading);
  const setHovered = useSearchStore((s) => s.setHoveredListing);

  const [nextUrl, setNextUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saveOpen, setSaveOpen] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [saveNotify, setSaveNotify] = useState(false);
  const [saveSubmitting, setSaveSubmitting] = useState(false);

  const ordering = sp.get("ordering") || "recommended";

  useEffect(() => {
    const q = new URLSearchParams(sp.toString());
    setParams(parseSearchParamsToState(q));
  }, [sp, setParams]);

  const runSearch = useCallback(async () => {
    setLoading(true);
    setError(null);
    const qs = sp.toString();
    const listPath = qs ? `/api/v1/search/?${qs}` : `/api/v1/search/`;
    const mapPath = qs ? `/api/v1/search/map/?${qs}` : `/api/v1/search/map/`;
    try {
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
      if (!mapRes.ok) throw new Error("Błąd mapy");
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
  }, [setLoading, setMapPins, setResults, sp]);

  useEffect(() => {
    void runSearch();
  }, [runSearch]);

  function changeOrdering(o: string) {
    const q = new URLSearchParams(sp.toString());
    q.set("ordering", o);
    router.replace(`/search?${q.toString()}`);
  }

  function openSaveSearchModal() {
    if (typeof window === "undefined" || !localStorage.getItem("access")) {
      toast.error("Zaloguj się, aby zapisać wyszukiwanie.");
      return;
    }
    const loc = sp.get("location")?.trim();
    setSaveName(loc || "Moje wyszukiwanie");
    setSaveNotify(false);
    setSaveOpen(true);
  }

  async function submitSavedSearch() {
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
  }

  const previewPayload = urlSearchParamsToQueryPayload(new URLSearchParams(sp.toString()));

  async function loadMore() {
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
  }

  return (
    <div className="flex min-h-[calc(100dvh-4rem)] flex-col overflow-hidden bg-white">
      <div className="sticky top-0 z-10 border-b border-gray-200 bg-white">
        <HeroSearchBar variant="strip" />
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 overflow-hidden lg:grid-cols-[380px_1fr]">
        <aside className="flex flex-col overflow-y-auto border-gray-200 lg:border-r">
          <div className="sticky top-0 z-[1] flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 bg-white/95 px-4 py-3 backdrop-blur">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-bold text-text">
                {count != null ? `${count} ofert` : "—"}
              </p>
              <button
                type="button"
                onClick={() => openSaveSearchModal()}
                className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-500 transition-colors hover:border-brand"
              >
                💾 Zapisz wyszukiwanie
              </button>
            </div>
            <select
              value={ordering}
              onChange={(e) => changeOrdering(e.target.value)}
              className="input max-w-[200px] py-1.5 text-xs"
            >
              <option value="recommended">Polecane</option>
              <option value="price_asc">Cena ↑</option>
              <option value="price_desc">Cena ↓</option>
              <option value="newest">Najnowsze</option>
            </select>
          </div>

          <div className="flex-1 space-y-0 px-4 py-3">
            {error && (
              <p className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </p>
            )}
            {loading && results.length === 0 && (
              <div className="space-y-3">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-[114px] overflow-hidden rounded-[14px]">
                    <SkeletonCard />
                  </div>
                ))}
              </div>
            )}
            {!loading && results.length === 0 && !error && (
              <div className="flex flex-col items-center gap-3 py-16 text-center">
                <span className="text-4xl" aria-hidden>
                  🔍
                </span>
                <p className="text-lg font-bold text-text">Brak wyników</p>
                <p className="max-w-xs text-sm text-text-muted">
                  Zmień kryteria lub wróć na stronę główną.
                </p>
                <Link href="/search" className="text-sm font-bold text-brand hover:underline">
                  Wyczyść filtry
                </Link>
              </div>
            )}
            {results.map((l: SearchListing) => (
              <ListingCard
                key={l.id}
                listing={l}
                variant="compact"
                highlighted={hoveredId === l.id}
                onHover={(h) => setHovered(h ? l.id : null)}
              />
            ))}
            {nextUrl && (
              <button
                type="button"
                onClick={() => void loadMore()}
                disabled={loading}
                className="btn-secondary mt-4 w-full py-2 text-sm"
              >
                Załaduj więcej
              </button>
            )}
          </div>
        </aside>

        <section className="relative hidden min-h-[280px] lg:block">
          <SearchMap
            pins={mapPins}
            highlightId={hoveredId}
            onPinHover={(id) => setHovered(id)}
          />
        </section>
      </div>

      <Dialog.Root open={saveOpen} onOpenChange={setSaveOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-[300] bg-black/50" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-[301] w-[min(92vw,400px)] -translate-x-1/2 -translate-y-1/2 rounded-[20px] border border-gray-200 bg-white p-7 shadow-xl">
            <Dialog.Title className="text-lg font-extrabold text-brand-dark">
              Zapisz wyszukiwanie
            </Dialog.Title>
            <p className="mt-1 text-sm text-text-muted">Nadaj nazwę i opcjonalnie włącz powiadomienia.</p>
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
                className={`relative h-[22px] w-10 shrink-0 rounded-full transition-colors ${saveNotify ? "bg-brand" : "bg-gray-300"}`}
              >
                <span
                  className={`absolute top-0.5 h-[18px] w-[18px] rounded-full bg-white shadow transition-all ${saveNotify ? "right-0.5" : "left-0.5"}`}
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
