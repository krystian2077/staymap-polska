"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";

import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { PriceBreakdown } from "@/components/booking/PriceBreakdown";
import { api } from "@/lib/api";
import { publicMediaUrl } from "@/lib/mediaUrl";
import { useAuthStore } from "@/lib/store/authStore";
import { useBookingStore } from "@/lib/store/bookingStore";
import { countNights, formatDate } from "@/lib/utils/dates";
import { cancellationPolicyText } from "@/lib/utils/booking";
import type { PricingBreakdown } from "@/types/booking";

const PAYMENT_METHODS = [
  { id: "card", emoji: "💳", title: "Karta / Stripe", sub: "Visa, MC, Amex" },
  { id: "blik", emoji: "🇵🇱", title: "BLIK", sub: "Przelewy24" },
  { id: "transfer", emoji: "🏦", title: "Przelew online", sub: "Przelewy24" },
  { id: "apple", emoji: "🍎", title: "Apple Pay", sub: "Touch / Face ID" },
];

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

export default function BookingSummaryPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  const listing = useBookingStore((s) => s.listingForBooking);
  const checkIn = useBookingStore((s) => s.checkIn);
  const checkOut = useBookingStore((s) => s.checkOut);
  const adults = useBookingStore((s) => s.adults);
  const children = useBookingStore((s) => s.children);
  const specialRequests = useBookingStore((s) => s.specialRequests);
  const quote = useBookingStore((s) => s.quote);
  const setQuote = useBookingStore((s) => s.setQuote);
  const setSpecialRequests = useBookingStore((s) => s.setSpecialRequests);
  const setBookingLoading = useBookingStore((s) => s.setBookingLoading);
  const setCurrentBooking = useBookingStore((s) => s.setCurrentBooking);

  const [pay, setPay] = useState("card");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) {
      router.replace("/login?next=/booking/summary");
    }
  }, [user, router]);

  useEffect(() => {
    if (!listing) router.replace("/search");
  }, [listing, router]);

  useEffect(() => {
    if (listing && !checkIn) router.replace(`/listing/${listing.slug}`);
  }, [listing, checkIn, router]);

  useEffect(() => {
    if (!listing || !checkIn || !checkOut) return;
    if (quote) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await api.post<{ data: Record<string, unknown> }>("/api/v1/bookings/quote/", {
          listing_id: listing.id,
          check_in: checkIn,
          check_out: checkOut,
          guests: Math.min(adults + children, listing.max_guests),
          adults,
        });
        if (!cancelled) setQuote(toQuote(res.data));
      } catch {
        if (!cancelled) router.replace(`/listing/${listing.slug}`);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [listing, checkIn, checkOut, adults, children, quote, router, setQuote]);

  const cover = useMemo(() => {
    if (!listing?.images?.length) return null;
    const im = [...listing.images].sort(
      (a, b) => Number(b.is_cover) - Number(a.is_cover) || a.sort_order - b.sort_order
    )[0];
    return publicMediaUrl(im?.display_url || im?.url);
  }, [listing]);

  if (!listing || !checkIn || !checkOut) {
    return (
      <main className="flex min-h-[40vh] items-center justify-center">
        <LoadingSpinner className="h-10 w-10 text-brand" />
      </main>
    );
  }

  if (!quote) {
    return (
      <main className="mx-auto max-w-lg px-5 py-16 text-center">
        <LoadingSpinner className="mx-auto h-10 w-10 text-brand" />
        <p className="mt-4 text-sm text-gray-500">Ładuję wycenę…</p>
      </main>
    );
  }

  const nights = countNights(checkIn, checkOut);
  const policyText = cancellationPolicyText(listing.cancellation_policy, checkIn);

  async function handleConfirm() {
    if (!listing || !checkIn || !checkOut) return;
    setLoading(true);
    setBookingLoading(true);
    try {
      const guests_count = Math.min(adults + children, listing.max_guests);
      const res = await api.post<{ data: { id: string } }>("/api/v1/bookings/", {
        listing_id: listing.id,
        check_in: checkIn,
        check_out: checkOut,
        guests_count,
        adults,
        children,
        special_requests: specialRequests,
      });
      setCurrentBooking(res.data);
      router.push(`/booking/${res.data.id}/success`);
    } catch (e) {
      const err = e as Error & { status?: number; message?: string };
      if (err.status === 409) {
        toast.error("Ten termin jest już zajęty. Wybierz inne daty.");
        router.push(`/listing/${listing.slug}`);
        return;
      }
      toast.error(err.message || "Nie udało się utworzyć rezerwacji.");
    } finally {
      setLoading(false);
      setBookingLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-[680px] px-5 py-8">
      <div className="mb-10 flex items-center justify-center gap-0 text-xs sm:text-sm">
        <Step n={1} label="Oferta" state="done" />
        <div className="mx-1 h-0.5 w-8 rounded bg-brand sm:w-14" />
        <Step n={2} label="Podsumowanie" state="active" />
        <div className="mx-1 h-0.5 w-8 rounded bg-gray-200 sm:w-14" />
        <Step n={3} label="Płatność" state="todo" />
      </div>

      <section className="card mb-4 p-6">
        <h2 className="mb-4 border-b border-gray-100 pb-3 text-base font-extrabold text-brand-dark">
          Twoja rezerwacja
        </h2>
        <div className="flex gap-3.5">
          <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-[10px] bg-brand-muted">
            {cover ? (
              <Image src={cover} alt="" fill className="object-cover" sizes="80px" unoptimized />
            ) : (
              <span className="flex h-full items-center justify-center text-2xl">
                {listing.listing_type?.icon ?? "🏠"}
              </span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-brand-dark">{listing.title}</p>
            <p className="text-xs text-gray-400">
              {listing.location?.city}
              {listing.host.is_verified ? ` · Superhost ${listing.host.display_name}` : ""}
            </p>
            <div className="mt-2 flex flex-wrap gap-3 text-xs">
              <div>
                <span className="text-gray-400">Przyjazd</span>
                <p className="text-sm font-bold">{formatDate(checkIn)}</p>
              </div>
              <div className="hidden h-8 w-px bg-gray-200 sm:block" />
              <div>
                <span className="text-gray-400">Wyjazd</span>
                <p className="text-sm font-bold">{formatDate(checkOut)}</p>
              </div>
              <div className="hidden h-8 w-px bg-gray-200 sm:block" />
              <div>
                <span className="text-gray-400">Goście</span>
                <p className="text-sm font-bold">{adults + children} osób</p>
              </div>
            </div>
          </div>
        </div>
        <div className="mt-4 border-t border-gray-100 pt-4">
          <label className="mb-1 block text-[13px] font-semibold text-brand-dark">
            Specjalne prośby <span className="font-normal text-gray-400">(opcjonalne)</span>
          </label>
          <textarea
            className="input min-h-[80px] resize-y"
            placeholder="np. późny check-in, rocznica — chcemy kwiaty, alergia na psy..."
            value={specialRequests}
            onChange={(e) => setSpecialRequests(e.target.value)}
          />
        </div>
      </section>

      <section className="card mb-4 p-6">
        <h2 className="mb-4 border-b border-gray-100 pb-3 text-base font-extrabold text-brand-dark">
          Szczegóły ceny
        </h2>
        <PriceBreakdown quote={quote} loading={false} />
      </section>

      <section className="card mb-4 p-6">
        <h2 className="mb-4 border-b border-gray-100 pb-3 text-base font-extrabold text-brand-dark">
          Zasady anulowania
        </h2>
        <div className="flex gap-2.5 rounded-[10px] border border-brand-border bg-brand-surface px-3.5 py-3 text-[13px] leading-relaxed text-gray-600">
          <span aria-hidden>📋</span>
          {policyText}
        </div>
      </section>

      <section className="card mb-4 p-6">
        <h2 className="mb-4 border-b border-gray-100 pb-3 text-base font-extrabold text-brand-dark">
          Wybierz metodę płatności
        </h2>
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          {PAYMENT_METHODS.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setPay(m.id)}
              className={`flex cursor-pointer items-center gap-2.5 rounded-[10px] border-[1.5px] p-3 text-left transition-colors ${
                pay === m.id
                  ? "border-brand bg-[#dcfce7]"
                  : "border-gray-200 hover:border-brand/50"
              }`}
            >
              <span className="text-xl">{m.emoji}</span>
              <div className="flex-1">
                <p className="text-[13px] font-bold text-brand-dark">{m.title}</p>
                <p className="text-[11px] text-gray-400">{m.sub}</p>
              </div>
              <span
                className={`h-4 w-4 shrink-0 rounded-full border-2 ${
                  pay === m.id ? "border-brand bg-brand" : "border-gray-300"
                }`}
              />
            </button>
          ))}
        </div>
        <p className="mt-3 text-center text-xs text-gray-400">
          W etapie beta płatności są symulowane. Rezerwacja zostanie potwierdzona automatycznie.
        </p>
      </section>

      <div className="mb-4 rounded-[20px] bg-brand-dark px-6 py-5 text-white">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p className="text-sm text-white/70">Do zapłaty</p>
            <p className="text-[26px] font-extrabold tracking-tight">
              {quote.total.toFixed(2)} zł
            </p>
            <p className="text-xs text-white/55">
              za {nights} {nights === 1 ? "noc" : "nocy"} · {formatDate(checkIn)} –{" "}
              {formatDate(checkOut)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-white/55">Booking ID</p>
            <p className="mt-1 rounded-md bg-white/10 px-2.5 py-1 font-mono text-[13px] text-white/90">
              Obliczany…
            </p>
          </div>
        </div>
      </div>

      <button
        type="button"
        disabled={loading}
        onClick={() => void handleConfirm()}
        className="flex w-full items-center justify-center gap-2 rounded-[14px] border-0 bg-brand py-4 text-base font-extrabold text-white shadow-[0_10px_28px_rgba(22,163,74,.4)] transition-all hover:bg-[#15803d] hover:-translate-y-0.5 disabled:opacity-60"
      >
        {loading ? (
          <>
            <LoadingSpinner className="h-5 w-5 text-white" />
            Tworzę rezerwację…
          </>
        ) : (
          <>Potwierdź rezerwację · {quote.total.toFixed(2)} zł</>
        )}
      </button>
      <p className="mt-2 flex items-center justify-center gap-1 text-xs text-gray-400">
        <span aria-hidden>🔒</span> Rezerwacja zabezpieczona SSL
      </p>

      <p className="mt-8 text-center text-sm">
        <Link href={`/listing/${listing.slug}`} className="font-semibold text-brand hover:underline">
          ← Wróć do oferty
        </Link>
      </p>
    </main>
  );
}

function Step({ n, label, state }: { n: number; label: string; state: "done" | "active" | "todo" }) {
  return (
    <div className="flex flex-col items-center gap-1 text-center">
      <div
        className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${
          state === "done"
            ? "bg-brand text-white"
            : state === "active"
              ? "bg-brand-dark text-white"
              : "bg-gray-200 text-gray-400"
        }`}
      >
        {state === "done" ? "✓" : n}
      </div>
      <span
        className={`max-w-[76px] leading-tight ${state === "active" ? "font-bold text-brand-dark" : "text-gray-400"}`}
      >
        {label}
      </span>
    </div>
  );
}
