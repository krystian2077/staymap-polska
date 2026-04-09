"use client";

import { useMemo } from "react";
import { useHostStore } from "@/lib/store/hostStore";
import { cn } from "@/lib/utils";

const CARD = "rounded-2xl bg-white shadow-card ring-1 ring-black/[.04]";

function formatPLN(n: number): string {
  return new Intl.NumberFormat("pl-PL", {
    style: "currency",
    currency: "PLN",
    maximumFractionDigits: 0,
  }).format(n);
}

function EarningsBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs">
        <span className="text-text-muted">{label}</span>
        <span className="font-bold text-brand-dark">{formatPLN(value)}</span>
      </div>
      <div className="h-3 w-full rounded-full bg-gray-100">
        <div className={cn("h-full rounded-full transition-all duration-500", color)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default function HostEarningsPage() {
  const stats = useHostStore((s) => s.stats);
  const profile = useHostStore((s) => s.profile);
  const bookings = useHostStore((s) => s.bookings);

  const thisMonth = stats?.revenue_this_month ?? 0;
  const lastMonth = stats?.revenue_last_month ?? 0;
  const maxBar = Math.max(thisMonth, lastMonth, 1);

  const revenueChange = useMemo(() => {
    if (!stats) return null;
    if (lastMonth === 0) return thisMonth > 0 ? 100 : 0;
    return ((thisMonth - lastMonth) / lastMonth) * 100;
  }, [stats, thisMonth, lastMonth]);

  const completedRevenue = useMemo(() => {
    return bookings
      .filter((b) => b.status === "completed")
      .reduce((acc, b) => acc + b.final_amount, 0);
  }, [bookings]);

  const confirmedRevenue = useMemo(() => {
    return bookings
      .filter((b) => b.status === "confirmed")
      .reduce((acc, b) => acc + b.final_amount, 0);
  }, [bookings]);

  const pendingRevenue = useMemo(() => {
    return bookings
      .filter((b) => b.status === "pending")
      .reduce((acc, b) => acc + b.final_amount, 0);
  }, [bookings]);

  const totalEarnings = profile?.total_earnings ?? completedRevenue;
  const payoutPending = profile?.payout_pending ?? 0;

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-6">
        <p className="text-[11px] font-extrabold uppercase tracking-[.15em] text-brand">Finanse</p>
        <h1 className="mt-1 text-[22px] font-extrabold text-brand-dark">Zarobki</h1>
        <p className="text-sm text-text-secondary">Przegląd przychodów i analiza finansowa.</p>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className={`${CARD} p-5`}>
          <p className="text-xs font-bold uppercase tracking-wider text-text-muted">Przychód ten miesiąc</p>
          <p className="mt-2 text-3xl font-extrabold text-brand-dark">{formatPLN(thisMonth)}</p>
          {revenueChange != null && (
            <p className={cn("mt-1 text-xs font-semibold", revenueChange >= 0 ? "text-emerald-600" : "text-red-600")}>
              {revenueChange >= 0 ? "↑" : "↓"} {Math.abs(revenueChange).toFixed(0)}% vs ostatni miesiąc
            </p>
          )}
        </div>
        <div className={`${CARD} p-5`}>
          <p className="text-xs font-bold uppercase tracking-wider text-text-muted">Poprzedni miesiąc</p>
          <p className="mt-2 text-3xl font-extrabold text-brand-dark">{formatPLN(lastMonth)}</p>
        </div>
        <div className={`${CARD} p-5`}>
          <p className="text-xs font-bold uppercase tracking-wider text-text-muted">Łączne zarobki</p>
          <p className="mt-2 text-3xl font-extrabold text-brand-dark">{formatPLN(totalEarnings)}</p>
        </div>
        <div className={`${CARD} p-5`}>
          <p className="text-xs font-bold uppercase tracking-wider text-text-muted">Do wypłaty</p>
          <p className="mt-2 text-3xl font-extrabold text-emerald-700">{formatPLN(payoutPending)}</p>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <div className={`${CARD} p-5`}>
          <h2 className="text-sm font-extrabold text-brand-dark">Porównanie miesięczne</h2>
          <div className="mt-5 space-y-4">
            <EarningsBar label="Ten miesiąc" value={thisMonth} max={maxBar} color="bg-brand" />
            <EarningsBar label="Poprzedni miesiąc" value={lastMonth} max={maxBar} color="bg-brand/40" />
          </div>
        </div>

        <div className={`${CARD} p-5`}>
          <h2 className="text-sm font-extrabold text-brand-dark">Przychód wg statusu rezerwacji</h2>
          <div className="mt-5 space-y-4">
            <EarningsBar label="Zakończone" value={completedRevenue} max={Math.max(completedRevenue, confirmedRevenue, pendingRevenue, 1)} color="bg-emerald-500" />
            <EarningsBar label="Potwierdzone" value={confirmedRevenue} max={Math.max(completedRevenue, confirmedRevenue, pendingRevenue, 1)} color="bg-blue-500" />
            <EarningsBar label="Oczekujące" value={pendingRevenue} max={Math.max(completedRevenue, confirmedRevenue, pendingRevenue, 1)} color="bg-amber-400" />
          </div>
        </div>
      </div>

      <div className={`${CARD} mt-6 p-5`}>
        <h2 className="text-sm font-extrabold text-brand-dark">Ostatnie transakcje</h2>
        {bookings.length === 0 ? (
          <p className="mt-3 text-sm text-text-muted">Brak transakcji do wyświetlenia.</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-gray-100 text-text-muted">
                  <th className="pb-2 pr-4 font-semibold">Gość</th>
                  <th className="pb-2 pr-4 font-semibold">Oferta</th>
                  <th className="pb-2 pr-4 font-semibold">Daty</th>
                  <th className="pb-2 pr-4 font-semibold">Status</th>
                  <th className="pb-2 text-right font-semibold">Kwota</th>
                </tr>
              </thead>
              <tbody>
                {bookings.slice(0, 10).map((b) => (
                  <tr key={b.id} className="border-b border-gray-50">
                    <td className="py-2.5 pr-4 font-medium text-brand-dark">{b.guest.first_name} {b.guest.last_name}</td>
                    <td className="py-2.5 pr-4 text-text-muted">{b.listing.title}</td>
                    <td className="py-2.5 pr-4 text-text-muted">{b.check_in} — {b.check_out}</td>
                    <td className="py-2.5 pr-4">
                      <span className={cn(
                        "rounded-full px-2 py-0.5 text-[10px] font-bold",
                        b.status === "completed" && "bg-emerald-100 text-emerald-800",
                        b.status === "confirmed" && "bg-blue-100 text-blue-800",
                        b.status === "pending" && "bg-amber-100 text-amber-800",
                        b.status === "cancelled" && "bg-gray-100 text-gray-500",
                        b.status === "rejected" && "bg-red-100 text-red-800",
                      )}>
                        {b.status}
                      </span>
                    </td>
                    <td className="py-2.5 text-right font-bold text-brand-dark">{b.final_amount} {b.currency}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
