"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";

import { api } from "@/lib/api";
import { countNights, formatDate } from "@/lib/utils/dates";
import { mapBookingToHostBooking } from "@/lib/utils/hostMap";
import { cn } from "@/lib/utils";
import { useHostStore } from "@/lib/store/hostStore";
import type { HostBooking } from "@/types/host";
import {
  addDays,
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { pl } from "date-fns/locale";

function formatPLN(n: number): string {
  return new Intl.NumberFormat("pl-PL", {
    style: "currency",
    currency: "PLN",
    maximumFractionDigits: 0,
  }).format(n);
}

function StatCard({
  value,
  label,
  changePct,
  delayMs,
}: {
  value: string;
  label: string;
  changePct?: number | null;
  delayMs: number;
}) {
  const pos = changePct != null && changePct >= 0;
  return (
    <div
      className="animate-fade-up rounded-xl border border-[#e5e7eb] bg-white px-4 py-4 text-center"
      style={{ animationDelay: `${delayMs}ms` }}
    >
      <p className="text-lg font-extrabold text-brand-dark">{value}</p>
      <p className="text-xs text-text-muted">{label}</p>
      {changePct != null ? (
        <p className={cn("mt-1 text-xs font-semibold", pos ? "text-brand" : "text-red-600")}>
          {pos ? "+" : ""}
          {changePct.toFixed(0)}% vs ostatni miesiąc
        </p>
      ) : null}
    </div>
  );
}

export default function HostDashboardPage() {
  const profile = useHostStore((s) => s.profile);
  const stats = useHostStore((s) => s.stats);
  const bookings = useHostStore((s) => s.bookings);
  const pendingCount = useHostStore((s) => s.pendingCount);
  const setBookings = useHostStore((s) => s.setBookings);

  const [listings, setListings] = useState<{ id: string; slug: string; title: string }[]>([]);
  const [bookedDates, setBookedDates] = useState<string[]>([]);
  const [blockedDates, setBlockedDates] = useState<string[]>([]);
  const [month, setMonth] = useState(() => new Date());
  const [blockOpen, setBlockOpen] = useState(false);

  const firstSlug = listings[0]?.slug;

  useEffect(() => {
    let c = false;
    (async () => {
      try {
        const res = await api.get<{ data: { slug: string; id: string; title: string }[] }>(
          "/api/v1/host/listings/"
        );
        if (!c && Array.isArray(res.data)) {
          setListings(res.data.map((x) => ({ id: x.id, slug: x.slug, title: x.title })));
        }
      } catch {
        if (!c) setListings([]);
      }
    })();
    return () => {
      c = true;
    };
  }, []);

  const loadCalendar = useCallback(async () => {
    if (!firstSlug) {
      setBookedDates([]);
      setBlockedDates([]);
      return;
    }
    try {
      const res = await api.get<{
        data: { booked_dates?: string[]; blocked_dates?: string[] };
      }>(`/api/v1/listings/${firstSlug}/availability/`);
      setBookedDates(res.data?.booked_dates ?? []);
      setBlockedDates(res.data?.blocked_dates ?? []);
    } catch {
      setBookedDates([]);
      setBlockedDates([]);
    }
  }, [firstSlug]);

  useEffect(() => {
    void loadCalendar();
  }, [loadCalendar]);

  const pendingBookings = useMemo(
    () => bookings.filter((b) => b.status === "pending"),
    [bookings]
  );

  const revenueChange = useMemo(() => {
    if (!stats) return null;
    const cur = stats.revenue_this_month;
    const prev = stats.revenue_last_month;
    if (prev === 0) return cur > 0 ? 100 : 0;
    return ((cur - prev) / prev) * 100;
  }, [stats]);

  const monthLabel = format(month, "LLLL yyyy", { locale: pl });
  const gridDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(month), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(month), { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [month]);

  const patchBookingStatus = async (id: string, status: "confirmed" | "rejected") => {
    try {
      await api.patch(`/api/v1/host/bookings/${id}/status/`, { status });
      toast.success(
        status === "confirmed"
          ? "Rezerwacja potwierdzona! Gość dostanie e-mail."
          : "Rezerwacja odrzucona."
      );
      const res = await api.get<{ data: Record<string, unknown>[] }>("/api/v1/host/bookings/");
      setBookings(res.data.map((b) => mapBookingToHostBooking(b)));
    } catch (e) {
      toast.error((e as Error).message || "Błąd");
    }
  };

  return (
    <div className="p-6 lg:p-8">
      <header className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-[22px] font-extrabold text-brand-dark">
            Dzień dobry, {profile?.display_name ?? "Gospodarzu"} 👋
          </h1>
          <p className="text-sm text-text-secondary">
            {pendingCount > 0 ? `Masz ${pendingCount} nowych próśb` : "Wszystko aktualne"}{" "}
            <span className="text-text-muted">
              · {format(new Date(), "EEEE, d MMMM yyyy", { locale: pl })}
            </span>
          </p>
        </div>
        <Link href="/host/new-listing" className="btn-primary shrink-0">
          + Dodaj ofertę
        </Link>
      </header>

      {stats ? (
        <div className="mb-6 grid grid-cols-2 gap-3.5 lg:grid-cols-4">
          <StatCard
            value={formatPLN(stats.revenue_this_month)}
            label="Przychód PLN"
            changePct={revenueChange}
            delayMs={0}
          />
          <StatCard value={`${stats.occupancy_percent}%`} label="Obłożenie" delayMs={80} />
          <StatCard value={stats.avg_rating.toFixed(2)} label="Śr. ocena" delayMs={160} />
          <StatCard
            value={String(stats.bookings_count)}
            label={`Rezerwacje · ${stats.bookings_pending} oczekujących`}
            delayMs={240}
          />
        </div>
      ) : null}

      <section className="mb-6">
        <div className="mb-3 flex items-center gap-2">
          <h2 className="text-base font-extrabold text-brand-dark">Prośby o rezerwację</h2>
          {pendingCount > 0 ? (
            <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-900">
              {pendingCount} oczekujące
            </span>
          ) : null}
        </div>
        {pendingBookings.length === 0 ? (
          <p className="text-sm text-text-muted">Brak oczekujących próśb.</p>
        ) : (
          <ul className="space-y-2.5">
            {pendingBookings.map((b) => (
              <PendingBookingCard
                key={b.id}
                booking={b}
                onAccept={() => patchBookingStatus(b.id, "confirmed")}
                onReject={() => {
                  if (confirm("Czy na pewno chcesz odrzucić rezerwację?")) {
                    void patchBookingStatus(b.id, "rejected");
                  }
                }}
              />
            ))}
          </ul>
        )}
      </section>

      <section>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-extrabold capitalize text-brand-dark">
            Kalendarz — {monthLabel}
          </h2>
          <div className="flex gap-2">
            <button
              type="button"
              className="btn-secondary text-xs"
              onClick={() => setMonth((d) => subMonths(d, 1))}
            >
              ←
            </button>
            <button
              type="button"
              className="btn-secondary text-xs"
              onClick={() => setMonth((d) => addMonths(d, 1))}
            >
              →
            </button>
          </div>
        </div>

        {!firstSlug ? (
          <p className="text-sm text-text-muted">Dodaj ofertę, aby zobaczyć kalendarz obłożenia.</p>
        ) : (
          <>
            <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-semibold text-text-muted">
              {["Pn", "Wt", "Śr", "Cz", "Pt", "So", "Nd"].map((d) => (
                <div key={d}>{d}</div>
              ))}
            </div>
            <div className="mt-1 grid grid-cols-7 gap-1">
              {gridDays.map((day) => {
                const iso = format(day, "yyyy-MM-dd");
                const inMonth = isSameMonth(day, month);
                const isBooked = bookedDates.includes(iso);
                const isBlocked = blockedDates.includes(iso);
                const isToday = isSameDay(day, new Date());
                const past = day < new Date() && !isToday;
                return (
                  <button
                    key={iso}
                    type="button"
                    disabled={past}
                    onClick={() => {
                      if (!past && inMonth && !isBooked && !isBlocked) setBlockOpen(true);
                    }}
                    className={cn(
                      "flex min-h-[52px] flex-col items-center justify-center rounded-lg border border-transparent p-1 text-xs transition-colors",
                      !inMonth && "opacity-40",
                      past && "cursor-not-allowed opacity-35",
                      isBooked && "bg-[#dcfce7] font-bold text-brand-dark",
                      isBlocked && !isBooked && "bg-red-100 font-bold text-red-900",
                      isToday && "border-2 border-brand text-brand",
                      !isBooked && !isBlocked && !past && inMonth && "hover:bg-brand-surface"
                    )}
                  >
                    <span>{format(day, "d")}</span>
                    {isBooked ? <span className="text-[8px]">Rez.</span> : null}
                    {isBlocked && !isBooked ? <span className="text-[8px]">Blk.</span> : null}
                  </button>
                );
              })}
            </div>
            <div className="mt-3 flex flex-wrap gap-4 text-xs text-text-muted">
              <span>
                <span className="mr-1 inline-block h-2 w-2 rounded-full bg-[#dcfce7]" /> Zarezerwowane
              </span>
              <span>
                <span className="mr-1 inline-block h-2 w-2 rounded-full bg-red-200" /> Zablokowane
              </span>
              <span>
                <span className="mr-1 inline-block h-2 w-2 rounded-full bg-brand" /> Dziś
              </span>
            </div>
          </>
        )}
      </section>

      {blockOpen ? (
        <BlockDatesModal
          listingId={listings[0]?.id}
          onClose={() => setBlockOpen(false)}
          onDone={() => {
            setBlockOpen(false);
            void loadCalendar();
          }}
        />
      ) : null}
    </div>
  );
}

function PendingBookingCard({
  booking,
  onAccept,
  onReject,
}: {
  booking: HostBooking;
  onAccept: () => void;
  onReject: () => void;
}) {
  const nights = countNights(booking.check_in, booking.check_out);
  const guest = booking.guest;
  const initials =
    `${guest.first_name?.[0] ?? ""}${guest.last_name?.[0] ?? ""}`.toUpperCase() || "?";

  return (
    <li className="flex flex-col gap-3 rounded-xl border border-[#e5e7eb] p-4 transition-colors hover:border-[#bbf7d0] hover:bg-brand-surface sm:flex-row sm:items-center">
      <div className="flex flex-1 items-center gap-3.5">
        <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-full bg-brand-muted text-sm font-bold text-brand-dark">
          {guest.avatar_url ? (
            <Image src={guest.avatar_url} alt="" width={44} height={44} className="object-cover" unoptimized />
          ) : (
            <span className="flex h-full w-full items-center justify-center">{initials}</span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-brand-dark">
            {guest.first_name} {guest.last_name}
          </p>
          <p className="mt-0.5 flex flex-wrap gap-2 text-xs text-text-muted">
            <span>
              📅 {formatDate(booking.check_in)} – {formatDate(booking.check_out)} · {nights} nocy
            </span>
            <span>👥 {booking.guests_count} gości</span>
            <span className="font-bold text-brand-dark">
              {booking.final_amount} {booking.currency}
            </span>
          </p>
          <span className="badge-green mt-1 inline-block">Oczekująca</span>
        </div>
      </div>
      <div className="flex shrink-0 flex-wrap gap-2">
        <button
          type="button"
          className="btn-secondary px-3 py-2"
          title="Czat"
          onClick={() => {
            const cid = booking.conversation_id;
            window.location.href = cid
              ? `/host/messages?conv=${encodeURIComponent(cid)}`
              : "/host/messages";
          }}
        >
          💬
        </button>
        <button type="button" className="btn-secondary px-3 py-2 text-xs" onClick={onReject}>
          Odrzuć
        </button>
        <button type="button" className="btn-primary px-3 py-2 text-xs" onClick={onAccept}>
          Akceptuj
        </button>
      </div>
    </li>
  );
}

function BlockDatesModal({
  listingId,
  onClose,
  onDone,
}: {
  listingId?: string;
  onClose: () => void;
  onDone: () => void;
}) {
  const [reason, setReason] = useState("");
  const [from, setFrom] = useState(() => format(new Date(), "yyyy-MM-dd"));
  const [to, setTo] = useState(() => format(addDays(new Date(), 1), "yyyy-MM-dd"));

  const submit = async () => {
    if (!listingId) return;
    const start = new Date(from);
    const end = new Date(to);
    if (end < start) {
      toast.error("Data końcowa musi być po początkowej.");
      return;
    }
    const dates = eachDayOfInterval({ start, end }).map((d) => format(d, "yyyy-MM-dd"));
    try {
      await api.post(`/api/v1/host/listings/${listingId}/block-dates/`, {
        dates,
        reason: reason || undefined,
      });
      toast.success("Terminy zablokowane.");
      onDone();
    } catch {
      toast.error("Nie udało się zablokować (sprawdź endpoint backendu).");
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <h3 className="text-lg font-extrabold text-brand-dark">Zablokuj termin</h3>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="text-xs font-semibold text-text-secondary">
            Od
            <input type="date" className="input mt-1" value={from} onChange={(e) => setFrom(e.target.value)} />
          </label>
          <label className="text-xs font-semibold text-text-secondary">
            Do
            <input type="date" className="input mt-1" value={to} onChange={(e) => setTo(e.target.value)} />
          </label>
        </div>
        <label className="mt-3 block text-xs font-semibold text-text-secondary">
          Powód (opcjonalnie)
          <input
            className="input mt-1"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="np. Konserwacja"
          />
        </label>
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Anuluj
          </button>
          <button type="button" className="btn-primary" onClick={() => void submit()}>
            Zablokuj
          </button>
        </div>
      </div>
    </div>
  );
}
