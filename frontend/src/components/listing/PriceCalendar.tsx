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
import { motion, AnimatePresence } from "framer-motion";

import { useJsonGet } from "@/lib/hooks/useJsonGet";
import type { PriceCalendarDay, PricingRule } from "@/types/listing";
import { cn } from "@/lib/utils";

type CalendarDayRow = {
  date: string;
  nightly_rate: string;
  base_price: string;
  seasonal_multiplier: string;
  holiday_multiplier: string;
  is_public_holiday?: boolean;
  /** Święto GUS lub dzień szczytu (Sylwester, Walentynki, majówka, …) */
  is_pricing_peak?: boolean;
  holiday_name?: string | null;
};

type CalendarApi = {
  data?: {
    days?: CalendarDayRow[];
    currency?: string;
    prices?: Record<string, PriceCalendarDay>;
    rules?: PricingRule[];
  };
};

type Props = {
  /** Slug listingu — backend: /api/v1/listings/{slug}/price-calendar/ */
  listingSlug: string;
  basePrice: number;
  pricingRules: PricingRule[];
  /** Z API oferty — czy stosować dodatkowe dni szczytu PL (mosty, Wigilia itd.). */
  applyTravelPeakExtras?: boolean;
};

const WEEKDAYS = ["Pn", "Wt", "Śr", "Cz", "Pt", "So", "Nd"];


export function PriceCalendar({
  listingSlug,
  basePrice,
  pricingRules,
  applyTravelPeakExtras = true,
}: Props) {
  const [cursor, setCursor] = useState(() => startOfMonth(new Date()));
  const [rangeStart, setRangeStart] = useState<string | null>(null);
  const [rangeEnd, setRangeEnd] = useState<string | null>(null);
  const [direction, setDirection] = useState(0);

  const monthStart = startOfMonth(cursor);
  const monthEnd = endOfMonth(cursor);
  const offset = (monthStart.getDay() + 6) % 7;
  const firstCell = new Date(monthStart);
  firstCell.setDate(firstCell.getDate() - offset);
  const lastCell = new Date(monthEnd);
  const trailing = 6 - ((lastCell.getDay() + 6) % 7);
  lastCell.setDate(lastCell.getDate() + trailing);

  const calendarUrl = useMemo(() => {
    if (!listingSlug) return null;
    const from = format(firstCell, "yyyy-MM-dd");
    const to = format(lastCell, "yyyy-MM-dd");
    return `/api/v1/listings/${listingSlug}/price-calendar/?from=${from}&to=${to}`;
  }, [listingSlug, cursor]);

  const { data, isLoading } = useJsonGet<CalendarApi>(calendarUrl);

  const prices = useMemo(() => {
    const preset = data?.data?.prices;
    if (preset && Object.keys(preset).length) return preset;
    const days = data?.data?.days;
    if (!days?.length) return {};
    const out: Record<string, PriceCalendarDay> = {};
    for (const row of days) {
      const rate = parseFloat(row.nightly_rate);
      const seasonal = parseFloat(row.seasonal_multiplier);
      const hol = parseFloat(row.holiday_multiplier);
      const sm = Number.isFinite(seasonal) ? seasonal : 1;
      const hm = Number.isFinite(hol) ? hol : 1;
      const effective = sm * hm;
      const peak =
        Boolean(row.is_pricing_peak) ||
        Boolean(row.is_public_holiday) ||
        hm > 1;
      out[row.date] = {
        date: row.date,
        price: Number.isFinite(rate) ? rate : null,
        seasonal_multiplier: sm,
        holiday_multiplier: hm,
        effective_multiplier: effective,
        is_holiday: peak,
        holiday_name: row.holiday_name ?? null,
        is_booked: false,
      };
    }
    return out;
  }, [data]);
  const rules = useMemo(() => {
    const r = data?.data?.rules;
    return r?.length ? r : pricingRules;
  }, [data, pricingRules]);

  const today = startOfDay(new Date());

  const cells = eachDayOfInterval({ start: firstCell, end: lastCell });

  const dayKey = (d: Date) => format(d, "yyyy-MM-dd");

  const changeMonth = (delta: number) => {
    setDirection(delta);
    setCursor((c) => addMonths(c, delta));
  };

  const pickDay = (iso: string, available: boolean) => {
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
      } else if (iso > rangeStart) {
        setRangeEnd(iso);
      } else {
        // iso === rangeStart: reset
        setRangeStart(null);
      }
    }
  };

  const nights = useMemo(() => {
    if (!rangeStart || !rangeEnd) return 0;
    return differenceInCalendarDays(parseISO(rangeEnd), parseISO(rangeStart));
  }, [rangeStart, rangeEnd]);

  const breakdown = useMemo(() => {
    if (!rangeStart || !rangeEnd || nights < 1) return null;
    const start = parseISO(rangeStart);
    const end = parseISO(rangeEnd);
    const stayDays = eachDayOfInterval({
      start,
      end: new Date(end.getTime() - 86400000),
    });
    let subtotal = 0;
    let maxSeason = 1;
    let holidayMult = 1;
    let anyHoliday = false;

    for (const d of stayDays) {
      const k = format(d, "yyyy-MM-dd");
      const cell = prices[k];
      const sm = cell?.seasonal_multiplier ?? 1;
      const hm = cell?.holiday_multiplier ?? 1;
      const eff = cell?.effective_multiplier ?? sm * hm;
      const p = cell?.price ?? basePrice * eff;
      subtotal += p;
      maxSeason = Math.max(maxSeason, eff);
      if (cell?.is_holiday) {
        anyHoliday = true;
        holidayMult = Math.max(holidayMult, eff);
      }
    }

    const longStay = rules.find((r) => r.type === "long_stay");
    const discountPct =
      longStay?.min_nights && nights >= longStay.min_nights
        ? longStay.discount_percent ?? 0
        : 0;

    return {
      subtotal,
      maxSeason,
      holidayMult: anyHoliday ? holidayMult : 1,
      anyHoliday,
      discountPct,
      total: subtotal * (1 - discountPct / 100),
    };
  }, [rangeStart, rangeEnd, nights, prices, basePrice, rules]);

  const tips = useMemo(() => {
    const inMonth = Object.entries(prices).filter(([k, v]) => {
      const d = parseISO(k);
      return isSameMonth(d, cursor) && v.price != null && !v.is_booked;
    });
    if (!inMonth.length) return null;
    const sorted = [...inMonth].sort((a, b) => (a[1].price ?? 0) - (b[1].price ?? 0));
    return {
      min: sorted[0],
      max: sorted[sorted.length - 1],
      long: rules.find((r) => r.type === "long_stay"),
    };
  }, [prices, cursor, rules]);

  return (
    <section className="mb-12 rounded-[2.5rem] bg-white p-8 shadow-sm ring-1 ring-black/[0.03] sm:p-10">
      <div className="mb-8">
        <h2 className="text-3xl font-black tracking-tight text-brand-dark">Kalendarz cen</h2>
        <p className="mt-2 text-[16px] text-gray-500">
          Cena za noc = baza × <strong className="text-gray-700">sezon</strong> ×{" "}
          <strong className="text-gray-700">święta / długie weekendy</strong>. Kolory pokazują łączny mnożnik
          (nie tylko sezon).
        </p>
        <p className="mt-2 text-[14px] leading-relaxed text-gray-600 rounded-2xl bg-gray-50 border border-black/[0.04] px-4 py-3">
          {applyTravelPeakExtras ? (
            <>
              Używamy domyślnego <strong>sezonu</strong> (np. lato, okolice świąt) oraz kalendarza{" "}
              <strong>świąt ustawowych i typowych dni podróży</strong> (m.in. majówka, Wielki Piątek, Wigilia,
              Sylwester). Gospodarz może dodać własne reguły w panelu.
            </>
          ) : (
            <>
              Ta oferta ma wyłączone dodatkowe dni szczytu — stosowane są{" "}
              <strong>święta ustawowe</strong> oraz własne reguły cenowe gospodarza.
            </>
          )}
        </p>
      </div>

      <div className="flex flex-col gap-10">
        <div className="relative overflow-hidden rounded-[2.5rem] border border-black/[0.06] bg-gray-50/20 p-2 shadow-inner">
          <div className="flex items-center justify-between px-8 py-6 bg-white rounded-[2rem] shadow-sm mb-2 border border-black/[0.03]">
            <button
              type="button"
              className="group flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-50 transition-all hover:bg-brand-dark hover:text-white hover:scale-105 active:scale-95 shadow-sm"
              onClick={() => changeMonth(-1)}
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div className="text-xl font-black tracking-tight text-brand-dark uppercase">
              {format(cursor, "LLLL yyyy", { locale: pl })}
            </div>
            <button
              type="button"
              className="group flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-50 transition-all hover:bg-brand-dark hover:text-white hover:scale-105 active:scale-95 shadow-sm"
              onClick={() => changeMonth(1)}
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          <div className="relative min-h-[400px]">
            <AnimatePresence mode="wait" custom={direction}>
              <motion.div
                key={cursor.toString()}
                custom={direction}
                initial={{ opacity: 0, x: direction * 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: direction * -20 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="grid grid-cols-7 gap-2 p-4"
              >
                {WEEKDAYS.map((w) => (
                  <div key={w} className="pb-5 text-center text-[12px] font-black uppercase tracking-widest text-gray-400">
                    {w}
                  </div>
                ))}
                {cells.map((d) => {
                  const k = dayKey(d);
                  const cell = prices[k];
                  const inMonth = isSameMonth(d, cursor);
                  const isPast = isBefore(d, today) && !isSameDay(d, today);
                  /** Jak w backendzie: sezon × święta (wcześniej UI patrzyło tylko na sezon). */
                  const mult =
                    cell?.effective_multiplier ??
                    (cell?.seasonal_multiplier ?? 1) * (cell?.holiday_multiplier ?? 1);
                  const unavailable = Boolean(cell?.is_booked) || cell?.price === null;
                  const price = unavailable ? null : cell?.price ?? basePrice * mult;
                  const highSeason =
                    mult >= 1.28 || (Boolean(cell?.is_holiday) && mult > 1.02);
                  const midSeason = mult > 1.02 && mult < 1.28 && !highSeason;
                  const isToday = isSameDay(d, today);
                  const isSel = k === rangeStart || k === rangeEnd || (rangeStart && rangeEnd && k > rangeStart && k < rangeEnd && inMonth);
                  const isEdge = k === rangeStart || k === rangeEnd;

                  if (!inMonth) return <div key={k} className="h-20" />;

                  return (
                    <div key={k} className="p-0.5">
                      <button
                        type="button"
                        title={
                          [
                            cell?.holiday_name,
                            mult > 1.01
                              ? `Sezon ×${(cell?.seasonal_multiplier ?? 1).toFixed(2)} · święta/długi weekend ×${(cell?.holiday_multiplier ?? 1).toFixed(2)} · łącznie ×${mult.toFixed(2)}`
                              : null,
                          ]
                            .filter(Boolean)
                            .join(" — ") || undefined
                        }
                        disabled={!!(isPast || unavailable || isLoading)}
                        onClick={() => pickDay(k, !isPast && !unavailable && !isLoading)}
                        className={cn(
                          "relative flex h-20 w-full flex-col items-center justify-center rounded-2xl transition-all group/day",
                          isPast || unavailable ? "cursor-not-allowed" : "hover:bg-brand/5 hover:scale-[1.02]",
                          isSel ? "bg-brand-dark text-white hover:bg-brand-dark shadow-lg scale-[1.02]" : "bg-white",
                          isToday && !isSel && "ring-2 ring-brand ring-inset",
                          unavailable && "bg-gray-100/50 opacity-60"
                        )}
                      >
                        <span className={cn("text-[16px] font-black transition-colors", isSel ? "text-white" : "text-brand-dark group-hover/day:text-brand")}>
                          {format(d, "d")}
                        </span>
                        {!unavailable && price != null && (
                          <span className={cn("text-[11px] font-bold mt-1", 
                            isSel ? "text-white/80" : 
                            highSeason ? "text-red-500" : 
                            midSeason ? "text-amber-500" : "text-brand")}>
                            {Math.round(price)} zł
                          </span>
                        )}
                        {highSeason && !unavailable && !isSel && (
                          <div className="absolute top-2 right-2 h-2 w-2 rounded-full bg-red-500 shadow-sm border-2 border-white" />
                        )}
                        {isEdge && isSel && (
                           <div className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-brand-light flex items-center justify-center shadow-md">
                              <div className="h-1.5 w-1.5 rounded-full bg-brand-dark" />
                           </div>
                        )}
                      </button>
                    </div>
                  );
                })}
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="mt-2 flex flex-wrap gap-6 px-8 py-5 bg-white/50 border-t border-black/[0.03] text-[13px] font-bold text-gray-500">
            <span className="flex items-center gap-2.5">
              <span className="h-3 w-3 rounded-full bg-red-500 shadow-sm" /> Szczyt (łączny mnożnik wysoki lub święto)
            </span>
            <span className="flex items-center gap-2.5">
              <span className="h-3 w-3 rounded-full bg-amber-500 shadow-sm" /> Podwyższony sezon / mniejszy szczyt
            </span>
            <span className="flex items-center gap-2.5">
              <span className="h-3 w-3 rounded-full bg-brand shadow-sm" /> Bez dodatkowego mnożnika
            </span>
            <span className="flex items-center gap-2.5">
              <span className="h-3 w-3 rounded-full bg-gray-300 shadow-sm" /> Termin zajęty
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:gap-8">
          {/* Selected Range Card */}
          <div className="rounded-[2.5rem] bg-white border border-black/[0.06] p-8 shadow-sm ring-1 ring-black/[0.02] flex flex-col">
            <div className="mb-6 flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand/10 text-brand shadow-inner">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-black uppercase tracking-wider text-brand-dark">Wybrany zakres</h3>
                {rangeStart && rangeEnd ? (
                  <p className="text-[13px] font-bold text-gray-400">{rangeStart} — {rangeEnd}</p>
                ) : (
                  <p className="text-[13px] font-bold text-gray-400">Wybierz daty</p>
                )}
              </div>
            </div>

            <div className="space-y-4 flex-grow">
              {breakdown ? (
                <>
                  <div className="flex justify-between text-[15px]">
                    <span className="text-gray-500 font-medium">{nights} {nights === 1 ? "noc" : "nocy"}</span>
                    <span className="font-bold text-brand-dark">{Math.round(breakdown.subtotal)} zł</span>
                  </div>
                  {breakdown.maxSeason > 1 && (
                    <div className="flex justify-between text-[15px]">
                      <span className="text-gray-500 font-medium">Najwyższy mnożnik (sezon × święta)</span>
                      <span className="font-bold text-amber-500">×{breakdown.maxSeason.toFixed(2)}</span>
                    </div>
                  )}
                  {breakdown.discountPct > 0 && (
                    <div className="flex justify-between text-[15px]">
                      <span className="text-gray-500 font-medium">Rabat {breakdown.discountPct}%</span>
                      <span className="font-bold text-brand">−{Math.round(breakdown.subtotal * breakdown.discountPct / 100)} zł</span>
                    </div>
                  )}
                  <div className="pt-5 mt-5 border-t border-black/[0.06] flex justify-between items-end">
                    <span className="text-[14px] font-black uppercase tracking-wider text-brand-dark">Suma</span>
                    <span className="text-3xl font-black text-brand-dark leading-none">{Math.round(breakdown.total)} zł</span>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center py-4 text-center">
                  <p className="text-[14px] text-gray-400 font-medium italic">Kliknij dwa dni na kalendarzu, aby zobaczyć wycenę pobytu.</p>
                </div>
              )}
            </div>
          </div>

          {/* Price Tip */}
          <div className="rounded-[2.5rem] bg-brand-dark p-8 text-white shadow-xl relative overflow-hidden group flex flex-col">
            <div className="absolute -right-6 -top-6 h-32 w-32 rounded-full bg-white/5 blur-3xl group-hover:bg-white/10 transition-all duration-700" />
            <div className="absolute -left-10 -bottom-10 h-32 w-32 rounded-full bg-brand-light/5 blur-3xl" />
            
            <h3 className="mb-6 text-sm font-black uppercase tracking-wider text-white/60">Wskazówka cenowa</h3>
            <div className="relative z-10 space-y-4 flex-grow">
              {tips?.min && (
                <div className="flex justify-between items-center bg-white/5 p-3 rounded-2xl border border-white/10">
                  <span className="text-white/70 font-medium">Najtaniej</span>
                  <span className="font-black text-brand-light text-lg">{Math.round(tips.min[1].price ?? 0)} zł</span>
                </div>
              )}
              {tips?.max && (
                <div className="flex justify-between items-center bg-white/5 p-3 rounded-2xl border border-white/10">
                  <span className="text-white/70 font-medium">Najdrożej</span>
                  <span className="font-black text-red-300 text-lg">{Math.round(tips.max[1].price ?? 0)} zł</span>
                </div>
              )}
              {tips?.long && (
                <div className="mt-4 p-4 bg-brand-light/10 rounded-2xl border border-brand-light/20 text-[13px] font-bold leading-relaxed text-brand-light">
                  <div className="flex items-center gap-2 mb-1">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    <span>SUPER OFERTA</span>
                  </div>
                  Zostań {tips.long.min_nights}+ nocy i zaoszczędź {tips.long.discount_percent}% na całym pobycie!
                </div>
              )}
              {!tips && <p className="text-white/60 text-sm font-medium italic">Brak danych w tym miesiącu.</p>}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
