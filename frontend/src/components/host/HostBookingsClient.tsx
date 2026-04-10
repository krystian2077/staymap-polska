"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { api } from "@/lib/api";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { formatDate, countNights } from "@/lib/utils/dates";
import { mapBookingToHostBooking } from "@/lib/utils/hostMap";
import { cn } from "@/lib/utils";
import type { HostBooking } from "@/types/host";

const CARD = "rounded-2xl bg-white shadow-card ring-1 ring-black/[.04]";

const STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  pending: { label: "Oczekująca", cls: "bg-amber-100 text-amber-800" },
  awaiting_payment: { label: "Oczekuje płatności", cls: "bg-blue-100 text-blue-800" },
  confirmed: { label: "Potwierdzona", cls: "bg-emerald-100 text-emerald-800" },
  cancelled: { label: "Anulowana", cls: "bg-gray-100 text-gray-500" },
  rejected: { label: "Odrzucona", cls: "bg-red-100 text-red-800" },
  completed: { label: "Zakończona", cls: "bg-brand-muted text-brand-dark" },
};

export function HostBookingsClient({
  title,
  statusFilter,
}: {
  title: string;
  statusFilter?: string;
}) {
  const [bookings, setBookings] = useState<HostBooking[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const load = async () => {
    try {
      const params: Record<string, string> = {};
      if (statusFilter) params.status = statusFilter;
      const res = await api.get<{ data: Record<string, unknown>[] }>("/api/v1/host/bookings/", params);
      setBookings(Array.isArray(res.data) ? res.data.map(mapBookingToHostBooking) : []);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Błąd ładowania rezerwacji.");
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  const patchStatus = async (id: string, status: "confirmed" | "rejected") => {
    try {
      await api.patch(`/api/v1/host/bookings/${id}/status/`, { status });
      toast.success(status === "confirmed" ? "Rezerwacja potwierdzona!" : "Rezerwacja odrzucona.");
      await load();
    } catch (e) {
      toast.error((e as Error).message || "Błąd");
    }
  };

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-6">
        <p className="text-[11px] font-extrabold uppercase tracking-[.15em] text-brand">Rezerwacje</p>
        <h1 className="mt-1 text-[22px] font-extrabold text-brand-dark">{title}</h1>
        <div className="mt-3 flex flex-wrap gap-2">
          {([
            ["/host/bookings", undefined, "Wszystkie"],
            ["/host/bookings/pending", "pending", "Oczekujące"],
            ["/host/bookings/confirmed", "confirmed", "Potwierdzone"],
          ] as const).map(([href, sf, label]) => (
            <Link
              key={href}
              href={href}
              className={cn(
                "rounded-full px-3 py-1.5 text-xs font-semibold ring-1 transition-colors",
                statusFilter === sf
                  ? "ring-brand bg-brand-muted text-brand-dark"
                  : "ring-black/[.04] text-text-secondary hover:ring-brand/20 hover:shadow-elevated"
              )}
            >
              {label}
            </Link>
          ))}
        </div>
      </div>

      {err && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{err}</p>
      )}

      {bookings === null ? (
        <div className="flex justify-center py-16">
          <LoadingSpinner className="h-10 w-10 text-brand" />
        </div>
      ) : bookings.length === 0 ? (
        <div className="rounded-2xl bg-brand-surface/50 ring-1 ring-brand/5 py-16 text-center">
          <span className="text-4xl">📋</span>
          <p className="mt-3 text-lg font-bold text-brand-dark">Brak rezerwacji</p>
          <p className="mt-1 text-sm text-text-muted">
            {statusFilter ? "Brak rezerwacji o podanym statusie." : "Gdy goście dokonają rezerwacji, pojawią się tutaj."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {bookings.map((b) => {
            const st = STATUS_LABELS[b.status] ?? { label: b.status, cls: "bg-gray-100 text-gray-600" };
            const nights = countNights(b.check_in, b.check_out);
            const initials = `${b.guest.first_name?.[0] ?? ""}${b.guest.last_name?.[0] ?? ""}`.toUpperCase() || "?";

            return (
              <div
                key={b.id}
                className={`${CARD} flex flex-col gap-4 p-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-elevated sm:flex-row sm:items-center`}
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-muted text-sm font-bold text-brand-dark">
                  {initials}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-bold text-brand-dark">
                      {b.guest.first_name} {b.guest.last_name}
                    </span>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${st.cls}`}>{st.label}</span>
                  </div>
                  <p className="mt-1 text-xs text-text-muted">
                    <Link href={`/listing/${b.listing.slug}`} className="font-semibold text-brand-dark hover:underline">
                      {b.listing.title}
                    </Link>
                    {" · "}
                    {formatDate(b.check_in)} – {formatDate(b.check_out)} · {nights} {nights === 1 ? "noc" : "nocy"}
                  </p>
                  <p className="mt-0.5 text-xs text-text-muted">
                    👥 {b.guests_count} gości · <span className="font-bold text-brand-dark">{b.final_amount} {b.currency}</span>
                      {b.special_requests && (
                        <span className="ml-2 italic">&bdquo;{b.special_requests.slice(0, 80)}{b.special_requests.length > 80 ? "…" : ""}&rdquo;</span>
                      )}
                  </p>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  {b.status === "pending" && (
                    <>
                      <button
                        type="button"
                        className="rounded-lg ring-1 ring-black/[.06] px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50"
                        onClick={() => { if (confirm("Odrzucić rezerwację?")) void patchStatus(b.id, "rejected"); }}
                      >
                        Odrzuć
                      </button>
                      <button
                        type="button"
                        className="btn-primary px-3 py-1.5 text-xs"
                        onClick={() => void patchStatus(b.id, "confirmed")}
                      >
                        Akceptuj
                      </button>
                    </>
                  )}
                  {b.conversation_id && (
                    <Link href={`/host/messages?conv=${encodeURIComponent(b.conversation_id)}`} className="rounded-lg ring-1 ring-black/[.06] px-3 py-1.5 text-xs font-medium hover:bg-brand-surface/60">
                      💬 Czat
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
