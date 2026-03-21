"use client";

import Link from "next/link";
import { useState } from "react";
import toast from "react-hot-toast";
import { api } from "@/lib/api";
import { stubListingFromSearch } from "@/lib/listingAdapters";
import { publicMediaUrl } from "@/lib/mediaUrl";
import { useCompareStore } from "@/lib/store/compareStore";
import type { SearchListing } from "@/lib/searchTypes";
import { cn } from "@/lib/utils";

type Props = {
  listing: SearchListing;
  variant?: "grid" | "compact";
  highlighted?: boolean;
  onHover?: (hover: boolean) => void;
  /** Etykieta na zdjęciu (np. last minute) */
  availabilityBadge?: string | null;
  showCompare?: boolean;
  showWishlist?: boolean;
  onWishlistToggle?: (listingId: string, liked: boolean) => void;
};

const TYPE_EMOJI: Record<string, string> = {
  góry: "⛰️",
  jezioro: "🏊",
  las: "🌲",
  wellness: "🧖",
};

export function ListingCard({
  listing,
  variant = "grid",
  highlighted = false,
  onHover,
  availabilityBadge,
  showCompare = true,
  showWishlist = true,
  onWishlistToggle,
}: Props) {
  const [liked, setLiked] = useState(false);
  const [ripple, setRipple] = useState(false);
  const compareListings = useCompareStore((s) => s.listings);
  const addCompare = useCompareStore((s) => s.addListing);
  const removeCompare = useCompareStore((s) => s.removeListing);
  const inCompare = compareListings.some((l) => l.id === listing.id);
  const compareFull = compareListings.length >= 3 && !inCompare;
  const city = listing.location?.city || "";
  const region = listing.location?.region || "";
  const locLine = [city, region].filter(Boolean).join(", ") || "Polska";
  const emoji = TYPE_EMOJI.wellness;
  const priceNum = parseFloat(listing.base_price);
  const priceOk = !Number.isNaN(priceNum);
  const coverSrc = publicMediaUrl(listing.cover_image);

  async function heartClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const token = typeof window !== "undefined" ? localStorage.getItem("access") : null;
    if (!token) {
      toast.error("Zaloguj się, aby dodać do listy życzeń.");
      return;
    }
    try {
      if (liked) {
        await api.delete(`/api/v1/wishlist/${listing.id}/`);
        setLiked(false);
        onWishlistToggle?.(listing.id, false);
        toast.success("Usunięto z listy życzeń");
      } else {
        await api.post("/api/v1/wishlist/", { listing_id: listing.id });
        setLiked(true);
        onWishlistToggle?.(listing.id, true);
        toast.success("Dodano do listy życzeń");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Błąd listy życzeń");
    }
  }

  async function compareClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (inCompare) {
      const token = typeof window !== "undefined" ? localStorage.getItem("access") : null;
      await removeCompare(listing.id, token ?? undefined);
      toast.success("Usunięto z porównania");
      return;
    }
    if (compareFull) {
      toast.error("Możesz porównać maksymalnie 3 oferty.");
      return;
    }
    const token = typeof window !== "undefined" ? localStorage.getItem("access") : null;
    setRipple(true);
    setTimeout(() => setRipple(false), 450);
    await addCompare(stubListingFromSearch(listing), token ?? undefined);
    toast.success("Dodano do porównania");
  }

  if (variant === "compact") {
    return (
      <Link
        href={`/listing/${listing.slug}`}
        className={cn(
          "mb-2.5 flex gap-3 rounded-[14px] border-[1.5px] bg-white p-3 transition-all duration-200",
          highlighted ? "border-brand bg-brand-surface" : "border-gray-200 hover:border-brand hover:bg-brand-surface"
        )}
        onMouseEnter={() => onHover?.(true)}
        onMouseLeave={() => onHover?.(false)}
      >
        <div className="relative h-[90px] w-[90px] shrink-0 overflow-hidden rounded-[10px] bg-brand-surface">
          {listing.cover_image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={listing.cover_image}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-2xl">{emoji}</div>
          )}
          {availabilityBadge ? (
            <span className="absolute bottom-1 left-1 right-1 truncate rounded px-1.5 py-0.5 text-center text-[10px] font-bold text-white shadow-sm"
              style={{ background: "rgba(10,46,26,.85)" }}
            >
              {availabilityBadge}
            </span>
          ) : null}
        </div>
        <div className="min-w-0 flex-1">
          <p className="mb-1 line-clamp-2 text-[13px] font-bold leading-snug text-text">
            {listing.title}
          </p>
          <p className="mb-2 flex items-center gap-1 text-[11px] text-text-muted">
            <span aria-hidden>📍</span>
            {locLine}
            {listing.distance_km != null && ` · ${listing.distance_km} km`}
          </p>
          <div className="flex items-center justify-between gap-2">
            <span className="text-[15px] font-extrabold text-text">
              {priceOk ? priceNum.toFixed(0) : listing.base_price}{" "}
              <span className="text-xs font-normal text-text-muted">{listing.currency}</span>
            </span>
            <span className="inline-flex rounded-md bg-brand px-3.5 py-1.5 text-xs font-bold text-white">
              Wybierz
            </span>
          </div>
        </div>
      </Link>
    );
  }

  return (
    <Link
      href={`/listing/${listing.slug}`}
      className={cn(
        "card-hover group relative block overflow-hidden rounded-[18px] border border-gray-200 bg-white shadow-card",
        ripple && "ring-2 ring-brand/40"
      )}
      onMouseEnter={() => onHover?.(true)}
      onMouseLeave={() => onHover?.(false)}
    >
      {ripple ? (
        <span
          className="pointer-events-none absolute inset-0 z-[2] animate-ping rounded-[18px] bg-brand/10"
          aria-hidden
        />
      ) : null}
      <div className="relative h-[210px] overflow-hidden">
        {coverSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={coverSrc}
            alt=""
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-brand-surface text-[52px]">
            {emoji}
          </div>
        )}
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/10"
          aria-hidden
        />
        <span className="badge-dark absolute left-3 top-3">Nocleg</span>
        {availabilityBadge ? (
          <span className="absolute bottom-3 left-3 z-[1] rounded-md bg-brand-dark/90 px-2 py-0.5 text-[10px] font-bold text-white">
            {availabilityBadge}
          </span>
        ) : null}
      </div>
      <div className="px-[18px] pb-[18px] pt-3.5">
        <h3 className="mb-1 line-clamp-2 text-sm font-bold leading-snug text-text">
          {listing.title}
        </h3>
        <p className="mb-3 flex items-center gap-1 text-xs text-text-muted">
          <span className="text-[10px]" aria-hidden>
            📍
          </span>
          {locLine}
          {listing.distance_km != null && ` · ${listing.distance_km} km`}
        </p>
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[17px] font-extrabold text-text">
              {priceOk ? priceNum.toFixed(0) : listing.base_price} {listing.currency}
            </span>
            <span className="ml-1 text-xs text-text-muted">/ noc</span>
          </div>
          <div className="flex items-center gap-1 text-amber-500">
            <span className="text-sm">★</span>
            <span className="text-[13px] font-bold text-text">—</span>
            <span className="text-[11px] text-text-muted">(0)</span>
          </div>
        </div>
        {(showCompare || showWishlist) && variant === "grid" ? (
          <div className="mt-2 flex animate-fade-up gap-1.5" style={{ animationDelay: "80ms" }}>
            {showWishlist ? (
              <button
                type="button"
                onClick={heartClick}
                className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-sm transition-colors",
                  liked
                    ? "border-rose-200 bg-rose-50 text-rose-600"
                    : "border-gray-200 bg-white text-gray-400 hover:border-rose-200 hover:text-rose-600"
                )}
                aria-label="Ulubione"
              >
                ♥
              </button>
            ) : null}
            {showCompare ? (
              <button
                type="button"
                onClick={compareClick}
                disabled={compareFull}
                title={compareFull ? "Max 3 oferty" : inCompare ? "W porównaniu" : "Porównaj"}
                className={cn(
                  "flex min-w-0 flex-1 items-center justify-center gap-1 rounded-full border px-2 py-1.5 text-[11px] font-bold transition-colors sm:flex-initial sm:px-3",
                  inCompare
                    ? "border-brand-border bg-[#dcfce7] text-brand-dark"
                    : "border-gray-200 bg-white text-gray-500 hover:border-brand-border hover:bg-brand-surface hover:text-brand-dark",
                  compareFull && "cursor-not-allowed opacity-40"
                )}
              >
                {inCompare ? "✓ W porównaniu" : "⚖️ Porównaj"}
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    </Link>
  );
}
