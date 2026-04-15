"use client";

import Link from "next/link";
import { publicMediaUrl } from "@/lib/mediaUrl";
import type { MapPin, SearchListing } from "@/lib/searchTypes";
import { MODE_EMOJI, TRAVEL_MODE_LABELS } from "@/lib/travelModes";
import { cn } from "@/lib/utils";

type Props = {
  pin: MapPin;
  /** Pełne dane listingu (z wyników listy) — opcjonalne, wzbogaca popup */
  listing?: SearchListing | null;
  /** Aktywny tryb podróży z URL — pokazuje dopasowanie oferty do trybu (jak na liście). */
  travelMode?: string | null;
  onClose: () => void;
};

export function SearchMapPopupCard({ pin, listing, travelMode, onClose }: Props) {
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
  const modeKey = travelMode?.trim() || "";
  const modeScore =
    modeKey && listing?.destination_score_cache
      ? listing.destination_score_cache[modeKey]
      : undefined;

  const cacheListing = () => {
    if (typeof window === "undefined" || !listing?.slug) return;
    try {
      localStorage.setItem(`listing-cache:${listing.slug}`, JSON.stringify(listing));
    } catch {
      // noop
    }
  };

  return (
    <div
      className="relative w-[274px] overflow-hidden rounded-[22px] border border-white/70 bg-white shadow-[0_20px_56px_rgba(15,23,42,.18)] ring-1 ring-black/5 transition-all duration-200"
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
      <div className="relative h-[148px] w-full overflow-hidden bg-brand-surface">
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
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/18 via-black/0 to-black/0" />
        {/* Price badge */}
        <div
          className="absolute bottom-2 left-2 rounded-[18px] px-3.5 py-2 text-white"
          style={{
            backgroundColor: "rgba(15, 23, 42, 0.98)",
            border: "1px solid rgba(255, 255, 255, 0.18)",
            boxShadow: "0 16px 34px rgba(0, 0, 0, 0.42)",
          }}
        >
          <div className="flex items-baseline gap-1.5 whitespace-nowrap">
            <span
              className="rounded-full px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-[0.14em] text-white"
              style={{ backgroundColor: "rgba(255, 255, 255, 0.12)" }}
            >
              od
            </span>
            <span
              className="text-[14px] font-black leading-none tracking-[-0.05em] text-white"
              style={{ textShadow: "0 1px 2px rgba(0, 0, 0, 0.35)" }}
            >
              {priceOk ? `${priceNum.toFixed(0)} zł` : `${pin.price} zł`}
            </span>
            <span className="text-[9px] font-medium leading-none text-white">
              / noc
            </span>
          </div>
        </div>
      </div>

      {/* Treść */}
      <div className="px-4 pb-4 pt-[11px]">
        <p className="mb-0.5 line-clamp-2 text-[13.5px] font-bold leading-snug text-text">{title}</p>
        <p className="mb-2.5 flex items-center gap-1 text-[11px] text-text-muted">
          <span aria-hidden className="text-[10px]">📍</span>
          {locLine}
        </p>
        {modeKey && typeof modeScore === "number" && (
          <p className="mb-2 text-[10px] font-semibold text-brand-dark">
            {MODE_EMOJI[modeKey] ?? "✨"} {TRAVEL_MODE_LABELS[modeKey] ?? modeKey}: {modeScore.toFixed(1)}/10
          </p>
        )}
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
              "rounded-full bg-brand px-3 py-1.5 text-[11px] font-bold text-white shadow-[0_8px_18px_rgba(22,163,74,.18)]",
              "transition-all duration-150 hover:-translate-y-px hover:bg-brand-700 active:scale-95"
            )}
            onClick={(e) => {
              e.stopPropagation();
              cacheListing();
            }}
          >
            Zobacz →
          </Link>
        </div>
      </div>
    </div>
  );
}
