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

import { motion, AnimatePresence } from "framer-motion";

const CARD = "rounded-[32px] bg-white shadow-[0_4px_20px_rgba(0,0,0,0.03)] ring-1 ring-black/[0.02] dark:bg-[var(--bg2)] dark:ring-brand-border/45";

const STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  pending: { label: "Oczekująca", cls: "bg-amber-50 text-amber-700 ring-1 ring-amber-500/10" },
  awaiting_payment: { label: "Oczekuje płatności", cls: "bg-blue-50 text-blue-700 ring-1 ring-blue-500/10" },
  confirmed: { label: "Potwierdzona", cls: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-500/10" },
  cancelled: { label: "Anulowana", cls: "bg-gray-50 text-gray-500 ring-1 ring-gray-500/10" },
  rejected: { label: "Odrzucona", cls: "bg-red-50 text-red-700 ring-1 ring-red-500/10" },
  completed: { label: "Zakończona", cls: "bg-brand-surface text-brand-dark ring-1 ring-brand/10" },
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
    <div className="mx-auto max-w-7xl p-3.5 sm:p-6 lg:p-10">
      <div className="mb-7 sm:mb-10">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <p className="mb-1.5 text-[11px] font-extrabold uppercase tracking-[.2em] text-brand sm:text-[12px] sm:tracking-[.25em]">Zarządzanie</p>
          <h1 className="text-[30px] font-black tracking-tight text-brand-dark sm:text-4xl">{title}</h1>
        </motion.div>
        
        <div className="mt-5 flex flex-wrap gap-2 border-b border-brand-dark/5 pb-5 sm:mt-8 sm:gap-3 sm:pb-8">
          {([
            ["/host/bookings", undefined, "Wszystkie"],
            ["/host/bookings/pending", "pending", "Oczekujące"],
            ["/host/bookings/confirmed", "confirmed", "Potwierdzone"],
          ] as const).map(([href, sf, label]) => (
            <Link
              key={href}
              href={href}
              className={cn(
                "relative rounded-xl px-4 py-2.5 text-[13px] font-bold transition-all duration-300 sm:px-6 sm:text-sm",
                statusFilter === sf
                  ? "bg-brand text-white shadow-lg shadow-brand/20 ring-1 ring-brand/10"
                  : "bg-white text-brand-dark/60 hover:text-brand-dark hover:bg-brand-surface/40 hover:shadow-sm ring-1 ring-black/[.03] dark:bg-[var(--bg3)] dark:text-[var(--text2)] dark:ring-brand-border/50"
              )}
            >
              {label}
              {statusFilter === sf && (
                <motion.div layoutId="filter-pill-bookings" className="absolute inset-0 rounded-xl bg-brand -z-10" />
              )}
            </Link>
          ))}
        </div>
      </div>

      {err && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border-l-4 border-red-500 bg-red-50 p-6 shadow-sm mb-8"
        >
          <p className="font-bold text-red-800">Błąd: {err}</p>
        </motion.div>
      )}

      {bookings === null ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <LoadingSpinner className="h-12 w-12 text-brand" />
          <p className="text-brand-dark/40 font-bold animate-pulse">Ładowanie rezerwacji...</p>
        </div>
      ) : bookings.length === 0 ? (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="rounded-[40px] bg-white border-2 border-dashed border-brand/20 py-24 text-center shadow-[0_20px_50px_rgba(22,163,74,0.03)] dark:bg-[var(--bg2)]"
        >
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-brand-surface text-4xl mb-6">📋</div>
          <p className="text-2xl font-black text-brand-dark">Cisza przed burzą?</p>
          <p className="mt-2 text-text-secondary max-w-sm mx-auto">
            {statusFilter ? "Brak rezerwacji o wybranym statusie." : "Jeszcze nie masz żadnych rezerwacji. Upewnij się, że Twoje ceny są konkurencyjne!"}
          </p>
        </motion.div>
      ) : (
        <div className="space-y-3.5 sm:space-y-4">
          <AnimatePresence mode="popLayout">
            {bookings.map((b, idx) => {
              const st = STATUS_LABELS[b.status] ?? { label: b.status, cls: "bg-gray-100 text-gray-600" };
              const nights = countNights(b.check_in, b.check_out);
              const initials = `${b.guest.first_name?.[0] ?? ""}${b.guest.last_name?.[0] ?? ""}`.toUpperCase() || "?";

              return (
                <motion.div
                  layout
                  key={b.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0, transition: { delay: idx * 0.05 } }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className={cn(CARD, "group flex flex-col gap-4 p-4 transition-all duration-500 hover:-translate-y-1 hover:shadow-[0_20px_40px_rgba(0,0,0,0.06)] hover:ring-brand/10 sm:flex-row sm:items-center sm:gap-6 sm:p-6")}
                >
                  <div className="flex flex-1 items-center gap-3.5 sm:gap-5">
                    <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full bg-brand-muted text-base font-black text-brand-dark ring-4 ring-brand/5 transition-transform duration-500 group-hover:scale-105 sm:h-14 sm:w-14 sm:text-lg">
                      {b.guest.avatar_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={b.guest.avatar_url} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <span className="flex h-full w-full items-center justify-center">{initials}</span>
                      )}
                    </div>
                    
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
                        <span className="text-base font-black tracking-tight text-brand-dark sm:text-lg">
                          {b.guest.first_name} {b.guest.last_name}
                        </span>
                        <span className={cn("rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-wider", st.cls)}>{st.label}</span>
                      </div>
                      <p className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[13px] font-medium text-text-muted sm:gap-x-3 sm:text-sm">
                        <Link href={`/listing/${b.listing.slug}`} className="font-bold text-brand hover:underline">
                          {b.listing.title}
                        </Link>
                        <span className="opacity-30">|</span>
                        <span className="flex items-center gap-1.5">📅 {formatDate(b.check_in)} – {formatDate(b.check_out)}</span>
                        <span className="opacity-30">|</span>
                        <span>{nights} {nights === 1 ? "noc" : "nocy"}</span>
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-3 text-xs sm:gap-4">
                        <span className="flex items-center gap-1.5 font-bold text-brand-dark">👥 {b.guests_count} gości</span>
                        <span className="h-1.5 w-1.5 rounded-full bg-brand/20" />
                        <span className="text-sm font-black text-brand">{b.final_amount} {b.currency}</span>
                        {b.special_requests && (
                          <div className="w-full mt-2 rounded-xl bg-gray-50 px-4 py-2.5 text-[13px] italic text-text-muted border-l-2 border-brand/20 dark:bg-[var(--bg3)]">
                            &bdquo;{b.special_requests}&rdquo;
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                   <div className="grid w-full grid-cols-1 gap-2 sm:flex sm:w-auto sm:shrink-0 sm:flex-wrap sm:justify-end">
                    {b.status === "pending" && (
                      <>
                        <button
                          type="button"
                          className="h-11 rounded-xl bg-red-50 px-5 text-sm font-black text-red-500 transition-all hover:bg-red-500 hover:text-white hover:shadow-lg hover:shadow-red-200 active:scale-95"
                          onClick={() => { if (confirm("Odrzucić rezerwację?")) void patchStatus(b.id, "rejected"); }}
                        >
                          Odrzuć
                        </button>
                        <button
                          type="button"
                          className="btn-primary h-11 rounded-xl px-6 text-sm font-black shadow-brand-lg"
                          onClick={() => void patchStatus(b.id, "confirmed")}
                        >
                          Akceptuj
                        </button>
                      </>
                    )}
                    {b.conversation_id && (
                      <Link 
                        href={`/host/messages?conv=${encodeURIComponent(b.conversation_id)}`} 
                        className="flex h-11 items-center justify-center gap-2 rounded-xl border border-black/[0.05] bg-white px-5 text-sm font-black text-brand-dark transition-all hover:bg-brand-surface hover:text-brand hover:shadow-md active:scale-95 dark:border-brand-border/60 dark:bg-[var(--bg3)] dark:text-[var(--foreground)] dark:hover:bg-[var(--bg2)]"
                      >
                        💬 Wiadomość
                      </Link>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
