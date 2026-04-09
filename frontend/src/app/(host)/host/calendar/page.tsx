"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import Link from "next/link";
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

import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

const CARD = "rounded-2xl bg-white shadow-card ring-1 ring-black/[.04]";

type ListingOption = { id: string; slug: string; title: string };

export default function HostCalendarPage() {
  const [listings, setListings] = useState<ListingOption[] | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [bookedDates, setBookedDates] = useState<string[]>([]);
  const [blockedDates, setBlockedDates] = useState<string[]>([]);
  const [month, setMonth] = useState(() => new Date());
  const [blockFrom, setBlockFrom] = useState("");
  const [blockTo, setBlockTo] = useState("");
  const [blockReason, setBlockReason] = useState("");
  const [blocking, setBlocking] = useState(false);

  useEffect(() => {
    let c = false;
    (async () => {
      try {
        const res = await api.get<{ data: ListingOption[] }>("/api/v1/host/listings/");
        if (!c && Array.isArray(res.data)) {
          setListings(res.data.map((x) => ({ id: x.id, slug: x.slug, title: x.title })));
          if (res.data.length > 0) setSelected(res.data[0].slug);
        }
      } catch {
        if (!c) setListings([]);
      }
    })();
    return () => { c = true; };
  }, []);

  const loadAvailability = useCallback(async () => {
    if (!selected) { setBookedDates([]); setBlockedDates([]); return; }
    try {
      const res = await api.get<{ data: { booked_dates?: string[]; blocked_dates?: string[] } }>(
        `/api/v1/listings/${selected}/availability/`
      );
      setBookedDates(res.data?.booked_dates ?? []);
      setBlockedDates(res.data?.blocked_dates ?? []);
    } catch {
      setBookedDates([]);
      setBlockedDates([]);
    }
  }, [selected]);

  useEffect(() => { void loadAvailability(); }, [loadAvailability]);

  const monthLabel = format(month, "LLLL yyyy", { locale: pl });
  const gridDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(month), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(month), { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [month]);

  const selectedListing = listings?.find((l) => l.slug === selected);

  const handleBlock = async () => {
    if (!selectedListing || !blockFrom || !blockTo) return;
    const start = new Date(blockFrom);
    const end = new Date(blockTo);
    if (end < start) { toast.error("Data końcowa musi być po początkowej."); return; }
    setBlocking(true);
    try {
      const dates = eachDayOfInterval({ start, end }).map((d) => format(d, "yyyy-MM-dd"));
      await api.post(`/api/v1/host/listings/${selectedListing.id}/block-dates/`, {
        dates,
        reason: blockReason || undefined,
      });
      toast.success(`Zablokowano ${dates.length} dni.`);
      setBlockFrom("");
      setBlockTo("");
      setBlockReason("");
      void loadAvailability();
    } catch {
      toast.error("Nie udało się zablokować terminów.");
    } finally {
      setBlocking(false);
    }
  };

  const totalBooked = bookedDates.length;
  const totalBlocked = blockedDates.length;

  if (listings === null) {
    return (
      <div className="flex justify-center py-24">
        <LoadingSpinner className="h-10 w-10 text-brand" />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[11px] font-extrabold uppercase tracking-[.15em] text-brand">Kalendarz</p>
          <h1 className="mt-1 text-[22px] font-extrabold text-brand-dark">Kalendarz dostępności</h1>
          <p className="text-sm text-text-secondary">
            Zarządzaj dostępnością i blokuj terminy swoich ofert.
          </p>
        </div>
        {listings.length > 1 && (
          <select
            className="rounded-xl border-0 bg-[#f7f9f8] px-3 py-2.5 text-sm font-medium text-brand-dark ring-1 ring-black/[.06] focus:ring-2 focus:ring-brand"
            value={selected ?? ""}
            onChange={(e) => setSelected(e.target.value)}
          >
            {listings.map((l) => (
              <option key={l.slug} value={l.slug}>{l.title}</option>
            ))}
          </select>
        )}
      </div>

      {listings.length === 0 ? (
        <div className="rounded-2xl bg-brand-surface/50 ring-1 ring-brand/5 py-16 text-center">
          <p className="text-lg font-bold text-brand-dark">Brak ofert</p>
          <p className="mt-1 text-sm text-text-muted">Dodaj pierwszą ofertę, aby zarządzać kalendarzem.</p>
          <Link href="/host/new-listing" className="btn-primary mt-6 inline-flex">Dodaj ofertę</Link>
        </div>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
          <div className={`${CARD} p-5`}>
            <div className="mb-4 flex items-center justify-between">
              <button type="button" className="rounded-lg ring-1 ring-black/[.06] px-3 py-1.5 text-sm font-medium text-brand-dark hover:bg-brand-surface/60" onClick={() => setMonth((d) => subMonths(d, 1))}>
                ← Poprzedni
              </button>
              <h2 className="text-base font-extrabold capitalize text-brand-dark">{monthLabel}</h2>
              <button type="button" className="rounded-lg ring-1 ring-black/[.06] px-3 py-1.5 text-sm font-medium text-brand-dark hover:bg-brand-surface/60" onClick={() => setMonth((d) => addMonths(d, 1))}>
                Następny →
              </button>
            </div>

            <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-bold uppercase tracking-wider text-text-muted">
              {["Pn", "Wt", "Śr", "Cz", "Pt", "So", "Nd"].map((d) => (
                <div key={d} className="py-2">{d}</div>
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
                  <div
                    key={iso}
                    className={cn(
                      "flex min-h-[56px] flex-col items-center justify-center rounded-xl p-1.5 text-xs transition-all",
                      !inMonth && "opacity-30",
                      past && "opacity-30",
                      isBooked && "bg-emerald-50 ring-1 ring-emerald-200",
                      isBlocked && !isBooked && "bg-red-50 ring-1 ring-red-200",
                      isToday && "ring-2 ring-brand",
                      !isBooked && !isBlocked && !past && inMonth && "hover:bg-brand-surface/60"
                    )}
                  >
                    <span className={cn(
                      "text-sm font-semibold",
                      isToday && "text-brand",
                      isBooked && "text-emerald-700",
                      isBlocked && !isBooked && "text-red-700"
                    )}>{format(day, "d")}</span>
                    {isBooked && <span className="mt-0.5 text-[8px] font-bold text-emerald-600">Rez.</span>}
                    {isBlocked && !isBooked && <span className="mt-0.5 text-[8px] font-bold text-red-500">Blok.</span>}
                  </div>
                );
              })}
            </div>

            <div className="mt-4 flex flex-wrap gap-5 border-t border-gray-100 pt-4 text-xs">
              <span className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-full bg-emerald-100 ring-1 ring-emerald-300" />
                Zarezerwowane ({totalBooked})
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-full bg-red-100 ring-1 ring-red-300" />
                Zablokowane ({totalBlocked})
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-full ring-2 ring-brand" />
                Dzisiaj
              </span>
            </div>
          </div>

          <div className="space-y-4">
            <div className={`${CARD} p-5`}>
              <h3 className="text-sm font-extrabold text-brand-dark">Zablokuj termin</h3>
              <p className="mt-1 text-xs text-text-muted">Zablokuj dni, kiedy oferta jest niedostępna.</p>
              <div className="mt-4 space-y-3">
                <label className="block text-xs font-semibold text-text-secondary">
                  Od
                  <input type="date" className="mt-1 w-full rounded-xl border-0 bg-[#f7f9f8] px-3 py-2.5 text-sm ring-1 ring-black/[.06] focus:ring-2 focus:ring-brand" value={blockFrom} onChange={(e) => setBlockFrom(e.target.value)} />
                </label>
                <label className="block text-xs font-semibold text-text-secondary">
                  Do
                  <input type="date" className="mt-1 w-full rounded-xl border-0 bg-[#f7f9f8] px-3 py-2.5 text-sm ring-1 ring-black/[.06] focus:ring-2 focus:ring-brand" value={blockTo} onChange={(e) => setBlockTo(e.target.value)} />
                </label>
                <label className="block text-xs font-semibold text-text-secondary">
                  Powód (opcjonalnie)
                  <input className="mt-1 w-full rounded-xl border-0 bg-[#f7f9f8] px-3 py-2.5 text-sm ring-1 ring-black/[.06] focus:ring-2 focus:ring-brand" value={blockReason} onChange={(e) => setBlockReason(e.target.value)} placeholder="np. Remont" />
                </label>
                <button
                  type="button"
                  disabled={blocking || !blockFrom || !blockTo}
                  className="btn-primary w-full disabled:opacity-50"
                  onClick={() => void handleBlock()}
                >
                  {blocking ? "Blokowanie…" : "Zablokuj terminy"}
                </button>
              </div>
            </div>

            <div className={`${CARD} p-5`}>
              <h3 className="text-sm font-extrabold text-brand-dark">Statystyki oferty</h3>
              <div className="mt-3 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-text-muted">Oferta</span>
                  <span className="font-bold text-brand-dark">{selectedListing?.title ?? "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-muted">Zarezerwowane dni</span>
                  <span className="font-bold text-emerald-700">{totalBooked}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-muted">Zablokowane dni</span>
                  <span className="font-bold text-red-600">{totalBlocked}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
