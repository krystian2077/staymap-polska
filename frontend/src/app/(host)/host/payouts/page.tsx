"use client";

import { useHostStore } from "@/lib/store/hostStore";

function formatPLN(n: number): string {
  return new Intl.NumberFormat("pl-PL", {
    style: "currency",
    currency: "PLN",
    maximumFractionDigits: 2,
  }).format(n);
}

export default function HostPayoutsPage() {
  const profile = useHostStore((s) => s.profile);
  const stats = useHostStore((s) => s.stats);

  const totalEarnings = profile?.total_earnings ?? 0;
  const pendingPayout = profile?.payout_pending ?? 0;
  const paidOut = totalEarnings - pendingPayout;

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-6">
        <h1 className="text-[22px] font-extrabold text-brand-dark">Wypłaty</h1>
        <p className="text-sm text-text-secondary">Przegląd wypłat i saldo konta gospodarza.</p>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="host-card p-5">
          <p className="text-xs font-bold uppercase tracking-wider text-text-muted">Łączne zarobki</p>
          <p className="mt-2 text-2xl font-extrabold text-brand-dark">{formatPLN(totalEarnings)}</p>
        </div>
        <div className="host-card p-5">
          <p className="text-xs font-bold uppercase tracking-wider text-text-muted">Wypłacono</p>
          <p className="mt-2 text-2xl font-extrabold text-emerald-700">{formatPLN(paidOut)}</p>
        </div>
        <div className="host-card p-5">
          <p className="text-xs font-bold uppercase tracking-wider text-text-muted">Do wypłaty</p>
          <p className="mt-2 text-2xl font-extrabold text-amber-700">{formatPLN(pendingPayout)}</p>
        </div>
      </div>

      <div className="host-card p-6">
        <h2 className="text-sm font-extrabold text-brand-dark">Metoda wypłaty</h2>
        <div className="host-card-muted mt-4 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-muted text-lg">
              🏦
            </div>
            <div>
              <p className="text-sm font-bold text-brand-dark">Przelew bankowy</p>
              <p className="text-xs text-text-muted">Wypłaty realizowane automatycznie co 14 dni na konto powiązane z profilem.</p>
            </div>
          </div>
        </div>

        <div className="mt-5">
          <h3 className="text-xs font-bold uppercase tracking-wider text-text-muted">Historia wypłat</h3>
          {stats && (stats.revenue_this_month > 0 || stats.revenue_last_month > 0) ? (
            <div className="mt-3 space-y-2">
              {stats.revenue_last_month > 0 && (
                <div className="flex items-center justify-between rounded-lg border border-brand-dark/[.04] px-4 py-3 dark:border-brand-border/45">
                  <div>
                    <p className="text-sm font-medium text-brand-dark">Wypłata za poprzedni miesiąc</p>
                    <p className="text-xs text-text-muted">Automatycznie przetworzona</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-emerald-700">{formatPLN(stats.revenue_last_month)}</p>
                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">Zrealizowana</span>
                  </div>
                </div>
              )}
              {stats.revenue_this_month > 0 && (
                <div className="flex items-center justify-between rounded-lg border border-brand-dark/[.04] px-4 py-3 dark:border-brand-border/45">
                  <div>
                    <p className="text-sm font-medium text-brand-dark">Bieżący miesiąc</p>
                    <p className="text-xs text-text-muted">W trakcie naliczania</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-amber-700">{formatPLN(stats.revenue_this_month)}</p>
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">W toku</span>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="mt-3 text-sm text-text-muted">Brak historii wypłat.</p>
          )}
        </div>
      </div>
    </div>
  );
}
