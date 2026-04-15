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

function fallbackDiscountPercent(listing: LastMinuteListing): number {
  // Stabilny fallback: ten sam listing zawsze dostanie ten sam % w UI.
  const seed = `${listing.id}|${listing.slug}|${listing.base_price}`;
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  }
  return 30 + (Math.abs(hash) % 41);
}

export function LastMinuteCard({
  listing,
}: {
  listing: LastMinuteListing;
}) {
  const img =
    listing.images?.find((i) => i.is_cover)?.display_url ?? listing.images?.[0]?.display_url;
  const src = publicMediaUrl(img);
  const disc =
    listing.discount_percent && listing.discount_percent > 0
      ? Math.round(listing.discount_percent)
      : fallbackDiscountPercent(listing);
  const origPrice = disc ? Math.round(listing.base_price / (1 - disc / 100)) : listing.base_price;
  const locationLabel = listing.location.city || listing.location.region || "Polska";

  return (
    <Link
      href={`/listing/${listing.slug}`}
      className="group relative w-full shrink-0 overflow-hidden rounded-2xl border border-gray-100 bg-white p-2 transition-all duration-500 hover:border-brand-border/30 hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)] dark:border-white/15 dark:bg-[var(--bg2)] dark:shadow-[0_16px_34px_-20px_rgba(0,0,0,.45)]"
    >
      <div className="relative h-[180px] overflow-hidden rounded-xl bg-brand-surface">
        <span className="absolute left-3 top-3 z-10 rounded-full bg-red-500 px-2.5 py-1 text-[11px] font-black text-white shadow-lg">
          −{disc}%
        </span>
        <span className="absolute right-3 top-3 z-10 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-bold text-brand-dark shadow-lg backdrop-blur-md dark:bg-[var(--bg3)]/90 dark:text-white">
          ⚡ {daysLabel(listing.available_from)}
        </span>
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img 
            src={src} 
            alt={`${listing.title} - ${locationLabel}`}
            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-3xl">{listing.listing_type?.icon}</div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
      </div>
      
      <div className="px-3 py-4">
        <h3 className="mb-1.5 line-clamp-1 text-[15px] font-bold text-brand-dark transition-colors group-hover:text-brand dark:text-white dark:group-hover:text-brand-light">
          {listing.title}
        </h3>
        <p className="mb-4 flex items-center gap-1 text-[12px] text-text-muted dark:text-white/70">
          <span className="opacity-70">📍</span> {locationLabel}
        </p>
        
        <div className="flex items-center justify-between border-t border-gray-50 pt-4 dark:border-white/15">
          <div className="flex flex-col">
            <span className="text-[10px] text-text-muted line-through decoration-red-400/50">
              {origPrice} {listing.currency}
            </span>
            <span className="text-lg font-black text-brand-dark dark:text-white">
              {listing.base_price} {listing.currency}
              <span className="ml-1 text-[10px] font-medium text-text-muted">/ noc</span>
            </span>
            <span className="mt-1.5 text-[11px] font-bold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
              {`Oszczedzasz ${disc}%`}
            </span>
          </div>
          
          <div className="flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-700 dark:bg-amber-900/35 dark:text-amber-200">
            ★ {listing.average_rating || "Nowość"}
          </div>
        </div>

        <span className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-brand/25 bg-brand-surface px-3 py-3 text-[13px] font-bold text-brand-dark shadow-sm transition-all duration-300 hover:shadow-md group-hover:-translate-y-0.5 group-hover:border-brand/50 group-hover:bg-brand group-hover:text-white group-hover:shadow-lg dark:border-brand/35 dark:bg-brand/10 dark:text-brand-light dark:group-hover:bg-brand dark:group-hover:text-white dark:group-hover:shadow-brand/30">
          Przejdz do oferty
          <span className="transition-transform duration-300 group-hover:translate-x-0.5">→</span>
        </span>
      </div>
    </Link>
  );
}

export function LastMinuteBanner() {
  return (
    <div
      className="relative mb-10 overflow-hidden rounded-[2rem] p-8 shadow-xl sm:p-12"
      style={{
        background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
      }}
    >
      {/* Elementy dekoracyjne tła */}
      <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-brand/20 blur-[80px]" />
      <div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-indigo-500/10 blur-[80px]" />
      
      <div className="relative flex flex-col items-center justify-between gap-8 lg:flex-row">
        <div className="text-center lg:text-left">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-brand/10 border border-brand/20 px-4 py-1.5 text-xs font-bold text-brand shadow-sm">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-brand"></span>
            </span>
            Okazje Last Minute
          </div>
          <h3 className="text-3xl font-black tracking-tight text-white sm:text-4xl">
            Złap okazję na ten weekend
          </h3>
          <p className="mt-4 max-w-lg text-lg text-slate-400">
            Wyselekcjonowane oferty z rabatem do <span className="font-bold text-white">-70%</span>. 
            Zostały ostatnie wolne miejsca w najlepszych lokalizacjach.
          </p>
        </div>
        
        <div className="flex shrink-0 flex-col items-center gap-4">
          <Link
            href="/search?available=this_weekend"
            className="group inline-flex items-center gap-2 rounded-full bg-white px-8 py-4 text-base font-black text-slate-900 shadow-2xl transition-all hover:-translate-y-1 hover:bg-brand hover:text-white"
          >
            Sprawdź wolne terminy
            <span className="transition-transform group-hover:translate-x-1">→</span>
          </Link>
          <p className="text-xs text-slate-500">Aktualizowane przed chwilą</p>
        </div>
      </div>
    </div>
  );
}
