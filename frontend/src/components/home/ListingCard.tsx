"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { publicMediaUrl } from "@/lib/mediaUrl";
import type { SearchListing } from "@/lib/searchTypes";
import { cn } from "@/lib/utils";

type Props = {
  listing: SearchListing;
  badge?: string;
  badgeColor?: string;
  emojiFallback?: string;
  index?: number;
};

export function ListingCard({ listing, badge = "Polecane", badgeColor = "#16a34a", emojiFallback = "🏡", index = 0 }: Props) {
  const [liked, setLiked] = useState(false);
  const cover = publicMediaUrl(listing.cover_image);

  const location = useMemo(() => {
    const city = listing.location?.city || "";
    const region = listing.location?.region || "";
    return [city, region].filter(Boolean).join(", ") || "Polska";
  }, [listing.location?.city, listing.location?.region]);

  const ratingValue =
    typeof listing.average_rating === "number"
      ? listing.average_rating
      : typeof listing.average_rating === "string"
        ? Number(listing.average_rating)
        : null;
  const rating = Number.isFinite(ratingValue as number) ? (ratingValue as number).toFixed(2) : "-";

  return (
    <Link
      href={`/listing/${listing.slug}`}
      className="group block overflow-hidden rounded-[22px] border border-[#e4ebe7] bg-white shadow-[0_1px_3px_rgba(10,15,13,.05)] transition-all duration-300 ease-[cubic-bezier(.16,1,.3,1)] hover:-translate-y-[7px] hover:border-[#bbf7d0] hover:shadow-[0_24px_64px_rgba(10,15,13,.16)]"
      style={{ animation: `fadeUp .65s ${index * 0.08}s cubic-bezier(.16,1,.3,1) both` }}
    >
      <div className="relative flex h-[224px] items-center justify-center overflow-hidden" style={{ background: "linear-gradient(145deg,#d1fae5,#a7f3d0)" }}>
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={cover} alt="" className="h-full w-full object-cover transition-transform duration-500 ease-[cubic-bezier(.16,1,.3,1)] group-hover:scale-[1.08]" />
        ) : (
          <span className="text-[64px] transition-transform duration-500 group-hover:scale-105">{emojiFallback}</span>
        )}
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_bottom,transparent_40%,rgba(10,46,26,.13)_100%)]" />

        <span className="absolute left-3 top-3 rounded-pill px-3 py-1 text-[11px] font-bold text-white" style={{ backgroundColor: badgeColor }}>
          {badge}
        </span>
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setLiked((v) => !v);
          }}
          className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full border border-white/40 bg-white/90 text-sm backdrop-blur-md transition-transform hover:scale-110"
          aria-label="Ulubione"
        >
          <span className={cn(liked && "animate-[heartbeat_.4s_ease]")}>{liked ? "❤️" : "🤍"}</span>
        </button>
      </div>

      <div className="px-5 pb-5 pt-4">
        <h3 className="mb-1.5 line-clamp-2 text-[15px] font-bold leading-[1.32] text-[#0a0f0d]">{listing.title}</h3>
        <p className="mb-3.5 flex items-center gap-1 text-[12px] text-[#7a8f84]">
          <span>📍</span>
          {location}
        </p>
        <div className="flex items-center justify-between">
          <p>
            <span className="text-[17px] font-extrabold text-[#0a0f0d]">{Number(listing.base_price).toFixed(0)} zł</span>
            <span className="ml-1 text-[12px] text-[#7a8f84]">/ noc</span>
          </p>
          <p className="flex items-center gap-1 text-[13px] font-bold text-[#0a0f0d]">
            <span className="text-[#f59e0b]">★</span>
            {rating}
            <span className="text-[11px] font-medium text-[#7a8f84]">({listing.review_count ?? 0})</span>
          </p>
        </div>
      </div>
    </Link>
  );
}
