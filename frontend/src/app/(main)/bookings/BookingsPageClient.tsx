"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
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

export function BookingsPageClient() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

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

  if (rows.length === 0) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <h1 className="text-2xl font-extrabold text-brand-dark">Moje rezerwacje</h1>
        <p className="mt-3 text-text-secondary">Nie masz jeszcze żadnych rezerwacji.</p>
        <Link href="/search" className="btn-primary mt-8 inline-block px-6">
          Szukaj noclegów
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-3xl font-extrabold tracking-tight text-brand-dark">Moje rezerwacje</h1>
      <ul className="mt-8 space-y-4">
        {rows.map((b) => (
          <li
            key={b.id}
            className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <Link
                  href={`/listing/${b.listing_slug}`}
                  className="text-lg font-bold text-brand-dark hover:text-brand"
                >
                  {b.listing_title}
                </Link>
                <p className="mt-1 text-sm text-text-secondary">
                  {b.check_in} → {b.check_out} · {b.guests_count}{" "}
                  {b.guests_count === 1 ? "gość" : "gości"}
                </p>
                <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-text-muted">
                  {statusPl[b.status] ?? b.status}
                  {b.confirmation_email_sent ? " · e-mail wysłany" : ""}
                </p>
              </div>
              <div className="text-right">
                <p className="text-lg font-extrabold text-brand-dark">
                  {b.final_amount} {b.currency}
                </p>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
