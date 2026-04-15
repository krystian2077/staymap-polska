"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { getAccessToken } from "@/lib/authStorage";
import {
  CompareListingCard,
  DataCell,
  formatCompareCell,
} from "@/components/compare/CompareListingCard";
import { buildCompareRows, winnerListingId } from "@/lib/compareRows";
import { publicMediaUrl } from "@/lib/mediaUrl";
import { useCompareStore } from "@/lib/store/compareStore";

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

  const rows = useMemo(() => buildCompareRows(listings), [listings]);
  const winnerId = useMemo(() => winnerListingId(listings), [listings]);

  const handleRemove = useCallback(
    (id: string) => {
      void removeListing(id, token ?? undefined);
      toast.success("Usunięto z porównania");
    },
    [removeListing, token]
  );

  if (!mounted) {
    return <div className="mx-auto max-w-[1200px] px-8 py-10 text-text-muted">Ładowanie…</div>;
  }

  if (!token) return null;

  if (listings.length < 2) {
    return (
      <div className="min-h-[70vh] bg-[linear-gradient(180deg,#f7faf8_0%,#eef6f1_50%,#fafcfb_100%)] pb-[calc(4rem+env(safe-area-inset-bottom,0px))] dark:bg-[var(--background)]">
        <div className="mx-auto max-w-[1200px] px-4 py-10 sm:px-8 sm:py-14">
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-brand/20 bg-white/80 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-brand shadow-sm dark:border-white/15 dark:bg-[var(--bg2)]">
            Porównywarka
          </div>
          <h1 className="text-[clamp(24px,5.5vw,34px)] font-black leading-tight tracking-tight text-brand-dark dark:text-white">
            Porównanie ofert
          </h1>
          <p className="mt-2 max-w-md text-[14px] font-medium text-text-muted dark:text-white/70">
            Max 3 oferty jednocześnie · sesja ważna 48h
          </p>
          <div className="mt-10 rounded-[24px] border border-gray-200/90 bg-white/90 p-8 text-center shadow-[0_16px_48px_rgba(10,46,26,0.08)] backdrop-blur-sm dark:border-white/15 dark:bg-[var(--bg2)] sm:p-12">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-brand/15 to-brand/5 text-3xl shadow-inner">
              ⚖️
            </div>
            <p className="text-[15px] font-semibold leading-snug text-brand-dark dark:text-white">
              Dodaj co najmniej 2 oferty, żeby zobaczyć zestawienie.
            </p>
            <p className="mx-auto mt-2 max-w-sm text-sm text-text-muted dark:text-white/65">
              Zapisz noclegi w ulubionych lub na liście wyników, potem wybierz „Porównaj”.
            </p>
            <Link
              href="/search"
              className="btn-primary mt-8 inline-flex min-h-[48px] rounded-full px-10 py-3 text-[15px] font-black"
            >
              Przeglądaj oferty
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f7faf8_0%,#eef6f1_38%,#fafcfb_100%)] pb-[calc(3rem+env(safe-area-inset-bottom,0px))] dark:bg-[var(--background)]">
      <div className="mx-auto max-w-[1200px] px-4 py-6 sm:px-7 sm:py-8 md:px-8">
        <div className="mb-1 inline-flex items-center gap-2 rounded-full border border-brand/15 bg-white/70 px-2.5 py-0.5 text-[9px] font-black uppercase tracking-[0.16em] text-brand dark:border-white/20 dark:bg-[var(--bg2)] sm:text-[10px]">
          Porównywarka
        </div>
        <h1 className="text-[clamp(22px,5vw,30px)] font-black leading-tight tracking-tight text-brand-dark dark:text-white">
          Porównanie ofert
        </h1>
        <p className="mb-5 mt-1.5 text-[13px] font-medium text-text-muted dark:text-white/70 sm:text-sm">
          Max 3 oferty jednocześnie · sesja ważna 48h
        </p>
        {loading ? (
          <p className="mb-3 text-sm text-text-muted dark:text-white/60">Synchronizacja z serwerem…</p>
        ) : null}

      <div className="space-y-4 lg:hidden">
        {listings.map((l, i) => (
          <CompareListingCard
            key={l.id}
            listing={l}
            columnIndex={i}
            rows={rows}
            winnerId={winnerId}
            onRemove={handleRemove}
          />
        ))}
      </div>

      <div className="hidden overflow-x-auto overscroll-x-contain rounded-2xl border border-gray-200 shadow-card [-webkit-overflow-scrolling:touch] lg:block">
        <table className="min-w-[700px] w-full border-collapse">
          <thead>
            <tr>
              <th className="sticky left-0 z-20 w-32 min-w-[7.5rem] bg-gray-50 p-3 text-left text-xs font-bold text-gray-500 shadow-[4px_0_12px_-8px_rgba(0,0,0,.12)]" />
              {listings.map((l) => {
                const img =
                  l.images?.find((i) => i.is_cover)?.display_url ?? l.images?.[0]?.display_url;
                const src = publicMediaUrl(img);
                return (
                  <th key={l.id} className="min-w-[130px] border-b border-gray-100 p-3 align-top">
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
                      className="w-full min-h-[40px] rounded-lg border border-gray-200 py-2 text-xs font-semibold text-red-600 hover:border-red-200 sm:min-h-0 sm:py-1.5"
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
                <td className="sticky left-0 z-10 border-b border-gray-100 bg-gray-50 px-3 py-2.5 text-xs font-bold text-gray-500 shadow-[4px_0_12px_-8px_rgba(0,0,0,.1)]">
                  {row.label}
                </td>
                {listings.map((_, ci) => {
                  const { node, emphasize, bad } = formatCompareCell(row, ci);
                  return (
                    <DataCell key={ci} emphasize={emphasize} bad={bad}>
                      {node}
                    </DataCell>
                  );
                })}
              </tr>
            ))}
            <tr className="bg-brand-surface/50">
              <td className="sticky left-0 z-10 border-t border-brand-border bg-brand-surface/50 px-3 py-3 text-xs font-bold text-brand-dark shadow-[4px_0_12px_-8px_rgba(0,0,0,.08)]">
                Najlepsza wartość
              </td>
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
    </div>
  );
}
