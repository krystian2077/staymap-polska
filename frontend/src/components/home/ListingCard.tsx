"use client";

import Link from "next/link";
import { useEffect, useMemo } from "react";
import toast from "react-hot-toast";
import { api } from "@/lib/api";
import { getAccessToken } from "@/lib/authStorage";
import { publicMediaUrl } from "@/lib/mediaUrl";
import type { SearchListing } from "@/lib/searchTypes";
import { useWishlistStore } from "@/lib/store/wishlistStore";
import { cn } from "@/lib/utils";

type Props = {
  listing: SearchListing;
  badge?: string;
  badgeColor?: string;
  emojiFallback?: string;
  index?: number;
};

export function ListingCard({ listing, badge = "Polecane", badgeColor = "#16a34a", emojiFallback = "🏡", index = 0 }: Props) {
  const ids = useWishlistStore((s) => s.ids);
  const load = useWishlistStore((s) => s.load);
  const addToStore = useWishlistStore((s) => s.add);
  const removeFromStore = useWishlistStore((s) => s.remove);
  const liked = ids.has(listing.id);
  const cover = publicMediaUrl(listing.cover_image);

  useEffect(() => {
    void load();
  }, [load]);

  const cacheListing = () => {
    if (typeof window === "undefined" || !listing?.slug) return;
    try {
      localStorage.setItem(`listing-cache:${listing.slug}`, JSON.stringify(listing));
    } catch {
      // noop
    }
  };

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
      className="group block overflow-hidden rounded-[18px] border border-[#e4ebe7] bg-white shadow-[0_10px_30px_-24px_rgba(10,15,13,.3)] transition-all duration-300 ease-[cubic-bezier(.16,1,.3,1)] sm:rounded-[22px] sm:hover:-translate-y-[7px] sm:hover:border-[#bbf7d0] sm:hover:shadow-[0_26px_70px_-24px_rgba(10,15,13,.35)] dark:border-brand-border dark:bg-[var(--bg2)] dark:shadow-[0_10px_30px_-24px_rgba(0,0,0,.5)] dark:sm:hover:border-brand/50"
      style={{ animation: `fadeUp .65s ${index * 0.08}s cubic-bezier(.16,1,.3,1) both` }}
      onClick={cacheListing}
    >
      <div className="relative flex h-[196px] items-center justify-center overflow-hidden sm:h-[224px]" style={{ background: "linear-gradient(145deg,#dff8e9,#bcefd4)" }}>
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={cover} alt="" className="h-full w-full object-cover transition-transform duration-500 ease-[cubic-bezier(.16,1,.3,1)] group-hover:scale-[1.08]" />
        ) : (
          <span className="text-[64px] transition-transform duration-500 group-hover:scale-105">{emojiFallback}</span>
        )}
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_bottom,rgba(255,255,255,.03)_24%,rgba(10,46,26,.18)_100%)]" />

        <span className="absolute left-3 top-3 rounded-pill px-3 py-1 text-[11px] font-bold text-white" style={{ backgroundColor: badgeColor }}>
          {badge}
        </span>
        <button
          type="button"
          onClick={async (e) => {
            e.preventDefault();
            e.stopPropagation();
            const token = typeof window !== "undefined" ? getAccessToken() : null;
            if (!token) {
              toast.error("Zaloguj się, aby dodać do listy życzeń.");
              return;
            }
            try {
              if (liked) {
                await api.delete(`/api/v1/wishlist/${listing.id}/`);
                removeFromStore(listing.id);
                toast.success("Usunięto z listy życzeń");
              } else {
                await api.post("/api/v1/wishlist/", { listing_id: listing.id });
                addToStore(listing.id);
                toast.success("Dodano do listy życzeń");
              }
            } catch (err) {
              toast.error(err instanceof Error ? err.message : "Błąd listy życzeń");
            }
          }}
          className="absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-full border border-white/40 bg-white/90 text-sm backdrop-blur-md transition-transform sm:h-9 sm:w-9 sm:hover:scale-110"
          aria-label="Ulubione"
        >
          <span className={cn(liked && "animate-[heartbeat_.4s_ease]")}>{liked ? "❤️" : "🤍"}</span>
        </button>
      </div>

      <div className="px-4 pb-4 pt-3.5 sm:px-5 sm:pb-5 sm:pt-4">
        <h3 className="mb-1.5 line-clamp-2 text-[14px] font-bold leading-[1.32] text-[#0a0f0d] sm:text-[15px] dark:text-[var(--foreground)]">{listing.title}</h3>
        <p className="mb-3 flex items-center gap-1 text-[12px] text-[#6e8378] sm:mb-3.5 dark:text-[var(--text3)]">
          <span>📍</span>
          {location}
        </p>
        <div className="flex items-center justify-between">
          <p>
            <span className="text-[16px] font-extrabold text-[#0a0f0d] sm:text-[17px] dark:text-[var(--foreground)]">{Number(listing.base_price).toFixed(0)} zł</span>
            <span className="ml-1 text-[12px] text-[#7a8f84] dark:text-[var(--text3)]">/ noc</span>
          </p>
          <p className="flex items-center gap-1 text-[13px] font-bold text-[#0a0f0d] dark:text-[var(--foreground)]">
            <span className="text-[#f59e0b]">★</span>
            {rating}
            <span className="text-[11px] font-medium text-[#7a8f84] dark:text-[var(--text3)]">({listing.review_count ?? 0})</span>
          </p>
        </div>
      </div>
    </Link>
  );
}
