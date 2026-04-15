"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";

import { api } from "@/lib/api";
import { formatDate } from "@/lib/utils/dates";
import { cn } from "@/lib/utils";
import { useHostStore } from "@/lib/store/hostStore";
import { useMessagingStore } from "@/lib/store/messagingStore";
import { useHostNotificationStore } from "@/lib/store/hostNotificationStore";
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

import { motion } from "framer-motion";

function formatPLN(n: number): string {
  return new Intl.NumberFormat("pl-PL", { style: "currency", currency: "PLN", maximumFractionDigits: 0 }).format(n);
}

const CARD = "rounded-3xl bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] ring-1 ring-black/[0.02] dark:bg-[var(--bg2)] dark:ring-brand-border/45";

function StatCard({ icon, value, label, changePct, delayMs }: {
  icon: React.ReactNode; value: string; label: string; changePct?: number | null; delayMs: number;
}) {
  const pos = changePct != null && changePct >= 0;
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0, transition: { delay: delayMs / 1000 } }}
      whileHover={{ y: -8, shadow: "0 30px 60px -12px rgba(0,0,0,0.12)" }}
      className={cn(CARD, "group p-7 transition-all duration-500 hover:ring-brand/20")}
    >
      <div className="flex items-start justify-between">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-surface text-2xl ring-1 ring-brand/10 shadow-sm transition-all duration-500 group-hover:scale-110 group-hover:bg-brand group-hover:text-white group-hover:shadow-lg group-hover:shadow-brand/20">
          {icon}
        </div>
        {changePct != null && (
          <span className={cn("rounded-full px-3 py-1.5 text-[11px] font-black tracking-tight shadow-sm", pos ? "bg-emerald-50 text-emerald-600 ring-1 ring-emerald-500/10" : "bg-red-50 text-red-600 ring-1 ring-red-500/10")}>
            {pos ? "↑" : "↓"} {Math.abs(changePct).toFixed(0)}%
          </span>
        )}
      </div>
      <p className="mt-6 text-3xl font-black text-brand-dark tracking-tight leading-none">{value}</p>
      <p className="mt-2 text-[11px] font-black text-brand-dark/40 uppercase tracking-[0.15em]">{label}</p>
    </motion.div>
  );
}

function QuickAction({ icon, label, href, badge, delayMs = 0 }: { icon: React.ReactNode; label: string; href: string; badge?: number; delayMs?: number }) {
  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1, transition: { delay: delayMs / 1000 } }}
      whileHover={{ scale: 1.03, y: -4 }} 
      whileTap={{ scale: 0.97 }}
    >
      <Link href={href} className={cn(CARD, "group flex flex-col items-start gap-5 p-7 transition-all duration-500 hover:bg-brand-surface/30 hover:ring-brand/30")}>
        <div className="relative">
          <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-surface text-3xl shadow-sm ring-1 ring-brand/10 transition-all duration-500 group-hover:scale-110 group-hover:bg-brand group-hover:text-white group-hover:shadow-xl group-hover:shadow-brand/20 group-hover:-rotate-3">
            {icon}
          </span>
          {badge != null && badge > 0 && (
            <span className="absolute -right-2 -top-2 flex h-7 min-w-7 items-center justify-center rounded-full bg-brand px-1.5 text-[11px] font-black text-white shadow-xl shadow-brand/30 ring-2 ring-white animate-bounce">
              {badge}
            </span>
          )}
        </div>
        <div className="flex w-full items-center justify-between">
          <span className="text-lg font-black text-brand-dark tracking-tight">{label}</span>
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand/5 text-brand opacity-0 transition-all duration-500 group-hover:opacity-100 group-hover:translate-x-1 group-hover:bg-brand group-hover:text-white">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </span>
        </div>
      </Link>
    </motion.div>
  );
}

export default function HostDashboardPage() {
  const profile = useHostStore((s) => s.profile);
  const stats = useHostStore((s) => s.stats);
  const bookings = useHostStore((s) => s.bookings);
  const pendingCount = useHostStore((s) => s.pendingCount);
  const unreadTotal = useMessagingStore((s) => s.unreadTotal);
  const notificationItems = useHostNotificationStore((s) => s.items);
  const notificationUnread = useHostNotificationStore((s) => s.unreadCount);
  const markNotificationRead = useHostNotificationStore((s) => s.markRead);

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

  const confirmedBookings = useMemo(() => bookings.filter((b) => b.status === "confirmed"), [bookings]);

  const recentNotifications = useMemo(() => {
    const live = notificationItems.map((n) => ({
      id: n.id,
      title: n.title,
      body: n.body,
      href: n.link || "/host/dashboard",
      time: n.created_at,
      isNew: !n.is_read,
      icon: n.type.startsWith("message") ? "💬" : n.type.startsWith("booking") ? "📅" : "🔔",
      type: n.type,
    }));

    const inferredPending = bookings
      .filter((b) => b.status === "pending")
      .map((b) => ({
        id: `pending:${b.id}`,
        title: "Nowa prośba o rezerwację",
        body: `${b.guest.first_name} ${b.guest.last_name} · ${b.listing.title}`,
        href: "/host/bookings/pending",
        time: b.created_at,
        isNew: false,
        icon: "📅",
        type: "booking.new",
      }));

    const merged = [...live, ...inferredPending]
      .sort((a, b) => +new Date(b.time) - +new Date(a.time))
      .slice(0, 30);

    if (merged.length === 0) {
      return [
        {
          id: "all-good",
          title: "Brak nowych powiadomień",
          body: "Gdy pojawią się nowe wiadomości i zmiany rezerwacji, zobaczysz je tutaj.",
          href: "/host/notifications",
          time: new Date().toISOString(),
          isNew: false,
          icon: "✅",
          type: "info",
        },
      ];
    }
    return merged;
  }, [notificationItems, bookings]);

  const formatNotifTime = (value: string) => {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "teraz";
    return format(d, "d MMM, HH:mm", { locale: pl });
  };

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

  return (
    <div className="mx-auto max-w-7xl px-4 py-5 sm:p-6 lg:p-10">
      <header className="mb-10 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <p className="text-[12px] font-extrabold uppercase tracking-[.25em] text-brand mb-1.5">Witaj ponownie</p>
          <h1 className="text-4xl font-black leading-tight text-brand-dark tracking-tight">
            {profile?.display_name ?? "Gospodarzu"} 👋
          </h1>
          <p className="mt-2 text-[15px] font-medium text-text-muted flex items-center gap-3">
            {format(new Date(), "EEEE, d MMMM yyyy", { locale: pl })}
            {pendingCount > 0 && (
              <span className="inline-flex items-center gap-2 rounded-full bg-brand-surface border border-brand/10 px-3 py-1 text-[11px] font-black text-brand uppercase tracking-wider animate-pulse">
                <span className="h-2 w-2 rounded-full bg-brand shadow-[0_0_8px_rgba(22,163,74,0.6)]" />
                {pendingCount} do potwierdzenia
              </span>
            )}
          </p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <Link href="/host/new-listing" className="group relative flex items-center gap-2 overflow-hidden rounded-2xl bg-brand-dark px-7 py-3.5 font-bold text-white shadow-xl transition-all duration-300 hover:-translate-y-1 hover:bg-brand hover:shadow-2xl active:scale-95">
            <span className="relative z-10 flex items-center gap-2">
              <span className="text-xl">＋</span>
              Dodaj nową ofertę
            </span>
            <div className="absolute inset-0 z-0 bg-gradient-to-r from-brand to-emerald-500 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
          </Link>
        </motion.div>
      </header>

      {unreadTotal > 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-brand/20 bg-gradient-to-r from-brand-surface to-white px-5 py-4 shadow-sm dark:to-[var(--bg2)]"
        >
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand text-lg text-white shadow-brand-lg">💬</span>
            <div>
              <p className="text-sm font-black text-brand-dark">Masz nowe wiadomości od gości</p>
              <p className="text-xs font-semibold text-text-muted">Nieprzeczytane: {unreadTotal}</p>
            </div>
          </div>
          <Link href="/host/messages" className="rounded-xl bg-brand px-4 py-2 text-xs font-black text-white transition hover:bg-brand-700">
            Przejdź do wiadomości
          </Link>
        </motion.div>
      ) : null}

      {stats && (
        <div className="mb-12 grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard icon="💰" value={formatPLN(stats.revenue_this_month)} label="Przychód (mc)" changePct={revenueChange} delayMs={0} />
          <StatCard icon="📈" value={`${stats.occupancy_percent}%`} label="Obłożenie" delayMs={100} />
          <StatCard icon="⭐" value={stats.avg_rating > 0 ? stats.avg_rating.toFixed(2) : "—"} label="Średnia ocena" delayMs={200} />
          <StatCard icon="📋" value={String(stats.bookings_count)} label="Rezerwacje" delayMs={300} />
        </div>
      )}

      <div className="mb-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <QuickAction icon="📅" label="Kalendarz" href="/host/calendar" delayMs={400} />
        <QuickAction icon="💬" label="Wiadomości" href="/host/messages" badge={unreadTotal} delayMs={500} />
        <QuickAction icon="⭐" label="Recenzje" href="/host/reviews" badge={stats?.reviews_pending_response} delayMs={600} />
        <QuickAction icon="💰" label="Zarobki" href="/host/earnings" delayMs={700} />
      </div>

      <div className="grid gap-8 xl:grid-cols-[1fr_360px]">
        <div className="space-y-8">
          <section className={cn(CARD, "p-7 overflow-hidden relative")}>
            <div className="mb-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-8 w-1.5 rounded-full bg-brand" />
                <h2 className="text-xl font-black text-brand-dark tracking-tight">Ostatnie powiadomienia</h2>
                {notificationUnread > 0 && (
                  <span className="rounded-full bg-brand px-3 py-1 text-xs font-black text-white shadow-brand-lg">
                    {notificationUnread > 99 ? "99+" : notificationUnread}
                  </span>
                )}
              </div>
              <Link href="/host/notifications" className="text-sm font-bold text-brand hover:underline underline-offset-4">Zobacz wszystkie →</Link>
            </div>

            <div className={cn("space-y-3", recentNotifications.length > 5 && "max-h-[460px] overflow-y-auto pr-2") }>
              {recentNotifications.map((n, idx) => (
                <motion.div
                  key={n.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0, transition: { delay: idx * 0.04 } }}
                >
                  <Link
                    href={n.href}
                    onClick={() => markNotificationRead(n.id)}
                    className={cn(
                      "group flex items-start gap-3 rounded-2xl border p-4 transition-all",
                      n.isNew
                        ? "border-brand/20 bg-brand-surface/45 shadow-[0_10px_26px_-22px_rgba(22,163,74,.6)]"
                        : "border-black/[.04] bg-white hover:border-brand/20 hover:bg-brand-surface/30 dark:border-brand-border/40 dark:bg-[var(--bg3)] dark:hover:bg-[var(--bg2)]"
                    )}
                  >
                    <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-lg ring-1 ring-black/[.05] dark:bg-[var(--bg2)] dark:ring-brand-border/50">
                      {n.icon}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-black text-brand-dark">{n.title}</p>
                        {n.isNew ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-brand px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-white">
                            <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
                            Nowe
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-1 line-clamp-2 text-xs font-medium text-text-muted">{n.body}</p>
                      <p className="mt-2 text-[11px] font-bold text-text-muted/80">{formatNotifTime(n.time)}</p>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          </section>

          {confirmedBookings.length > 0 && (
            <section className={cn(CARD, "p-7 overflow-hidden")}>
              <div className="mb-6 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-1.5 rounded-full bg-emerald-500" />
                  <h2 className="text-xl font-black text-brand-dark tracking-tight">Nadchodzące pobyty</h2>
                </div>
                <Link href="/host/bookings/confirmed" className="text-sm font-bold text-brand hover:underline underline-offset-4">Wszystkie →</Link>
              </div>
              <div className="space-y-3">
                {confirmedBookings.slice(0, 3).map((b, idx) => (
                  <motion.div 
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0, transition: { delay: idx * 0.1 } }}
                    key={b.id} 
                    className="group flex items-center gap-4 rounded-[24px] bg-white p-4 ring-1 ring-black/[0.03] transition-all hover:bg-brand-surface/40 hover:shadow-md hover:ring-brand/10 dark:bg-[var(--bg3)] dark:ring-brand-border/45 dark:hover:bg-[var(--bg2)]"
                  >
                    <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full bg-brand-muted text-sm font-black text-brand-dark ring-2 ring-brand/10 transition-transform group-hover:scale-110">
                      {b.guest.avatar_url ? (
                        <Image src={b.guest.avatar_url} alt="" width={48} height={48} className="object-cover" unoptimized />
                      ) : (
                        <span className="flex h-full w-full items-center justify-center">
                          {`${b.guest.first_name?.[0] ?? ""}${b.guest.last_name?.[0] ?? ""}`.toUpperCase() || "?"}
                        </span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[15px] font-black text-brand-dark">{b.guest.first_name} {b.guest.last_name}</p>
                      <p className="text-xs font-medium text-text-muted mt-0.5">{b.listing.title} · {formatDate(b.check_in)} – {formatDate(b.check_out)}</p>
                    </div>
                    <div className="text-right">
                      <span className="block text-sm font-black text-brand">{b.final_amount} {b.currency}</span>
                      <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Potwierdzone</span>
                    </div>
                  </motion.div>
                ))}
              </div>
            </section>
          )}

          <section className={cn(CARD, "p-7")}>
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-black capitalize text-brand-dark tracking-tight">{monthLabel}</h2>
              <div className="flex gap-2">
                <button type="button" className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-surface text-brand ring-1 ring-brand/10 transition-all hover:bg-brand hover:text-white shadow-sm" onClick={() => setMonth((d) => subMonths(d, 1))}>←</button>
                <button type="button" className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-surface text-brand ring-1 ring-brand/10 transition-all hover:bg-brand hover:text-white shadow-sm" onClick={() => setMonth((d) => addMonths(d, 1))}>→</button>
              </div>
            </div>
            {!firstSlug ? (
              <div className="rounded-[24px] bg-brand-surface/30 px-6 py-12 text-center border-2 border-dashed border-brand/10">
                <p className="text-sm font-bold text-brand-dark">Dodaj ofertę, aby zobaczyć kalendarz.</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-black uppercase tracking-widest text-brand-dark/30 mb-2">
                  {["Pn", "Wt", "Śr", "Cz", "Pt", "So", "Nd"].map((d) => <div key={d} className="py-2">{d}</div>)}
                </div>
                <div className="grid grid-cols-7 gap-2">
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
                          "relative flex min-h-[50px] flex-col items-center justify-center rounded-2xl text-[13px] font-bold transition-all",
                          !inMonth && "opacity-25", past && "cursor-not-allowed opacity-20",
                          isBooked && "bg-emerald-50 text-emerald-700 ring-2 ring-emerald-200/50 shadow-sm",
                          isBlocked && !isBooked && "bg-red-50 text-red-600 ring-2 ring-red-200/50 shadow-sm",
                          isToday && "ring-2 ring-brand bg-brand-surface text-brand",
                          !isBooked && !isBlocked && !past && inMonth && "bg-white ring-1 ring-black/[0.03] hover:ring-brand hover:shadow-md hover:-translate-y-0.5 dark:bg-[var(--bg3)] dark:ring-brand-border/45"
                        )}
                      >
                        <span>{format(day, "d")}</span>
                        {(isBooked || isBlocked) && <span className="absolute bottom-1 h-1 w-1 rounded-full bg-current opacity-40" />}
                      </button>
                    );
                  })}
                </div>
                <div className="mt-6 flex flex-wrap gap-4 text-[11px] font-bold text-brand-dark/60">
                  <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.4)]" />Zajęte</span>
                  <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-red-400 shadow-[0_0_8px_rgba(248,113,113,0.4)]" />Zablokowane</span>
                  <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-brand shadow-[0_0_8px_rgba(22,163,74,0.4)]" />Dzisiaj</span>
                </div>
                <Link href="/host/calendar" className="mt-8 block w-full rounded-2xl bg-brand-surface/50 py-3.5 text-center text-sm font-black text-brand transition-all hover:bg-brand hover:text-white">Zarządzaj dostępnością →</Link>
              </>
            )}
          </section>
        </div>

        <div className="space-y-6">
          <div className={cn(CARD, "p-7")}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-black text-brand-dark tracking-tight">Twoje oferty</h3>
              <Link href="/host/listings" className="text-xs font-bold text-brand hover:underline">Zarządzaj</Link>
            </div>
            {listings.length === 0 ? (
              <p className="text-sm text-text-muted italic">Brak aktywnych ofert.</p>
            ) : (
              <ul className="space-y-2">
                {listings.slice(0, 5).map((l) => (
                  <li key={l.id}>
                    <Link href={`/listing/${l.slug}`} className="group flex items-center gap-3 rounded-2xl px-3 py-2.5 transition-all hover:bg-brand-surface/50 ring-1 ring-transparent hover:ring-brand/5">
                      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-surface text-lg ring-1 ring-brand/5 transition-transform group-hover:scale-110">🏠</span>
                      <span className="truncate text-sm font-bold text-brand-dark">{l.title}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {stats && (
            <div className={cn(CARD, "p-7")}>
              <h3 className="text-base font-black text-brand-dark tracking-tight mb-5">Działania</h3>
              <div className="space-y-4">
                {[
                  { label: "Oczekujące rezerwacje", val: stats.bookings_pending, warn: stats.bookings_pending > 0, icon: "⏳" },
                  { label: "Nowe wiadomości", val: unreadTotal, warn: unreadTotal > 0, icon: "💬" },
                  { label: "Recenzje do odp.", val: stats.reviews_pending_response, warn: stats.reviews_pending_response > 0, icon: "⭐" },
                  { label: "Aktywne oferty", val: listings.length, warn: false, icon: "✅" },
                ].map((row) => (
                  <div key={row.label} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-base grayscale group-hover:grayscale-0">{row.icon}</span>
                      <span className="text-xs font-bold text-text-muted">{row.label}</span>
                    </div>
                    <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-black", row.warn ? "bg-amber-100 text-amber-700 ring-1 ring-amber-500/10 animate-pulse" : "bg-gray-50 text-brand-dark/40")}>
                      {row.val}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <motion.div 
            whileHover={{ scale: 1.02 }}
            className="rounded-3xl bg-gradient-to-br from-brand-dark to-brand p-7 text-white shadow-xl shadow-brand/10"
          >
            <h3 className="text-base font-black flex items-center gap-2">
              <span className="text-xl">💡</span>
              Wskazówka Pro
            </h3>
            <p className="mt-3 text-sm leading-relaxed font-medium opacity-90">
              Szybka odpowiedź to klucz do sukcesu. Gospodarze odpowiadający w 2h mają o 40% wyższą konwersję!
            </p>
            <Link href="/host/messages" className="mt-5 inline-block text-xs font-black bg-white/20 backdrop-blur-md px-4 py-2 rounded-xl hover:bg-white/30 transition-all">Odpowiedz teraz →</Link>
          </motion.div>
        </div>
      </div>

      {blockOpen && (
        <BlockDatesModal listingId={listings[0]?.id} onClose={() => setBlockOpen(false)} onDone={() => { setBlockOpen(false); void loadCalendar(); }} />
      )}
    </div>
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
      <div className="w-full max-w-md animate-scale-in rounded-2xl bg-white p-6 shadow-hover ring-1 ring-black/[.06] dark:bg-[var(--bg2)] dark:ring-brand-border/50">
        <h3 className="text-lg font-extrabold text-brand-dark">Zablokuj termin</h3>
        <p className="mt-1 text-xs text-text-muted">Wybierz daty, w których oferta będzie niedostępna.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="text-xs font-semibold text-text-secondary">Od
            <input type="date" className="host-input mt-1" value={from} onChange={(e) => setFrom(e.target.value)} />
          </label>
          <label className="text-xs font-semibold text-text-secondary">Do
            <input type="date" className="host-input mt-1" value={to} onChange={(e) => setTo(e.target.value)} />
          </label>
        </div>
        <label className="mt-3 block text-xs font-semibold text-text-secondary">Powód (opcjonalnie)
          <input className="host-input mt-1" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="np. Konserwacja" />
        </label>
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" className="btn-secondary" onClick={onClose}>Anuluj</button>
          <button type="button" className="btn-primary shadow-brand-lg" onClick={() => void submit()}>Zablokuj</button>
        </div>
      </div>
    </div>
  );
}
