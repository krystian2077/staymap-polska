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
  const [open, setOpen] = useState(true);

  if (loading) {
    return (
      <div className="space-y-2 rounded-[14px] border border-gray-200 p-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="h-4 animate-pulse rounded bg-gray-100"
            style={{ width: `${70 + (i % 3) * 10}%` }}
          />
        ))}
      </div>
    );
  }

  if (!quote) {
    return (
      <div className="rounded-[14px] border border-dashed border-gray-200 bg-gray-50/80 p-4 text-center text-sm text-gray-500">
        Wybierz daty, aby zobaczyć cenę
      </div>
    );
  }

  const cur = quote.currency;
  const hasSeason = quote.seasonal_multiplier > 1.001;
  const hasDiscount = quote.long_stay_discount > 0;

  return (
    <div className="overflow-hidden rounded-[14px] border border-gray-200">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between bg-gray-50 px-4 py-3 text-left transition-colors hover:bg-brand-surface"
      >
        <span className="text-[13px] font-bold text-brand-dark">Szczegóły ceny</span>
        <span className="text-sm font-extrabold text-brand-dark">{money(quote.total, cur)}</span>
      </button>
      {open && (
        <div className="space-y-2.5 px-4 py-3 text-sm">
          <div className="flex justify-between gap-4 text-gray-600">
            <span className="flex flex-wrap items-center gap-2">
              {money(quote.nightly_rate, cur)} × {quote.nights}{" "}
              {quote.nights === 1 ? "noc" : quote.nights < 5 ? "noce" : "nocy"}
              {hasSeason && (
                <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-900">
                  Sezon ×{quote.seasonal_multiplier.toFixed(2)}
                </span>
              )}
            </span>
            <span className="shrink-0 font-medium text-gray-900">
              {money(quote.accommodation_subtotal, cur)}
            </span>
          </div>
          {hasDiscount && (
            <div className="flex justify-between gap-4 text-emerald-700">
              <span>
                Rabat za długi pobyt
                {quote.long_stay_discount_percent ? (
                  <span className="text-emerald-600"> ({quote.long_stay_discount_percent}%)</span>
                ) : null}
              </span>
              <span className="font-semibold">−{money(quote.long_stay_discount, cur)}</span>
            </div>
          )}
          <div className="flex justify-between gap-4 text-gray-600">
            <span className="flex items-center gap-1">
              Opłata za sprzątanie
              <span
                title="Jednorazowa opłata przy każdej rezerwacji"
                className="inline-flex h-4 w-4 cursor-help items-center justify-center rounded-full border border-gray-400 text-[9px] text-gray-500"
              >
                ?
              </span>
            </span>
            <span className="font-medium">{money(quote.cleaning_fee, cur)}</span>
          </div>
          <div className="flex justify-between gap-4 text-gray-600">
            <span className="flex items-center gap-1">
              Opłata serwisowa StayMap
              <span
                title={`${quote.service_fee_percent ?? 15}% od zakwaterowania po rabatach`}
                className="inline-flex h-4 w-4 cursor-help items-center justify-center rounded-full border border-gray-400 text-[9px] text-gray-500"
              >
                ?
              </span>
            </span>
            <span className="font-medium">{money(quote.service_fee, cur)}</span>
          </div>
          <div className="mt-2 flex justify-between border-t border-gray-100 pt-3 text-base font-extrabold text-brand-dark">
            <span>Łącznie (PLN)</span>
            <span>{money(quote.total, cur)}</span>
          </div>
        </div>
      )}
    </div>
  );
}
