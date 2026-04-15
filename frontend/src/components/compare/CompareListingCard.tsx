"use client";

import Link from "next/link";
import { publicMediaUrl } from "@/lib/mediaUrl";
import { cn } from "@/lib/utils";
import type { Listing } from "@/types/listing";

export type RowKind = "price" | "rating" | "reviews" | "bool" | "number" | "text";

export type CompareRow = {
  label: string;
  kind: RowKind;
  cells: React.ReactNode[];
  meta: { emphasizeIdx: Set<number>; badIdx: Set<number> };
};

export function DataCell({
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

export function formatCompareCell(
  row: CompareRow,
  columnIndex: number
): { node: React.ReactNode; emphasize: boolean; bad: boolean } {
  const raw = row.cells[columnIndex];
  const isBool = row.kind === "bool";
  const emphasize = row.meta.emphasizeIdx.has(columnIndex);
  const bad = row.meta.badIdx.has(columnIndex);
  const content =
    isBool && raw === "✓" ? (
      <span className="text-base text-brand">✓</span>
    ) : isBool && raw === "✗" ? (
      <span className="text-base text-gray-400">✗</span>
    ) : (
      raw
    );
  return { node: content, emphasize, bad: bad && !isBool };
}

export function CompareListingCard({
  listing,
  columnIndex,
  rows,
  winnerId,
  onRemove,
}: {
  listing: Listing;
  columnIndex: number;
  rows: CompareRow[];
  winnerId: string | null;
  /** Brak przycisku „Usuń”, gdy nie przekazano */
  onRemove?: (id: string) => void;
}) {
  const img =
    listing.images?.find((i) => i.is_cover)?.display_url ?? listing.images?.[0]?.display_url;
  const src = publicMediaUrl(img);
  const isWinner = listing.id === winnerId;

  return (
    <article className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-card dark:border-[var(--brand-border)] dark:bg-[var(--bg2)]">
      <div className="flex gap-3 p-4">
        <div className="h-[88px] w-[110px] shrink-0 overflow-hidden rounded-xl bg-brand-surface">
          {src ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={src} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center text-3xl">
              {listing.listing_type?.icon ?? "🏠"}
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="line-clamp-2 text-[15px] font-bold leading-snug text-brand-dark dark:text-zinc-100">
            {listing.title}
          </h2>
          <p className="mt-1 text-[12px] text-text-muted">📍 {listing.location?.city ?? "—"}</p>
          {onRemove ? (
            <button
              type="button"
              onClick={() => onRemove(listing.id)}
              className="mt-2 min-h-[40px] w-full max-w-[140px] rounded-lg border border-gray-200 py-2 text-xs font-semibold text-red-600 hover:border-red-200 dark:border-zinc-600"
            >
              × Usuń
            </button>
          ) : null}
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-x-3 gap-y-2 border-t border-gray-100 px-4 py-3 dark:border-[var(--brand-border)]">
        {rows.slice(0, 8).map((row) => {
          const { node, emphasize, bad } = formatCompareCell(row, columnIndex);
          return (
            <div key={row.label} className="min-w-0">
              <dt className="text-[10px] font-bold uppercase tracking-wide text-gray-500 dark:text-zinc-400">
                {row.label}
              </dt>
              <dd
                className={cn(
                  "text-sm text-brand-dark dark:text-zinc-100",
                  emphasize && "font-bold text-brand",
                  bad && "font-bold text-red-500"
                )}
              >
                {node}
              </dd>
            </div>
          );
        })}
      </dl>

      {rows.length > 8 ? (
        <details className="group border-t border-gray-100 dark:border-[var(--brand-border)]">
          <summary className="cursor-pointer list-none px-4 py-3 text-sm font-semibold text-brand hover:bg-brand-surface/50 dark:hover:bg-white/5 [&::-webkit-details-marker]:hidden">
            <span className="flex items-center justify-between gap-2">
              Wszystkie szczegóły
              <span className="text-xs font-normal text-text-muted transition group-open:rotate-180">▼</span>
            </span>
          </summary>
          <dl className="space-y-2 border-t border-gray-100 px-4 py-3 dark:border-[var(--brand-border)]">
            {rows.slice(8).map((row) => {
              const { node, emphasize, bad } = formatCompareCell(row, columnIndex);
              return (
                <div
                  key={row.label}
                  className="flex items-baseline justify-between gap-3 border-b border-gray-50 pb-2 last:border-0 dark:border-zinc-800"
                >
                  <dt className="shrink-0 text-xs font-bold text-gray-500 dark:text-zinc-400">{row.label}</dt>
                  <dd
                    className={cn(
                      "text-right text-sm text-brand-dark dark:text-zinc-100",
                      emphasize && "font-bold text-brand",
                      bad && "font-bold text-red-500"
                    )}
                  >
                    {node}
                  </dd>
                </div>
              );
            })}
          </dl>
        </details>
      ) : null}

      <div className="border-t border-brand-border bg-brand-surface/50 p-4 dark:border-[var(--brand-border)] dark:bg-white/5">
        {isWinner ? (
          <Link
            href={`/listing/${listing.slug}`}
            className="flex min-h-[48px] w-full items-center justify-center rounded-xl bg-brand text-sm font-bold text-white hover:bg-brand-700"
          >
            👑 Wybierz tę ofertę
          </Link>
        ) : (
          <Link
            href={`/listing/${listing.slug}`}
            className="flex min-h-[48px] w-full items-center justify-center rounded-xl bg-gray-100 text-sm font-bold text-gray-600 hover:bg-gray-200 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
          >
            Zobacz i rezerwuj
          </Link>
        )}
      </div>
    </article>
  );
}
