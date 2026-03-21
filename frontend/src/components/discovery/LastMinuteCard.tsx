"use client";

import Link from "next/link";
import { differenceInCalendarDays, parseISO, startOfDay } from "date-fns";
import { publicMediaUrl } from "@/lib/mediaUrl";
import type { LastMinuteListing } from "@/types/ai";

function daysLabel(availableFrom: string): string {
  const d = differenceInCalendarDays(parseISO(availableFrom), startOfDay(new Date()));
  if (d <= 0) return "Dziś!";
  if (d === 1) return "Jutro!";
  return `${d} dni`;
}

export function LastMinuteCard({ listing }: { listing: LastMinuteListing }) {
  const img =
    listing.images?.find((i) => i.is_cover)?.display_url ?? listing.images?.[0]?.display_url;
  const src = publicMediaUrl(img);
  const disc = listing.discount_percent && listing.discount_percent > 0 ? listing.discount_percent : 0;
  const origPrice = disc ? Math.round(listing.base_price / (1 - disc / 100)) : listing.base_price;

  return (
    <Link
      href={`/listing/${listing.slug}`}
      className="min-w-[240px] max-w-[240px] shrink-0 overflow-hidden rounded-[14px] border border-gray-200 bg-white transition-all duration-300 ease-[cubic-bezier(.16,1,.3,1)] hover:-translate-y-[3px] hover:border-brand-border hover:shadow-hover"
    >
      <div className="relative h-[150px] overflow-hidden bg-brand-surface">
        {disc > 0 ? (
          <span className="absolute left-2 top-2 rounded bg-red-500/90 px-1.5 py-0.5 text-[10px] font-bold text-white">
            −{disc}%
          </span>
        ) : null}
        <span className="absolute right-2 top-2 rounded bg-brand-dark px-1.5 py-0.5 text-[10px] font-bold text-white">
          ⚡ {daysLabel(listing.available_from)}
        </span>
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-3xl">{listing.listing_type?.icon}</div>
        )}
      </div>
      <div className="px-3 py-2.5">
        <h3 className="mb-1 line-clamp-2 text-[13px] font-bold text-text">{listing.title}</h3>
        <p className="mb-2 text-[11px] text-text-muted">
          {listing.location.city}, {listing.location.region}
        </p>
        <div className="flex flex-wrap items-baseline gap-2">
          {disc > 0 ? (
            <span className="text-xs text-text-muted line-through">{origPrice} {listing.currency}</span>
          ) : null}
          <span className="text-sm font-extrabold text-text">
            {listing.base_price} {listing.currency} / noc
          </span>
        </div>
        <p className="mt-1 text-xs text-amber-600">
          ★ {listing.average_rating ?? "—"}
        </p>
      </div>
    </Link>
  );
}

export function LastMinuteBanner() {
  return (
    <div
      className="mb-8 flex flex-col items-start justify-between gap-4 rounded-2xl px-7 py-6 sm:flex-row sm:items-center"
      style={{
        background: "linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)",
      }}
    >
      <div>
        <p className="mb-2.5 inline-block rounded-full bg-white/20 px-2 py-0.5 text-[11px] font-bold text-white">
          ⚡ Dostępne w ten weekend
        </p>
        <h3 className="text-xl font-extrabold tracking-tight text-white">
          Last minute — zostały ostatnie miejsca
        </h3>
        <p className="mt-1 text-[13px] text-white/70">
          Oferty dostępne już od jutra · aktualizowane co 30 min
        </p>
      </div>
      <Link
        href="/search?available=this_weekend"
        className="inline-flex shrink-0 items-center rounded-lg bg-white px-5 py-2.5 text-sm font-bold text-indigo-600 shadow-md transition-all hover:-translate-y-px hover:bg-violet-50"
      >
        Zobacz dostępne →
      </Link>
    </div>
  );
}
