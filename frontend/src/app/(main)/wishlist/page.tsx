"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { formatDate } from "@/lib/utils/dates";
import { apiUrl } from "@/lib/api";
import { getAccessToken } from "@/lib/authStorage";
import { topTravelModeFromListing } from "@/lib/destinationMode";
import { publicMediaUrl } from "@/lib/mediaUrl";
import { buildSearchURL } from "@/lib/searchUrl";
import { MODE_EMOJI, TRAVEL_MODE_LABELS } from "@/lib/travelModes";
import { CompareListingCard } from "@/components/compare/CompareListingCard";
import { buildCompareRows, winnerListingId } from "@/lib/compareRows";
import { cn } from "@/lib/utils";
import type { Listing } from "@/types/listing";
import type { SavedSearch, WishlistItem } from "@/types/ai";
import { motion, AnimatePresence } from "framer-motion";
import * as Dialog from "@radix-ui/react-dialog";

async function fetchJson<T>(path: string): Promise<T> {
  const token = typeof window !== "undefined" ? getAccessToken() : null;
  if (!token) throw new Error("no auth");
  const res = await fetch(apiUrl(path), {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<T>;
}

function typeBadgeClass(name: string): string {
  const n = name.toLowerCase();
  if (n.includes("gór") || n.includes("mountain")) return "bg-brand text-white";
  if (n.includes("jezior") || n.includes("lake")) return "bg-blue-600 text-white";
  if (n.includes("las") || n.includes("forest")) return "bg-amber-600 text-white";
  return "bg-brand-dark text-white";
}

function WishlistCard({
  item,
  onRemove,
  removing,
  isSelected,
  selectionIndex,
  onToggleSelect,
}: {
  item: WishlistItem;
  onRemove: (listingId: string) => void;
  removing: boolean;
  isSelected: boolean;
  selectionIndex: number;
  onToggleSelect: (id: string) => void;
}) {
  const router = useRouter();
  const listing = item.listing as Listing;
  const img = listing.images?.find((i) => i.is_cover)?.display_url ?? listing.images?.[0]?.display_url;
  const src = publicMediaUrl(img);
  const city = listing.location?.city ?? "";
  const region = listing.location?.region ?? "";
  const typeName = listing.listing_type?.name ?? "Nocleg";
  const icon = listing.listing_type?.icon ?? "🏠";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className={cn(
        "group relative flex cursor-pointer flex-col overflow-hidden rounded-[20px] border border-gray-100/90 bg-white shadow-[0_8px_32px_rgba(10,46,26,0.06)] transition-all duration-500 hover:border-brand-border/55 hover:shadow-[0_20px_48px_rgba(10,46,26,0.1)] dark:border-white/15 dark:bg-[var(--bg2)] dark:shadow-[0_16px_36px_-20px_rgba(0,0,0,.45)] max-sm:flex-row max-sm:rounded-[20px]",
        removing && "pointer-events-none scale-95 opacity-50",
        isSelected &&
          "ring-2 ring-brand ring-offset-[3px] ring-offset-[#eef6f1] shadow-[0_8px_28px_rgba(22,163,74,0.18)] dark:ring-offset-[var(--background)]"
      )}
      onClick={() => router.push(`/listing/${listing.slug}`)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter") router.push(`/listing/${listing.slug}`);
      }}
    >
      <div className="relative aspect-[4/3] max-sm:aspect-auto max-sm:h-[132px] max-sm:w-[118px] max-sm:min-w-[118px] max-sm:max-w-[118px] max-sm:shrink-0 overflow-hidden bg-brand-surface sm:w-full">
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={src}
            alt=""
            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-gradient-to-br from-brand-surface to-brand-muted text-5xl">
            {icon}
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

        <span
          className={cn(
            "absolute left-2 top-2 max-w-[calc(100%-3rem)] truncate rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-wider shadow-lg backdrop-blur-md sm:left-4 sm:top-4 sm:max-w-none sm:px-3 sm:py-1 sm:text-[11px]",
            typeBadgeClass(typeName)
          )}
        >
          {typeName}
        </span>

        <button
          type="button"
          className="absolute right-2 top-2 flex min-h-[40px] min-w-[40px] items-center justify-center rounded-full bg-white/90 text-base text-rose-600 shadow-lg backdrop-blur-md transition-all hover:scale-110 hover:bg-white active:scale-95 dark:bg-[var(--bg3)]/90 sm:right-4 sm:top-4 sm:min-h-[44px] sm:min-w-[44px] sm:text-lg"
          aria-label="Usuń z ulubionych"
          onClick={(e) => {
            e.stopPropagation();
            onRemove(listing.id);
          }}
        >
          ♥
        </button>

        <span className="absolute bottom-2 left-2 text-[9px] font-bold text-white/90 drop-shadow-md sm:bottom-4 sm:left-4 sm:text-[10px]">
          {formatDate(item.created_at)}
        </span>
      </div>

      <div className="flex min-w-0 flex-1 flex-col justify-between p-3 sm:p-5">
        <button
          type="button"
          className={cn(
            "mb-2.5 flex min-h-[42px] w-full items-center justify-between gap-2 rounded-2xl border px-3 py-2 text-left transition-all active:scale-[0.99] sm:mb-3 sm:min-h-[44px]",
            isSelected
              ? "border-brand/60 bg-brand-surface text-brand-dark shadow-[0_8px_20px_rgba(22,163,74,0.16)] dark:border-brand/50 dark:bg-brand/20 dark:text-brand-light"
              : "border-gray-200 bg-white text-text hover:border-brand/35 hover:bg-brand-surface/40 dark:border-white/20 dark:bg-[var(--bg3)] dark:text-white"
          )}
          onClick={(e) => {
            e.stopPropagation();
            onToggleSelect(listing.id);
          }}
        >
          <span className="flex items-center gap-2">
            <span
              className={cn(
                "inline-flex h-6 min-w-6 items-center justify-center rounded-full px-1.5 text-[11px] font-black",
                isSelected
                  ? "bg-brand text-white"
                  : "bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-white/75"
              )}
            >
              {isSelected ? selectionIndex + 1 : "+"}
            </span>
            <span className="text-[12px] font-black sm:text-[13px]">
              {isSelected ? "Wybrane do porównania" : "Dodaj do porównania"}
            </span>
          </span>
          <span className="text-[11px] font-bold opacity-75 sm:text-xs">
            {isSelected ? "Usuń" : "Max 3"}
          </span>
        </button>

        <div className="mb-2 flex items-start justify-between gap-2">
          <h3 className="line-clamp-3 text-sm font-black leading-tight text-brand-dark transition-colors group-hover:text-brand dark:text-white dark:group-hover:text-brand-light sm:line-clamp-2 sm:text-base">
            {listing.title}
          </h3>
          {listing.average_rating != null && (
            <div className="flex shrink-0 items-center gap-1 rounded-lg bg-brand-surface px-1.5 py-0.5 text-[10px] font-black text-brand-dark dark:bg-[var(--bg3)] dark:text-white sm:px-2 sm:py-1 sm:text-xs">
              ⭐ {Number(listing.average_rating).toFixed(1)}
            </div>
          )}
        </div>
        
        <p className="mb-3 flex items-center gap-1.5 text-[12px] font-medium text-text-muted dark:text-white/70 sm:mb-4 sm:text-[13px]">
          <span className="text-sm">📍</span>
          <span className="line-clamp-1">{city}, {region}</span>
        </p>

        <div className="mt-auto flex items-center justify-between border-t border-gray-50 pt-3 dark:border-white/15 sm:pt-4">
          <div>
            <span className="block text-[10px] font-black uppercase tracking-widest text-text-muted sm:text-[11px]">Za noc</span>
            <span className="text-base font-black text-brand-dark dark:text-white sm:text-lg">
              {listing.base_price} {listing.currency}
            </span>
          </div>
          <button
            type="button"
            className="rounded-full bg-brand-dark px-4 py-2 text-[11px] font-black text-white transition-all hover:bg-brand hover:shadow-lg hover:shadow-brand/20 active:scale-95 sm:px-6 sm:py-2.5 sm:text-xs"
            onClick={(e) => {
              e.stopPropagation();
              router.push(`/listing/${listing.slug}`);
            }}
          >
            Szczegóły
          </button>
        </div>
      </div>
    </motion.div>
  );
}

function ComparisonDialog({
  listings,
  open,
  onOpenChange,
}: {
  listings: Listing[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const rows = useMemo(() => buildCompareRows(listings), [listings]);
  const winnerId = useMemo(() => winnerListingId(listings), [listings]);
  const winnerListing = useMemo(() => listings.find((l) => l.id === winnerId) ?? null, [listings, winnerId]);

  const summary = useMemo(() => {
    const priced = listings
      .map((l) => ({ l, p: Number.parseFloat(String(l.base_price ?? "")) }))
      .filter((x) => Number.isFinite(x.p));
    const rated = listings
      .map((l) => ({ l, r: typeof l.average_rating === "number" ? l.average_rating : Number.NaN }))
      .filter((x) => Number.isFinite(x.r));

    const cheapest = priced.length
      ? priced.reduce((a, b) => (b.p < a.p ? b : a))
      : null;
    const highestRated = rated.length
      ? rated.reduce((a, b) => (b.r > a.r ? b : a))
      : null;
    const avgPrice = priced.length
      ? priced.reduce((acc, cur) => acc + cur.p, 0) / priced.length
      : null;
    const maxPrice = priced.length
      ? priced.reduce((a, b) => (b.p > a.p ? b : a))
      : null;
    const spread = cheapest && maxPrice ? Math.max(0, maxPrice.p - cheapest.p) : null;

    return { cheapest, highestRated, avgPrice, maxPrice, spread };
  }, [listings]);

  if (listings.length === 0) return null;

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[var(--z-modal-overlay)] bg-black/60 backdrop-blur-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 dark:bg-black/70" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-[var(--z-modal-content)] flex max-h-[min(85dvh,var(--sheet-max-h,min(92dvh,800px)))] w-[min(calc(100vw-1.25rem),26rem)] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-[24px] border border-gray-200/90 bg-white shadow-[0_24px_80px_rgba(10,46,26,0.18)] outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=closed]:zoom-out-95 dark:border-white/15 dark:bg-[var(--bg2)] dark:shadow-[0_24px_80px_rgba(0,0,0,0.45)] md:max-h-[min(86vh,940px)] md:w-[min(95vw,960px)] md:rounded-[30px] md:shadow-[0_34px_100px_rgba(10,46,26,0.24)] lg:w-[min(92vw,1200px)] lg:rounded-[34px] xl:w-[min(90vw,1360px)]">
          <div className="pointer-events-none hidden h-px w-full bg-gradient-to-r from-transparent via-brand/35 to-transparent md:block" />
          <div className="flex shrink-0 items-center justify-between gap-3 border-b border-gray-100 px-4 py-4 dark:border-white/15 md:px-8 md:py-6 lg:px-10">
            <div className="min-w-0">
              <Dialog.Title className="text-lg font-black text-brand-dark dark:text-white md:text-[30px] md:leading-[1.1]">
                Porównaj oferty
              </Dialog.Title>
              <Dialog.Description className="text-xs font-medium text-text-muted dark:text-white/70 md:mt-1 md:text-[15px]">
                {listings.length} miejsc · te same metryki co w porównywarce
              </Dialog.Description>
              <div className="mt-2 hidden items-center gap-2 lg:flex">
                <span className="rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-[11px] font-bold text-violet-700">
                  Lider: {winnerListing ? winnerListing.title.slice(0, 24) : "-"}
                </span>
                <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-bold text-emerald-700">
                  Rozstrzał cen: {summary.spread != null ? `${summary.spread.toFixed(0)} PLN` : "-"}
                </span>
              </div>
            </div>
            <Dialog.Close className="tap-target flex shrink-0 items-center justify-center rounded-full bg-gray-100 p-2 text-gray-500 transition-colors hover:bg-gray-200 dark:bg-[var(--bg3)] dark:text-white/70 dark:hover:bg-[var(--bg)]">
              ✕
            </Dialog.Close>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 md:px-8 md:py-6 lg:px-10">
            <div className="mb-4 hidden grid-cols-2 gap-3 md:grid xl:grid-cols-4">
              <div className="rounded-2xl border border-brand/20 bg-brand-surface/55 px-4 py-3">
                <p className="text-[11px] font-black uppercase tracking-wider text-brand">Najlepsza cena</p>
                <p className="mt-1 text-xl font-black text-brand-dark">{summary.cheapest ? `${summary.cheapest.p.toFixed(0)} PLN` : "-"}</p>
                <p className="line-clamp-1 text-xs font-semibold text-text-muted">{summary.cheapest?.l.title ?? "Brak danych"}</p>
              </div>
              <div className="rounded-2xl border border-amber-300/35 bg-amber-50 px-4 py-3 dark:bg-amber-950/20">
                <p className="text-[11px] font-black uppercase tracking-wider text-amber-700 dark:text-amber-300">Najwyższa ocena</p>
                <p className="mt-1 text-xl font-black text-amber-700 dark:text-amber-300">{summary.highestRated ? summary.highestRated.r.toFixed(1) : "-"}</p>
                <p className="line-clamp-1 text-xs font-semibold text-text-muted">{summary.highestRated?.l.title ?? "Brak danych"}</p>
              </div>
              <div className="rounded-2xl border border-emerald-300/35 bg-emerald-50 px-4 py-3 dark:bg-emerald-950/20">
                <p className="text-[11px] font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-300">Średnia cena</p>
                <p className="mt-1 text-xl font-black text-emerald-700 dark:text-emerald-300">{summary.avgPrice ? `${summary.avgPrice.toFixed(0)} PLN` : "-"}</p>
                <p className="line-clamp-1 text-xs font-semibold text-text-muted">dla {listings.length} ofert</p>
              </div>
              <div className="rounded-2xl border border-violet-300/35 bg-violet-50 px-4 py-3 dark:bg-violet-950/20">
                <p className="text-[11px] font-black uppercase tracking-wider text-violet-700 dark:text-violet-300">Lider porównania</p>
                <p className="mt-1 line-clamp-1 text-[15px] font-black text-violet-700 dark:text-violet-300">{winnerListing?.title ?? "W trakcie analizy"}</p>
                <p className="line-clamp-1 text-xs font-semibold text-text-muted">najlepszy wynik ogólny</p>
              </div>
            </div>
            <div className="space-y-4 lg:grid lg:grid-cols-2 lg:gap-5 lg:space-y-0 xl:grid-cols-3">
              {listings.map((l, i) => (
                <CompareListingCard
                  key={l.id}
                  listing={l}
                  columnIndex={i}
                  rows={rows}
                  winnerId={winnerId}
                />
              ))}
            </div>
          </div>

          <div className="shrink-0 border-t border-gray-100 bg-gray-50 px-4 py-4 dark:border-white/10 dark:bg-[var(--bg3)] md:px-8 md:py-5 lg:px-10">
            <Dialog.Close className="btn-primary mx-auto flex min-h-[48px] w-full max-w-sm items-center justify-center rounded-full px-8 md:min-h-[52px] md:max-w-md md:px-12 md:text-[15px]">
              Zamknij
            </Dialog.Close>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function NotifyToggle({
  on,
  onToggle,
}: {
  on: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      title="Powiadomienia o nowych ofertach"
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
      className={cn(
        "relative h-[18px] w-8 shrink-0 rounded-full transition-colors duration-300",
        on ? "bg-brand" : "bg-gray-200"
      )}
    >
      <span
        className={cn(
          "absolute top-0.5 h-3.5 w-3.5 rounded-full bg-white shadow transition-all duration-300",
          on ? "right-0.5" : "left-0.5"
        )}
      />
    </button>
  );
}

export default function WishlistPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [filterMode, setFilterMode] = useState<string>("all");
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [localItems, setLocalItems] = useState<WishlistItem[] | null>(null);
  const [selectedCompareIds, setSelectedCompareIds] = useState<string[]>([]);
  const [isCompareOpen, setIsCompareOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const token = mounted && typeof window !== "undefined" ? getAccessToken() : null;

  const [wishPayload, setWishPayload] = useState<{ data: WishlistItem[] } | null>(null);
  const [savedPayload, setSavedPayload] = useState<{ data: SavedSearch[] } | null>(null);
  const [wishLoading, setWishLoading] = useState(false);

  const loadWish = useCallback(async () => {
    if (!token) return;
    setWishLoading(true);
    try {
      const j = await fetchJson<{ data: WishlistItem[] }>("/api/v1/wishlist/");
      setWishPayload(j);
    } catch {
      setWishPayload({ data: [] });
    } finally {
      setWishLoading(false);
    }
  }, [token]);

  const loadSaved = useCallback(async () => {
    if (!token) return;
    try {
      const j = await fetchJson<{ data: SavedSearch[] }>("/api/v1/saved-searches/");
      setSavedPayload(j);
    } catch {
      setSavedPayload({ data: [] });
    }
  }, [token]);

  useEffect(() => {
    if (!token) return;
    void loadWish();
    void loadSaved();
  }, [token, loadWish, loadSaved]);

  useEffect(() => {
    if (!token) return;
    const onFocus = () => {
      void loadWish();
      void loadSaved();
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [token, loadWish, loadSaved]);

  const items = useMemo(
    () => localItems ?? wishPayload?.data ?? [],
    [localItems, wishPayload]
  );

  useEffect(() => {
    if (wishPayload?.data) setLocalItems(null);
  }, [wishPayload?.data]);

  const modes = useMemo(() => {
    const m = new Map<string, number>();
    for (const it of items) {
      const mode = topTravelModeFromListing(it.listing as Listing);
      if (!mode) continue;
      m.set(mode, (m.get(mode) ?? 0) + 1);
    }
    return m;
  }, [items]);

  const filteredItems = useMemo(() => {
    if (filterMode === "all") return items;
    return items.filter((it) => topTravelModeFromListing(it.listing as Listing) === filterMode);
  }, [items, filterMode]);

  const handleRemove = useCallback(
    async (listingId: string) => {
      const prev = items;
      setLocalItems(prev.filter((i) => (i.listing as Listing).id !== listingId));
      setRemovingId(listingId);
      setSelectedCompareIds(prev => prev.filter(id => id !== listingId));
      try {
        const res = await fetch(apiUrl(`/api/v1/wishlist/${listingId}/`), {
          method: "DELETE",
          headers: { Authorization: `Bearer ${getAccessToken() ?? ""}` },
        });
        if (!res.ok) throw new Error("delete failed");
        toast.success("Usunięto z ulubionych");
        await loadWish();
      } catch {
        setLocalItems(null);
        toast.error("Błąd usuwania");
      } finally {
        setRemovingId(null);
      }
    },
    [items, loadWish]
  );

  const toggleSelectCompare = useCallback((id: string) => {
    setSelectedCompareIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 3) {
        toast.error("Możesz porównać maksymalnie 3 oferty");
        return prev;
      }
      return [...prev, id];
    });
  }, []);

  const selectedListings = useMemo(() => {
    return items
      .filter((it) => selectedCompareIds.includes((it.listing as Listing).id))
      .map((it) => it.listing as Listing);
  }, [items, selectedCompareIds]);

  const toggleNotify = useCallback(
    async (s: SavedSearch) => {
      const next = !s.notify_new_listings;
      setSavedPayload((cur) => {
        if (!cur?.data) return cur;
        return {
          data: cur.data.map((x) => (x.id === s.id ? { ...x, notify_new_listings: next } : x)),
        };
      });
      try {
        const res = await fetch(apiUrl(`/api/v1/saved-searches/${s.id}/`), {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${getAccessToken() ?? ""}`,
          },
          body: JSON.stringify({ notify_new_listings: next }),
        });
        if (!res.ok) throw new Error("patch failed");
        await loadSaved();
      } catch {
        await loadSaved();
        toast.error("Nie udało się zmienić powiadomień");
      }
    },
    [loadSaved]
  );

  const deleteSaved = useCallback(
    async (id: string) => {
      setSavedPayload((cur) => (cur ? { data: cur.data.filter((x) => x.id !== id) } : cur));
      try {
        const res = await fetch(apiUrl(`/api/v1/saved-searches/${id}/`), {
          method: "DELETE",
          headers: { Authorization: `Bearer ${getAccessToken() ?? ""}` },
        });
        if (!res.ok) throw new Error("delete failed");
        toast.success("Usunięto");
        await loadSaved();
      } catch {
        await loadSaved();
        toast.error("Błąd usuwania");
      }
    },
    [loadSaved]
  );

  if (!mounted) {
    return (
      <div className="mx-auto max-w-[1200px] px-8 py-20 text-center">
        <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-brand border-t-transparent" />
        <p className="mt-4 font-bold text-brand-dark">Przygotowujemy Twoje ulubione…</p>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="mx-auto max-w-lg px-8 py-32 text-center">
        <div className="mb-6 text-6xl">🔒</div>
        <h1 className="text-3xl font-black text-brand-dark">Twoja lista czeka</h1>
        <p className="mt-4 text-lg font-medium text-text-muted">Zaloguj się, aby zobaczyć i zarządzać swoimi zapisanymi ofertami.</p>
        <Link href="/login?next=/wishlist" className="btn-primary mt-8 inline-flex px-10">
          Zaloguj się teraz
        </Link>
      </div>
    );
  }

  const saved = savedPayload?.data ?? [];

  return (
      <div className="min-h-screen bg-[linear-gradient(180deg,#f7faf8_0%,#eef6f1_42%,#fafcfb_100%)] pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))] dark:bg-[var(--background)]">
      <div className="mx-auto max-w-[1400px] px-4 py-8 sm:px-6 sm:py-12 md:px-10 lg:py-16">
        <header className="mb-8 flex flex-col gap-5 sm:mb-10 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between sm:gap-6">
          <div className="min-w-0">
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="mb-2 flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.18em] text-brand sm:mb-3 sm:text-sm sm:tracking-widest"
            >
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-brand shadow-[0_0_12px_rgba(22,163,74,0.6)]" />
              Twoja kolekcja
            </motion.div>
            <h1 className="text-[clamp(26px,7vw,48px)] font-black leading-[1.05] tracking-tight text-brand-dark dark:text-white">
              Moje{" "}
              <span className="bg-gradient-to-r from-[#15803d] via-[#22c55e] to-rose-500 bg-clip-text text-transparent">
                Ulubione
              </span>
            </h1>
            <p className="mt-2 max-w-md text-[15px] font-medium leading-snug text-text-muted dark:text-white/70 sm:mt-3 sm:text-lg">
              {items.length} zapisanych ofert — wybierz dwie lub trzy, by je porównać.
            </p>
          </div>
          <div className="hidden sm:flex sm:gap-3">
            <button type="button" className="btn-secondary flex items-center gap-2 rounded-full border-gray-200 bg-white px-6 font-black text-brand-dark shadow-[0_4px_24px_rgba(10,46,26,0.06)] hover:border-brand-border dark:border-white/20 dark:bg-[var(--bg2)] dark:text-white" onClick={() => toast.success("Kolekcje będą dostępne już wkrótce!")}>
              📋 Stwórz kolekcję
            </button>
          </div>
        </header>

        <div className="mb-8 flex snap-x snap-mandatory gap-2 overflow-x-auto pb-2 [-webkit-overflow-scrolling:touch] [scrollbar-width:none] sm:mb-10 sm:flex-wrap sm:overflow-visible sm:pb-0 [&::-webkit-scrollbar]:hidden">
          <button
            type="button"
            onClick={() => setFilterMode("all")}
            className={cn(
              "snap-start shrink-0 rounded-2xl px-4 py-2.5 text-[13px] font-black transition-all sm:rounded-full sm:px-6 sm:py-3 sm:text-sm",
              filterMode === "all" 
                ? "bg-brand-dark text-white shadow-[0_8px_28px_rgba(10,46,26,0.28)] ring-2 ring-brand-dark/20" 
                : "border border-gray-200/90 bg-white/90 text-text-muted shadow-sm hover:border-brand/30 hover:text-brand dark:border-white/15 dark:bg-[var(--bg2)] dark:text-white/70 dark:hover:text-white"
            )}
          >
            Wszystkie ({items.length})
          </button>
          {Array.from(modes.entries()).map(([mode, n]) => (
            <button
              key={mode}
              type="button"
              onClick={() => setFilterMode(mode)}
              className={cn(
                "flex snap-start shrink-0 items-center gap-2 rounded-2xl px-4 py-2.5 text-[13px] font-black transition-all sm:rounded-full sm:px-6 sm:py-3 sm:text-sm",
                filterMode === mode 
                  ? "bg-brand-dark text-white shadow-[0_8px_28px_rgba(10,46,26,0.28)] ring-2 ring-brand-dark/20" 
                  : "border border-gray-200/90 bg-white/90 text-text-muted shadow-sm hover:border-brand/30 hover:text-brand dark:border-white/15 dark:bg-[var(--bg2)] dark:text-white/70 dark:hover:text-white"
              )}
            >
              <span>{MODE_EMOJI[mode] ?? "✨"}</span>
              <span className="max-[380px]:hidden sm:inline">{TRAVEL_MODE_LABELS[mode] ?? mode}</span>
              <span className="opacity-60">({n})</span>
            </button>
          ))}
        </div>

        {wishLoading && items.length === 0 ? (
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-80 animate-pulse rounded-[32px] bg-gray-100 dark:bg-[var(--bg3)]" />
            ))}
          </div>
        ) : filteredItems.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="rounded-[40px] border border-gray-100 bg-white px-8 py-24 text-center shadow-sm dark:border-white/15 dark:bg-[var(--bg2)]"
          >
            <div className="animate-bounce text-7xl mb-8" aria-hidden>
              ❤️
            </div>
            <h2 className="text-3xl font-black text-brand-dark dark:text-white">Lista jest pusta</h2>
            <p className="mx-auto mt-4 max-w-md text-lg font-medium text-text-muted dark:text-white/70">
              Nie masz jeszcze żadnych zapisanych ofert. Przeglądaj noclegi i znajdź coś wyjątkowego!
            </p>
            <Link href="/search" className="btn-primary mt-10 inline-flex px-12 rounded-full py-4 text-base">
              Znajdź inspirację
            </Link>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-8 lg:grid-cols-3 xl:grid-cols-4">
            <AnimatePresence mode="popLayout">
              {filteredItems.map((it) => (
                <WishlistCard
                  key={it.id}
                  item={it}
                  onRemove={handleRemove}
                  removing={removingId === (it.listing as Listing).id}
                  isSelected={selectedCompareIds.includes((it.listing as Listing).id)}
                  selectionIndex={selectedCompareIds.indexOf((it.listing as Listing).id)}
                  onToggleSelect={toggleSelectCompare}
                />
              ))}
            </AnimatePresence>
          </div>
        )}

        <div className="my-20 h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent dark:via-white/20" />

        <div className="rounded-[40px] border border-gray-100 bg-white p-8 shadow-sm dark:border-white/15 dark:bg-[var(--bg2)] lg:p-12">
          <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-black text-brand-dark dark:text-white">Zapisane wyszukiwania</h2>
              <p className="text-sm font-medium text-text-muted dark:text-white/70">Wracaj do ulubionych filtrów jednym kliknięciem.</p>
            </div>
            <Link href="/search" className="btn-secondary rounded-full px-6 text-sm font-black">
              + Nowe wyszukiwanie
            </Link>
          </header>

          <div className="space-y-4">
            {saved.length === 0 ? (
                <div className="rounded-3xl border-2 border-dashed border-gray-100 py-12 text-center dark:border-white/20">
                  <p className="font-bold text-text-muted dark:text-white/70">Brak zapisanych wyszukiwań.</p>
              </div>
            ) : (
              saved.map((s) => (
                <motion.div
                  key={s.id}
                  whileHover={{ x: 5 }}
                  className="group flex cursor-pointer flex-wrap items-center gap-4 rounded-3xl border border-gray-100 bg-white p-5 transition-all hover:border-brand-border hover:shadow-md dark:border-white/15 dark:bg-[var(--bg3)] dark:hover:border-white/30"
                  onClick={() => router.push(buildSearchURL(s.query_payload))}
                >
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-brand-surface text-2xl group-hover:bg-brand group-hover:text-white transition-colors">
                    🔍
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-lg font-black text-brand-dark dark:text-white">{s.name}</p>
                    <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-[13px] font-medium text-text-muted dark:text-white/70">
                      {s.query_payload.location ? <span className="flex items-center gap-1">📍 {s.query_payload.location}</span> : null}
                      {s.query_payload.travel_mode ? (
                        <span className="flex items-center gap-1">
                          {MODE_EMOJI[s.query_payload.travel_mode] ?? ""}{" "}
                          {TRAVEL_MODE_LABELS[s.query_payload.travel_mode] ?? s.query_payload.travel_mode}
                        </span>
                      ) : null}
                      {s.query_payload.max_price != null ? <span className="flex items-center gap-1">💰 do {s.query_payload.max_price} zł</span> : null}
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center gap-4">
                    {s.new_listings_count > 0 && (
                      <div className="rounded-full bg-brand px-4 py-1.5 text-xs font-black text-white">
                        {s.new_listings_count} nowe oferty
                      </div>
                    )}
                    <div className="flex items-center gap-3 border-l border-gray-100 pl-4 dark:border-white/15">
                      <NotifyToggle on={s.notify_new_listings} onToggle={() => void toggleNotify(s)} />
                      <button
                        type="button"
                        className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-50 text-red-500 transition-colors hover:bg-red-50 dark:bg-[var(--bg2)]"
                        onClick={(e) => {
                          e.stopPropagation();
                          void deleteSaved(s.id);
                        }}
                        title="Usuń"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Floating Compare Bar */}
      <AnimatePresence>
        {selectedCompareIds.length > 0 && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed inset-x-2 z-[190] flex max-w-none flex-col items-stretch gap-2.5 rounded-[20px] border border-white/15 bg-[#0a2e1a]/95 px-3.5 py-3 shadow-[0_12px_48px_rgba(0,0,0,0.35)] backdrop-blur-xl sm:inset-x-auto sm:bottom-8 sm:left-1/2 sm:w-auto sm:max-w-none sm:-translate-x-1/2 sm:flex-row sm:items-center sm:gap-6 sm:rounded-full sm:px-8 sm:py-4 lg:min-w-[760px] lg:max-w-[980px] lg:rounded-[28px] lg:border-white/25 lg:bg-[linear-gradient(120deg,rgba(10,46,26,.98),rgba(16,66,40,.96))] lg:px-10 lg:py-5 lg:shadow-[0_22px_72px_rgba(0,0,0,.38)]"
            style={{ bottom: "max(calc(var(--guest-nav-bottom-offset, 0px) + 0.5rem), env(safe-area-inset-bottom, 0px))" }}
          >
            <div className="text-center sm:hidden">
              <p className="text-[13px] font-black text-white">
                Porównanie · {selectedCompareIds.length} / 3
              </p>
              <p className="text-[10px] font-semibold text-white/55">Min. 2, max. 3</p>
            </div>
            <div className="hidden sm:block">
              <p className="text-sm font-black text-white lg:text-base">Wybrano: {selectedCompareIds.length} / 3</p>
              <p className="text-[10px] font-bold text-white/60 lg:text-xs lg:text-white/70">Wybierz do 3 ofert by je porównać</p>
            </div>
            <div className="flex justify-center -space-x-3 lg:-space-x-4">
              {selectedListings.map(l => (
                <div key={l.id} className="h-10 w-10 overflow-hidden rounded-full border-2 border-brand-dark bg-gray-200 lg:h-11 lg:w-11 lg:border-[2.5px]">
                  <img src={publicMediaUrl(l.images?.find(i => i.is_cover)?.display_url ?? l.images?.[0]?.display_url) ?? undefined} alt="" className="h-full w-full object-cover" />
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between gap-3 sm:justify-start lg:gap-4">
              <button
                type="button"
                className="text-xs font-black text-white/70 transition-colors hover:text-white lg:rounded-full lg:bg-white/10 lg:px-4 lg:py-2 lg:text-sm"
                onClick={() => setSelectedCompareIds([])}
              >
                Wyczyść
              </button>
              <button
                type="button"
                className="btn-primary min-h-[42px] rounded-full px-6 py-2.5 text-sm font-black disabled:opacity-50 lg:min-h-[48px] lg:px-10 lg:text-base"
                disabled={selectedCompareIds.length < 2}
                onClick={() => setIsCompareOpen(true)}
              >
                Porównaj {selectedCompareIds.length >= 2 ? "" : "(wybierz min. 2)"}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <ComparisonDialog 
        open={isCompareOpen} 
        onOpenChange={setIsCompareOpen} 
        listings={selectedListings} 
      />
    </div>
  );
}
