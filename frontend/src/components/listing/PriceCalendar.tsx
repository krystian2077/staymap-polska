"use client";

import {
  addMonths,
  differenceInCalendarDays,
  eachDayOfInterval,
  endOfMonth,
  format,
  isBefore,
  isSameDay,
  isSameMonth,
  parseISO,
  startOfDay,
  startOfMonth,
} from "date-fns";
import { pl } from "date-fns/locale";
import { useMemo, useState } from "react";

import { useJsonGet } from "@/lib/hooks/useJsonGet";
import type { PriceCalendarDay, PricingRule } from "@/types/listing";

type CalendarApi = {
  data?: {
    prices?: Record<string, PriceCalendarDay>;
    rules?: PricingRule[];
  };
};

type Props = {
  /** Slug listingu — backend: /api/v1/listings/{slug}/price-calendar/ */
  listingSlug: string;
  basePrice: number;
  pricingRules: PricingRule[];
};

const WEEKDAYS = ["Pn", "Wt", "Śr", "Cz", "Pt", "So", "Nd"];

function padPrice(p: number | null | undefined): string {
  if (p == null) return "—";
  return `${Math.round(p)}`;
}

export function PriceCalendar({ listingSlug, basePrice, pricingRules }: Props) {
  const [cursor, setCursor] = useState(() => startOfMonth(new Date()));
  const [rangeStart, setRangeStart] = useState<string | null>(null);
  const [rangeEnd, setRangeEnd] = useState<string | null>(null);

  const { data, isLoading } = useJsonGet<CalendarApi>(
    listingSlug
      ? `/api/v1/listings/${listingSlug}/price-calendar/?months=2`
      : null
  );

  const prices = useMemo(() => data?.data?.prices ?? {}, [data]);
  const rules = useMemo(() => {
    const r = data?.data?.rules;
    return r?.length ? r : pricingRules;
  }, [data, pricingRules]);

  const today = startOfDay(new Date());

  const monthStart = startOfMonth(cursor);
  const monthEnd = endOfMonth(cursor);
  const gridStart = monthStart;
  const offset = (gridStart.getDay() + 6) % 7;
  const firstCell = new Date(gridStart);
  firstCell.setDate(firstCell.getDate() - offset);
  const lastCell = new Date(monthEnd);
  const trailing = 6 - ((lastCell.getDay() + 6) % 7);
  lastCell.setDate(lastCell.getDate() + trailing);

  const cells = eachDayOfInterval({ start: firstCell, end: lastCell });

  function dayKey(d: Date): string {
    return format(d, "yyyy-MM-dd");
  }

  function pickDay(iso: string, available: boolean) {
    if (!available) return;
    if (!rangeStart || (rangeStart && rangeEnd)) {
      setRangeStart(iso);
      setRangeEnd(null);
      return;
    }
    if (rangeStart && !rangeEnd) {
      if (iso < rangeStart) {
        setRangeEnd(rangeStart);
        setRangeStart(iso);
      } else if (iso === rangeStart) {
        setRangeEnd(iso);
      } else {
        setRangeEnd(iso);
      }
    }
  }

  /** check-in → check-out (dzień wyjazdu); nocy = różnica dni kalendarzowych */
  const nights = useMemo(() => {
    if (!rangeStart || !rangeEnd) return 0;
    const a = parseISO(rangeStart);
    const b = parseISO(rangeEnd);
    if (b <= a) return 0;
    return differenceInCalendarDays(b, a);
  }, [rangeStart, rangeEnd]);

  const breakdown = useMemo(() => {
    if (!rangeStart || !rangeEnd || nights < 1) return null;
    const start = parseISO(rangeStart);
    const end = parseISO(rangeEnd);
    if (end <= start) return null;
    const stayDays = eachDayOfInterval({ start, end: addDaysSafe(end, -1) });
    let subtotal = 0;
    let maxSeason = 1;
    let holidayMult = 1;
    let anyHoliday = false;
    for (const d of stayDays) {
      const k = format(d, "yyyy-MM-dd");
      const cell = prices[k];
      const p =
        cell?.price != null
          ? cell.price
          : basePrice * (cell?.seasonal_multiplier ?? 1);
      subtotal += p;
      const sm = cell?.seasonal_multiplier ?? 1;
      if (sm > maxSeason) maxSeason = sm;
      if (cell?.is_holiday) {
        anyHoliday = true;
        holidayMult = Math.max(holidayMult, sm);
      }
    }
    const longStay = rules.find((r) => r.type === "long_stay");
    let discountPct = 0;
    if (longStay?.min_nights != null && nights >= longStay.min_nights) {
      discountPct = longStay.discount_percent ?? 0;
    }
    const afterDiscount = subtotal * (1 - discountPct / 100);
    return {
      subtotal,
      maxSeason,
      holidayMult: anyHoliday ? holidayMult : 1,
      anyHoliday,
      discountPct,
      total: afterDiscount,
    };
  }, [rangeStart, rangeEnd, nights, prices, basePrice, rules]);

  const tips = useMemo(() => {
    const inMonth = Object.entries(prices).filter(([k, v]) => {
      const d = parseISO(k);
      return isSameMonth(d, cursor) && v.price != null && !v.is_booked;
    });
    if (!inMonth.length) return null;
    let min = inMonth[0];
    let max = inMonth[0];
    for (const e of inMonth) {
      if ((e[1].price ?? 0) < (min[1].price ?? 0)) min = e;
      if ((e[1].price ?? 0) > (max[1].price ?? 0)) max = e;
    }
    const long = rules.find((r) => r.type === "long_stay");
    return { min, max, long };
  }, [prices, cursor, rules]);

  return (
    <section className="mb-10">
      <h2 className="sec-h mb-2">Kalendarz cen</h2>
      <p className="mb-5 text-sm leading-relaxed text-[#6b7280]">
        Ceny zmieniają się zależnie od sezonu, polskich świąt i reguł cenowych
        gospodarza.
      </p>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_300px]">
        <div className="overflow-hidden rounded-[14px] border-[1.5px] border-[#e5e7eb] bg-white">
          <div className="flex items-center justify-between border-b border-[#e5e7eb] px-[18px] py-3.5">
            <button
              type="button"
              aria-label="Poprzedni miesiąc"
              className="flex h-7 w-7 items-center justify-center rounded-lg border border-gray-200 text-sm hover:bg-gray-50"
              onClick={() => setCursor((c) => addMonths(c, -1))}
            >
              ‹
            </button>
            <span className="text-sm font-bold text-[#111827]">
              {format(cursor, "LLLL yyyy", { locale: pl })}
            </span>
            <button
              type="button"
              aria-label="Następny miesiąc"
              className="flex h-7 w-7 items-center justify-center rounded-lg border border-gray-200 text-sm hover:bg-gray-50"
              onClick={() => setCursor((c) => addMonths(c, 1))}
            >
              ›
            </button>
          </div>

          <div className="grid grid-cols-7 gap-y-1 px-2 pb-2 pt-3">
            {WEEKDAYS.map((w) => (
              <div
                key={w}
                className="pb-1 text-center text-[10px] font-semibold uppercase tracking-[0.04em] text-gray-400"
              >
                {w}
              </div>
            ))}
            {cells.map((d) => {
              const k = dayKey(d);
              const cell = prices[k];
              const inMonth = isSameMonth(d, cursor);
              const isPast = isBefore(d, today) && !isSameDay(d, today);
              const mult = cell?.seasonal_multiplier ?? 1;
              const unavailable =
                Boolean(cell?.is_booked) || cell?.price === null;
              const price = unavailable
                ? null
                : cell?.price != null
                  ? cell.price
                  : basePrice * mult;
              const highSeason = mult >= 1.3 || Boolean(cell?.is_holiday);
              const midSeason = mult > 1 && mult < 1.3;
              const isWeekend = d.getDay() === 0 || d.getDay() === 6;
              const isToday = isSameDay(d, today);
              const inRange =
                rangeStart &&
                rangeEnd &&
                k >= rangeStart &&
                k <= rangeEnd &&
                inMonth;
              const isSel =
                k === rangeStart || k === rangeEnd || (inRange && inMonth);

              let priceColor = "#16a34a";
              if (highSeason) priceColor = "#ef4444";
              else if (midSeason) priceColor = "#f59e0b";

              if (!inMonth) {
                return <div key={k} className="min-h-[52px]" />;
              }

              return (
                <div key={k} className="px-1 py-1 text-center">
                  <button
                    type="button"
                    disabled={Boolean(isPast || unavailable || isLoading)}
                    onClick={() => pickDay(k, !isPast && !unavailable && !isLoading)}
                    className={`relative w-full rounded-md px-1 py-1 transition-colors ${
                      isPast || unavailable
                        ? "cursor-not-allowed"
                        : "cursor-pointer hover:bg-[#f0fdf4]"
                    } ${isWeekend && !isSel ? "bg-[#f9fafb]" : ""} ${
                      unavailable ? "bg-[#f9fafb]" : ""
                    } ${isSel ? "rounded-lg bg-[#0a2e1a] text-white hover:bg-[#0a2e1a]" : ""}`}
                  >
                    {highSeason && !unavailable && (
                      <span
                        className="absolute left-1 right-1 top-0 block h-[3px] rounded-full bg-[#ef4444]"
                        aria-hidden
                      />
                    )}
                    <span
                      className={`block text-[13px] font-medium ${
                        isToday && !isSel ? "rounded-md border-[1.5px] border-brand font-bold text-brand" : ""
                      } ${unavailable ? "text-[#9ca3af] line-through" : ""} ${
                        isPast ? "opacity-35" : ""
                      } ${isSel ? "text-white" : ""}`}
                    >
                      {format(d, "d")}
                    </span>
                    {!unavailable && price != null && (
                      <span
                        className="mt-0.5 block text-[9px] font-bold"
                        style={{ color: isSel ? "#fff" : priceColor }}
                      >
                        {padPrice(price)} zł
                      </span>
                    )}
                  </button>
                </div>
              );
            })}
          </div>

          <div className="flex flex-wrap gap-3.5 border-t border-[#e5e7eb] bg-[#f9fafb] px-4 py-2.5 text-[11px] text-[#6b7280]">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-[#ef4444]" /> Wysoki sezon
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-[#f59e0b]" /> Długi weekend / święto
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-[#16a34a]" /> Niska cena
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-[#9ca3af]" /> Niedostępny
            </span>
          </div>
        </div>

        <div className="space-y-3.5">
          <div className="overflow-hidden rounded-[14px] border-[1.5px] border-[#e5e7eb] bg-white">
            <div className="border-b border-[#bbf7d0] bg-[#f0fdf4] px-[18px] py-3.5">
              <p className="text-[13px] font-bold text-[#0a2e1a]">Wybrany zakres</p>
              {rangeStart && rangeEnd ? (
                <p className="text-[11px] text-[#9ca3af]">
                  {rangeStart} – {rangeEnd} · {nights} {nights === 1 ? "noc" : "nocy"}
                </p>
              ) : (
                <p className="text-[11px] text-[#9ca3af]">Wybierz daty na kalendarzu</p>
              )}
            </div>
            <div className="px-4 py-4 text-[13px]">
              {breakdown ? (
                <>
                  <div className="flex justify-between border-b border-[#e5e7eb] py-2">
                    <span>
                      Nocleg × {nights} {nights === 1 ? "noc" : "nocy"} (szac.)
                    </span>
                    <span>{Math.round(breakdown.subtotal)} zł</span>
                  </div>
                  {breakdown.maxSeason > 1 && (
                    <div className="flex justify-between border-b border-[#e5e7eb] py-2">
                      <span>Mnożnik sezonowy</span>
                      <span className="font-bold text-[#f59e0b]">
                        ×{breakdown.maxSeason.toFixed(2)}
                      </span>
                    </div>
                  )}
                  {breakdown.anyHoliday && (
                    <div className="flex justify-between border-b border-[#e5e7eb] py-2">
                      <span>Święto PL</span>
                      <span className="font-bold text-[#ef4444]">
                        ×{breakdown.holidayMult.toFixed(2)}
                      </span>
                    </div>
                  )}
                  {breakdown.discountPct > 0 && (
                    <div className="flex justify-between border-b border-[#e5e7eb] py-2">
                      <span>Rabat za długi pobyt</span>
                      <span className="font-bold text-brand">
                        −{breakdown.discountPct}%
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between py-2 font-extrabold text-[#0a2e1a]">
                    <span>Łącznie zakwaterowanie</span>
                    <span>{Math.round(breakdown.total)} zł</span>
                  </div>
                </>
              ) : (
                <p className="text-sm text-[#9ca3af]">Wybierz zakres dat.</p>
              )}
            </div>
          </div>

          <div className="rounded-[14px] border border-[#e5e7eb] p-4">
            <p className="mb-3 text-[13px] font-bold text-[#111827]">Reguły cenowe</p>
            {rules.length === 0 ? (
              <p className="text-xs text-[#6b7280]">Brak dodatkowych reguł.</p>
            ) : (
              <ul className="space-y-2.5">
                {rules.map((rule, i) => (
                  <li key={`${rule.name}-${i}`} className="flex items-center gap-2.5 text-[12px]">
                    <span
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{
                        background:
                          rule.type === "seasonal"
                            ? "#ef4444"
                            : rule.type === "holiday"
                              ? "#f59e0b"
                              : "#16a34a",
                      }}
                    />
                    <span className="font-semibold text-[#111827]">{rule.name}</span>
                    <span className="text-[#6b7280]">
                      {rule.multiplier != null ? `${rule.multiplier}×` : ""}
                      {rule.discount_percent != null
                        ? `−${rule.discount_percent}%`
                        : ""}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-xl border border-[#bbf7d0] bg-[#f0fdf4] p-4">
            <p className="mb-2 text-[13px] font-bold text-[#0a2e1a]">💡 Wskazówka cenowa</p>
            <div className="space-y-2 text-[13px] leading-relaxed text-[#6b7280]">
              {tips?.min && (
                <p>
                  Najtańszy dzień w tym miesiącu:{" "}
                  <span className="font-semibold text-[#111827]">{tips.min[0]}</span> od{" "}
                  <span className="font-semibold text-brand">
                    {padPrice(tips.min[1].price)} zł
                  </span>
                  .
                </p>
              )}
              {tips?.max && (
                <p>
                  Najdroższy:{" "}
                  <span className="font-semibold text-[#111827]">{tips.max[0]}</span>{" "}
                  <span className="font-semibold text-[#ef4444]">
                    {padPrice(tips.max[1].price)} zł
                  </span>
                  .
                </p>
              )}
              {tips?.long?.min_nights != null && tips.long.discount_percent != null ? (
                <p>
                  Zostań {tips.long.min_nights}+ nocy i zaoszczędź{" "}
                  {tips.long.discount_percent}%.
                </p>
              ) : null}
              {!tips && <p>Brak wystarczających danych cenowych w tym miesiącu.</p>}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function addDaysSafe(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}
