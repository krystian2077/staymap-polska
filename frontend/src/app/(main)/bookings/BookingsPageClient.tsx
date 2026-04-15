"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { api } from "@/lib/api";

type Row = {
  id: string;
  listing_title: string;
  listing_slug: string;
  check_in: string;
  check_out: string;
  guests_count: number;
  status: string;
  final_amount: string;
  currency: string;
  confirmation_email_sent: boolean;
  conversation_id?: string | null;
  special_requests?: string;
  cancellation_policy_snapshot?: string;
  has_guest_review?: boolean;
  cost_split?: {
    people?: number | string;
    per_person?: string | number;
    total?: string | number;
    currency?: string;
    max_guests?: number;
  } | null;
  pricing_breakdown?: {
    cost_split?: {
      people?: number;
      per_person?: string | number;
      total?: string | number;
      currency?: string;
      max_guests?: number;
    };
  };
  status_history?: Array<{
    id: string;
    old_status: string;
    new_status: string;
    note: string;
    created_at: string;
  }>;
};

const statusPl: Record<string, string> = {
  pending: "Oczekuje na hosta",
  awaiting_payment: "Oczekuje płatności",
  confirmed: "Potwierdzona",
  cancelled: "Anulowana",
  rejected: "Odrzucona",
  completed: "Zakończona",
  abandoned: "Porzucona",
  payment_failed: "Płatność nieudana",
};

const cancellableStatuses = new Set(["pending", "awaiting_payment", "confirmed"]);

function fmtDate(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("pl-PL");
}

function statusTone(status: string): string {
  switch (status) {
    case "confirmed":
      return "bg-emerald-50 text-emerald-700 ring-emerald-200";
    case "pending":
    case "awaiting_payment":
      return "bg-amber-50 text-amber-700 ring-amber-200";
    case "cancelled":
    case "rejected":
    case "payment_failed":
      return "bg-rose-50 text-rose-700 ring-rose-200";
    case "completed":
      return "bg-sky-50 text-sky-700 ring-sky-200";
    default:
      return "bg-slate-50 text-slate-700 ring-slate-200";
  }
}

function nightsCount(checkIn: string, checkOut: string): number | null {
  const start = new Date(checkIn);
  const end = new Date(checkOut);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;
  const diffMs = end.getTime() - start.getTime();
  const nights = Math.round(diffMs / (1000 * 60 * 60 * 24));
  return nights > 0 ? nights : null;
}

function canWriteReview(booking: Row): boolean {
  if (booking.has_guest_review) return false;
  return booking.status === "completed" || booking.status === "confirmed";
}

function costSplitLabel(booking: Row): string | null {
  const split = booking.cost_split ?? booking.pricing_breakdown?.cost_split;
  if (!split) return null;

  const people = Number(split.people ?? 0);
  if (Number.isNaN(people) || people < 1) return null;

  const currency = split.currency || booking.currency || "PLN";
  const perPersonRaw = Number(split.per_person ?? 0);

  if (!Number.isNaN(perPersonRaw) && perPersonRaw > 0) {
    return `${people} os. x ${perPersonRaw.toFixed(2)} ${currency}`;
  }

  const totalRaw = Number(split.total ?? booking.final_amount ?? 0);
  if (!Number.isNaN(totalRaw) && totalRaw > 0) {
    return `${people} os. x ${(totalRaw / people).toFixed(2)} ${currency}`;
  }

  return `${people} os.`;
}

// ── Star Picker ────────────────────────────────────────────────────────────────

function StarPicker({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  const [hovered, setHovered] = useState(0);

  return (
    <div className="flex gap-1" role="radiogroup" aria-label="Ocena">
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = star <= (hovered || value);
        return (
          <button
            key={star}
            type="button"
            role="radio"
            aria-checked={star === value}
            aria-label={`${star} ${star === 1 ? "gwiazdka" : star < 5 ? "gwiazdki" : "gwiazdek"}`}
            onMouseEnter={() => setHovered(star)}
            onMouseLeave={() => setHovered(0)}
            onClick={() => onChange(star)}
            className="text-3xl leading-none transition-transform hover:scale-110 focus:outline-none"
          >
            <span className={filled ? "text-amber-400" : "text-slate-300"}>★</span>
          </button>
        );
      })}
    </div>
  );
}

const SUBSCORE_LABELS: Record<string, string> = {
  cleanliness: "Czystość",
  location: "Lokalizacja",
  communication: "Komunikacja",
  accuracy: "Zgodność z opisem",
};

function SubscoreSliders({
  value,
  onChange,
}: {
  value: Record<string, number>;
  onChange: (v: Record<string, number>) => void;
}) {
  return (
    <div className="space-y-4">
      <p className="font-bold text-brand-dark">Oceny szczegółowe</p>
      {Object.entries(SUBSCORE_LABELS).map(([key, label]) => (
        <div key={key} className="flex items-center gap-3 sm:gap-4">
          <span className="w-36 shrink-0 text-sm text-text-secondary sm:w-44">{label}</span>
          <input
            type="range"
            min={1}
            max={5}
            step={0.5}
            value={value[key] ?? 5}
            onChange={(e) => onChange({ ...value, [key]: parseFloat(e.target.value) })}
            className="min-w-0 flex-1 accent-brand"
          />
          <span className="w-8 shrink-0 text-right text-sm font-bold text-brand">
            {(value[key] ?? 5).toFixed(1)}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Review Modal ───────────────────────────────────────────────────────────────

function ReviewModal({
  booking,
  onClose,
  onSubmitted,
}: {
  booking: Row;
  onClose: () => void;
  onSubmitted: () => void;
}) {
  const [rating, setRating] = useState(0);
  const [content, setContent] = useState("");
  const [subscores, setSubscores] = useState({
    cleanliness: 5,
    location: 5,
    communication: 5,
    accuracy: 5,
  });
  const [submitting, setSubmitting] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);

  // Close on overlay click
  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === overlayRef.current) onClose();
  };

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0) {
      toast.error("Wybierz ocenę w skali 1–5 gwiazdek.");
      return;
    }
    setSubmitting(true);
    try {
      await api.post("/api/v1/reviews/", {
        booking_id: booking.id,
        reviewer_role: "guest",
        overall_rating: rating,
        content: content.trim(),
        subscores,
      });
      toast.success("Recenzja została opublikowana!");
      onSubmitted();
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Nie udało się opublikować recenzji.");
    } finally {
      setSubmitting(false);
    }
  };

  const ratingLabels: Record<number, string> = {
    1: "Bardzo słabo",
    2: "Słabo",
    3: "Przeciętnie",
    4: "Dobrze",
    5: "Wyśmienicie",
  };

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-2.5 backdrop-blur-sm sm:items-center sm:p-4"
    >
      <div className="max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-[22px] border border-brand-dark/[.08] bg-white p-4 shadow-[0_40px_100px_-30px_rgba(15,23,42,0.45)] dark:border-white/20 dark:bg-[var(--bg2)] sm:max-h-none sm:rounded-[28px] sm:p-8">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-brand">Recenzja pobytu</p>
            <h2 className="mt-1 line-clamp-2 text-xl font-black tracking-tight text-brand-dark dark:text-white">
              {booking.listing_title}
            </h2>
            <p className="mt-1 text-xs text-text-secondary dark:text-white/70">
              {fmtDate(booking.check_in)} – {fmtDate(booking.check_out)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Zamknij"
            className="shrink-0 rounded-xl border border-brand-dark/[.1] bg-white p-2 text-text-secondary transition hover:bg-brand-surface hover:text-brand-dark dark:border-white/20 dark:bg-[var(--bg3)] dark:text-white/70 dark:hover:bg-[var(--bg)] dark:hover:text-white"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
              <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
            </svg>
          </button>
        </div>

        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4 sm:space-y-5">
          <div>
            <p className="mb-2 text-sm font-bold text-brand-dark dark:text-white">Ogólna ocena *</p>
            <StarPicker value={rating} onChange={setRating} />
            {rating > 0 && (
              <p className="mt-1.5 text-sm font-semibold text-amber-600">{ratingLabels[rating]}</p>
            )}
          </div>

          <SubscoreSliders
            value={subscores}
            onChange={(v) =>
              setSubscores({
                cleanliness: v.cleanliness ?? 5,
                location: v.location ?? 5,
                communication: v.communication ?? 5,
                accuracy: v.accuracy ?? 5,
              })
            }
          />

          <div>
              <label htmlFor="review-content" className="mb-1.5 block text-sm font-bold text-brand-dark dark:text-white">
              Treść recenzji{" "}
              <span className="font-normal text-text-secondary">(opcjonalna)</span>
            </label>
            <textarea
              id="review-content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              maxLength={4000}
              rows={5}
              placeholder="Opisz swoje doświadczenia — co było super, a co można poprawić..."
              className="w-full resize-none rounded-2xl border border-brand-dark/[.15] bg-[#f8faf9] px-4 py-3 text-sm text-brand-dark placeholder:text-text-muted focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 dark:border-white/20 dark:bg-[var(--bg3)] dark:text-white dark:placeholder:text-white/45"
            />
            <p className="mt-1 text-right text-[11px] text-text-muted">{content.length}/4000</p>
          </div>

          <div className="flex flex-col gap-2.5 pt-1 sm:flex-row sm:flex-wrap sm:gap-3">
            <button
              type="submit"
              disabled={submitting || rating === 0}
              className="w-full rounded-xl bg-gradient-to-r from-brand to-[#15803d] px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:-translate-y-px hover:from-[#15803d] hover:to-[#166534] disabled:cursor-not-allowed disabled:opacity-60 sm:flex-1"
            >
              {submitting ? "Publikowanie..." : "Opublikuj recenzję"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-full rounded-xl border border-brand-dark/[.1] bg-white px-5 py-3 text-sm font-bold text-brand-dark transition hover:-translate-y-px hover:bg-brand-surface dark:border-white/20 dark:bg-[var(--bg3)] dark:text-white dark:hover:bg-[var(--bg)] sm:w-auto"
            >
              Anuluj
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export function BookingsPageClient() {
  const router = useRouter();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [reviewBooking, setReviewBooking] = useState<Row | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await api.get<{ data: Row[] }>("/api/v1/bookings/me/");
        if (!cancelled) setRows(res.data);
      } catch (e) {
        if (!cancelled) setErr(e instanceof Error ? e.message : "Błąd");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const sortedRows = useMemo(() => rows ?? [], [rows]);

  const onCancel = async (booking: Row) => {
    if (!cancellableStatuses.has(booking.status)) {
      toast.error("Tej rezerwacji nie można już anulować.");
      return;
    }
    if (!confirm("Czy na pewno chcesz anulować tę rezerwację?")) return;
    setBusyId(booking.id);
    try {
      const res = await api.delete<{ data: Row }>(`/api/v1/bookings/${booking.id}/`);
      const updated = res.data;
      setRows((prev) =>
        (prev ?? []).map((b) => (b.id === booking.id ? { ...b, ...updated } : b))
      );
      toast.success("Rezerwacja została anulowana.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Nie udało się anulować rezerwacji.");
    } finally {
      setBusyId(null);
    }
  };

  const onMessageHost = async (booking: Row) => {
    setBusyId(booking.id);
    try {
      let convId = booking.conversation_id ?? null;

      if (!convId) {
        const detail = await api.get<{ data: { listing?: { id?: string }; conversation_id?: string | null } }>(
          `/api/v1/bookings/${booking.id}/`
        );
        convId = detail.data?.conversation_id ?? null;

        if (!convId) {
          const listingId = detail.data?.listing?.id;
          if (listingId) {
            const created = await api.post<{ data: { id: string } }>("/api/v1/conversations/", {
              listing_id: listingId,
            });
            convId = created.data?.id ?? null;
          }
        }
      }

      if (!convId) {
        toast.error("Nie udało się otworzyć rozmowy.");
        return;
      }

      setRows((prev) =>
        (prev ?? []).map((b) => (b.id === booking.id ? { ...b, conversation_id: convId } : b))
      );
      router.push(`/messages?conv=${encodeURIComponent(convId)}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Nie udało się otworzyć rozmowy z gospodarzem.");
    } finally {
      setBusyId(null);
    }
  };

  const onReviewSubmitted = (bookingId: string) => {
    setRows((prev) =>
      (prev ?? []).map((b) => (b.id === bookingId ? { ...b, has_guest_review: true } : b))
    );
  };

  if (err) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <p className="text-red-600">{err}</p>
        <Link href="/login" className="btn-primary mt-6 inline-block px-6">
          Zaloguj się
        </Link>
      </div>
    );
  }

  if (rows === null) {
    return (
      <div className="flex justify-center py-24">
        <LoadingSpinner className="h-10 w-10 text-brand" />
      </div>
    );
  }

  if (sortedRows.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16">
        <div className="rounded-[28px] border border-brand-dark/[.08] bg-white p-10 text-center shadow-[0_30px_80px_-45px_rgba(15,23,42,0.4)] dark:border-white/20 dark:bg-[var(--bg2)]">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-muted text-2xl">📅</div>
          <h1 className="text-3xl font-black tracking-tight text-brand-dark dark:text-white">Moje rezerwacje</h1>
          <p className="mt-3 text-text-secondary dark:text-white/70">Nie masz jeszcze żadnych rezerwacji. Znajdź wymarzone miejsce i zarezerwuj je w kilka kliknięć.</p>
          <Link href="/search" className="btn-primary mt-8 inline-block px-8 py-3 text-sm font-bold">
            Szukaj noclegów
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      {reviewBooking && (
        <ReviewModal
          booking={reviewBooking}
          onClose={() => setReviewBooking(null)}
          onSubmitted={() => {
            onReviewSubmitted(reviewBooking.id);
          }}
        />
      )}

      <div className="mx-auto max-w-5xl px-3 py-6 sm:px-4 sm:py-12">
        <div className="relative overflow-hidden rounded-[24px] border border-brand-dark/[.08] bg-gradient-to-br from-brand-dark via-[#0f5f2e] to-[#15803d] p-5 text-white shadow-[0_35px_90px_-45px_rgba(21,128,61,0.65)] sm:rounded-[32px] sm:p-8">
          <div className="pointer-events-none absolute -right-8 -top-10 h-44 w-44 rounded-full bg-white/10 blur-3xl" />
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/80">Twoje konto</p>
          <h1 className="mt-2 text-[28px] font-black tracking-tight sm:text-3xl">Moje rezerwacje</h1>
          <p className="mt-2 max-w-2xl text-[13px] text-white/85 sm:text-sm">Zarządzaj pobytami, sprawdzaj szczegóły, anuluj rezerwację i skontaktuj się bezpośrednio z gospodarzem.</p>
        </div>

        <ul className="mt-5 space-y-4 sm:mt-8 sm:space-y-5">
          {sortedRows.map((b) => (
            (() => {
              const nights = nightsCount(b.check_in, b.check_out);
              const isBusy = busyId === b.id;
              const canCancel = cancellableStatuses.has(b.status);
              const showReviewBtn = canWriteReview(b);
              const splitInfo = costSplitLabel(b);
              return (
            <li
              key={b.id}
              className="group overflow-hidden rounded-[20px] border border-brand-dark/[.08] bg-white p-4 shadow-[0_20px_45px_-36px_rgba(15,23,42,0.45)] transition-all duration-300 hover:-translate-y-[2px] hover:shadow-[0_28px_70px_-34px_rgba(15,23,42,0.45)] dark:border-white/15 dark:bg-[var(--bg2)] dark:shadow-[0_24px_52px_-28px_rgba(0,0,0,.6)] sm:rounded-[26px] sm:p-6"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ring-1 ${statusTone(b.status)}`}>
                      {statusPl[b.status] ?? b.status}
                    </span>
                    {b.confirmation_email_sent ? (
                       <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-600 ring-1 ring-slate-200 dark:bg-[var(--bg3)] dark:text-white/75 dark:ring-white/20">
                        Potwierdzenie e-mail
                      </span>
                    ) : null}
                    {b.has_guest_review ? (
                      <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-amber-700 ring-1 ring-amber-200">
                        ★ Recenzja wystawiona
                      </span>
                    ) : null}
                  </div>
                  <Link
                    href={`/listing/${b.listing_slug}`}
                    className="line-clamp-2 text-[19px] font-black leading-tight tracking-tight text-brand-dark transition-colors hover:text-brand dark:text-white dark:hover:text-brand-light sm:text-[22px]"
                  >
                    {b.listing_title}
                  </Link>
                  <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm font-medium text-text-secondary dark:text-white/70">
                    <span>📍 {b.listing_slug}</span>
                    <span>👥 {b.guests_count} {b.guests_count === 1 ? "gość" : "gości"}</span>
                    {nights ? <span>🌙 {nights} {nights === 1 ? "noc" : "nocy"}</span> : null}
                    {splitInfo ? <span>🧾 Podział: {splitInfo}</span> : null}
                  </p>
                </div>
                <div className="w-full rounded-2xl border border-brand-dark/[.08] bg-[#f8faf9] px-4 py-3 text-left shadow-inner dark:border-white/15 dark:bg-[var(--bg3)] sm:w-auto sm:min-w-[170px] sm:text-right">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-text-muted">Do zapłaty</p>
                  <p className="mt-1 text-2xl font-black tracking-tight text-brand-dark dark:text-white">
                    {b.final_amount} {b.currency}
                  </p>
                  <p className="mt-1 text-[11px] text-text-muted">ID: {b.id.slice(0, 8).toUpperCase()}</p>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-2 rounded-2xl border border-brand-dark/[.08] bg-[#f8faf9] p-4 text-sm text-text-secondary dark:border-white/15 dark:bg-[var(--bg3)] dark:text-white/75 sm:grid-cols-2">
                <p>
                  <span className="font-semibold text-brand-dark dark:text-white">Przyjazd:</span> {fmtDate(b.check_in)}
                </p>
                <p>
                  <span className="font-semibold text-brand-dark dark:text-white">Wyjazd:</span> {fmtDate(b.check_out)}
                </p>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-2.5 sm:flex sm:flex-wrap">
                <button
                  type="button"
                  onClick={() => setExpandedId((prev) => (prev === b.id ? null : b.id))}
                  className="rounded-xl border border-brand-dark/[.1] bg-white px-4 py-2.5 text-xs font-bold text-brand-dark transition hover:-translate-y-px hover:bg-brand-surface dark:border-white/20 dark:bg-[var(--bg3)] dark:text-white dark:hover:bg-[var(--bg)]"
                >
                  {expandedId === b.id ? "Ukryj szczegóły" : "Szczegóły"}
                </button>

                <button
                  type="button"
                  disabled={isBusy || !canCancel}
                  onClick={() => void onCancel(b)}
                    className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-xs font-bold text-red-700 transition hover:-translate-y-px hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isBusy ? "Anulowanie..." : "Anuluj"}
                </button>

                <button
                  type="button"
                  disabled={isBusy}
                  onClick={() => void onMessageHost(b)}
                   className="rounded-xl bg-gradient-to-r from-brand to-[#15803d] px-4 py-2.5 text-xs font-bold text-white shadow-sm transition hover:-translate-y-px hover:from-[#15803d] hover:to-[#166534] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isBusy ? "Otwieranie..." : "Napisz do gospodarza"}
                </button>

                {showReviewBtn && (
                  <button
                    type="button"
                    onClick={() => setReviewBooking(b)}
                    className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs font-bold text-amber-700 transition hover:-translate-y-px hover:bg-amber-100"
                  >
                    ★ Napisz recenzję
                  </button>
                )}
              </div>

              {expandedId === b.id ? (
                <div className="mt-4 rounded-2xl border border-brand-dark/[.08] bg-white p-4 shadow-inner dark:border-white/15 dark:bg-[var(--bg2)] sm:p-5">
                  <h3 className="text-sm font-extrabold uppercase tracking-wide text-brand-dark dark:text-white">Szczegóły rezerwacji</h3>
                  <div className="mt-3 grid grid-cols-1 gap-3 text-sm text-text-secondary dark:text-white/75 sm:grid-cols-2">
                    <div className="rounded-xl border border-brand-dark/[.08] bg-[#f8faf9] px-3 py-2.5 dark:border-white/15 dark:bg-[var(--bg3)]">
                      <p className="text-[11px] font-bold uppercase tracking-wide text-text-muted">Termin</p>
                      <p className="mt-1 font-semibold text-brand-dark dark:text-white">{fmtDate(b.check_in)} - {fmtDate(b.check_out)}</p>
                    </div>
                    <div className="rounded-xl border border-brand-dark/[.08] bg-[#f8faf9] px-3 py-2.5 dark:border-white/15 dark:bg-[var(--bg3)]">
                      <p className="text-[11px] font-bold uppercase tracking-wide text-text-muted">Status</p>
                      <p className="mt-1 font-semibold text-brand-dark dark:text-white">{statusPl[b.status] ?? b.status}</p>
                    </div>
                    <div className="rounded-xl border border-brand-dark/[.08] bg-[#f8faf9] px-3 py-2.5 dark:border-white/15 dark:bg-[var(--bg3)] sm:col-span-2">
                      <p className="text-[11px] font-bold uppercase tracking-wide text-text-muted">Polityka anulacji</p>
                      <p className="mt-1 font-semibold text-brand-dark dark:text-white">{b.cancellation_policy_snapshot || "Brak informacji"}</p>
                    </div>
                    <div className="rounded-xl border border-brand-dark/[.08] bg-[#f8faf9] px-3 py-2.5 dark:border-white/15 dark:bg-[var(--bg3)] sm:col-span-2">
                      <p className="text-[11px] font-bold uppercase tracking-wide text-text-muted">Wiadomość do gospodarza</p>
                      <p className="mt-1 font-semibold text-brand-dark dark:text-white">{b.special_requests?.trim() || "Brak"}</p>
                    </div>
                    <div className="rounded-xl border border-brand-dark/[.08] bg-[#f8faf9] px-3 py-2.5 dark:border-white/15 dark:bg-[var(--bg3)] sm:col-span-2">
                      <p className="text-[11px] font-bold uppercase tracking-wide text-text-muted">Podział kosztów</p>
                      <p className="mt-1 font-semibold text-brand-dark dark:text-white">{splitInfo || "Brak zapisanego podziału"}</p>
                    </div>
                  </div>

                  {Array.isArray(b.status_history) && b.status_history.length > 0 ? (
                    <div className="mt-4 rounded-xl border border-brand-dark/[.08] bg-[#f8faf9] p-3.5 dark:border-white/15 dark:bg-[var(--bg3)]">
                      <p className="text-[11px] font-bold uppercase tracking-wide text-brand-dark">Historia statusów</p>
                      <ul className="mt-2 space-y-1.5 text-xs text-text-secondary">
                        {b.status_history.slice(-4).reverse().map((h) => (
                          <li key={h.id} className="rounded-lg bg-white px-2.5 py-2 ring-1 ring-black/[.04] dark:bg-[var(--bg2)] dark:ring-white/15">
                            <span className="font-semibold text-brand-dark dark:text-white">{fmtDate(h.created_at)}</span>
                            {" - "}
                            {statusPl[h.new_status] ?? h.new_status}
                            {h.note ? ` (${h.note})` : ""}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </li>
              );
            })()
          ))}
        </ul>
      </div>
    </>
  );
}
