"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { cn } from "@/lib/utils";

type ListingRow = {
  id: string;
  title: string;
  slug: string;
  status: string;
  base_price: string;
  currency: string;
  max_guests: number;
  booking_mode: string;
  average_rating: number | null;
  review_count: number;
  cover_image: string | null;
  created_at: string;
  location?: { city?: string; region?: string } | null;
};

const CARD = "rounded-2xl bg-white shadow-card ring-1 ring-black/[.04]";

const STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  draft: { label: "Szkic", cls: "bg-gray-100 text-gray-700" },
  pending: { label: "W moderacji", cls: "bg-amber-100 text-amber-800" },
  approved: { label: "Aktywna", cls: "bg-emerald-100 text-emerald-800" },
  rejected: { label: "Odrzucona", cls: "bg-red-100 text-red-800" },
  archived: { label: "Zarchiwizowana", cls: "bg-gray-100 text-gray-500" },
};

type StatusFilter = "all" | "draft" | "pending" | "approved" | "rejected" | "archived";

export default function HostListingsPage() {
  const [listings, setListings] = useState<ListingRow[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [filter, setFilter] = useState<StatusFilter>("all");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await api.get<{ data: ListingRow[] }>("/api/v1/host/listings/");
        if (!cancelled) setListings(res.data ?? []);
      } catch (e) {
        if (!cancelled) setErr(e instanceof Error ? e.message : "Błąd ładowania ofert.");
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const filtered = listings?.filter((l) => filter === "all" || l.status === filter) ?? null;
  const counts = listings ? {
    all: listings.length,
    approved: listings.filter((l) => l.status === "approved").length,
    pending: listings.filter((l) => l.status === "pending").length,
    draft: listings.filter((l) => l.status === "draft").length,
  } : null;

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[11px] font-extrabold uppercase tracking-[.15em] text-brand">Oferty</p>
          <h1 className="mt-1 text-[22px] font-extrabold text-brand-dark">Moje oferty</h1>
          <p className="text-sm text-text-secondary">
            Zarządzaj swoimi ofertami noclegowymi.
          </p>
        </div>
        <Link href="/host/new-listing" className="btn-primary shrink-0 px-5 py-2.5">
          + Dodaj ofertę
        </Link>
      </div>

      {counts && listings && listings.length > 0 && (
        <div className="mb-5 flex flex-wrap gap-2">
          {([
            ["all", `Wszystkie (${counts.all})`],
            ["approved", `Aktywne (${counts.approved})`],
            ["pending", `W moderacji (${counts.pending})`],
            ["draft", `Szkice (${counts.draft})`],
          ] as const).map(([val, label]) => (
            <button
              key={val}
              type="button"
              onClick={() => setFilter(val)}
              className={cn(
                "rounded-full px-3 py-1.5 text-xs font-semibold ring-1 transition-colors",
                filter === val
                  ? "ring-brand bg-brand-muted text-brand-dark"
                  : "ring-black/[.04] text-text-secondary hover:ring-brand/20 hover:shadow-elevated"
              )}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {err && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{err}</p>
      )}

      {filtered === null ? (
        <div className="flex justify-center py-16">
          <LoadingSpinner className="h-10 w-10 text-brand" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl bg-brand-surface/50 ring-1 ring-brand/5 py-16 text-center">
          <span className="text-4xl">🏠</span>
          <p className="mt-3 text-lg font-bold text-brand-dark">Brak ofert</p>
          <p className="mt-1 text-sm text-text-muted">
            {filter !== "all" ? "Brak ofert o tym statusie." : "Stwórz swoją pierwszą ofertę, aby zacząć przyjmować rezerwacje."}
          </p>
          {filter === "all" && (
            <Link href="/host/new-listing" className="btn-primary mt-6 inline-flex">Dodaj pierwszą ofertę</Link>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((listing) => {
            const st = STATUS_LABELS[listing.status] ?? { label: listing.status, cls: "bg-gray-100 text-gray-600" };
            return (
              <div
                key={listing.id}
                className={`${CARD} flex flex-col gap-4 p-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-elevated sm:flex-row sm:items-center`}
              >
                {listing.cover_image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={listing.cover_image} alt="" className="h-20 w-28 shrink-0 rounded-xl object-cover" />
                ) : (
                  <div className="flex h-20 w-28 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-2xl text-gray-300">🏠</div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link href={`/listing/${listing.slug}`} className="text-sm font-bold text-brand-dark hover:text-brand hover:underline">
                      {listing.title}
                    </Link>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${st.cls}`}>{st.label}</span>
                  </div>
                  <p className="mt-1 text-xs text-text-muted">
                    {listing.base_price} {listing.currency} / noc
                    {listing.max_guests > 0 && ` · max ${listing.max_guests} gości`}
                    {listing.average_rating != null && ` · ${listing.average_rating.toFixed(2)} ★ (${listing.review_count})`}
                    {listing.location?.city && ` · ${listing.location.city}`}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <Link href={`/host/calendar`} className="rounded-lg ring-1 ring-black/[.06] px-3 py-1.5 text-xs font-medium text-brand-dark hover:bg-brand-surface/60">📅</Link>
                  <Link href={`/listing/${listing.slug}`} className="btn-secondary px-3 py-1.5 text-xs">Podgląd</Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
