"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useState } from "react";
import toast from "react-hot-toast";
import { api } from "@/lib/api";
import { getAccessToken } from "@/lib/authStorage";
import { stubListingFromSearch } from "@/lib/listingAdapters";
import { publicMediaUrl } from "@/lib/mediaUrl";
import { useCompareStore } from "@/lib/store/compareStore";
import type { SearchListing } from "@/lib/searchTypes";
import { cn } from "@/lib/utils";

type Props = {
  listing: SearchListing;
  variant?: "grid" | "compact";
  highlighted?: boolean;
  selected?: boolean;
  onHover?: (hover: boolean) => void;
  onClick?: () => void;
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
  selected = false,
  onHover,
  onClick,
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

  const cacheListing = () => {
    if (typeof window === "undefined" || !listing?.slug) return;
    try {
      localStorage.setItem(`listing-cache:${listing.slug}`, JSON.stringify(listing));
    } catch {
      // noop
    }
  };

  async function heartClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const token = typeof window !== "undefined" ? getAccessToken() : null;
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
      const token = typeof window !== "undefined" ? getAccessToken() : null;
      await removeCompare(listing.id, token ?? undefined);
      toast.success("Usunięto z porównania");
      return;
    }
    if (compareFull) {
      toast.error("Możesz porównać maksymalnie 3 oferty.");
      return;
    }
    const token = typeof window !== "undefined" ? getAccessToken() : null;
    setRipple(true);
    setTimeout(() => setRipple(false), 450);
    await addCompare(stubListingFromSearch(listing), token ?? undefined);
    toast.success("Dodano do porównania");
  }

  if (variant === "compact") {
    return (
      <div
        className={cn(
          "group relative mb-0.5 flex cursor-pointer gap-4 rounded-[20px] border-[1.5px] bg-white p-3.5",
          "transition-all duration-300 ease-[cubic-bezier(0.23,1,0.32,1)]",
          selected
            ? "border-brand bg-brand-surface shadow-[0_8px_24px_rgba(22,163,74,0.12)] z-[2] scale-[1.02]"
            : highlighted
              ? "border-brand/40 bg-brand-surface/50 shadow-md z-[1]"
              : "border-gray-100/80 hover:border-brand/30 hover:bg-gray-50/50 hover:shadow-lg",
        )}
        onMouseEnter={() => onHover?.(true)}
        onMouseLeave={() => onHover?.(false)}
        onClick={onClick}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === "Enter" && onClick?.()}
      >
        {/* Selection indicator */}
        {selected && (
          <motion.span
            layoutId="active-indicator"
            className="absolute left-0 top-1/2 h-10 w-1.5 -translate-y-1/2 rounded-r-full bg-brand shadow-[0_0_12px_rgba(22,163,74,0.4)]"
          />
        )}
        <Link
          href={`/listing/${listing.slug}`}
          className="relative h-[92px] w-[92px] shrink-0 overflow-hidden rounded-[16px] bg-brand-surface/20 shadow-inner"
          onClick={(e) => {
            e.stopPropagation();
            cacheListing();
          }}
        >
          {coverSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={coverSrc}
              alt=""
              className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-3xl bg-brand-surface/30">{emoji}</div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          {availabilityBadge ? (
            <span
              className="absolute bottom-1.5 left-1.5 right-1.5 truncate rounded-lg px-2 py-0.5 text-center text-[9px] font-bold text-white shadow-sm backdrop-blur-md"
              style={{ background: "rgba(10,46,26,0.75)" }}
            >
              {availabilityBadge}
            </span>
          ) : null}
        </Link>
        <div className="min-w-0 flex-1 flex flex-col justify-between">
          <div>
            <Link
              href={`/listing/${listing.slug}`}
              className="mb-1 line-clamp-1 block text-[15px] font-extrabold leading-snug text-text transition-colors group-hover:text-brand-dark"
              onClick={(e) => {
                e.stopPropagation();
                cacheListing();
              }}
            >
              {listing.title}
            </Link>
            <p className="mb-2 flex items-center gap-1.5 text-[11px] font-medium text-text-muted">
              <span className="text-brand/70" aria-hidden>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
              </span>
              {locLine}
              {listing.distance_km != null && (
                <span className="ml-0.5 px-1.5 py-0.5 rounded-md bg-brand-surface/60 text-[10px] text-brand-dark/80">
                  {listing.distance_km} km
                </span>
              )}
            </p>
          </div>
          <div className="flex items-center justify-between gap-3">
            <div className="flex flex-col">
              <span className="text-[11px] font-medium text-text-muted leading-none mb-0.5">od</span>
              <span className="text-[16px] font-black text-text tracking-tight">
                {priceOk ? priceNum.toFixed(0) : listing.base_price}{" "}
                <span className="text-[12px] font-bold text-text-muted/70">zł</span>
              </span>
            </div>
            <Link
              href={`/listing/${listing.slug}`}
              className={cn(
                "rounded-xl px-4 py-2 text-[12px] font-bold transition-all duration-300",
                selected
                  ? "bg-brand text-white shadow-[0_4px_12px_rgba(22,163,74,0.3)]"
                  : "bg-brand-surface text-brand-dark hover:bg-brand hover:text-white hover:shadow-md active:scale-95",
              )}
                onClick={(e) => {
                  e.stopPropagation();
                  cacheListing();
                }}
            >
              Szczegóły
            </Link>
          </div>
        </div>
      </div>
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
      onClick={cacheListing}
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
