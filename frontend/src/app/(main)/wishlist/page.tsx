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
  onToggleSelect,
}: {
  item: WishlistItem;
  onRemove: (listingId: string) => void;
  removing: boolean;
  isSelected: boolean;
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
        "group relative cursor-pointer overflow-hidden rounded-[24px] border border-gray-100 bg-white shadow-sm transition-all duration-500 hover:border-brand-border/50 hover:shadow-xl hover:shadow-brand/5 dark:border-white/15 dark:bg-[var(--bg2)] dark:shadow-[0_16px_36px_-20px_rgba(0,0,0,.45)]",
        removing && "pointer-events-none scale-95 opacity-50",
        isSelected && "ring-2 ring-brand ring-offset-2"
      )}
      onClick={() => router.push(`/listing/${listing.slug}`)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter") router.push(`/listing/${listing.slug}`);
      }}
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-brand-surface">
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
            "absolute left-4 top-4 rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-wider shadow-lg backdrop-blur-md",
            typeBadgeClass(typeName)
          )}
        >
          {typeName}
        </span>

        <button
          type="button"
          className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-lg text-rose-600 shadow-lg backdrop-blur-md transition-all hover:scale-110 hover:bg-white active:scale-95 dark:bg-[var(--bg3)]/90"
          aria-label="Usuń z ulubionych"
          onClick={(e) => {
            e.stopPropagation();
            onRemove(listing.id);
          }}
        >
          ♥
        </button>

        <button
          type="button"
          className={cn(
            "absolute bottom-4 right-4 flex items-center gap-2 rounded-full px-4 py-2 text-xs font-black shadow-lg backdrop-blur-md transition-all active:scale-95",
            isSelected
              ? "bg-brand text-white"
              : "bg-white/90 text-brand-dark hover:bg-white dark:bg-[var(--bg3)] dark:text-white"
          )}
          onClick={(e) => {
            e.stopPropagation();
            onToggleSelect(listing.id);
          }}
        >
          {isSelected ? "✓ Wybrano" : "+ Porównaj"}
        </button>

        <span className="absolute bottom-4 left-4 text-[10px] font-bold text-white/90 drop-shadow-md">
          {formatDate(item.created_at)}
        </span>
      </div>

      <div className="p-5">
        <div className="mb-2 flex items-start justify-between gap-2">
          <h3 className="line-clamp-2 text-base font-black leading-tight text-brand-dark transition-colors group-hover:text-brand dark:text-white dark:group-hover:text-brand-light">
            {listing.title}
          </h3>
          {listing.average_rating != null && (
            <div className="flex shrink-0 items-center gap-1 rounded-lg bg-brand-surface px-2 py-1 text-xs font-black text-brand-dark dark:bg-[var(--bg3)] dark:text-white">
              ⭐ {Number(listing.average_rating).toFixed(1)}
            </div>
          )}
        </div>
        
        <p className="mb-4 flex items-center gap-1.5 text-[13px] font-medium text-text-muted dark:text-white/70">
          <span className="text-sm">📍</span>
          {city}, {region}
        </p>

        <div className="flex items-center justify-between border-t border-gray-50 pt-4 dark:border-white/15">
          <div>
            <span className="block text-[11px] font-black uppercase tracking-widest text-text-muted">Cena za noc</span>
            <span className="text-lg font-black text-brand-dark dark:text-white">
              {listing.base_price} {listing.currency}
            </span>
          </div>
          <button
            type="button"
            className="rounded-full bg-brand-dark px-6 py-2.5 text-xs font-black text-white transition-all hover:bg-brand hover:shadow-lg hover:shadow-brand/20 active:scale-95"
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
  if (listings.length === 0) return null;

  const features = [
    { label: "Cena za noc", getValue: (l: Listing) => `${l.base_price} ${l.currency}` },
    { label: "Ocena", getValue: (l: Listing) => l.average_rating != null ? `⭐ ${Number(l.average_rating).toFixed(1)} (${l.review_count})` : "Brak ocen" },
    { label: "Typ", getValue: (l: Listing) => l.listing_type?.name || "Obiekt 🏠" },
    { label: "Lokalizacja", getValue: (l: Listing) => l.location?.city || "Polska" },
    { label: "Goście", getValue: (l: Listing) => `Max ${l.max_guests || 2} os.` },
    { label: "Pokoje / Łóżka", getValue: (l: Listing) => `${l.bedrooms || 1} syp. / ${l.beds || 1} łóżek` },
    { label: "Łazienki", getValue: (l: Listing) => `${l.bathrooms || 1} łaz.` },
    { label: "Klimat", getValue: (l: Listing) => {
      if (!l.destination_score_cache) return "Uniwersalny";
      const scores = [
        { key: 'romantic', label: 'Romantyczny' },
        { key: 'outdoor', label: 'Aktywny' },
        { key: 'nature', label: 'Natura' },
        { key: 'quiet', label: 'Spokojny' },
        { key: 'family', label: 'Rodzinny' },
        { key: 'wellness', label: 'Relaks' },
        { key: 'workation', label: 'Praca zdalna' }
      ];
      
      const scoreCache = (l.destination_score_cache ?? {}) as Record<string, number>;
      const top = scores
        .map(s => ({ label: s.label, score: scoreCache[s.key] ?? 0 }))
        .filter(s => s.score >= 8)
        .sort((a, b) => b.score - a.score)
        .slice(0, 2);

      return top.length > 0 ? (
        <div className="flex flex-wrap gap-1">
          {top.map(t => (
            <span key={t.label} className="rounded-full bg-brand-surface px-2 py-0.5 text-[10px] font-bold text-brand-dark border border-brand/10">
              {t.label}
            </span>
          ))}
        </div>
      ) : "Zrównoważony";
    }},
    { label: "Atuty", getValue: (l: Listing) => {
      const pluses = [];
      if (Number(l.average_rating) >= 4.8) pluses.push("Wybitna ocena 🏆");
      else if (Number(l.average_rating) >= 4.5) pluses.push("Świetna ocena ⭐");
      
      if (l.is_pet_friendly) pluses.push("Przyjazny zwierzętom 🐾");
      if (l.review_count > 20) pluses.push("Bardzo popularna 🔥");
      else if (l.review_count > 5) pluses.push("Sprawdzona oferta ✅");
      
      if (l.booking_mode === "instant") pluses.push("Natychmiastowa rezerwacja ⚡");
      if (!l.cleaning_fee || l.cleaning_fee === 0) pluses.push("Brak opłaty za sprzątanie ✨");
      
      if (l.amenities?.some(a => a.name.toLowerCase().includes("wifi"))) pluses.push("Szybkie WiFi 📶");
      if (l.amenities?.some(a => a.name.toLowerCase().includes("parking"))) pluses.push("Parking 🚗");
      if (l.amenities?.some(a => a.name.toLowerCase().includes("klimatyzacja"))) pluses.push("Klimatyzacja ❄️");
      
      return (
        <div className="flex flex-wrap gap-1">
          {pluses.length > 0 ? pluses.map(p => (
            <span key={p} className="rounded bg-green-50 px-2 py-0.5 text-[10px] font-bold text-green-700 border border-green-100">
              {p}
            </span>
          )) : <span className="text-gray-400">---</span>}
        </div>
      );
    }},
    { label: "Udogodnienia", getValue: (l: Listing) => (
      <div className="flex flex-wrap gap-1">
        {l.amenities && l.amenities.length > 0 ? (
          <>
            {l.amenities.slice(0, 10).map(a => (
              <span key={a.id} className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-bold text-gray-600">
                {a.name}
              </span>
            ))}
            {l.amenities.length > 10 && <span className="text-[10px] text-gray-400 font-bold">+{l.amenities.length - 10}</span>}
          </>
        ) : (
          <span className="text-gray-400 italic">Podstawowe</span>
        )}
      </div>
    )},
    { label: "Okolica", getValue: (l: Listing) => (
      <p className="line-clamp-3 text-[11px] leading-relaxed text-text-muted italic">
        {l.area_summary || "Brak szczegółowego opisu okolicy."}
      </p>
    )}
  ];

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm animate-in fade-in duration-300" />
        <Dialog.Content className="fixed left-1/2 top-[12vh] z-[101] flex max-h-[78vh] w-[95vw] max-w-7xl -translate-x-1/2 flex-col rounded-[32px] bg-white p-0 shadow-2xl animate-in zoom-in-95 duration-300 focus:outline-none overflow-hidden border border-gray-100 dark:border-white/15 dark:bg-[var(--bg2)] dark:shadow-[0_24px_60px_-20px_rgba(0,0,0,.55)]">
          <div className="flex items-center justify-between border-b border-gray-100 px-8 py-6 dark:border-white/15">
            <div>
              <Dialog.Title className="text-2xl font-black text-brand-dark dark:text-white">Porównaj oferty</Dialog.Title>
              <Dialog.Description className="text-sm font-medium text-text-muted dark:text-white/70">
                Porównujesz {listings.length} wybrane miejsca
              </Dialog.Description>
            </div>
            <Dialog.Close className="rounded-full bg-gray-100 p-2 text-gray-500 transition-colors hover:bg-gray-200 dark:bg-[var(--bg3)] dark:text-white/70 dark:hover:bg-[var(--bg)]">
              ✕
            </Dialog.Close>
          </div>

          <div className="flex-1 overflow-auto px-8 py-6">
            <div className="grid" style={{ gridTemplateColumns: `140px repeat(${listings.length}, minmax(200px, 1fr))` }}>
              {/* Header: Images & Titles */}
              <div className="sticky left-0 bg-white dark:bg-[var(--bg2)]" />
              {listings.map(l => (
                <div key={l.id} className="border-l border-gray-50 px-4 pb-6 first:border-l-0 dark:border-white/10">
                  <div className="relative aspect-video mb-4 overflow-hidden rounded-2xl bg-brand-surface shadow-inner group">
                    {(() => {
                      const img = l.images?.find(i => i.is_cover)?.display_url ?? l.images?.[0]?.display_url;
                      const src = publicMediaUrl(img);
                      if (src) {
                        return (
                          <img 
                            src={src} 
                            alt="" 
                            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                          />
                        );
                      }
                      return (
                        <div className="flex h-full items-center justify-center text-4xl">
                          {l.listing_type?.icon ?? "🏠"}
                        </div>
                      );
                    })()}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
                  </div>
                  <h4 className="min-h-[2.5rem] line-clamp-2 text-[13px] font-black leading-tight text-brand-dark dark:text-white">{l.title}</h4>
                </div>
              ))}

              {/* Rows */}
              {features.map((f, idx) => (
                <div key={f.label} className={cn("contents group", idx % 2 === 0 ? "bg-white dark:bg-[var(--bg2)]" : "bg-gray-50/50 dark:bg-[var(--bg3)]")}>
                  <div className={cn("sticky left-0 flex items-center border-t border-gray-100 py-4 text-xs font-black uppercase tracking-wider text-text-muted dark:border-white/10 dark:text-white/65", idx % 2 === 0 ? "bg-white dark:bg-[var(--bg2)]" : "bg-gray-50 dark:bg-[var(--bg3)]")}>
                    {f.label}
                  </div>
                  {listings.map(l => (
                    <div key={l.id} className="flex items-center border-t border-gray-100 px-4 py-4 text-sm font-bold text-brand-dark dark:border-white/10 dark:text-white">
                      {f.getValue(l)}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
          
          <div className="border-t border-gray-100 bg-gray-50 px-8 py-6 text-center dark:border-white/10 dark:bg-[var(--bg3)]">
            <Dialog.Close className="btn-primary rounded-full px-12">
              Zamknij porównanie
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
      if (prev.length >= 4) {
        toast.error("Możesz porównać maksymalnie 4 oferty");
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
      <div className="min-h-screen bg-[#fafbfc] pb-20 dark:bg-[var(--background)]">
      <div className="mx-auto max-w-[1400px] px-6 py-12 sm:px-10 lg:py-16">
        <header className="mb-10 flex flex-wrap items-end justify-between gap-6">
          <div>
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="mb-3 flex items-center gap-2 text-sm font-black uppercase tracking-widest text-brand"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-brand" />
              Twoja kolekcja
            </motion.div>
            <h1 className="text-[clamp(32px,5vw,48px)] font-black leading-tight tracking-tight text-brand-dark dark:text-white">
              Moje <span className="bg-gradient-to-r from-brand to-rose-500 bg-clip-text text-transparent">Ulubione</span>
            </h1>
            <p className="mt-3 text-lg font-medium text-text-muted dark:text-white/70">
              {items.length} zapisanych ofert gotowych do odkrycia.
            </p>
          </div>
          <div className="flex gap-3">
            <button type="button" className="btn-secondary flex items-center gap-2 rounded-full border-gray-200 bg-white px-6 font-black text-brand-dark shadow-sm hover:border-brand-border dark:border-white/20 dark:bg-[var(--bg2)] dark:text-white" onClick={() => toast.success("Kolekcje będą dostępne już wkrótce!")}>
              📋 Stwórz kolekcję
            </button>
          </div>
        </header>

        <div className="mb-10 flex gap-2 overflow-x-auto pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <button
            type="button"
            onClick={() => setFilterMode("all")}
            className={cn(
              "shrink-0 rounded-full px-6 py-3 text-sm font-black transition-all",
              filterMode === "all" 
                ? "bg-brand-dark text-white shadow-lg shadow-brand-dark/20" 
                : "bg-white text-text-muted hover:bg-brand-surface hover:text-brand dark:bg-[var(--bg2)] dark:text-white/70 dark:hover:text-white"
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
                "flex shrink-0 items-center gap-2 rounded-full px-6 py-3 text-sm font-black transition-all",
                filterMode === mode 
                  ? "bg-brand-dark text-white shadow-lg shadow-brand-dark/20" 
                  : "bg-white text-text-muted hover:bg-brand-surface hover:text-brand dark:bg-[var(--bg2)] dark:text-white/70 dark:hover:text-white"
              )}
            >
              <span>{MODE_EMOJI[mode] ?? "✨"}</span>
              <span>{TRAVEL_MODE_LABELS[mode] ?? mode}</span>
              <span className="opacity-50">({n})</span>
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
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            <AnimatePresence mode="popLayout">
              {filteredItems.map((it) => (
                <WishlistCard
                  key={it.id}
                  item={it}
                  onRemove={handleRemove}
                  removing={removingId === (it.listing as Listing).id}
                  isSelected={selectedCompareIds.includes((it.listing as Listing).id)}
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
            className="fixed bottom-8 left-1/2 z-50 flex -translate-x-1/2 items-center gap-6 rounded-full border border-white/20 bg-brand-dark/90 px-8 py-4 shadow-2xl backdrop-blur-xl"
          >
            <div className="hidden sm:block">
              <p className="text-sm font-black text-white">Wybrano: {selectedCompareIds.length} / 4</p>
              <p className="text-[10px] font-bold text-white/60">Wybierz do 4 ofert by je porównać</p>
            </div>
            <div className="flex -space-x-3">
              {selectedListings.map(l => (
                <div key={l.id} className="h-10 w-10 overflow-hidden rounded-full border-2 border-brand-dark bg-gray-200">
                  <img src={publicMediaUrl(l.images?.find(i => i.is_cover)?.display_url ?? l.images?.[0]?.display_url) ?? undefined} alt="" className="h-full w-full object-cover" />
                </div>
              ))}
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                className="text-xs font-black text-white/70 hover:text-white transition-colors"
                onClick={() => setSelectedCompareIds([])}
              >
                Wyczyść
              </button>
              <button
                type="button"
                className="btn-primary rounded-full px-8 py-2.5 text-sm font-black disabled:opacity-50"
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
