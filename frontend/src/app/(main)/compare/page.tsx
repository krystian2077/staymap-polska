"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { getAccessToken } from "@/lib/authStorage";
import { publicMediaUrl } from "@/lib/mediaUrl";
import { useCompareStore } from "@/lib/store/compareStore";
import { cn } from "@/lib/utils";
import type { Listing } from "@/types/listing";

function hasAmenity(listing: Listing, sub: string) {
  return listing.amenities?.some((a) => a.name.toLowerCase().includes(sub)) ?? false;
}

function avgDestScore(listing: Listing): number {
  const d = listing.destination_score_cache;
  if (!d) return 0;
  const vals = [
    d.romantic,
    d.nature,
    d.outdoor,
    d.quiet,
    d.family,
    d.workation,
    d.accessibility,
  ];
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

function totalAlgoScore(listing: Listing): number {
  const price = Math.max(listing.base_price || 1, 1);
  const rating = listing.average_rating ?? 0;
  const dest = avgDestScore(listing);
  return (1 / price) * 0.3 + rating * 0.3 + (dest / 10) * 0.4;
}

type RowKind = "price" | "rating" | "reviews" | "bool" | "number" | "text";

function DataCell({
  children,
  emphasize,
  bad,
}: {
  children: React.ReactNode;
  emphasize?: boolean;
  bad?: boolean;
}) {
  return (
    <td
      className={cn(
        "border-b border-gray-100 px-3 py-2.5 text-center text-sm",
        emphasize && "font-bold text-brand",
        bad && "font-bold text-red-500"
      )}
    >
      {children}
    </td>
  );
}

export default function ComparePage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const listings = useCompareStore((s) => s.listings);
  const sessionId = useCompareStore((s) => s.sessionId);
  const loadSession = useCompareStore((s) => s.loadSession);
  const removeListing = useCompareStore((s) => s.removeListing);
  const loading = useCompareStore((s) => s.loading);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || typeof window === "undefined") return;
    if (!getAccessToken()) {
      router.replace("/login?next=/compare");
    }
  }, [mounted, router]);

  useEffect(() => {
    const t = getAccessToken();
    if (!t || !sessionId) return;
    void loadSession(sessionId, t);
  }, [sessionId, loadSession]);

  const token = mounted && typeof window !== "undefined" ? getAccessToken() : null;

  const winnerId = useMemo(() => {
    if (listings.length < 2) return null;
    let best = listings[0];
    let bestS = totalAlgoScore(best);
    for (let i = 1; i < listings.length; i++) {
      const s = totalAlgoScore(listings[i]);
      if (s > bestS) {
        best = listings[i];
        bestS = s;
      }
    }
    return best.id;
  }, [listings]);

  const handleRemove = useCallback(
    (id: string) => {
      void removeListing(id, token ?? undefined);
      toast.success("Usunięto z porównania");
    },
    [removeListing, token]
  );

  function rowMeta(
    kind: RowKind,
    values: (number | string | null | boolean)[]
  ): { emphasizeIdx: Set<number>; badIdx: Set<number> } {
    const emphasizeIdx = new Set<number>();
    const badIdx = new Set<number>();
    if (kind === "price") {
      const nums = values.map((v, i) => (typeof v === "number" ? { v, i } : null)).filter(Boolean) as {
        v: number;
        i: number;
      }[];
      if (nums.length) {
        const min = Math.min(...nums.map((x) => x.v));
        const max = Math.max(...nums.map((x) => x.v));
        nums.forEach(({ v, i }) => {
          if (v === min) emphasizeIdx.add(i);
          if (v === max && max !== min) badIdx.add(i);
        });
      }
    }
    if (kind === "rating" || kind === "number") {
      const nums = values.map((v, i) => (typeof v === "number" ? { v, i } : null)).filter(Boolean) as {
        v: number;
        i: number;
      }[];
      if (nums.length) {
        const min = Math.min(...nums.map((x) => x.v));
        const max = Math.max(...nums.map((x) => x.v));
        nums.forEach(({ v, i }) => {
          if (v === max) emphasizeIdx.add(i);
          if (v === min && min !== max) badIdx.add(i);
        });
      }
    }
    if (kind === "reviews") {
      const nums = values.map((v, i) => (typeof v === "number" ? { v, i } : null)).filter(Boolean) as {
        v: number;
        i: number;
      }[];
      if (nums.length) {
        const max = Math.max(...nums.map((x) => x.v));
        nums.forEach(({ v, i }) => {
          if (v === max) emphasizeIdx.add(i);
        });
      }
    }
    return { emphasizeIdx, badIdx };
  }

  if (!mounted) {
    return <div className="mx-auto max-w-[1200px] px-8 py-10 text-text-muted">Ładowanie…</div>;
  }

  if (!token) return null;

  if (listings.length < 2) {
    return (
      <div className="mx-auto max-w-[1200px] px-8 py-12">
        <h1 className="text-[22px] font-extrabold text-brand-dark">Porównanie ofert</h1>
        <p className="mt-1 text-sm text-text-muted">Max 3 oferty jednocześnie · sesja ważna 48h</p>
        <div className="mt-10 rounded-xl border border-dashed border-gray-200 bg-brand-surface/40 p-10 text-center">
          <p className="font-medium text-text">Dodaj co najmniej 2 oferty, żeby zobaczyć tabelę.</p>
          <Link href="/search" className="btn-primary mt-5 inline-flex">
            Przeglądaj oferty
          </Link>
        </div>
      </div>
    );
  }

  const prices = listings.map((l) => l.base_price);
  const ratings = listings.map((l) => l.average_rating ?? 0);
  const reviews = listings.map((l) => l.review_count || 0);
  const workation = listings.map((l) => l.destination_score_cache?.workation || 0);
  const romantic = listings.map((l) => l.destination_score_cache?.romantic || 0);
  const nature = listings.map((l) => l.destination_score_cache?.nature || 0);

  const pm = rowMeta("price", prices);
  const rm = rowMeta("rating", ratings);
  const wm = rowMeta("number", workation);
  const romM = rowMeta("number", romantic);
  const natM = rowMeta("number", nature);
  const revM = rowMeta("reviews", reviews);

  const rows: {
    label: string;
    kind: RowKind;
    cells: React.ReactNode[];
    meta: { emphasizeIdx: Set<number>; badIdx: Set<number> };
  }[] = [
    {
      label: "Cena / noc",
      kind: "price",
      meta: pm,
      cells: listings.map((l) => `${l.base_price || 0} ${l.currency || 'PLN'}`),
    },
    {
      label: "Ocena",
      kind: "rating",
      meta: rm,
      cells: listings.map((l) => (l.average_rating != null ? Number(l.average_rating).toFixed(1) : "—")),
    },
    {
      label: "Typ",
      kind: "text",
      meta: { emphasizeIdx: new Set(), badIdx: new Set() },
      cells: listings.map((l) => l.listing_type?.name || "Obiekt 🏠"),
    },
    {
      label: "Recenzje",
      kind: "reviews",
      meta: revM,
      cells: listings.map((l) => (l.review_count || 0)),
    },
    {
      label: "Sauna",
      kind: "bool",
      meta: { emphasizeIdx: new Set(), badIdx: new Set() },
      cells: listings.map((l) => (hasAmenity(l, "saun") ? "✓" : "✗")),
    },
    {
      label: "WiFi",
      kind: "bool",
      meta: { emphasizeIdx: new Set(), badIdx: new Set() },
      cells: listings.map((l) =>
        hasAmenity(l, "wifi") || hasAmenity(l, "wi-fi") ? "✓" : "✗"
      ),
    },
    {
      label: "Zwierzęta",
      kind: "bool",
      meta: { emphasizeIdx: new Set(), badIdx: new Set() },
      cells: listings.map((l) => (l.is_pet_friendly ? "✓" : "✗")),
    },
    {
      label: "Max goście",
      kind: "number",
      meta: rowMeta(
        "number",
        listings.map((l) => l.max_guests || 2)
      ),
      cells: listings.map((l) => (l.max_guests || 2)),
    },
    {
      label: "Sypialnie",
      kind: "number",
      meta: rowMeta("number", listings.map((l) => l.bedrooms || 1)),
      cells: listings.map((l) => l.bedrooms || 1),
    },
    {
      label: "Łóżka",
      kind: "number",
      meta: rowMeta("number", listings.map((l) => l.beds || 1)),
      cells: listings.map((l) => l.beds || 1),
    },
    {
      label: "Workation",
      kind: "number",
      meta: wm,
      cells: listings.map((l) => (l.destination_score_cache?.workation ?? "—") as string | number),
    },
    {
      label: "Romantyczność",
      kind: "number",
      meta: romM,
      cells: listings.map((l) => (l.destination_score_cache?.romantic ?? "—") as string | number),
    },
    {
      label: "Natura",
      kind: "number",
      meta: natM,
      cells: listings.map((l) => (l.destination_score_cache?.nature ?? "—") as string | number),
    },
  ];

  return (
    <div className="mx-auto max-w-[1200px] px-7 py-8 sm:px-8">
      <h1 className="text-[22px] font-extrabold text-brand-dark">Porównanie ofert</h1>
      <p className="mb-5 mt-1 text-sm text-text-muted">
        Max 3 oferty jednocześnie · sesja ważna 48h
      </p>
      {loading ? <p className="text-sm text-text-muted">Synchronizacja z serwerem…</p> : null}

      <div className="overflow-x-auto rounded-2xl border border-gray-200 shadow-card">
        <table className="min-w-[700px] w-full border-collapse">
          <thead>
            <tr>
              <th className="w-32 bg-gray-50 p-3 text-left text-xs font-bold text-gray-500" />
              {listings.map((l) => {
                const img =
                  l.images?.find((i) => i.is_cover)?.display_url ?? l.images?.[0]?.display_url;
                const src = publicMediaUrl(img);
                return (
                  <th key={l.id} className="border-b border-gray-100 p-3 align-top">
                    <div className="mb-2.5 h-[110px] overflow-hidden rounded-[10px] bg-brand-surface">
                      {src ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={src} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full items-center justify-center text-3xl">
                          {l.listing_type?.icon ?? "🏠"}
                        </div>
                      )}
                    </div>
                    <p className="mb-1 line-clamp-2 text-left text-[13px] font-bold leading-snug">{l.title}</p>
                    <p className="mb-2 text-left text-[11px] text-text-muted">
                      📍 {l.location?.city ?? "—"}
                    </p>
                    <button
                      type="button"
                      onClick={() => handleRemove(l.id)}
                      className="w-full rounded-lg border border-gray-200 py-1.5 text-xs font-semibold text-red-600 hover:border-red-200"
                    >
                      × Usuń
                    </button>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, ri) => (
              <tr
                key={row.label}
                className="animate-ai-slide-up"
                style={{ animationDelay: `${ri * 30}ms` }}
              >
                <td className="border-b border-gray-100 bg-gray-50 px-3 py-2.5 text-xs font-bold text-gray-500">
                  {row.label}
                </td>
                {listings.map((_, ci) => {
                  const raw = row.cells[ci];
                  const isBool = row.kind === "bool";
                  const emphasize = row.meta.emphasizeIdx.has(ci);
                  const bad = row.meta.badIdx.has(ci);
                  const content =
                    isBool && raw === "✓" ? (
                      <span className="text-base text-brand">✓</span>
                    ) : isBool && raw === "✗" ? (
                      <span className="text-base text-gray-400">✗</span>
                    ) : (
                      raw
                    );
                  return (
                    <DataCell key={ci} emphasize={emphasize} bad={bad && !isBool}>
                      {content}
                    </DataCell>
                  );
                })}
              </tr>
            ))}
            <tr className="bg-brand-surface/50">
              <td className="px-3 py-3 text-xs font-bold text-brand-dark">Najlepsza wartość</td>
              {listings.map((l) => (
                <td key={l.id} className="border-t border-brand-border px-3 py-3 text-center">
                  {l.id === winnerId ? (
                    <Link
                      href={`/listing/${l.slug}`}
                      className="inline-block rounded-lg bg-brand px-4 py-2 text-xs font-bold text-white hover:bg-brand-700"
                    >
                      👑 Wybierz tę
                    </Link>
                  ) : (
                    <Link
                      href={`/listing/${l.slug}`}
                      className="inline-block rounded-lg bg-gray-100 px-4 py-2 text-xs font-bold text-gray-500 hover:bg-gray-200"
                    >
                      Rezerwuj
                    </Link>
                  )}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
