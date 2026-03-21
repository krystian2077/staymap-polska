"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { api } from "@/lib/api";
import { normalizeListing } from "@/lib/listingNormalize";
import { useAuthStore } from "@/lib/store/authStore";
import { useBookingStore } from "@/lib/store/bookingStore";
import { countNights, formatDate } from "@/lib/utils/dates";
import { displayBookingId, formatGuests } from "@/lib/utils/booking";
import type { Listing } from "@/types/listing";

type BookingPayload = {
  id: string;
  check_in: string;
  check_out: string;
  guests_count: number;
  adults: number;
  children: number;
  status: string;
  listing: Record<string, unknown>;
};

export default function BookingSuccessPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const cached = useBookingStore((s) => s.currentBooking) as BookingPayload | null;

  const [booking, setBooking] = useState<BookingPayload | null>(cached);
  const [listing, setListing] = useState<Listing | null>(() =>
    cached?.listing ? normalizeListing(cached.listing as Record<string, unknown>) : null
  );

  useEffect(() => {
    if (!user) router.replace(`/login?next=/booking/${params.id}/success`);
  }, [user, router, params.id]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await api.get<{ data: BookingPayload }>(`/api/v1/bookings/${params.id}/`);
        if (cancelled) return;
        setBooking(res.data);
        setListing(normalizeListing(res.data.listing as Record<string, unknown>));
      } catch {
        if (!cancelled) router.replace("/");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [params.id, router]);

  useEffect(() => {
    const t = window.setTimeout(() => {
      useBookingStore.getState().resetAfterSuccess();
    }, 400);
    return () => window.clearTimeout(t);
  }, []);

  if (!booking || !listing) {
    return (
      <main className="flex min-h-[50vh] flex-col items-center justify-center gap-3">
        <LoadingSpinner className="h-10 w-10 text-brand" />
        <p className="text-sm text-gray-500">Ładuję potwierdzenie…</p>
      </main>
    );
  }

  const nights = countNights(booking.check_in, booking.check_out);
  const isRequest = listing.booking_mode === "request";
  const confirmed = booking.status === "confirmed";

  return (
    <main className="mx-auto max-w-[560px] px-5 py-14 text-center">
      <div
        className="mx-auto mb-7 flex h-20 w-20 items-center justify-center rounded-full border-[3px] border-brand-border bg-[#dcfce7] animate-[scale-in_.6s_cubic-bezier(.16,1,.3,1)]"
        style={{ animationFillMode: "both" }}
      >
        <svg
          width="40"
          height="40"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden
        >
          <path
            d="M6 12l5 5 9-9"
            stroke="#16a34a"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="60"
            strokeDashoffset="60"
            className="checkmark-path"
          />
        </svg>
      </div>

      <h1
        className="mb-2.5 text-[30px] font-extrabold tracking-tight text-brand-dark animate-[fade-up_.6s_.1s_cubic-bezier(.16,1,.3,1)_both]"
        style={{ letterSpacing: "-1px" }}
      >
        Rezerwacja potwierdzona!
      </h1>
      <p className="mb-7 text-base leading-relaxed text-gray-600 animate-[fade-up_.6s_.15s_cubic-bezier(.16,1,.3,1)_both]">
        {isRequest ? (
          <>
            Twoja prośba została wysłana. Gospodarz ma 24h na odpowiedź.
          </>
        ) : (
          <>
            Twój domek w {listing.location?.city} czeka. Potwierdzenie zostało wysłane na{" "}
            <span className="font-semibold text-brand-dark">{user?.email}</span>
          </>
        )}
      </p>

      <div className="mb-6 flex gap-2 rounded-[10px] border border-brand-border bg-brand-surface px-4 py-3 text-left text-[13px] text-gray-600">
        <span aria-hidden>📧</span>
        <p>
          Sprawdź skrzynkę — wysłaliśmy szczegóły, dane kontaktowe do {listing.host.display_name} i
          wskazówki dojazdu.
        </p>
      </div>

      <div
        className="mb-7 rounded-[20px] border-[1.5px] border-brand-border bg-white p-6 text-left shadow-[0_8px_32px_rgba(22,163,74,.1)] animate-[fade-up_.6s_.3s_cubic-bezier(.16,1,.3,1)_both]"
      >
        <div className="mb-4 flex justify-between gap-4 border-b border-gray-100 pb-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-gray-400">
              Numer rezerwacji
            </p>
            <p className="text-xs text-gray-400">Zachowaj na potwierdzenie</p>
          </div>
          <code className="h-fit rounded-md bg-[#dcfce7] px-2.5 py-1 font-mono text-[13px] font-bold text-brand-dark">
            {displayBookingId(booking.id)}
          </code>
        </div>

        <div className="flex flex-col gap-3">
          <Row icon="🏠" label="Obiekt" value={listing.title} />
          <Row
            icon="📍"
            label="Lokalizacja"
            value={`${listing.location?.city}, ${listing.location?.region}`}
          />
          <Row
            icon="📅"
            label="Termin"
            value={`${formatDate(booking.check_in)} – ${formatDate(booking.check_out)} · ${nights} nocy`}
          />
          <Row
            icon="👥"
            label="Goście"
            value={formatGuests(booking.adults ?? 1, booking.children ?? 0)}
          />
          <Row
            icon="✅"
            label="Status"
            value={confirmed ? "Potwierdzona" : "Oczekuje na akceptację"}
            valueClass={confirmed ? "text-brand" : "text-amber-500"}
          />
          <Row
            icon="⏰"
            label="Check-in / Check-out"
            value={`${listing.check_in_time} / ${listing.check_out_time}`}
          />
        </div>
      </div>

      <div className="mb-8 flex flex-col gap-2.5">
        <Link href="/bookings" className="btn-primary w-full py-3.5 text-[15px]">
          Moje rezerwacje
        </Link>
        <Link href={`/listing/${listing.slug}`} className="btn-secondary w-full py-3.5 text-[15px]">
          Wróć do oferty
        </Link>
        <button
          type="button"
          className="btn-ghost text-[13px] text-gray-400"
          onClick={() => {
            // eslint-disable-next-line no-console
            console.log("PDF — wkrótce");
          }}
        >
          Pobierz potwierdzenie PDF
        </button>
      </div>

      <div className="rounded-[14px] bg-gray-50 p-5 text-left">
        <p className="mb-3 text-sm font-bold text-brand-dark">Co dalej?</p>
        <ul className="space-y-3 text-[13px] text-gray-600">
          <li>
            💬 <strong>Napisz do {listing.host.display_name}</strong> — ustal szczegóły przyjazdu.
          </li>
          <li>
            ⭐ <strong>Po pobycie wystaw opinię</strong> — pomoże innym podróżnikom.
          </li>
          <li>
            🔔 <strong>Włącz powiadomienia</strong> — przypomnimy o check-in.
          </li>
        </ul>
      </div>

      <style jsx global>{`
        .checkmark-path {
          animation: checkmark 0.6s 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        @keyframes checkmark {
          to {
            stroke-dashoffset: 0;
          }
        }
        @keyframes fade-up {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes scale-in {
          from {
            opacity: 0;
            transform: scale(0.85);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
      `}</style>
    </main>
  );
}

function Row({
  icon,
  label,
  value,
  valueClass,
}: {
  icon: string;
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-brand-surface text-base">
        {icon}
      </span>
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">{label}</p>
        <p className={`text-sm font-bold text-brand-dark ${valueClass ?? ""}`}>{value}</p>
      </div>
    </div>
  );
}
