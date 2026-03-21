"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { ListingCard } from "@/components/listings/ListingCard";
import { useJsonGet } from "@/lib/hooks/useJsonGet";
import { publicMediaUrl } from "@/lib/mediaUrl";
import type { SearchListing } from "@/lib/searchTypes";
import type { SimilarListing } from "@/types/listing";
import { MODE_EMOJI, TRAVEL_MODE_LABELS } from "@/lib/utils/booking";
import { cn } from "@/lib/utils";

type SimilarApi = {
  data?: SimilarListing[];
  meta?: { count?: number };
};

type SearchMoreApi = {
  data?: SearchListing[];
};

type CardProps = {
  item: SimilarListing;
  index: number;
  travelMode?: string;
};

function SimilarListingCard({ item, index, travelMode }: CardProps) {
  const [liked, setLiked] = useState(false);
  const coverRaw =
    item.images?.find((i) => i.is_cover)?.display_url ?? item.images?.[0]?.display_url ?? null;
  const cover = publicMediaUrl(coverRaw);
  const badge = item.top_badge || item.listing_type?.name || "Nocleg";
  const modeScore =
    travelMode && item.destination_score_cache
      ? item.destination_score_cache[travelMode]
      : null;

  return (
    <Link
      href={`/listing/${item.slug}`}
      className={cn(
        "group block overflow-hidden rounded-[14px] border border-[#e5e7eb] transition-all duration-[250ms] ease-[cubic-bezier(.16,1,.3,1)] hover:-translate-y-1 hover:border-[#bbf7d0] hover:shadow-[0_14px_36px_rgba(0,0,0,.1)]"
      )}
      style={{
        opacity: 0,
        transform: "translateY(20px)",
        animation: `fade-up 0.55s cubic-bezier(.16,1,.3,1) forwards`,
        animationDelay: `${index * 70}ms`,
      }}
    >
      <div className="relative h-[150px] overflow-hidden bg-brand-surface">
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={cover}
            alt=""
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-5xl">
            {item.listing_type?.icon || "🏠"}
          </div>
        )}
        <span className="absolute left-2 top-2 rounded-full bg-brand px-2.5 py-0.5 text-[10px] font-bold text-white">
          {badge}
        </span>
        <span
          className="absolute right-2 top-2 rounded-full px-2.5 py-0.5 text-[10px] font-bold text-[#0a2e1a]"
          style={{ background: "var(--brand-muted)" }}
        >
          {item.distance_km.toFixed(1)} km od Ciebie
        </span>
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setLiked(!liked);
          }}
          className="absolute bottom-2 right-2 flex h-6 w-6 items-center justify-center rounded-full border border-black/10 bg-white/90 text-xs transition hover:scale-110"
          aria-label="Ulubione"
        >
          {liked ? "♥" : "♡"}
        </button>
      </div>
      <div className="px-3.5 py-3">
        <h3 className="mb-1 line-clamp-2 text-[13px] font-bold leading-snug text-[#111827]">
          {item.title}
        </h3>
        <p className="mb-2 flex items-center gap-1 text-[11px] text-[#9ca3af]">
          <svg className="h-2.5 w-2.5 shrink-0" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
          </svg>
          {item.location.city}, {item.location.region}
        </p>
        <div className="flex items-center justify-between">
          <div>
            <span className="text-sm font-extrabold text-[#111827]">{item.base_price} zł</span>
            <span className="ml-1 text-[11px] text-[#9ca3af]">/ noc</span>
          </div>
          <div className="text-right">
            <span className="text-xs font-bold text-[#111827]">
              ★ {item.average_rating != null ? item.average_rating.toFixed(1) : "—"}
            </span>
            <span className="ml-1 text-[11px] text-[#9ca3af]">({item.review_count})</span>
          </div>
        </div>
        {travelMode && typeof modeScore === "number" && (
          <div className="mt-2">
            <p className="mb-0.5 text-[10px] text-[#9ca3af]">
              Dopasowanie {MODE_EMOJI[travelMode] ?? "✨"}{" "}
              {TRAVEL_MODE_LABELS[travelMode] ?? travelMode}
            </p>
            <div className="h-1 overflow-hidden rounded-sm bg-[#e5e7eb]">
              <div
                className="h-full rounded-sm bg-brand transition-all duration-700 ease-[cubic-bezier(.16,1,.3,1)]"
                style={{ width: `${Math.min(100, Math.max(0, modeScore * 10))}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </Link>
  );
}

type Props = {
  /** Slug bieżącej oferty (endpoint similar może być dodany później) */
  listingSlug: string;
  listingId: string;
  currentCity: string;
  travelMode?: string;
};

export function SimilarListings({
  listingSlug,
  listingId,
  currentCity,
  travelMode,
}: Props) {
  const q = useMemo(() => {
    const m = travelMode?.trim() || "";
    return `/api/v1/listings/${listingSlug}/similar/?limit=4${m ? `&mode=${encodeURIComponent(m)}` : ""}`;
  }, [listingSlug, travelMode]);

  const { data, isLoading } = useJsonGet<SimilarApi>(listingSlug ? q : null);

  const items = data?.data ?? [];
  const showMore = items.length >= 4;

  const moreUrl = currentCity
    ? `/api/v1/search/?location=${encodeURIComponent(currentCity)}&page_size=3&exclude=${encodeURIComponent(listingId)}`
    : null;

  const { data: moreData, isLoading: moreLoading } = useJsonGet<SearchMoreApi>(
    showMore && moreUrl ? moreUrl : null
  );

  const moreListings = moreData?.data ?? [];

  return (
    <div className="mb-10 min-h-[200px]">
      <h2 className="sec-h mb-2">Podobne oferty w okolicy</h2>
      <p className="mb-5 text-sm text-[#6b7280]">
        Oferty o podobnym charakterze w promieniu 30 km
        {travelMode
          ? `, posortowane wg trybu ${MODE_EMOJI[travelMode] ?? ""} ${TRAVEL_MODE_LABELS[travelMode] ?? travelMode}`
          : ""}
        .
      </p>

      <div className="grid min-h-[180px] grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
        {isLoading
          ? Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="animate-pulse overflow-hidden rounded-[14px] border border-[#e5e7eb]"
              >
                <div className="h-[150px] bg-gray-100" />
                <div className="space-y-2 p-3.5">
                  <div className="h-3 w-[80%] rounded bg-gray-100" />
                  <div className="h-3 w-1/2 rounded bg-gray-100" />
                </div>
              </div>
            ))
          : items.map((item, i) => (
              <SimilarListingCard
                key={item.id}
                item={item}
                index={i}
                travelMode={travelMode}
              />
            ))}
      </div>

      {!isLoading && items.length === 0 && (
        <p className="py-6 text-center text-sm text-[#9ca3af]">Brak podobnych ofert.</p>
      )}

      {showMore && (
        <div className="mt-10">
          <h3 className="sec-h mb-2">Więcej w {currentCity}</h3>
          <p className="mb-5 text-sm text-[#6b7280]">Wszystkie zatwierdzone oferty w tym rejonie</p>
          <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-3">
            {moreLoading
              ? Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-40 animate-pulse rounded-[14px] bg-gray-100" />
                ))
              : moreListings.map((l) => (
                  <ListingCard key={l.id} listing={l} variant="grid" />
                ))}
          </div>
        </div>
      )}
    </div>
  );
}
