"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";

import { api } from "@/lib/api";
import { formatDate } from "@/lib/utils/dates";
import { cn } from "@/lib/utils";
import type { ReviewWithBlind } from "@/types/listing";
import { differenceInDays } from "date-fns";

type Filter = "all" | "published" | "pending" | "noreply";
type Sort = "new" | "old" | "low" | "noreply";

function daysUntil(iso: string): number {
  const d = differenceInDays(new Date(iso), new Date());
  return Math.max(0, d);
}

export default function HostReviewsPage() {
  const [reviews, setReviews] = useState<ReviewWithBlind[]>([]);
  const [meta, setMeta] = useState({ count: 0, avg_rating: 0, pending_response_count: 0 });
  const [filter, setFilter] = useState<Filter>("all");
  const [sort, setSort] = useState<Sort>("new");
  const [replyOpen, setReplyOpen] = useState<string | null>(null);
  const [replyText, setReplyText] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    try {
      const res = await api.get<{
        data: ReviewWithBlind[];
        meta: { count: number; avg_rating: number; pending_response_count: number };
      }>("/api/v1/host/reviews/");
      setReviews(res.data ?? []);
      setMeta(res.meta ?? { count: 0, avg_rating: 0, pending_response_count: 0 });
    } catch {
      setReviews([]);
      setMeta({ count: 0, avg_rating: 0, pending_response_count: 0 });
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const blindCount = useMemo(
    () => reviews.filter((r) => !r.is_public || !r.is_blind_review_released).length,
    [reviews]
  );

  const filtered = useMemo(() => {
    let rows = [...reviews];
    if (filter === "published") rows = rows.filter((r) => r.is_public);
    if (filter === "pending") rows = rows.filter((r) => !r.is_public);
    if (filter === "noreply") rows = rows.filter((r) => r.is_public && !r.host_response);
    if (sort === "new") rows.sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));
    if (sort === "old") rows.sort((a, b) => +new Date(a.created_at) - +new Date(b.created_at));
    if (sort === "low") rows.sort((a, b) => a.overall_rating - b.overall_rating);
    if (sort === "noreply") rows.sort((a, b) => +!!a.host_response - +!!b.host_response);
    return rows;
  }, [reviews, filter, sort]);

  const submitReply = async (id: string) => {
    const text = (replyText[id] ?? "").trim();
    if (text.length < 20) {
      toast.error("Minimum 20 znaków.");
      return;
    }
    try {
      await api.patch(`/api/v1/reviews/${id}/host-response/`, { host_response: text });
      toast.success("Odpowiedź opublikowana!");
      setReplyOpen(null);
      void load();
    } catch (e) {
      toast.error((e as Error).message || "Błąd");
    }
  };

  return (
    <div className="p-6 lg:p-8">
      <header className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-lg font-extrabold text-brand-dark">Recenzje gości</h1>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-4xl font-extrabold text-brand-dark">
              {meta.avg_rating.toFixed(2)}
            </span>
            <span className="text-amber-500">★★★★★</span>
            <span className="text-sm text-text-muted">{meta.count} recenzji</span>
          </div>
        </div>
      </header>

      {blindCount > 0 ? (
        <div className="mb-4 flex gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3.5 dark:border-amber-500/35 dark:bg-amber-950/30">
          <span className="text-xl">🔒</span>
          <div>
            <p className="font-bold text-amber-900">Blind Review Period — {blindCount} recenzji oczekuje</p>
            <p className="text-sm text-amber-800">
              Recenzje zostaną opublikowane 14 dni po checkout lub wcześniej jeśli obie strony wystawią opinie.
            </p>
          </div>
        </div>
      ) : null}

      <div className="mb-4 flex flex-wrap gap-2">
        {(
          [
            ["all", "Wszystkie"],
            ["published", "Opublikowane"],
            ["pending", "Oczekujące"],
            ["noreply", "Bez odpowiedzi"],
          ] as const
        ).map(([k, lab]) => (
          <button
            key={k}
            type="button"
            onClick={() => setFilter(k)}
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
              filter === k
                ? "border-brand bg-brand-muted text-brand-dark"
                : "border-brand-dark/[.06] text-text-secondary hover:border-brand"
            )}
          >
            {lab}
          </button>
        ))}
        <select
          className="input ml-auto max-w-[200px] py-1.5 text-xs"
          value={sort}
          onChange={(e) => setSort(e.target.value as Sort)}
        >
          <option value="new">Najnowsze</option>
          <option value="old">Najstarsza</option>
          <option value="low">Najniższa ocena</option>
          <option value="noreply">Bez odpowiedzi</option>
        </select>
      </div>

      <div className="mb-5 flex flex-wrap gap-4 text-xs">
        {["Czystość", "Lokalizacja", "Komunikacja", "Dokładność"].map((label) => (
          <div key={label} className="flex min-w-[140px] flex-1 items-center gap-2">
            <span className="w-20 shrink-0 text-text-muted">{label}</span>
            <div className="h-1 flex-1 rounded bg-border">
              <div className="h-full w-[80%] rounded bg-brand" />
            </div>
            <span className="text-brand-dark">4.8</span>
          </div>
        ))}
      </div>

      <ul className="space-y-4">
        {filtered.map((r) => (
          <li
            key={r.id}
            className={cn(
              "rounded-xl border p-4",
              !r.is_public ? "border-amber-200 bg-amber-50/85 opacity-85 dark:border-amber-500/35 dark:bg-amber-950/30" : "bg-white ring-1 ring-black/[.04] dark:bg-[var(--bg2)] dark:ring-brand-border/45"
            )}
          >
            {!r.is_public ? (
              <div className="flex gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-200 text-lg font-bold text-gray-500 dark:bg-[var(--bg3)] dark:text-[var(--text2)]">
                  ?
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold">Gość — blind</p>
                   <span className="mt-1 inline-block rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-900 dark:bg-amber-900/40 dark:text-amber-200">
                    🔒 Blind period — pozostało {daysUntil(r.blind_release_at)} dni
                  </span>
                  <div className="mt-2 rounded-lg bg-amber-100 p-3 text-sm text-amber-900 dark:bg-amber-900/35 dark:text-amber-100">
                    Treść ukryta do czasu publikacji.
                  </div>
                </div>
              </div>
            ) : (
              <>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="flex gap-3">
                    {r.author.avatar_url ? (
                      <Image
                        src={r.author.avatar_url}
                        alt=""
                        width={40}
                        height={40}
                        className="rounded-full object-cover"
                        unoptimized
                      />
                    ) : (
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-muted text-sm font-bold">
                        {r.author.first_name[0]}
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-bold">
                        {r.author.first_name} {r.author.last_name}
                      </p>
                      <p className="text-[11px] text-text-muted">{formatDate(r.created_at)}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-amber-500">{"★".repeat(Math.round(r.overall_rating))}</span>
                    {!r.host_response ? (
                      <span className="ml-2 rounded bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-900">
                        Bez odpowiedzi
                      </span>
                    ) : null}
                  </div>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-text">{r.content}</p>
                {r.host_response ? (
                  <div className="mt-3 rounded-lg border-l-4 border-brand bg-brand-surface px-3 py-2">
                    <p className="text-[11px] font-bold uppercase text-brand">Twoja odpowiedź</p>
                    <p className="text-sm text-brand-dark">{r.host_response}</p>
                  </div>
                ) : (
                  <div className="mt-3">
                    {replyOpen === r.id ? (
                      <>
                        <textarea
                          className="input min-h-[80px] w-full resize-y"
                          placeholder="Twoja publiczna odpowiedź…"
                          value={replyText[r.id] ?? ""}
                          onChange={(e) =>
                            setReplyText((prev) => ({ ...prev, [r.id]: e.target.value }))
                          }
                        />
                        <p className="mt-1 text-[11px] text-text-muted">
                          Odpowiedź będzie widoczna publicznie dla wszystkich gości (min. 20 znaków).
                        </p>
                        <button
                          type="button"
                          className="btn-primary mt-2"
                          onClick={() => void submitReply(r.id)}
                        >
                          Opublikuj odpowiedź
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        className="btn-secondary text-xs"
                        onClick={() => setReplyOpen(r.id)}
                      >
                        ✏️ Odpowiedz (tylko 1 raz)
                      </button>
                    )}
                  </div>
                )}
              </>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
