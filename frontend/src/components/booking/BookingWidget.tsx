"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import type { DateRange } from "react-day-picker";
import { api } from "@/lib/api";
import { parseISODateLocal, toISODateString } from "@/lib/dates";
import { useAuthStore } from "@/lib/store/authStore";
import { useBookingStore } from "@/lib/store/bookingStore";
import { cancellationPolicyText } from "@/lib/utils/booking";
import type { Listing } from "@/types/listing";
import type { PricingBreakdown } from "@/types/booking";

import type { BusyRange } from "./calendarUtils";
import { DatePickerField } from "./DatePickerField";
import { GuestsField } from "./GuestsField";
import { PriceBreakdown } from "./PriceBreakdown";
import { PriceDetailsModal } from "./PriceDetailsModal";

type AvailabilityData = {
  blocked_dates: string[];
  booked_dates?: string[];
  busy_dates?: string[];
  busy_ranges: BusyRange[];
};

function toQuote(d: Record<string, unknown>): PricingBreakdown {
  return {
    nights: Number(d.nights),
    guests: Number(d.guests),
    guests_included: Number(d.guests_included),
    extra_guests: Number(d.extra_guests),
    extra_guest_fee_per_night: parseFloat(String(d.extra_guest_fee_per_night || 0)),
    extra_guests_total: parseFloat(String(d.extra_guests_total || 0)),
    nightly_rate: parseFloat(String(d.nightly_rate)),
    seasonal_multiplier: parseFloat(String(d.seasonal_multiplier ?? 1)),
    holiday_multiplier: parseFloat(String(d.holiday_multiplier ?? 1)),
    long_stay_discount: parseFloat(String(d.long_stay_discount || 0)),
    long_stay_discount_percent: parseFloat(String(d.long_stay_discount_percent || 0)),
    accommodation_subtotal: parseFloat(String(d.accommodation_subtotal)),
    accommodation_after_discount: parseFloat(String(d.accommodation_after_discount ?? d.accommodation_subtotal)),
    cleaning_fee: parseFloat(String(d.cleaning_fee)),
    service_fee: parseFloat(String(d.service_fee)),
    service_fee_percent: parseFloat(String(d.service_fee_percent ?? 15)),
    total: parseFloat(String(d.total)),
    currency: String(d.currency || "PLN"),
  };
}

export function BookingWidget({ listing }: { listing: Listing }) {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  const checkIn = useBookingStore((s) => s.checkIn);
  const checkOut = useBookingStore((s) => s.checkOut);
  const adults = useBookingStore((s) => s.adults);
  const children = useBookingStore((s) => s.children);
  const pets = useBookingStore((s) => s.pets);
  const arrivalTime = useBookingStore((s) => s.arrivalTime);
  const departureTime = useBookingStore((s) => s.departureTime);
  const quote = useBookingStore((s) => s.quote);
  const quoteLoading = useBookingStore((s) => s.quoteLoading);
  const quoteError = useBookingStore((s) => s.quoteError);

  const setDates = useBookingStore((s) => s.setDates);
  const setTimes = useBookingStore((s) => s.setTimes);
  const setGuests = useBookingStore((s) => s.setGuests);
  const setQuote = useBookingStore((s) => s.setQuote);
  const setQuoteLoading = useBookingStore((s) => s.setQuoteLoading);
  const setQuoteError = useBookingStore((s) => s.setQuoteError);
  const setListingForBooking = useBookingStore((s) => s.setListingForBooking);

  const [range, setRange] = useState<DateRange | undefined>(() =>
    checkIn && checkOut
      ? {
          from: parseISODateLocal(checkIn),
          to: parseISODateLocal(checkOut),
        }
      : undefined
  );
  const [availability, setAvailability] = useState<AvailabilityData | null>(null);
  const [debounceTick, setDebounceTick] = useState(0);
  const [priceHint, setPriceHint] = useState<string | null>(null);
  const [priceDetailsOpen, setPriceDetailsOpen] = useState(false);

  const fetchPriceHintForMonth = useCallback(
    async (monthAnchor: Date) => {
      const y = monthAnchor.getFullYear();
      const m = monthAnchor.getMonth();
      const from = new Date(y, m, 1);
      const to = new Date(y, m + 1, 0);
      const fromStr = toISODateString(from);
      const toStr = toISODateString(to);
      try {
        const res = await api.get<{
          data: { days: { nightly_rate: string }[]; currency: string };
        }>(
          `/api/v1/listings/${listing.slug}/price-calendar/?from=${fromStr}&to=${toStr}`
        );
        const days = res.data?.days ?? [];
        if (!days.length) {
          setPriceHint(null);
          return;
        }
        const rates = days.map((d) => parseFloat(d.nightly_rate));
        const min = Math.min(...rates);
        const max = Math.max(...rates);
        const cur = res.data.currency || "PLN";
        if (min === max) {
          setPriceHint(`${min} ${cur} / noc (wszystkie dni w miesiącu)`);
        } else {
          setPriceHint(`od ${min} do ${max} ${cur} / noc (orientacyjnie, bez rabatu długiego pobytu)`);
        }
      } catch {
        setPriceHint(null);
      }
    },
    [listing.slug]
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await api.get<{ data: AvailabilityData }>(
          `/api/v1/listings/${listing.slug}/availability/`
        );
        if (!cancelled) setAvailability(res.data);
      } catch {
        if (!cancelled)
          setAvailability({
            blocked_dates: [],
            busy_ranges: [],
          });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [listing.slug]);

  useEffect(() => {
    if (range?.from && range.to) {
      setDates(toISODateString(range.from), toISODateString(range.to));
    }
  }, [range, setDates]);

  const fetchQuote = useCallback(async () => {
    if (!range?.from || !range.to) {
      setQuote(null);
      setQuoteError(null);
      return;
    }
    const ci = toISODateString(range.from);
    const co = toISODateString(range.to);
    if (ci >= co) {
      setQuote(null);
      return;
    }
    const guests = Math.min(adults + children, listing.max_guests);
    setQuoteLoading(true);
    setQuoteError(null);
    try {
      const res = await api.post<{ data: Record<string, unknown> }>("/api/v1/bookings/quote/", {
        listing_id: listing.id,
        check_in: ci,
        check_out: co,
        arrival_time: arrivalTime,
        departure_time: departureTime,
        guests,
        adults,
      });
      setQuote(toQuote(res.data));
    } catch (e) {
      setQuote(null);
      setQuoteError(e instanceof Error ? e.message : "Nie udało się pobrać wyceny.");
    } finally {
      setQuoteLoading(false);
    }
  }, [listing.id, range, adults, children, arrivalTime, departureTime, listing.max_guests, setQuote, setQuoteError, setQuoteLoading]);

  useEffect(() => {
    const t = window.setTimeout(() => setDebounceTick((x) => x + 1), 400);
    return () => window.clearTimeout(t);
  }, [range, adults, children, arrivalTime, departureTime]);

  useEffect(() => {
    void fetchQuote();
  }, [debounceTick, fetchQuote]);

  const booked =
    availability?.booked_dates ??
    availability?.busy_dates ??
    availability?.blocked_dates ??
    [];
  const busy = availability?.busy_ranges ?? [];

  const ciStr = range?.from ? toISODateString(range.from) : checkIn;
  const policyText =
    ciStr && listing.cancellation_policy
      ? cancellationPolicyText(listing.cancellation_policy, ciStr)
      : "";

  function goLogin() {
    const next = encodeURIComponent(`/listing/${listing.slug}`);
    window.location.href = `/login?next=${next}`;
  }

  function goSummary() {
    setListingForBooking(listing);
    router.push("/booking/summary");
  }

  return (
    <div className="group/widget sticky top-28 rounded-[2.5rem] bg-white/75 p-2.5 shadow-[0_45px_100px_-25px_rgba(0,0,0,0.12)] backdrop-blur-3xl transition-all duration-700 hover:shadow-[0_65px_130px_-30px_rgba(0,0,0,0.22)] hover:-translate-y-1.5">
      {/* Dekoracyjny blask w tle */}
      <div className="absolute -top-32 -right-32 -z-10 h-72 w-72 rounded-full bg-brand/10 blur-[100px] transition-opacity duration-1000 group-hover/widget:opacity-100 opacity-60 animate-pulse" />
      <div className="absolute -bottom-32 -left-32 -z-10 h-72 w-72 rounded-full bg-blue-500/5 blur-[100px] transition-opacity duration-1000 group-hover/widget:opacity-100 opacity-60" />

      <div className="relative overflow-hidden rounded-[2.25rem] bg-white p-7 pb-5 shadow-[0_20px_45px_-12px_rgba(0,0,0,0.04)] ring-1 ring-black/[0.04] transition-shadow duration-700 group-hover/widget:shadow-2xl">
        <div className="flex items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-black tracking-tighter text-brand-dark drop-shadow-sm">
                {listing.base_price}
              </span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-lg font-black text-brand/30 leading-none">zł</span>
                <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 leading-none">/ noc</span>
              </div>
            </div>

            {listing.average_rating != null && (
              <div className="flex items-center gap-2">
                <div className="h-5 w-[1.5px] bg-gray-100 rounded-full" />
                <div className="flex items-center gap-2 text-[13px] font-bold text-gray-500">
                  <div className="flex items-center gap-1.5 rounded-full bg-amber-50/90 px-3 py-1 ring-1 ring-inset ring-amber-200/50 shadow-sm backdrop-blur-sm transition-transform hover:scale-105">
                    <span className="text-amber-500 text-sm">★</span>
                    <span className="font-black text-amber-700">{Number(listing.average_rating).toFixed(1)}</span>
                  </div>
                  <button type="button" className="group/link flex items-center gap-1.5 transition-colors hover:text-brand-dark">
                    <span className="underline decoration-gray-200 underline-offset-4 transition-colors group-hover/link:decoration-brand/40">
                      {listing.review_count} opinii
                    </span>
                  </button>
                </div>
              </div>
            )}
          </div>
          {quote && quote.seasonal_multiplier > 1.001 && (
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, rotate: 5 }}
              animate={{ scale: 1, opacity: 1, rotate: 0 }}
              className="relative rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 p-[1px] shadow-lg shadow-amber-200/50"
            >
              <div className="rounded-[15px] bg-white px-3 py-1.5 text-center">
                <p className="text-[9px] font-black uppercase tracking-[0.15em] text-amber-600/60 leading-tight">Okres</p>
                <p className="bg-gradient-to-br from-amber-500 to-orange-600 bg-clip-text text-[11px] font-black uppercase tracking-wider text-transparent leading-tight">premium</p>
              </div>
            </motion.div>
          )}
        </div>
      </div>

      <div className="space-y-4 px-6 py-7">
        <div className="group/fields relative overflow-hidden rounded-[2.25rem] bg-gray-50/50 p-2 ring-1 ring-black/[0.04] transition-all duration-700 focus-within:ring-2 focus-within:ring-brand/30 hover:bg-gray-50/80 hover:shadow-[inset_0_4px_12px_rgba(0,0,0,0.02)]">
          <DatePickerField
            range={range}
            onRangeChange={setRange}
            arrivalTime={arrivalTime}
            onArrivalTimeChange={(t) => setTimes(t, departureTime)}
            departureTime={departureTime}
            onDepartureTimeChange={(t) => setTimes(arrivalTime, t)}
            bookedDates={booked}
            busyRanges={busy}
            priceHint={priceHint}
            onCalendarOpen={() => {
              void fetchPriceHintForMonth(new Date());
            }}
            onVisibleMonthChange={(d) => {
              void fetchPriceHintForMonth(d);
            }}
          />

          <div className="mt-2">
            <GuestsField
              adults={adults}
              kids={children}
              pets={pets}
              maxGuests={listing.max_guests}
              onChange={(a, c, p) => setGuests(a, c, p)}
            />
          </div>
        </div>

        <AnimatePresence mode="wait">
          {quoteLoading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="py-4"
            >
              <div className="h-28 w-full animate-pulse rounded-[2.5rem] bg-gray-50 ring-1 ring-inset ring-black/[0.02]" />
            </motion.div>
          ) : quoteError ? (
            <motion.div
              key="error"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-3xl bg-red-50/40 p-4 text-center ring-1 ring-inset ring-red-100/50 backdrop-blur-md"
            >
              <p className="text-xs font-bold tracking-tight text-red-500">{quoteError}</p>
            </motion.div>
          ) : (
            <motion.div
              key="quote"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="mt-3"
            >
              <div className="group/total relative overflow-hidden rounded-[2.25rem] bg-gradient-to-br from-brand/[0.03] to-brand/[0.08] p-6 ring-1 ring-inset ring-brand/10 transition-all duration-700 hover:from-brand/[0.05] hover:to-brand/[0.12] hover:shadow-2xl hover:shadow-brand/10">
                {/* Brand Glow effect inside quote box */}
                <div className="absolute -right-12 -top-12 h-32 w-32 rounded-full bg-brand/15 blur-3xl transition-transform duration-1000 group-hover/total:scale-150" />
                
                <div className="relative flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-[10px] font-black uppercase tracking-[0.22em] text-brand/60">Suma całkowita</p>
                      <div className="h-1 w-1 rounded-full bg-brand/30" />
                    </div>
                    <div className="mt-1 flex items-baseline gap-2">
                      <span className="text-3xl font-black tracking-tighter text-brand-dark drop-shadow-md">{quote?.total}</span>
                      <span className="text-sm font-black text-brand opacity-40">{quote?.currency}</span>
                    </div>
                  </div>
                  <button 
                    type="button" 
                    onClick={() => setPriceDetailsOpen(true)}
                    className="group/details-btn relative overflow-hidden rounded-xl bg-white px-5 py-3.5 text-[10px] font-black uppercase tracking-[0.18em] text-brand shadow-lg shadow-brand/10 ring-1 ring-inset ring-brand/10 transition-all hover:-translate-y-0.5 hover:bg-brand hover:text-white hover:shadow-xl hover:shadow-brand/30 active:scale-95 active:translate-y-0"
                  >
                    <span className="relative z-10">Szczegóły</span>
                    <div className="absolute inset-0 bg-gradient-to-tr from-brand-dark to-brand opacity-0 transition-opacity duration-300 group-hover/details-btn:opacity-100" />
                  </button>
                </div>
              </div>
              <PriceDetailsModal 
                open={priceDetailsOpen} 
                onOpenChange={setPriceDetailsOpen} 
                quote={quote} 
              />
            </motion.div>
          )}
        </AnimatePresence>

        {policyText && (
          <div className="group/policy relative overflow-hidden flex gap-3.5 rounded-2xl border border-gray-100 bg-white/50 p-4 shadow-sm transition-all hover:bg-white hover:shadow-xl hover:shadow-black/[0.02]">
            <div className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gray-50 text-lg transition-all group-hover/policy:bg-brand/10 group-hover/policy:scale-110">
              📋
            </div>
            <div className="relative z-10 text-[13px] leading-relaxed">
              <p className="font-bold text-gray-700">{policyText}</p>
              <button type="button" className="mt-1.5 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-brand hover:text-brand-dark transition-colors">
                Szczegóły anulowania
                <svg className="h-3 w-3 transition-transform group-hover/policy:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </button>
            </div>
          </div>
        )}

        <div className="pt-2">
          <BookActionButton
            hasDates={Boolean(range?.from && range.to)}
            quoteLoading={quoteLoading}
            quoteOk={Boolean(quote && !quoteError)}
            loggedIn={Boolean(user)}
            bookingMode={listing.booking_mode}
            onLogin={goLogin}
            onContinue={goSummary}
          />
        </div>

        <div className="mt-6 grid grid-cols-3 gap-4 border-t border-gray-100/60 pt-7">
          <div className="group flex flex-col items-center gap-2.5">
            <div className="relative flex h-11 w-11 items-center justify-center rounded-[1.25rem] bg-gray-50/60 text-gray-400 transition-all duration-500 group-hover:bg-brand-surface group-hover:text-brand group-hover:scale-110 group-hover:rotate-6 group-hover:shadow-2xl group-hover:shadow-brand/10 ring-1 ring-black/[0.03]">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <span className="text-[9px] font-black uppercase tracking-[0.18em] text-gray-400 transition-colors duration-500 group-hover:text-brand-dark">Bezpiecznie</span>
          </div>
          <div className="group flex flex-col items-center gap-2.5">
            <div className="relative flex h-11 w-11 items-center justify-center rounded-[1.25rem] bg-gray-50/60 text-gray-400 transition-all duration-500 group-hover:bg-brand-surface group-hover:text-brand group-hover:scale-110 group-hover:-rotate-6 group-hover:shadow-2xl group-hover:shadow-brand/10 ring-1 ring-black/[0.03]">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </div>
            <span className="text-[9px] font-black uppercase tracking-[0.18em] text-gray-400 transition-colors duration-500 group-hover:text-brand-dark">Zwrot</span>
          </div>
          <div className="group flex flex-col items-center gap-2.5">
            <div className="relative flex h-11 w-11 items-center justify-center rounded-[1.25rem] bg-gray-50/60 text-gray-400 transition-all duration-500 group-hover:bg-brand-surface group-hover:text-brand group-hover:scale-110 group-hover:rotate-12 group-hover:shadow-2xl group-hover:shadow-brand/10 ring-1 ring-black/[0.03]">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
            <span className="text-[9px] font-black uppercase tracking-[0.18em] text-gray-400 transition-colors duration-500 group-hover:text-brand-dark">Wsparcie</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function BookActionButton({
  hasDates,
  quoteLoading,
  quoteOk,
  loggedIn,
  bookingMode,
  onLogin,
  onContinue,
}: {
  hasDates: boolean;
  quoteLoading: boolean;
  quoteOk: boolean;
  loggedIn: boolean;
  bookingMode: string;
  onLogin: () => void;
  onContinue: () => void;
}) {
  const commonClasses = "relative w-full py-6 text-[17px] font-black uppercase tracking-[0.2em] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.22)] transition-all duration-700 active:scale-[0.97] rounded-[2.25rem] overflow-hidden group border-none";

  if (!hasDates) {
    return (
      <button type="button" disabled className={`${commonClasses} bg-gray-100 text-gray-400 cursor-not-allowed shadow-none`}>
        <span className="relative z-10">Wybierz daty pobytu</span>
      </button>
    );
  }
  if (quoteLoading) {
    return (
      <button type="button" disabled className={`${commonClasses} bg-brand/10 text-brand shadow-none`}>
        <span className="relative z-10 flex items-center justify-center gap-3">
          <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Przeliczanie…
        </span>
      </button>
    );
  }
  if (!loggedIn) {
    return (
      <button 
        type="button" 
        onClick={onLogin} 
        className={`${commonClasses} bg-brand text-white hover:bg-brand-dark hover:shadow-2xl hover:shadow-brand/40`}
      >
        <span className="relative z-20 flex items-center justify-center gap-4">
          Zaloguj się
          <svg className="h-6 w-6 transition-transform duration-500 group-hover:-translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
          </svg>
        </span>
        <div className="absolute inset-0 z-10 bg-gradient-to-tr from-black/20 via-transparent to-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out" />
      </button>
    );
  }
  if (!quoteOk) {
    return (
      <button type="button" disabled className={`${commonClasses} bg-red-50 text-red-400 cursor-not-allowed border border-red-100 shadow-none`}>
        <span className="relative z-10">Błędne dane</span>
      </button>
    );
  }
  if (bookingMode === "request") {
    return (
      <button 
        type="button" 
        onClick={onContinue} 
        className={`${commonClasses} bg-white text-brand ring-4 ring-brand/10 hover:ring-brand/20 hover:bg-brand/5 shadow-brand/10`}
      >
        <span className="relative z-20 flex items-center justify-center gap-4">
          Zarezerwuj
          <svg className="h-7 w-7 transition-transform duration-500 group-hover:rotate-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        </span>
        <div className="absolute inset-0 bg-brand/[0.03] opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      </button>
    );
  }
  return (
    <button 
      type="button" 
      onClick={onContinue} 
      className={`${commonClasses} bg-brand text-white hover:bg-brand-dark hover:shadow-[0_45px_90px_-20px_rgba(22,163,74,0.45)] hover:-translate-y-1`}
    >
      <span className="relative z-20 flex items-center justify-center gap-3.5 text-[18px]">
        Rezerwuj teraz
        <svg className="h-7 w-7 transition-transform duration-700 group-hover:translate-x-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 7l5 5m0 0l-5 5m5-5H6" />
        </svg>
      </span>
      <div className="absolute inset-0 z-10 bg-gradient-to-tr from-black/20 via-transparent to-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-[1400ms] ease-in-out" />
    </button>
  );
}
