"use client";

import Link from "next/link";
import { publicMediaUrl } from "@/lib/mediaUrl";
import type { MapPin, SearchListing } from "@/lib/searchTypes";
import { cn } from "@/lib/utils";

type Props = {
  pin: MapPin;
  /** Pełne dane listingu (z wyników listy) — opcjonalne, wzbogaca popup */
  listing?: SearchListing | null;
  onClose: () => void;
};

export function SearchMapPopupCard({ pin, listing, onClose }: Props) {
  const title = listing?.title ?? pin.title ?? "Oferta";
  const slug = listing?.slug ?? pin.slug;
  const city = listing?.location?.city ?? pin.city;
  const region = listing?.location?.region;
  const rawCover = listing?.cover_image ?? null;
  const coverSrc = rawCover ? publicMediaUrl(rawCover) : null;
  const priceNum = parseFloat(pin.price);
  const priceOk = !Number.isNaN(priceNum);
  const rating = (listing?.average_rating ?? pin.average_rating) ?? null;
  const ratingNum = rating != null ? parseFloat(String(rating)) : null;
  const typeIcon = (listing as unknown as { listing_type?: { icon?: string } })?.listing_type?.icon
    ?? pin.listing_type?.icon
    ?? "🏠";

  const locLine = [city, region].filter(Boolean).join(", ") || "Polska";
  const href = slug ? `/listing/${slug}` : "#";

  return (
    <div
      className="relative w-[240px] overflow-hidden rounded-[16px] border border-gray-100 bg-white shadow-[0_8px_32px_rgba(0,0,0,.16)] transition-all duration-200"
      style={{ animation: "scaleIn 0.18s cubic-bezier(.16,1,.3,1) both" }}
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Zamknij"
        className="absolute right-2 top-2 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-black/40 text-[11px] text-white backdrop-blur-sm transition-colors hover:bg-black/60"
      >
        ✕
      </button>

      {/* Zdjęcie */}
      <div className="relative h-[130px] w-full overflow-hidden bg-brand-surface">
        {coverSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={coverSrc}
            alt={title}
            className="h-full w-full object-cover transition-transform duration-500 hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-[40px]">{typeIcon}</div>
        )}
        {/* Price badge */}
        <div className="absolute bottom-2 left-2 rounded-lg bg-brand-dark/90 px-2.5 py-1 text-xs font-extrabold text-white backdrop-blur-sm">
          {priceOk ? `${priceNum.toFixed(0)} zł` : `${pin.price} zł`}
          <span className="ml-1 font-normal opacity-75">/ noc</span>
        </div>
      </div>

      {/* Treść */}
      <div className="px-3 pb-3 pt-2.5">
        <p className="mb-0.5 line-clamp-2 text-[13px] font-bold leading-snug text-text">{title}</p>
        <p className="mb-2 flex items-center gap-1 text-[11px] text-text-muted">
          <span aria-hidden className="text-[10px]">📍</span>
          {locLine}
        </p>
        <div className="flex items-center justify-between gap-2">
          {ratingNum != null && ratingNum > 0 ? (
            <div className="flex items-center gap-0.5 text-amber-500">
              <span className="text-[11px]">★</span>
              <span className="text-[11px] font-bold text-text">{ratingNum.toFixed(1)}</span>
            </div>
          ) : (
            <span className="text-[11px] text-text-muted">Nowe</span>
          )}
          <Link
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              "rounded-md bg-brand px-3 py-1.5 text-[11px] font-bold text-white",
              "transition-all duration-150 hover:bg-brand-700 active:scale-95"
            )}
            onClick={(e) => e.stopPropagation()}
          >
            Zobacz →
          </Link>
        </div>
      </div>
    </div>
  );
}
