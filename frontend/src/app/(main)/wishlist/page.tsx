"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { formatDate } from "@/lib/utils/dates";
import { apiUrl } from "@/lib/api";
import { topTravelModeFromListing } from "@/lib/destinationMode";
import { publicMediaUrl } from "@/lib/mediaUrl";
import { buildSearchURL } from "@/lib/searchUrl";
import { MODE_EMOJI, TRAVEL_MODE_LABELS } from "@/lib/travelModes";
import { cn } from "@/lib/utils";
import type { Listing } from "@/types/listing";
import type { SavedSearch, WishlistItem } from "@/types/ai";

async function fetchJson<T>(path: string): Promise<T> {
  const token = typeof window !== "undefined" ? localStorage.getItem("access") : null;
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
}: {
  item: WishlistItem;
  onRemove: (listingId: string) => void;
  removing: boolean;
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
    <div
      className={cn(
        "cursor-pointer overflow-hidden rounded-[14px] border border-gray-200 bg-white shadow-card transition-all duration-300 ease-[cubic-bezier(.16,1,.3,1)] hover:-translate-y-1 hover:border-brand-border hover:shadow-hover",
        removing && "pointer-events-none scale-90 opacity-0"
      )}
      onClick={() => router.push(`/listing/${listing.slug}`)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter") router.push(`/listing/${listing.slug}`);
      }}
    >
      <div className="relative h-[170px] overflow-hidden bg-brand-surface">
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center bg-gradient-to-br from-brand-surface to-brand-muted text-4xl">
            {icon}
          </div>
        )}
        <span
          className={cn(
            "absolute left-2.5 top-2.5 rounded-lg px-2 py-0.5 text-[10px] font-bold",
            typeBadgeClass(typeName)
          )}
        >
          {typeName}
        </span>
        <button
          type="button"
          className="absolute right-2.5 top-2.5 flex h-[30px] w-[30px] items-center justify-center rounded-full border border-black/[0.07] bg-white/93 text-sm text-rose-600 transition-transform hover:scale-110 hover:bg-rose-50"
          aria-label="Usuń z ulubionych"
          onClick={(e) => {
            e.stopPropagation();
            onRemove(listing.id);
          }}
        >
          ♥
        </button>
        <span className="absolute bottom-2 left-2.5 rounded-full bg-black/50 px-2 py-0.5 text-[10px] font-semibold text-white">
          Dodano {formatDate(item.created_at)}
        </span>
      </div>
      <div className="px-3.5 py-3">
        <h3 className="mb-1 line-clamp-2 text-[13px] font-bold leading-snug text-text">{listing.title}</h3>
        <p className="mb-2 flex items-center gap-1 text-[11px] text-text-muted">
          <span aria-hidden>📍</span>
          {city}, {region}
        </p>
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-extrabold text-text">
            {listing.base_price} {listing.currency} / noc
          </span>
          <button
            type="button"
            className="shrink-0 rounded-md bg-brand px-3 py-1 text-[11px] font-bold text-white hover:bg-brand-700"
            onClick={(e) => {
              e.stopPropagation();
              router.push(`/listing/${listing.slug}`);
            }}
          >
            Rezerwuj
          </button>
        </div>
      </div>
    </div>
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

  useEffect(() => {
    setMounted(true);
  }, []);

  const token = mounted && typeof window !== "undefined" ? localStorage.getItem("access") : null;

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
      try {
        const res = await fetch(apiUrl(`/api/v1/wishlist/${listingId}/`), {
          method: "DELETE",
          headers: { Authorization: `Bearer ${localStorage.getItem("access") ?? ""}` },
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
            Authorization: `Bearer ${localStorage.getItem("access") ?? ""}`,
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
          headers: { Authorization: `Bearer ${localStorage.getItem("access") ?? ""}` },
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
      <div className="mx-auto max-w-[1200px] px-8 py-10">
        <p className="text-text-muted">Ładowanie…</p>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="mx-auto max-w-lg px-8 py-20 text-center">
        <p className="text-lg font-bold text-text">Zaloguj się, aby zobaczyć ulubione.</p>
        <Link href="/login?next=/wishlist" className="mt-4 inline-block font-bold text-brand hover:underline">
          Przejdź do logowania
        </Link>
      </div>
    );
  }

  const saved = savedPayload?.data ?? [];

  return (
    <div className="mx-auto max-w-[1200px] px-7 py-8 sm:px-8">
      <header className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-extrabold text-brand-dark">Moje ulubione</h1>
          <p className="text-sm text-text-muted">
            {items.length} zapisanych ofert · sortuj i filtruj
          </p>
        </div>
        <button type="button" className="btn-secondary text-sm" onClick={() => console.log("kolekcja — wkrótce")}>
          📋 Stwórz kolekcję
        </button>
      </header>

      <div className="mb-5 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <button
          type="button"
          onClick={() => setFilterMode("all")}
          className={cn("mode-chip shrink-0 px-3 py-2 text-xs", filterMode === "all" && "on")}
        >
          Wszystkie ({items.length})
        </button>
        {Array.from(modes.entries()).map(([mode, n]) => (
          <button
            key={mode}
            type="button"
            onClick={() => setFilterMode(mode)}
            className={cn("mode-chip shrink-0 px-3 py-2 text-xs", filterMode === mode && "on")}
          >
            {MODE_EMOJI[mode] ?? "✨"} {TRAVEL_MODE_LABELS[mode] ?? mode} ({n})
          </button>
        ))}
      </div>

      {wishLoading && items.length === 0 ? (
        <p className="text-text-muted">Ładowanie…</p>
      ) : filteredItems.length === 0 ? (
        <div className="py-20 text-center">
          <div className="animate-float-heart text-[56px] leading-none" aria-hidden>
            💔
          </div>
          <h2 className="mt-4 text-2xl font-extrabold text-brand-dark">Brak ulubionych</h2>
          <p className="mx-auto mt-2 max-w-md text-text-muted">
            Przeglądaj oferty i klikaj ♡ żeby zapisywać ulubione miejsca
          </p>
          <Link href="/search" className="btn-primary mt-6 inline-flex">
            Znajdź nocleg
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredItems.map((it) => (
            <WishlistCard
              key={it.id}
              item={it}
              onRemove={handleRemove}
              removing={removingId === (it.listing as Listing).id}
            />
          ))}
        </div>
      )}

      <div className="my-8 border-t border-gray-200" />

      <header className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-extrabold text-brand-dark">Zapisane wyszukiwania</h2>
        <Link href="/search" className="text-sm font-bold text-brand hover:underline">
          + Nowe wyszukiwanie
        </Link>
      </header>

      <div className="space-y-2.5">
        {saved.length === 0 ? (
          <p className="text-sm text-text-muted">Brak zapisanych wyszukiwań.</p>
        ) : (
          saved.map((s) => (
            <div
              key={s.id}
              role="button"
              tabIndex={0}
              className="mb-2.5 flex cursor-pointer flex-wrap items-center gap-3 rounded-xl border border-gray-200 px-4 py-3.5 transition-all duration-150 hover:border-brand hover:bg-brand-surface"
              onClick={() => router.push(buildSearchURL(s.query_payload))}
              onKeyDown={(e) => {
                if (e.key === "Enter") router.push(buildSearchURL(s.query_payload));
              }}
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-brand-surface text-lg">
                🔍
              </div>
              <div className="min-w-0 flex-1">
                <p className="mb-1 text-sm font-bold text-gray-900">{s.name}</p>
                <div className="flex flex-wrap gap-2 text-xs text-text-muted">
                  {s.query_payload.location ? <span>📍 {s.query_payload.location}</span> : null}
                  {s.query_payload.travel_mode ? (
                    <span>
                      {MODE_EMOJI[s.query_payload.travel_mode] ?? ""}{" "}
                      {TRAVEL_MODE_LABELS[s.query_payload.travel_mode] ?? s.query_payload.travel_mode}
                    </span>
                  ) : null}
                  {s.query_payload.date_from && s.query_payload.date_to ? (
                    <span>
                      📅 {formatDate(s.query_payload.date_from)} – {formatDate(s.query_payload.date_to)}
                    </span>
                  ) : null}
                  {s.query_payload.max_price != null ? <span>💰 do {s.query_payload.max_price} zł</span> : null}
                  {s.query_payload.near_mountains ? <span>⛰️ Góry</span> : null}
                  {s.query_payload.near_lake ? <span>🏊 Jezioro</span> : null}
                </div>
              </div>
              <div className="flex shrink-0 flex-wrap items-center gap-2">
                <div className="flex flex-col items-center text-center text-[11px] text-text-muted">
                  <span
                    className={cn(
                      "text-sm font-extrabold",
                      s.new_listings_count > 0 ? "text-brand" : "text-text-muted"
                    )}
                  >
                    {s.new_listings_count > 0 ? s.new_listings_count : "Brak"}
                  </span>
                  <span>nowych</span>
                </div>
                <NotifyToggle on={s.notify_new_listings} onToggle={() => void toggleNotify(s)} />
                <button
                  type="button"
                  className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-500 hover:border-brand"
                  onClick={(e) => {
                    e.stopPropagation();
                    router.push(buildSearchURL(s.query_payload));
                  }}
                >
                  Szukaj
                </button>
                <button
                  type="button"
                  className="rounded-lg px-3 py-1.5 text-xs font-semibold text-red-500 hover:bg-red-50"
                  onClick={(e) => {
                    e.stopPropagation();
                    void deleteSaved(s.id);
                  }}
                >
                  Usuń
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
