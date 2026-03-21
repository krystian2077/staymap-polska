"use client";

import { useEffect, useState } from "react";

import { api } from "@/lib/api";
import type { Review } from "@/types/booking";

type Props = { listingSlug: string };

export function ListingReviews({ listingSlug }: Props) {
  const [reviews, setReviews] = useState<Review[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await api.get<{ data: Review[] }>(
          `/api/v1/listings/${listingSlug}/reviews/`,
          { page_size: "4" }
        );
        if (!cancelled)
          setReviews(
            res.data.map((r) => ({
              ...r,
              overall_rating: Number(r.overall_rating),
            }))
          );
      } catch {
        if (!cancelled) setReviews([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [listingSlug]);

  const subAvg = (key: string) => {
    if (!reviews?.length) return 0;
    let s = 0;
    let n = 0;
    for (const r of reviews) {
      const v = r.subscores?.[key];
      if (v != null) {
        s += v;
        n += 1;
      }
    }
    return n ? s / n : 0;
};

  const dims = [
    { key: "cleanliness", label: "Czystość" },
    { key: "location", label: "Lokalizacja" },
    { key: "communication", label: "Komunikacja" },
    { key: "accuracy", label: "Dokładność" },
  ];

  if (loading) {
    return (
      <section className="mt-10">
        <h2 className="mb-4 text-lg font-extrabold text-brand-dark">Opinie</h2>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className="h-28 animate-pulse rounded-xl bg-gray-100" />
          <div className="h-28 animate-pulse rounded-xl bg-gray-100" />
        </div>
      </section>
    );
  }

  if (!reviews?.length) {
    return (
      <section className="mt-10">
        <h2 className="mb-2 text-lg font-extrabold text-brand-dark">Opinie</h2>
        <p className="text-sm text-gray-500">Jeszcze brak opinii dla tej oferty.</p>
      </section>
    );
  }

  const avg =
    reviews.reduce((a, r) => a + r.overall_rating, 0) / reviews.length;

  return (
    <section className="mt-10">
      <div className="mb-6 flex flex-wrap items-end gap-4">
        <p className="text-4xl font-extrabold text-brand-dark">{avg.toFixed(1)}</p>
        <div className="text-amber-400">{"★".repeat(5)}</div>
        <p className="text-sm text-gray-500">{reviews.length} opinii</p>
      </div>

      <div className="mb-8 space-y-2">
        {dims.map((d) => {
          const v = subAvg(d.key);
          const pct = (v / 5) * 100;
          return (
            <div key={d.key} className="flex items-center gap-2 text-xs text-gray-400">
              <span className="min-w-[80px] font-medium">{d.label}</span>
              <div className="h-1 flex-1 overflow-hidden rounded-full bg-gray-200">
                <div
                  className="h-full rounded-full bg-brand transition-all duration-700 ease-[cubic-bezier(.16,1,.3,1)]"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="w-8 font-bold text-brand-dark">{v.toFixed(1)}</span>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2">
        {reviews.map((r) => (
          <article key={r.id} className="rounded-xl bg-gray-50 p-4">
            <div className="mb-2 flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-muted text-xs font-bold text-brand-dark">
                {r.author.first_name[0]}
                {r.author.last_name[0]}
              </span>
              <div>
                <p className="text-sm font-semibold text-brand-dark">
                  {r.author.first_name} {r.author.last_name}
                </p>
                <p className="text-xs text-gray-400">
                  {new Date(r.created_at).toLocaleDateString("pl-PL")}
                </p>
              </div>
            </div>
            <p className="text-amber-400">{"★".repeat(Math.round(r.overall_rating))}</p>
            {r.title && <p className="mt-1 text-sm font-bold text-brand-dark">{r.title}</p>}
            <p className="mt-1 text-[13px] leading-relaxed text-gray-600">{r.content}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
