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
      } catch (err) {
        console.error("[ListingReviews] Fetch error:", err);
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
    <section>
      <div className="mb-10 flex flex-col gap-10 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-center gap-6">
          <div className="flex h-24 w-24 flex-col items-center justify-center rounded-[2rem] bg-brand text-white shadow-xl shadow-brand/20">
            <p className="text-4xl font-black leading-none">{avg.toFixed(1)}</p>
            <p className="mt-1 text-[11px] font-black uppercase tracking-[0.15em] opacity-70">Ocena</p>
          </div>
          <div>
            <h2 className="text-3xl font-black tracking-tight text-brand-dark">Opinie gości</h2>
            <div className="mt-2 flex items-center gap-2">
              <div className="flex text-yellow-400">
                {[...Array(5)].map((_, i) => (
                  <svg key={i} className={`h-4.5 w-4.5 ${i < Math.round(avg) ? "fill-current" : "text-gray-200"}`} viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
              <p className="text-[15px] font-bold text-gray-500">{reviews.length} zweryfikowanych opinii</p>
            </div>
          </div>
        </div>

        <div className="grid min-w-[320px] grid-cols-2 gap-x-10 gap-y-5">
          {dims.map((d) => {
            const v = subAvg(d.key);
            const pct = (v / 5) * 100;
            return (
              <div key={d.key} className="flex flex-col gap-2">
                <div className="flex justify-between text-[11px] font-black uppercase tracking-widest text-gray-400">
                  <span>{d.label}</span>
                  <span className="text-brand-dark">{v.toFixed(1)}</span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-50 shadow-inner">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-brand/60 to-brand transition-all duration-[1200ms] ease-[cubic-bezier(.16,1,.3,1)]"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
        {reviews.map((r) => (
          <article key={r.id} className="group relative rounded-3xl border border-black/[0.03] bg-gray-50/30 p-8 transition-all duration-300 hover:border-brand/20 hover:bg-white hover:shadow-lg">
            <div className="mb-5 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-sm font-black text-brand-dark shadow-sm ring-1 ring-black/[0.02]">
                  {r.author.first_name[0]}
                  {r.author.last_name[0]}
                </div>
                <div>
                  <p className="text-base font-black tracking-tight text-brand-dark">
                    {r.author.first_name} {r.author.last_name}
                  </p>
                  <p className="text-[11px] font-black uppercase tracking-widest text-gray-400">
                    {new Date(r.created_at).toLocaleDateString("pl-PL", { month: "long", year: "numeric" })}
                  </p>
                </div>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand/5 text-[15px] font-black text-brand">
                {r.overall_rating.toFixed(1)}
              </div>
            </div>
            {r.title && <h4 className="mb-3 text-[15px] font-black text-brand-dark">{r.title}</h4>}
            <p className="text-[15.5px] leading-relaxed text-gray-600 line-clamp-5 group-hover:line-clamp-none transition-all duration-500">
              {r.content}
            </p>
          </article>
        ))}
      </div>
      {reviews.length >= 4 && (
        <button type="button" className="mt-12 w-full rounded-2xl border-2 border-brand-dark px-10 py-4 text-xs font-black uppercase tracking-widest text-brand-dark transition-all hover:bg-brand-dark hover:text-white sm:w-auto">
          Pokaż wszystkie opinie
        </button>
      )}
    </section>
  );
}
