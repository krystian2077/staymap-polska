"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";

import { PriceBreakdown } from "@/components/booking/PriceBreakdown";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { api } from "@/lib/api";
import { publicMediaUrl } from "@/lib/mediaUrl";
import { useAuthStore } from "@/lib/store/authStore";
import { useBookingStore } from "@/lib/store/bookingStore";
import { cancellationPolicyText } from "@/lib/utils/booking";
import { countNights, formatDate } from "@/lib/utils/dates";
import type { PricingBreakdown } from "@/types/booking";

type SavedCostSplit = {
  people: number;
  per_person: number;
  total: number;
  currency: string;
  max_guests: number;
};

const PAYMENT_METHODS = [
  { id: "card", emoji: "💳", title: "Karta / Stripe", sub: "Visa, MC, Amex" },
  { id: "blik", emoji: "🇵🇱", title: "BLIK", sub: "Przelewy24" },
  { id: "transfer", emoji: "🏦", title: "Przelew online", sub: "Przelewy24" },
  { id: "apple", emoji: "🍎", title: "Apple Pay", sub: "Touch / Face ID" },
];

function toQuote(d: Record<string, unknown>): PricingBreakdown {
  return {
    nights: Number(d.nights),
    adults: Number(d.adults),
    children: Number(d.children),
    pets: Number(d.pets),
    extra_adults: Number(d.extra_adults || 0),
    adult_surcharge_percent: parseFloat(String(d.adult_surcharge_percent || 0)),
    adults_surcharge_total: parseFloat(String(d.adults_surcharge_total || 0)),
    extra_children: Number(d.extra_children || 0),
    child_surcharge_percent: parseFloat(String(d.child_surcharge_percent || 0)),
    children_surcharge_total: parseFloat(String(d.children_surcharge_total || 0)),
    guest_surcharge_total: parseFloat(String(d.guest_surcharge_total || 0)),
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

export default function BookingSummaryPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  const listing = useBookingStore((s) => s.listingForBooking);
  const checkIn = useBookingStore((s) => s.checkIn);
  const checkOut = useBookingStore((s) => s.checkOut);
  const adults = useBookingStore((s) => s.adults);
  const children = useBookingStore((s) => s.children);
  const pets = useBookingStore((s) => s.pets);
  const specialRequests = useBookingStore((s) => s.specialRequests);
  const quote = useBookingStore((s) => s.quote);
  const costSplitCount = useBookingStore((s) => s.costSplitCount);
  const setQuote = useBookingStore((s) => s.setQuote);
  const setSpecialRequests = useBookingStore((s) => s.setSpecialRequests);
  const setCostSplitCount = useBookingStore((s) => s.setCostSplitCount);
  const setBookingLoading = useBookingStore((s) => s.setBookingLoading);
  const setCurrentBooking = useBookingStore((s) => s.setCurrentBooking);

  const [pay, setPay] = useState("card");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) router.replace("/login?next=/booking/summary");
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
          children,
          pets,
        });
        if (!cancelled) setQuote(toQuote(res.data));
      } catch {
        if (!cancelled) router.replace(`/listing/${listing.slug}`);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [listing, checkIn, checkOut, adults, children, pets, quote, router, setQuote]);

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
        <p className="mt-4 text-sm text-gray-500">Laduje wycene...</p>
      </main>
    );
  }

  const nights = countNights(checkIn, checkOut);
  const policyText = cancellationPolicyText(listing.cancellation_policy, checkIn);
  const activeListing = listing;
  const guestsCount = Math.min(adults + children, listing.max_guests);
  const splitGuestsLimit = guestsCount;
  const savedSplit: SavedCostSplit | null =
    costSplitCount && costSplitCount >= 1 && costSplitCount <= splitGuestsLimit
      ? {
          people: costSplitCount,
          per_person: Number((quote.total / costSplitCount).toFixed(2)),
          total: Number(quote.total.toFixed(2)),
          currency: quote.currency || "PLN",
          max_guests: splitGuestsLimit,
        }
      : null;

  function handleSaveCostSplit(splitCount: number) {
    if (splitCount < 1 || splitCount > splitGuestsLimit) {
      toast.error(`Mozesz podzielic koszt maksymalnie na ${splitGuestsLimit} osob.`);
      return;
    }
    setCostSplitCount(splitCount);
    toast.success(`Podzial zapisany: ${splitCount} os.`);
  }

  async function handleConfirm() {
    setLoading(true);
    setBookingLoading(true);
    try {
      const latestCostSplitCount = useBookingStore.getState().costSplitCount;
      const costSplitPayload =
        latestCostSplitCount &&
        latestCostSplitCount >= 1 &&
        latestCostSplitCount <= splitGuestsLimit
          ? { people: latestCostSplitCount }
          : null;

      const res = await api.post<{ data: { id: string } }>("/api/v1/bookings/", {
        listing_id: activeListing.id,
        check_in: checkIn,
        check_out: checkOut,
        guests_count: guestsCount,
        adults,
        children,
        pets,
        special_requests: specialRequests,
        cost_split: costSplitPayload,
      });
      setCurrentBooking(res.data);
      router.push(`/booking/${res.data.id}/success`);
    } catch (e) {
      const err = e as Error & { status?: number; message?: string };
      if (err.status === 409) {
        toast.error("Ten termin jest juz zajety. Wybierz inne daty.");
        router.push(`/listing/${activeListing.slug}`);
        return;
      }
      toast.error(err.message || "Nie udalo sie utworzyc rezerwacji.");
    } finally {
      setLoading(false);
      setBookingLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-[1180px] px-4 py-8 sm:px-5 lg:py-10">
      <div className="mb-8 flex items-center justify-center gap-0 text-xs sm:text-sm">
        <Step n={1} label="Oferta" state="done" />
        <div className="mx-1 h-0.5 w-8 rounded bg-brand sm:w-14" />
        <Step n={2} label="Podsumowanie" state="active" />
        <div className="mx-1 h-0.5 w-8 rounded bg-gray-200 sm:w-14" />
        <Step n={3} label="Platnosc" state="todo" />
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-4">
          <section className="relative overflow-hidden rounded-[28px] border border-brand-dark/[.08] bg-white p-6 shadow-[0_35px_80px_-45px_rgba(15,23,42,.45)] sm:p-7">
            <div className="pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full bg-brand/10 blur-3xl" />
            <h2 className="mb-5 border-b border-gray-100 pb-3 text-base font-extrabold text-brand-dark">
              Twoja rezerwacja
            </h2>
            <div className="flex gap-4">
              <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-brand-muted">
                {cover ? (
                  <Image src={cover} alt="" fill className="object-cover" sizes="80px" unoptimized />
                ) : (
                  <span className="flex h-full items-center justify-center text-2xl">
                    {listing.listing_type?.icon ?? "🏠"}
                  </span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-base font-black tracking-tight text-brand-dark">{listing.title}</p>
                <p className="text-xs text-gray-400">
                  {listing.location?.city}
                  {listing.host.is_verified ? ` · Superhost ${listing.host.display_name}` : ""}
                </p>
                <div className="mt-3 grid grid-cols-1 gap-2 text-xs sm:grid-cols-3 sm:gap-3">
                  <MetaChip label="Przyjazd" value={formatDate(checkIn)} />
                  <MetaChip label="Wyjazd" value={formatDate(checkOut)} />
                  <MetaChip label="Goscie" value={`${guestsCount} osob`} />
                  {pets > 0 ? <MetaChip label="Zwierzęta" value={`${pets}`} /> : null}
                </div>
              </div>
            </div>
            <div className="mt-5 border-t border-gray-100 pt-4">
              <label className="mb-1 block text-[13px] font-semibold text-brand-dark">
                Specjalne prosby <span className="font-normal text-gray-400">(opcjonalne)</span>
              </label>
              <textarea
                className="input min-h-[84px] resize-y"
                placeholder="np. pozny check-in, rocznica, alergia na psy..."
                value={specialRequests}
                onChange={(e) => setSpecialRequests(e.target.value)}
              />
            </div>
          </section>

          <section className="rounded-[28px] border border-brand-dark/[.08] bg-white p-6 shadow-[0_30px_70px_-45px_rgba(15,23,42,.45)] sm:p-7">
            <h2 className="mb-4 border-b border-gray-100 pb-3 text-base font-extrabold text-brand-dark">
              Szczegoly ceny
            </h2>
            <PriceBreakdown
              quote={quote}
              loading={false}
              costSplitDefaultGuests={guestsCount}
              costSplitMaxGuests={splitGuestsLimit}
              costSplitSavedCount={costSplitCount}
              onSaveCostSplit={handleSaveCostSplit}
            />
            {savedSplit ? (
              <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                <p className="font-semibold">Zapisany podzial kosztow</p>
                <p className="mt-1">
                  {savedSplit.people} os. x {savedSplit.per_person.toFixed(2)} {savedSplit.currency} = {savedSplit.total.toFixed(2)} {savedSplit.currency}
                </p>
              </div>
            ) : null}
          </section>

          <section className="rounded-[28px] border border-brand-dark/[.08] bg-white p-6 shadow-[0_30px_70px_-45px_rgba(15,23,42,.45)] sm:p-7">
            <h2 className="mb-4 border-b border-gray-100 pb-3 text-base font-extrabold text-brand-dark">
              Zasady anulowania
            </h2>
            <div className="flex gap-2.5 rounded-[12px] border border-brand-border bg-brand-surface px-3.5 py-3 text-[13px] leading-relaxed text-gray-600">
              <span aria-hidden>📋</span>
              {policyText}
            </div>
          </section>

          <section className="rounded-[28px] border border-brand-dark/[.08] bg-white p-6 shadow-[0_30px_70px_-45px_rgba(15,23,42,.45)] sm:p-7">
            <h2 className="mb-4 border-b border-gray-100 pb-3 text-base font-extrabold text-brand-dark">
              Wybierz metode platnosci
            </h2>
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {PAYMENT_METHODS.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setPay(m.id)}
                  className={`flex cursor-pointer items-center gap-2.5 rounded-[12px] border-[1.5px] p-3 text-left transition-colors ${
                    pay === m.id ? "border-brand bg-[#dcfce7]" : "border-gray-200 hover:border-brand/50"
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
              W etapie beta platnosci sa symulowane. Rezerwacja zostanie potwierdzona automatycznie.
            </p>
          </section>

          <p className="pt-3 text-sm">
            <Link href={`/listing/${listing.slug}`} className="font-semibold text-brand hover:underline">
              ← Wroc do oferty
            </Link>
          </p>
        </div>

        <aside className="lg:sticky lg:top-24">
          <div className="overflow-hidden rounded-[28px] bg-gradient-to-br from-brand-dark via-[#0f5f2e] to-[#15803d] p-6 text-white shadow-[0_35px_90px_-40px_rgba(21,128,61,0.65)]">
            <p className="text-xs uppercase tracking-[0.18em] text-white/70">Do zaplaty</p>
            <p className="mt-2 text-[34px] font-black tracking-tight">{quote.total.toFixed(2)} zl</p>
            <p className="mt-1 text-xs text-white/70">
              {nights} {nights === 1 ? "noc" : "nocy"} · {formatDate(checkIn)} - {formatDate(checkOut)}
            </p>

            <div className="mt-5 rounded-2xl border border-white/15 bg-white/10 p-4 text-sm">
              <p className="font-semibold">Podsumowanie pobytu</p>
              <p className="mt-1 text-white/85">
                {guestsCount} osob · metoda: {PAYMENT_METHODS.find((m) => m.id === pay)?.title}
              </p>
              {savedSplit ? (
                <p className="mt-2 text-white/90">
                  Podzial: {savedSplit.people} os. x {savedSplit.per_person.toFixed(2)} {savedSplit.currency}
                </p>
              ) : (
                <p className="mt-2 text-white/70">Podzial kosztow nie zostal zapisany.</p>
              )}
            </div>

            <button
              type="button"
              disabled={loading}
              onClick={() => void handleConfirm()}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-[14px] border-0 bg-white py-4 text-base font-extrabold text-brand-dark shadow-[0_10px_28px_rgba(0,0,0,.2)] transition-all hover:-translate-y-0.5 disabled:opacity-60"
            >
              {loading ? (
                <>
                  <LoadingSpinner className="h-5 w-5 text-brand-dark" />
                  Tworze rezerwacje...
                </>
              ) : (
                <>Potwierdz rezerwacje · {quote.total.toFixed(2)} zl</>
              )}
            </button>

            <p className="mt-3 flex items-center justify-center gap-1 text-xs text-white/75">
              <span aria-hidden>🔒</span> Rezerwacja zabezpieczona SSL
            </p>
          </div>
        </aside>
      </div>
    </main>
  );
}

function MetaChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-brand-dark/[.08] bg-[#f8faf9] px-3 py-2">
      <p className="text-[11px] uppercase tracking-wide text-text-muted">{label}</p>
      <p className="mt-0.5 text-sm font-bold text-brand-dark">{value}</p>
    </div>
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
