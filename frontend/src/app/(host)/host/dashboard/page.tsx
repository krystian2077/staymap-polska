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
import { useMessagingStore } from "@/lib/store/messagingStore";
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
  return new Intl.NumberFormat("pl-PL", { style: "currency", currency: "PLN", maximumFractionDigits: 0 }).format(n);
}

const CARD = "rounded-2xl bg-white shadow-card ring-1 ring-black/[.04]";

function StatCard({ icon, value, label, changePct, delayMs }: {
  icon: string; value: string; label: string; changePct?: number | null; delayMs: number;
}) {
  const pos = changePct != null && changePct >= 0;
  return (
    <div className={cn(CARD, "animate-fade-up p-5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-elevated")} style={{ animationDelay: `${delayMs}ms` }}>
      <div className="flex items-start justify-between">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-surface text-lg ring-1 ring-brand/10">{icon}</div>
        {changePct != null && (
          <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold", pos ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700")}>
            {pos ? "↑" : "↓"} {Math.abs(changePct).toFixed(0)}%
          </span>
        )}
      </div>
      <p className="mt-3 text-2xl font-extrabold text-brand-dark">{value}</p>
      <p className="mt-0.5 text-xs text-text-muted">{label}</p>
    </div>
  );
}

function QuickAction({ icon, label, href, badge }: { icon: string; label: string; href: string; badge?: number }) {
  return (
    <Link href={href} className={cn(CARD, "flex items-center gap-3 px-4 py-3.5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-elevated")}>
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-surface text-base ring-1 ring-brand/10">{icon}</span>
      <span className="flex-1 text-sm font-semibold text-brand-dark">{label}</span>
      {badge != null && badge > 0 && (
        <span className="rounded-full bg-brand px-2 py-0.5 text-[10px] font-bold text-white shadow-sm shadow-brand/20">{badge}</span>
      )}
      <span className="text-text-muted transition-transform group-hover:translate-x-0.5">→</span>
    </Link>
  );
}

export default function HostDashboardPage() {
  const profile = useHostStore((s) => s.profile);
  const stats = useHostStore((s) => s.stats);
  const bookings = useHostStore((s) => s.bookings);
  const pendingCount = useHostStore((s) => s.pendingCount);
  const setBookings = useHostStore((s) => s.setBookings);
  const unreadTotal = useMessagingStore((s) => s.unreadTotal);

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
        const res = await api.get<{ data: { slug: string; id: string; title: string }[] }>("/api/v1/host/listings/");
        if (!c && Array.isArray(res.data)) setListings(res.data.map((x) => ({ id: x.id, slug: x.slug, title: x.title })));
      } catch { if (!c) setListings([]); }
    })();
    return () => { c = true; };
  }, []);

  const loadCalendar = useCallback(async () => {
    if (!firstSlug) { setBookedDates([]); setBlockedDates([]); return; }
    try {
      const res = await api.get<{ data: { booked_dates?: string[]; blocked_dates?: string[] } }>(`/api/v1/listings/${firstSlug}/availability/`);
      setBookedDates(res.data?.booked_dates ?? []);
      setBlockedDates(res.data?.blocked_dates ?? []);
    } catch { setBookedDates([]); setBlockedDates([]); }
  }, [firstSlug]);

  useEffect(() => { void loadCalendar(); }, [loadCalendar]);

  const pendingBookings = useMemo(() => bookings.filter((b) => b.status === "pending"), [bookings]);
  const confirmedBookings = useMemo(() => bookings.filter((b) => b.status === "confirmed"), [bookings]);

  const revenueChange = useMemo(() => {
    if (!stats) return null;
    const cur = stats.revenue_this_month, prev = stats.revenue_last_month;
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
      toast.success(status === "confirmed" ? "Rezerwacja potwierdzona!" : "Rezerwacja odrzucona.");
      const res = await api.get<{ data: Record<string, unknown>[] }>("/api/v1/host/bookings/");
      setBookings(res.data.map((b) => mapBookingToHostBooking(b)));
    } catch (e) { toast.error((e as Error).message || "Błąd"); }
  };

  return (
    <div className="p-6 lg:p-8">
      <header className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[11px] font-extrabold uppercase tracking-[.15em] text-brand">Panel gospodarza</p>
          <h1 className="mt-1.5 text-[26px] font-extrabold leading-tight text-brand-dark">
            Dzień dobry, {profile?.display_name ?? "Gospodarzu"} 👋
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            {format(new Date(), "EEEE, d MMMM yyyy", { locale: pl })}
            {pendingCount > 0 && (
              <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-500" />
                {pendingCount} oczekujących
              </span>
            )}
          </p>
        </div>
        <Link href="/host/new-listing" className="btn-primary shrink-0 px-5 py-2.5 shadow-brand-lg transition-shadow hover:shadow-brand-lg/80">
          + Dodaj nową ofertę
        </Link>
      </header>

      {stats && (
        <div className="mb-7 grid grid-cols-2 gap-4 xl:grid-cols-4">
          <StatCard icon="💰" value={formatPLN(stats.revenue_this_month)} label="Przychód ten miesiąc" changePct={revenueChange} delayMs={0} />
          <StatCard icon="📈" value={`${stats.occupancy_percent}%`} label="Obłożenie" delayMs={80} />
          <StatCard icon="⭐" value={stats.avg_rating > 0 ? stats.avg_rating.toFixed(2) : "—"} label="Średnia ocena" delayMs={160} />
          <StatCard icon="📋" value={String(stats.bookings_count)} label="Rezerwacje łącznie" delayMs={240} />
        </div>
      )}

      <div className="mb-7 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <QuickAction icon="📅" label="Kalendarz" href="/host/calendar" />
        <QuickAction icon="💬" label="Wiadomości" href="/host/messages" badge={unreadTotal} />
        <QuickAction icon="⭐" label="Recenzje" href="/host/reviews" badge={stats?.reviews_pending_response} />
        <QuickAction icon="💰" label="Zarobki" href="/host/earnings" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          <section className={cn(CARD, "p-5")}>
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-extrabold text-brand-dark">Prośby o rezerwację</h2>
                {pendingCount > 0 && (
                  <span className="flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-900">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-500" /> {pendingCount}
                  </span>
                )}
              </div>
              <Link href="/host/bookings/pending" className="text-xs font-semibold text-brand hover:underline">Pokaż wszystkie →</Link>
            </div>
            {pendingBookings.length === 0 ? (
              <div className="rounded-xl bg-brand-surface/50 px-4 py-8 text-center ring-1 ring-brand/5">
                <p className="text-sm text-text-muted">Brak oczekujących próśb — brawo! 🎉</p>
              </div>
            ) : (
              <ul className="space-y-2.5">
                {pendingBookings.slice(0, 3).map((b) => (
                  <PendingBookingCard key={b.id} booking={b}
                    onAccept={() => void patchBookingStatus(b.id, "confirmed")}
                    onReject={() => { if (confirm("Czy na pewno chcesz odrzucić rezerwację?")) void patchBookingStatus(b.id, "rejected"); }}
                  />
                ))}
              </ul>
            )}
          </section>

          {confirmedBookings.length > 0 && (
            <section className={cn(CARD, "p-5")}>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-base font-extrabold text-brand-dark">Nadchodzące rezerwacje</h2>
                <Link href="/host/bookings/confirmed" className="text-xs font-semibold text-brand hover:underline">Wszystkie →</Link>
              </div>
              <div className="space-y-2">
                {confirmedBookings.slice(0, 3).map((b) => (
                  <div key={b.id} className="flex items-center gap-3 rounded-xl bg-emerald-50/80 px-4 py-3 ring-1 ring-emerald-200/50 transition-colors hover:bg-emerald-50">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700 ring-1 ring-emerald-200/50">
                      {`${b.guest.first_name?.[0] ?? ""}${b.guest.last_name?.[0] ?? ""}`.toUpperCase() || "?"}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-brand-dark">{b.guest.first_name} {b.guest.last_name}</p>
                      <p className="text-xs text-text-muted">{b.listing.title} · {formatDate(b.check_in)} – {formatDate(b.check_out)}</p>
                    </div>
                    <span className="text-xs font-bold text-emerald-700">{b.final_amount} {b.currency}</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          <section className={cn(CARD, "p-5")}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-extrabold capitalize text-brand-dark">{monthLabel}</h2>
              <div className="flex gap-1.5">
                <button type="button" className="rounded-lg bg-brand-surface px-2.5 py-1 text-xs font-semibold text-brand-dark ring-1 ring-brand/10 transition-colors hover:bg-brand-muted" onClick={() => setMonth((d) => subMonths(d, 1))}>←</button>
                <button type="button" className="rounded-lg bg-brand-surface px-2.5 py-1 text-xs font-semibold text-brand-dark ring-1 ring-brand/10 transition-colors hover:bg-brand-muted" onClick={() => setMonth((d) => addMonths(d, 1))}>→</button>
              </div>
            </div>
            {!firstSlug ? (
              <div className="rounded-xl bg-brand-surface/50 px-4 py-8 text-center ring-1 ring-brand/5">
                <p className="text-sm text-text-muted">Dodaj ofertę, aby zobaczyć kalendarz obłożenia.</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold uppercase tracking-wider text-text-muted">
                  {["Pn", "Wt", "Śr", "Cz", "Pt", "So", "Nd"].map((d) => <div key={d} className="py-1">{d}</div>)}
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
                      <button key={iso} type="button" disabled={past}
                        onClick={() => { if (!past && inMonth && !isBooked && !isBlocked) setBlockOpen(true); }}
                        className={cn(
                          "flex min-h-[44px] flex-col items-center justify-center rounded-lg text-xs transition-all",
                          !inMonth && "opacity-25", past && "cursor-not-allowed opacity-20",
                          isBooked && "bg-emerald-50 font-bold text-emerald-700 ring-1 ring-emerald-200",
                          isBlocked && !isBooked && "bg-red-50 font-bold text-red-600 ring-1 ring-red-200",
                          isToday && "ring-2 ring-brand font-bold text-brand",
                          !isBooked && !isBlocked && !past && inMonth && "hover:bg-brand-surface/60"
                        )}
                      >
                        <span>{format(day, "d")}</span>
                        {isBooked && <span className="text-[7px]">Rez.</span>}
                        {isBlocked && !isBooked && <span className="text-[7px]">Blk.</span>}
                      </button>
                    );
                  })}
                </div>
                <div className="mt-3 flex gap-4 text-[10px] text-text-muted">
                  <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-200 ring-1 ring-emerald-300" />Rez.</span>
                  <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-red-200 ring-1 ring-red-300" />Blk.</span>
                  <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full ring-2 ring-brand" />Dziś</span>
                </div>
                <Link href="/host/calendar" className="mt-3 block text-center text-xs font-semibold text-brand hover:underline">Pełny kalendarz →</Link>
              </>
            )}
          </section>
        </div>

        <div className="space-y-5">
          <div className={cn(CARD, "p-5")}>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-extrabold text-brand-dark">Twoje oferty</h3>
              <Link href="/host/listings" className="text-xs font-semibold text-brand hover:underline">Wszystkie</Link>
            </div>
            {listings.length === 0 ? (
              <p className="mt-3 text-xs text-text-muted">Brak ofert.</p>
            ) : (
              <ul className="mt-3 space-y-1">
                {listings.slice(0, 4).map((l) => (
                  <li key={l.id}>
                    <Link href={`/listing/${l.slug}`} className="flex items-center gap-2 rounded-xl px-2.5 py-2 text-sm font-medium text-brand-dark transition-all hover:bg-brand-surface/70">
                      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-surface text-sm ring-1 ring-brand/10">🏠</span>
                      <span className="truncate">{l.title}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {stats && (
            <div className={cn(CARD, "p-5")}>
              <h3 className="text-sm font-extrabold text-brand-dark">Podsumowanie</h3>
              <div className="mt-4 space-y-3">
                {[
                  { label: "Oczekujące rezerwacje", val: stats.bookings_pending, warn: stats.bookings_pending > 0 },
                  { label: "Nowe wiadomości", val: unreadTotal, warn: unreadTotal > 0 },
                  { label: "Recenzje bez odpowiedzi", val: stats.reviews_pending_response, warn: stats.reviews_pending_response > 0 },
                  { label: "Aktywne oferty", val: listings.length, warn: false },
                ].map((row) => (
                  <div key={row.label} className="flex items-center justify-between text-xs">
                    <span className="text-text-muted">{row.label}</span>
                    <span className={cn("rounded-full px-2 py-0.5 font-bold", row.warn ? "bg-amber-50 text-amber-700" : "text-brand-dark")}>
                      {row.val}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="rounded-2xl bg-gradient-to-br from-brand-surface via-brand-muted/30 to-brand-surface p-5 ring-1 ring-brand/10">
            <h3 className="text-sm font-extrabold text-brand-dark">💡 Wskazówka</h3>
            <p className="mt-2 text-xs leading-relaxed text-text-secondary">
              Odpowiadaj na prośby o rezerwację w ciągu 24h — to znacząco podnosi Twój ranking w wynikach wyszukiwania i zwiększa widoczność ofert.
            </p>
          </div>
        </div>
      </div>

      {blockOpen && (
        <BlockDatesModal listingId={listings[0]?.id} onClose={() => setBlockOpen(false)} onDone={() => { setBlockOpen(false); void loadCalendar(); }} />
      )}
    </div>
  );
}

function PendingBookingCard({ booking, onAccept, onReject }: { booking: HostBooking; onAccept: () => void; onReject: () => void; }) {
  const nights = countNights(booking.check_in, booking.check_out);
  const guest = booking.guest;
  const initials = `${guest.first_name?.[0] ?? ""}${guest.last_name?.[0] ?? ""}`.toUpperCase() || "?";

  return (
    <li className="flex flex-col gap-3 rounded-xl bg-brand-surface/30 p-4 ring-1 ring-brand/[.06] transition-all hover:bg-brand-surface/60 hover:shadow-card sm:flex-row sm:items-center">
      <div className="flex flex-1 items-center gap-3.5">
        <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-full bg-brand-muted text-sm font-bold text-brand-dark ring-2 ring-brand/10">
          {guest.avatar_url ? (
            <Image src={guest.avatar_url} alt="" width={44} height={44} className="object-cover" unoptimized />
          ) : (
            <span className="flex h-full w-full items-center justify-center">{initials}</span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-brand-dark">{guest.first_name} {guest.last_name}</p>
          <p className="mt-0.5 flex flex-wrap gap-2 text-xs text-text-muted">
            <span>📅 {formatDate(booking.check_in)} – {formatDate(booking.check_out)} · {nights} nocy</span>
            <span>👥 {booking.guests_count} gości</span>
            <span className="font-bold text-brand-dark">{booking.final_amount} {booking.currency}</span>
          </p>
        </div>
      </div>
      <div className="flex shrink-0 flex-wrap gap-2">
        {booking.conversation_id && (
          <button type="button" className="rounded-lg bg-white px-3 py-2 text-xs font-medium shadow-card ring-1 ring-black/[.04] transition-all hover:shadow-elevated" onClick={() => { window.location.href = `/host/messages?conv=${encodeURIComponent(booking.conversation_id!)}`; }}>💬</button>
        )}
        <button type="button" className="rounded-lg bg-white px-3 py-2 text-xs font-semibold text-red-600 shadow-card ring-1 ring-red-100 transition-all hover:bg-red-50 hover:shadow-elevated" onClick={onReject}>Odrzuć</button>
        <button type="button" className="btn-primary px-3 py-2 text-xs shadow-brand-lg" onClick={onAccept}>Akceptuj</button>
      </div>
    </li>
  );
}

function BlockDatesModal({ listingId, onClose, onDone }: { listingId?: string; onClose: () => void; onDone: () => void; }) {
  const [reason, setReason] = useState("");
  const [from, setFrom] = useState(() => format(new Date(), "yyyy-MM-dd"));
  const [to, setTo] = useState(() => format(addDays(new Date(), 1), "yyyy-MM-dd"));

  const submit = async () => {
    if (!listingId) return;
    const start = new Date(from), end = new Date(to);
    if (end < start) { toast.error("Data końcowa musi być po początkowej."); return; }
    const dates = eachDayOfInterval({ start, end }).map((d) => format(d, "yyyy-MM-dd"));
    try {
      await api.post(`/api/v1/host/listings/${listingId}/block-dates/`, { dates, reason: reason || undefined });
      toast.success("Terminy zablokowane.");
      onDone();
    } catch { toast.error("Nie udało się zablokować terminów."); }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md animate-scale-in rounded-2xl bg-white p-6 shadow-hover ring-1 ring-black/[.06]">
        <h3 className="text-lg font-extrabold text-brand-dark">Zablokuj termin</h3>
        <p className="mt-1 text-xs text-text-muted">Wybierz daty, w których oferta będzie niedostępna.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="text-xs font-semibold text-text-secondary">Od
            <input type="date" className="mt-1 w-full rounded-xl border-0 bg-[#f7f9f8] px-3 py-2.5 text-sm ring-1 ring-black/[.06] focus:ring-2 focus:ring-brand" value={from} onChange={(e) => setFrom(e.target.value)} />
          </label>
          <label className="text-xs font-semibold text-text-secondary">Do
            <input type="date" className="mt-1 w-full rounded-xl border-0 bg-[#f7f9f8] px-3 py-2.5 text-sm ring-1 ring-black/[.06] focus:ring-2 focus:ring-brand" value={to} onChange={(e) => setTo(e.target.value)} />
          </label>
        </div>
        <label className="mt-3 block text-xs font-semibold text-text-secondary">Powód (opcjonalnie)
          <input className="mt-1 w-full rounded-xl border-0 bg-[#f7f9f8] px-3 py-2.5 text-sm ring-1 ring-black/[.06] focus:ring-2 focus:ring-brand" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="np. Konserwacja" />
        </label>
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" className="btn-secondary" onClick={onClose}>Anuluj</button>
          <button type="button" className="btn-primary shadow-brand-lg" onClick={() => void submit()}>Zablokuj</button>
        </div>
      </div>
    </div>
  );
}
