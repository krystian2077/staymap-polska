"use client";

import { useState } from "react";

import type { PricingBreakdown } from "@/types/booking";

function money(n: number, currency: string) {
  return new Intl.NumberFormat("pl-PL", {
    style: "currency",
    currency: currency || "PLN",
    minimumFractionDigits: 2,
  }).format(n);
}

export function PriceBreakdown({
  quote,
  loading,
}: {
  quote: PricingBreakdown | null;
  loading?: boolean;
}) {
  if (loading) {
    return (
      <div className="space-y-4 rounded-[2rem] border border-gray-100 bg-white/50 p-6 shadow-sm">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex justify-between gap-4">
            <div className="h-5 animate-pulse rounded-lg bg-gray-100" style={{ width: `${40 + (i % 3) * 15}%` }} />
            <div className="h-5 w-20 animate-pulse rounded-lg bg-gray-100" />
          </div>
        ))}
      </div>
    );
  }

  if (!quote) {
    return (
      <div className="group relative overflow-hidden rounded-[2rem] border border-dashed border-gray-200 bg-gray-50/30 p-8 text-center transition-all hover:bg-gray-50/50">
        <p className="text-[14px] font-black tracking-tight text-gray-400 uppercase group-hover:text-brand transition-colors">
          Wybierz daty, aby zobaczyć cenę
        </p>
      </div>
    );
  }

  const cur = quote.currency;
  const hasSeason = quote.seasonal_multiplier > 1.001;
  const hasDiscount = quote.long_stay_discount > 0;

  return (
    <div className="overflow-hidden rounded-[2rem] border border-gray-100 bg-white shadow-sm transition-all hover:shadow-md">
      <div className="space-y-4 px-6 py-6 text-[14px] leading-relaxed">
        <div className="flex justify-between gap-4 text-gray-500 font-semibold">
          <span className="flex flex-wrap items-center gap-2">
            {money(quote.nightly_rate, cur)} × {quote.nights}{" "}
            {quote.nights === 1 ? "noc" : quote.nights < 5 ? "noce" : "nocy"}
            {hasSeason && (
              <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-[10px] font-black text-amber-700 ring-1 ring-inset ring-amber-200/50">
                SEZON
              </span>
            )}
          </span>
          <span className="shrink-0 font-black text-brand-dark">
            {money(quote.accommodation_subtotal, cur)}
          </span>
        </div>
        
        {quote.extra_guests && quote.extra_guests > 0 ? (
          <div className="flex justify-between gap-4 text-gray-500 font-semibold">
            <span className="flex items-center gap-2">
              Dodatkowi goście
              <div title={`${quote.extra_guests} × ${money(quote.extra_guest_fee_per_night || 0, cur)} / noc`} className="cursor-help text-gray-300 hover:text-brand transition-colors">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </span>
            <span className="shrink-0 font-black text-brand-dark">
              {money(quote.extra_guests_total || 0, cur)}
            </span>
          </div>
        ) : null}

        {hasDiscount && (
          <div className="flex justify-between gap-4 text-emerald-600 font-black bg-emerald-50/50 -mx-6 px-6 py-2">
            <span className="flex items-center gap-2">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12z" />
              </svg>
              Rabat za długi pobyt
              {quote.long_stay_discount_percent ? (
                <span className="font-bold"> ({quote.long_stay_discount_percent}%)</span>
              ) : null}
            </span>
            <span className="shrink-0">−{money(quote.long_stay_discount, cur)}</span>
          </div>
        )}

        <div className="flex justify-between gap-4 text-gray-500 font-semibold">
          <span className="flex items-center gap-2">
            Opłata za sprzątanie
            <div title="Jednorazowa opłata pobierana przez gospodarza" className="cursor-help text-gray-300 hover:text-brand transition-colors">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </span>
          <span className="shrink-0 font-black text-brand-dark">{money(quote.cleaning_fee, cur)}</span>
        </div>

        <div className="flex justify-between gap-4 text-gray-500 font-semibold">
          <span className="flex items-center gap-2">
            Opłata serwisowa
            <div title={`Obejmuje obsługę rezerwacji i wsparcie 24/7 (${quote.service_fee_percent ?? 15}%)`} className="cursor-help text-gray-300 hover:text-brand transition-colors">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </span>
          <span className="shrink-0 font-black text-brand-dark">{money(quote.service_fee, cur)}</span>
        </div>

        <div className="mt-2 flex justify-between border-t border-gray-50 pt-5 text-[19px] font-black text-brand-dark tracking-tighter">
          <span>Razem</span>
          <div className="flex flex-col items-end">
            <span>{money(quote.total, cur)}</span>
            <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mt-0.5">Wszystkie opłaty wliczone</span>
          </div>
        </div>
      </div>
    </div>
  );
}
