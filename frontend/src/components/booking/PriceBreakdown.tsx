"use client";

import { useEffect, useMemo, useState } from "react";

import type { PricingBreakdown } from "@/types/booking";

function money(n: number, currency: string) {
  return new Intl.NumberFormat("pl-PL", {
    style: "currency",
    currency: currency || "PLN",
    minimumFractionDigits: 2,
  }).format(n);
}

function CostSplitCalculator({
  totalAmount,
  defaultGuests,
  maxGuests,
  currency,
  savedSplitCount,
  onSave,
}: {
  totalAmount: number;
  defaultGuests: number;
  maxGuests: number;
  currency: string;
  savedSplitCount?: number | null;
  onSave?: (splitCount: number, perPersonAmount: number) => void;
}) {
  const normalizedMaxGuests = Math.max(1, maxGuests || 1);
  const [splitCount, setSplitCount] = useState(() =>
    Math.min(normalizedMaxGuests, Math.max(1, defaultGuests || 1)),
  );

  useEffect(() => {
    if (savedSplitCount != null && savedSplitCount >= 1 && savedSplitCount <= normalizedMaxGuests) {
      setSplitCount(savedSplitCount);
      return;
    }
    setSplitCount((prev) => Math.min(normalizedMaxGuests, Math.max(1, prev)));
  }, [normalizedMaxGuests, savedSplitCount]);

  const perPerson = totalAmount / splitCount;
  const cur = currency || "PLN";
  const isSaved = savedSplitCount === splitCount;

  const copyLine = `${splitCount} os. × ${perPerson.toFixed(2)} ${cur} = ${totalAmount.toFixed(2)} ${cur}`;

  return (
    <div className="mt-6 rounded-2xl border border-brand-border bg-brand-surface p-5">
      <div className="mb-4 flex items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-black uppercase tracking-wide text-brand-dark">Podziel koszt</h3>
          <p className="mt-1 text-xs text-text-muted">Maksymalnie {normalizedMaxGuests} os. zgodnie z limitem tej rezerwacji.</p>
        </div>
        {savedSplitCount ? (
          <span className="rounded-full bg-emerald-100 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-emerald-700">
            Zapisano
          </span>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <label className="text-sm font-semibold text-text-secondary">Liczba osób</label>
        <input
          type="range"
          min={1}
          max={normalizedMaxGuests}
          value={splitCount}
          onChange={(e) => setSplitCount(Number(e.target.value))}
          className="min-w-[140px] flex-1 accent-brand"
          aria-valuemin={1}
          aria-valuemax={normalizedMaxGuests}
          aria-valuenow={splitCount}
        />
        <span className="w-8 text-center text-lg font-black text-brand-dark">{splitCount}</span>
      </div>

      <div className="mt-5 text-center">
        <span className="text-3xl font-black text-brand tabular-nums">
          {perPerson.toLocaleString("pl-PL", {
            style: "currency",
            currency: cur,
            maximumFractionDigits: 0,
          })}
        </span>
        <span className="ml-2 text-sm font-medium text-text-muted">/ osobę</span>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => {
            if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
              void navigator.clipboard.writeText(copyLine);
            }
          }}
          className="w-full rounded-xl border border-brand-border bg-white py-2.5 text-xs font-bold text-brand-dark transition hover:bg-brand-muted"
        >
          Skopiuj
        </button>
        <button
          type="button"
          onClick={() => onSave?.(splitCount, perPerson)}
          className={`w-full rounded-xl py-2.5 text-xs font-bold transition ${
            isSaved
              ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
              : "bg-brand text-white hover:bg-[#15803d]"
          }`}
        >
          {isSaved ? "Podział zapisany" : "Zapisz podział"}
        </button>
      </div>
    </div>
  );
}

export function PriceBreakdown({
  quote,
  loading,
  costSplitDefaultGuests,
  costSplitMaxGuests,
  costSplitSavedCount,
  onSaveCostSplit,
}: {
  quote: PricingBreakdown | null;
  loading?: boolean;
  /** When set (e.g. guest count), shows cost split calculator below the breakdown. */
  costSplitDefaultGuests?: number;
  costSplitMaxGuests?: number;
  costSplitSavedCount?: number | null;
  onSaveCostSplit?: (splitCount: number, perPersonAmount: number) => void;
}) {
  const splitMaxGuests = useMemo(() => {
    if (costSplitMaxGuests == null) return null;
    return Math.max(1, costSplitMaxGuests);
  }, [costSplitMaxGuests]);

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
  const hasAdultSurcharge = (quote.adults_surcharge_total ?? 0) > 0;
  const hasChildSurcharge = (quote.children_surcharge_total ?? 0) > 0;
  const petsCount = Math.max(0, quote.pets ?? 0);
  const adultsCount = Math.max(0, quote.extra_adults ?? 0);
  const childrenCount = Math.max(0, quote.extra_children ?? quote.children ?? 0);
  const adultUnitPerNight =
    adultsCount > 0 && quote.nights > 0
      ? (quote.adults_surcharge_total ?? 0) / (adultsCount * quote.nights)
      : 0;
  const childUnitPerNight =
    childrenCount > 0 && quote.nights > 0
      ? (quote.children_surcharge_total ?? 0) / (childrenCount * quote.nights)
      : 0;

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
        
        {hasAdultSurcharge ? (
          <div className="flex justify-between gap-4 text-gray-500 font-semibold">
            <span className="flex items-center gap-2">
              Dodatkowi dorośli ({adultsCount})
              <div title={`${adultsCount} × ${money(adultUnitPerNight, cur)} / noc`} className="cursor-help text-gray-300 hover:text-brand transition-colors">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </span>
            <div className="shrink-0 text-right">
              <span className="font-black text-brand-dark">{money(quote.adults_surcharge_total || 0, cur)}</span>
              <p className="text-[10px] font-bold text-gray-400">{money(adultUnitPerNight, cur)} / os. / noc</p>
            </div>
          </div>
        ) : null}

        {hasChildSurcharge ? (
          <div className="flex justify-between gap-4 text-gray-500 font-semibold">
            <span className="flex items-center gap-2">
              Dzieci ({childrenCount})
              <div title={`${childrenCount} × ${money(childUnitPerNight, cur)} / noc`} className="cursor-help text-gray-300 hover:text-brand transition-colors">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </span>
            <div className="shrink-0 text-right">
              <span className="font-black text-brand-dark">{money(quote.children_surcharge_total || 0, cur)}</span>
              <p className="text-[10px] font-bold text-gray-400">{money(childUnitPerNight, cur)} / os. / noc</p>
            </div>
          </div>
        ) : null}

        {petsCount > 0 ? (
          <div className="flex justify-between gap-4 text-gray-500 font-semibold">
            <span className="flex items-center gap-2">
              Zwierzęta ({petsCount})
              <div title="Zwierzęta są uwzględnione informacyjnie i nie mają dodatkowej opłaty." className="cursor-help text-gray-300 hover:text-brand transition-colors">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </span>
            <div className="shrink-0 text-right">
              <span className="font-black text-brand-dark">0,00 zł</span>
              <p className="text-[10px] font-bold text-gray-400">bez dopłaty</p>
            </div>
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

        {costSplitDefaultGuests != null && costSplitDefaultGuests > 0 && splitMaxGuests != null ? (
          <CostSplitCalculator
            totalAmount={quote.total}
            defaultGuests={costSplitDefaultGuests}
            maxGuests={splitMaxGuests}
            currency={cur}
            savedSplitCount={costSplitSavedCount}
            onSave={onSaveCostSplit}
          />
        ) : null}
      </div>
    </div>
  );
}
