"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
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

export function BookingsPageClient() {
  const router = useRouter();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

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
        <div className="rounded-[28px] border border-brand-dark/[.08] bg-white p-10 text-center shadow-[0_30px_80px_-45px_rgba(15,23,42,0.4)]">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-muted text-2xl">📅</div>
          <h1 className="text-3xl font-black tracking-tight text-brand-dark">Moje rezerwacje</h1>
          <p className="mt-3 text-text-secondary">Nie masz jeszcze żadnych rezerwacji. Znajdź wymarzone miejsce i zarezerwuj je w kilka kliknięć.</p>
          <Link href="/search" className="btn-primary mt-8 inline-block px-8 py-3 text-sm font-bold">
            Szukaj noclegów
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <div className="relative overflow-hidden rounded-[32px] border border-brand-dark/[.08] bg-gradient-to-br from-brand-dark via-[#0f5f2e] to-[#15803d] p-7 text-white shadow-[0_35px_90px_-45px_rgba(21,128,61,0.65)] sm:p-8">
        <div className="pointer-events-none absolute -right-8 -top-10 h-44 w-44 rounded-full bg-white/10 blur-3xl" />
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/80">Twoje konto</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight">Moje rezerwacje</h1>
        <p className="mt-2 max-w-2xl text-sm text-white/85">Zarządzaj pobytami, sprawdzaj szczegóły, anuluj rezerwację i skontaktuj się bezpośrednio z gospodarzem.</p>
      </div>

      <ul className="mt-8 space-y-5">
        {sortedRows.map((b) => (
          (() => {
            const nights = nightsCount(b.check_in, b.check_out);
            const isBusy = busyId === b.id;
            const canCancel = cancellableStatuses.has(b.status);
            return (
          <li
            key={b.id}
            className="group overflow-hidden rounded-[26px] border border-brand-dark/[.08] bg-white p-5 shadow-[0_20px_45px_-36px_rgba(15,23,42,0.45)] transition-all duration-300 hover:-translate-y-[2px] hover:shadow-[0_28px_70px_-34px_rgba(15,23,42,0.45)] sm:p-6"
          >
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ring-1 ${statusTone(b.status)}`}>
                    {statusPl[b.status] ?? b.status}
                  </span>
                  {b.confirmation_email_sent ? (
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-600 ring-1 ring-slate-200">
                      Potwierdzenie e-mail
                    </span>
                  ) : null}
                </div>
                <Link
                  href={`/listing/${b.listing_slug}`}
                  className="line-clamp-2 text-[22px] font-black leading-tight tracking-tight text-brand-dark transition-colors hover:text-brand"
                >
                  {b.listing_title}
                </Link>
                <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm font-medium text-text-secondary">
                  <span>📍 {b.listing_slug}</span>
                  <span>👥 {b.guests_count} {b.guests_count === 1 ? "gość" : "gości"}</span>
                  {nights ? <span>🌙 {nights} {nights === 1 ? "noc" : "nocy"}</span> : null}
                </p>
              </div>
              <div className="rounded-2xl border border-brand-dark/[.08] bg-[#f8faf9] px-4 py-3 text-right shadow-inner sm:min-w-[170px]">
                <p className="text-[11px] font-bold uppercase tracking-wide text-text-muted">Do zapłaty</p>
                <p className="mt-1 text-2xl font-black tracking-tight text-brand-dark">
                  {b.final_amount} {b.currency}
                </p>
                <p className="mt-1 text-[11px] text-text-muted">ID: {b.id.slice(0, 8).toUpperCase()}</p>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-2 rounded-2xl border border-brand-dark/[.08] bg-[#f8faf9] p-4 text-sm text-text-secondary sm:grid-cols-2">
              <p>
                <span className="font-semibold text-brand-dark">Przyjazd:</span> {fmtDate(b.check_in)}
              </p>
              <p>
                <span className="font-semibold text-brand-dark">Wyjazd:</span> {fmtDate(b.check_out)}
              </p>
            </div>

            <div className="mt-4 flex flex-wrap gap-2.5">
              <button
                type="button"
                onClick={() => setExpandedId((prev) => (prev === b.id ? null : b.id))}
                className="rounded-xl border border-brand-dark/[.1] bg-white px-4 py-2.5 text-xs font-bold text-brand-dark transition hover:-translate-y-px hover:bg-brand-surface"
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
            </div>

            {expandedId === b.id ? (
              <div className="mt-4 rounded-2xl border border-brand-dark/[.08] bg-white p-4 shadow-inner sm:p-5">
                <h3 className="text-sm font-extrabold uppercase tracking-wide text-brand-dark">Szczegóły rezerwacji</h3>
                <div className="mt-3 grid grid-cols-1 gap-3 text-sm text-text-secondary sm:grid-cols-2">
                  <div className="rounded-xl border border-brand-dark/[.08] bg-[#f8faf9] px-3 py-2.5">
                    <p className="text-[11px] font-bold uppercase tracking-wide text-text-muted">Termin</p>
                    <p className="mt-1 font-semibold text-brand-dark">{fmtDate(b.check_in)} - {fmtDate(b.check_out)}</p>
                  </div>
                  <div className="rounded-xl border border-brand-dark/[.08] bg-[#f8faf9] px-3 py-2.5">
                    <p className="text-[11px] font-bold uppercase tracking-wide text-text-muted">Status</p>
                    <p className="mt-1 font-semibold text-brand-dark">{statusPl[b.status] ?? b.status}</p>
                  </div>
                  <div className="rounded-xl border border-brand-dark/[.08] bg-[#f8faf9] px-3 py-2.5 sm:col-span-2">
                    <p className="text-[11px] font-bold uppercase tracking-wide text-text-muted">Polityka anulacji</p>
                    <p className="mt-1 font-semibold text-brand-dark">{b.cancellation_policy_snapshot || "Brak informacji"}</p>
                  </div>
                  <div className="rounded-xl border border-brand-dark/[.08] bg-[#f8faf9] px-3 py-2.5 sm:col-span-2">
                    <p className="text-[11px] font-bold uppercase tracking-wide text-text-muted">Wiadomość do gospodarza</p>
                    <p className="mt-1 font-semibold text-brand-dark">{b.special_requests?.trim() || "Brak"}</p>
                  </div>
                </div>

                {Array.isArray(b.status_history) && b.status_history.length > 0 ? (
                  <div className="mt-4 rounded-xl border border-brand-dark/[.08] bg-[#f8faf9] p-3.5">
                    <p className="text-[11px] font-bold uppercase tracking-wide text-brand-dark">Historia statusów</p>
                    <ul className="mt-2 space-y-1.5 text-xs text-text-secondary">
                      {b.status_history.slice(-4).reverse().map((h) => (
                        <li key={h.id} className="rounded-lg bg-white px-2.5 py-2 ring-1 ring-black/[.04]">
                          <span className="font-semibold text-brand-dark">{fmtDate(h.created_at)}</span>
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
  );
}
