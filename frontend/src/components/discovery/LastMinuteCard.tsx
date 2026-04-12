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
      className="group relative min-w-[280px] max-w-[280px] shrink-0 overflow-hidden rounded-2xl border border-gray-100 bg-white p-2 transition-all duration-500 hover:border-brand-border/30 hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)]"
    >
      <div className="relative h-[180px] overflow-hidden rounded-xl bg-brand-surface">
        {disc > 0 ? (
          <span className="absolute left-3 top-3 z-10 rounded-full bg-red-500 px-2.5 py-1 text-[11px] font-black text-white shadow-lg">
            −{disc}%
          </span>
        ) : null}
        <span className="absolute right-3 top-3 z-10 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-bold text-brand-dark shadow-lg backdrop-blur-md">
          ⚡ {daysLabel(listing.available_from)}
        </span>
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img 
            src={src} 
            alt="" 
            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110" 
          />
        ) : (
          <div className="flex h-full items-center justify-center text-3xl">{listing.listing_type?.icon}</div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
      </div>
      
      <div className="px-3 py-4">
        <h3 className="mb-1.5 line-clamp-1 text-[15px] font-bold text-brand-dark transition-colors group-hover:text-brand">
          {listing.title}
        </h3>
        <p className="mb-4 flex items-center gap-1 text-[12px] text-text-muted">
          <span className="opacity-70">📍</span> {listing.location.city}
        </p>
        
        <div className="flex items-center justify-between border-t border-gray-50 pt-4">
          <div className="flex flex-col">
            {disc > 0 ? (
              <span className="text-[10px] text-text-muted line-through decoration-red-400/50">
                {origPrice} {listing.currency}
              </span>
            ) : null}
            <span className="text-base font-black text-brand-dark">
              {listing.base_price} {listing.currency}
              <span className="ml-1 text-[10px] font-medium text-text-muted">/ noc</span>
            </span>
          </div>
          
          <div className="flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-700">
            ★ {listing.average_rating || "Nowość"}
          </div>
        </div>
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
            Wyselekcjonowane oferty z rabatem do <span className="font-bold text-white">-40%</span>. 
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
