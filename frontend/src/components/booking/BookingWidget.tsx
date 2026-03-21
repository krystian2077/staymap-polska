"use client";

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

type AvailabilityData = {
  blocked_dates: string[];
  booked_dates?: string[];
  busy_dates?: string[];
  busy_ranges: BusyRange[];
};

function toQuote(d: Record<string, unknown>): PricingBreakdown {
  return {
    nights: Number(d.nights),
    nightly_rate: parseFloat(String(d.nightly_rate)),
    seasonal_multiplier: parseFloat(String(d.seasonal_multiplier ?? 1)),
    holiday_multiplier: parseFloat(String(d.holiday_multiplier ?? 1)),
    long_stay_discount: parseFloat(String(d.long_stay_discount || 0)),
    long_stay_discount_percent: parseFloat(String(d.long_stay_discount_percent || 0)),
    accommodation_subtotal: parseFloat(String(d.accommodation_subtotal)),
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
  const quote = useBookingStore((s) => s.quote);
  const quoteLoading = useBookingStore((s) => s.quoteLoading);
  const quoteError = useBookingStore((s) => s.quoteError);

  const setDates = useBookingStore((s) => s.setDates);
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
  }, [listing.id, range, adults, children, listing.max_guests, setQuote, setQuoteError, setQuoteLoading]);

  useEffect(() => {
    const t = window.setTimeout(() => setDebounceTick((x) => x + 1), 400);
    return () => window.clearTimeout(t);
  }, [range, adults, children]);

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
    <div className="sticky top-24 max-h-[calc(100vh-120px)] overflow-y-auto rounded-[20px] border-[1.5px] border-gray-200 bg-white shadow-[0_8px_32px_rgba(0,0,0,.1)]">
      <div className="border-b border-gray-200 px-6 pb-4 pt-[22px]">
        <div className="flex flex-wrap items-end gap-2">
          <p className="text-[26px] font-extrabold text-brand-dark">
            {listing.base_price}{" "}
            <span className="text-sm font-semibold text-gray-500">zł</span>
          </p>
          <span className="pb-1 text-sm text-gray-500">/ noc</span>
          {quote && quote.seasonal_multiplier > 1.001 && (
            <span className="mb-1 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-900">
              Sezon ×{quote.seasonal_multiplier.toFixed(2)}
            </span>
          )}
        </div>
        {listing.average_rating != null && (
          <p className="mt-1 text-[13px] text-gray-600">
            ★ {listing.average_rating.toFixed(1)} · {listing.review_count} opinii
          </p>
        )}
      </div>

      <div className="space-y-3 px-5 py-[18px]">
        <DatePickerField
          range={range}
          onRangeChange={setRange}
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

        <GuestsField
          adults={adults}
          kids={children}
          pets={pets}
          maxGuests={listing.max_guests}
          onChange={(a, c, p) => setGuests(a, c, p)}
        />

        <PriceBreakdown quote={quote} loading={quoteLoading} />
        {quoteError && (
          <p className="text-center text-xs text-red-600">{quoteError}</p>
        )}

        {policyText && (
          <div className="flex gap-2.5 rounded-[10px] border border-brand-border bg-brand-surface px-3.5 py-3">
            <span className="text-base" aria-hidden>
              📋
            </span>
            <div className="text-[13px] leading-relaxed text-gray-600">
              <p>{policyText}</p>
              <button type="button" className="mt-1 text-xs font-semibold text-brand">
                Więcej o zasadach →
              </button>
            </div>
          </div>
        )}

        <BookActionButton
          hasDates={Boolean(range?.from && range.to)}
          quoteLoading={quoteLoading}
          quoteOk={Boolean(quote && !quoteError)}
          loggedIn={Boolean(user)}
          bookingMode={listing.booking_mode}
          onLogin={goLogin}
          onContinue={goSummary}
        />

        <div className="flex justify-center gap-5 border-t border-gray-100 pt-3.5 text-center text-xs text-gray-400">
          <span>
            🔒
            <br />
            Bezpieczna płatność
          </span>
          <span>
            🔄
            <br />
            Elastyczne anulowanie
          </span>
          <span>
            💬
            <br />
            Wsparcie 24/7
          </span>
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
  if (!hasDates) {
    return (
      <button type="button" disabled className="btn-primary w-full cursor-not-allowed py-3 opacity-50">
        Wybierz daty
      </button>
    );
  }
  if (quoteLoading) {
    return (
      <button type="button" disabled className="btn-primary w-full py-3 opacity-80">
        Obliczam cenę…
      </button>
    );
  }
  if (!loggedIn) {
    return (
      <button type="button" onClick={onLogin} className="btn-primary w-full py-3">
        Zaloguj się, aby zarezerwować
      </button>
    );
  }
  if (!quoteOk) {
    return (
      <button type="button" disabled className="btn-primary w-full cursor-not-allowed py-3 opacity-50">
        Popraw daty lub gości
      </button>
    );
  }
  if (bookingMode === "request") {
    return (
      <button type="button" onClick={onContinue} className="btn-secondary w-full py-3">
        Zapytaj o dostępność
      </button>
    );
  }
  return (
    <button type="button" onClick={onContinue} className="btn-primary w-full py-3">
      Rezerwuj teraz
    </button>
  );
}
