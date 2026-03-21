"use client";

import { useEffect, useState } from "react";

import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

type Props = {
  city: string;
  basePrice: number;
  cleaningFee: number;
  bookingMode: "instant" | "request";
  cancellationPolicy: string;
  onChange: (patch: {
    base_price?: number;
    cleaning_fee?: number;
    booking_mode?: "instant" | "request";
    cancellation_policy?: string;
  }) => void;
};

export function Step5Pricing({
  city,
  basePrice,
  cleaningFee,
  bookingMode,
  cancellationPolicy,
  onChange,
}: Props) {
  const [suggestion, setSuggestion] = useState<{ min: number; max: number; med: number } | null>(
    null
  );

  useEffect(() => {
    if (!city?.trim()) return;
    let c = false;
    (async () => {
      try {
        const res = await api.get<{ data: { base_price?: number }[] }>("/api/v1/search/", {
          location: city,
          page_size: "20",
        });
        if (c || !Array.isArray(res.data)) return;
        const prices = res.data.map((x) => Number(x.base_price)).filter((n) => n > 0);
        if (prices.length === 0) return;
        prices.sort((a, b) => a - b);
        const med = prices[Math.floor(prices.length / 2)] ?? prices[0];
        setSuggestion({
          min: prices[0],
          max: prices[prices.length - 1],
          med,
        });
      } catch {
        setSuggestion(null);
      }
    })();
    return () => {
      c = true;
    };
  }, [city]);

  return (
    <div>
      <h2 className="text-[22px] font-extrabold text-brand-dark">💰 Ceny</h2>
      <p className="mt-1 text-sm text-text-muted">Ustal stawki i zasady rezerwacji.</p>

      {suggestion ? (
        <div className="mt-6 rounded-[10px] border border-brand-border bg-brand-surface p-3 text-sm text-brand-dark">
          💡 Podobne domki w {city}: {suggestion.min}–{suggestion.max} zł/noc. Sugerujemy start od{" "}
          {suggestion.med} zł.
        </div>
      ) : null}

      <div className="mt-4 grid grid-cols-2 gap-3">
        <label className="text-sm font-semibold text-brand-dark">
          Cena za noc (PLN)
          <input
            type="number"
            min={1}
            className="input mt-2"
            value={basePrice || ""}
            onChange={(e) => onChange({ base_price: Number(e.target.value) })}
          />
        </label>
        <label className="text-sm font-semibold text-brand-dark">
          Opłata za sprzątanie
          <input
            type="number"
            min={0}
            className="input mt-2"
            value={cleaningFee || ""}
            onChange={(e) => onChange({ cleaning_fee: Number(e.target.value) })}
          />
        </label>
      </div>

      <p className="mt-4 text-sm font-semibold text-brand-dark">Tryb rezerwacji</p>
      <div className="mt-2 grid grid-cols-2 gap-2.5">
        <button
          type="button"
          onClick={() => onChange({ booking_mode: "instant" })}
          className={cn(
            "rounded-xl border-[1.5px] p-3 text-left text-sm transition-all",
            bookingMode === "instant"
              ? "border-2 border-brand bg-brand-muted"
              : "border-[#e5e7eb] hover:border-brand"
          )}
        >
          <span className="font-bold">⚡ Instant Booking</span>
          <p className="mt-1 text-xs text-text-muted">Goście rezerwują od razu.</p>
        </button>
        <button
          type="button"
          onClick={() => onChange({ booking_mode: "request" })}
          className={cn(
            "rounded-xl border-[1.5px] p-3 text-left text-sm transition-all",
            bookingMode === "request"
              ? "border-2 border-brand bg-brand-muted"
              : "border-[#e5e7eb] hover:border-brand"
          )}
        >
          <span className="font-bold">📋 Na zapytanie</span>
          <p className="mt-1 text-xs text-text-muted">Akceptujesz każdą rezerwację ręcznie (24h).</p>
        </button>
      </div>

      <label className="mt-6 block text-sm font-semibold text-brand-dark">
        Polityka anulowania
        <select
          className="input mt-2"
          value={cancellationPolicy}
          onChange={(e) => onChange({ cancellation_policy: e.target.value })}
        >
          <option value="flexible">Elastyczna — zwrot do 24h przed</option>
          <option value="moderate">Umiarkowana — zwrot do 5 dni</option>
          <option value="strict">Surowa — zwrot do 14 dni</option>
          <option value="non_refundable">Bez zwrotu</option>
        </select>
      </label>
    </div>
  );
}
