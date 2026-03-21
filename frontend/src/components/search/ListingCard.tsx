import Link from "next/link";
import { publicMediaUrl } from "@/lib/mediaUrl";
import type { SearchListing } from "@/lib/searchTypes";

type Props = { listing: SearchListing };

export function ListingCard({ listing }: Props) {
  const coverSrc = publicMediaUrl(listing.cover_image);
  const loc =
    listing.location?.city ||
    listing.location?.region ||
    (listing.location ? `${listing.location.lat.toFixed(2)}, ${listing.location.lng.toFixed(2)}` : "—");

  return (
    <article className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm transition hover:border-neutral-400 dark:border-neutral-700 dark:bg-neutral-950 dark:hover:border-neutral-500">
      <Link href={`/listing/${listing.slug}`} className="block">
        <div className="aspect-[16/10] w-full bg-neutral-100 dark:bg-neutral-800">
          {coverSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={coverSrc}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-neutral-400">
              Brak zdjęcia
            </div>
          )}
        </div>
        <div className="space-y-1 p-4">
          <h3 className="font-semibold leading-snug text-neutral-900 dark:text-neutral-100">
            {listing.title}
          </h3>
          <p className="text-sm text-neutral-600 dark:text-neutral-400">{loc}</p>
          <div className="flex flex-wrap items-baseline gap-2 pt-1">
            <span className="text-lg font-semibold tabular-nums">
              {listing.base_price} {listing.currency}
            </span>
            <span className="text-sm text-neutral-500">/ noc</span>
            {listing.distance_km != null && (
              <span className="text-sm text-neutral-500">
                · {listing.distance_km} km
              </span>
            )}
          </div>
          <p className="text-xs text-neutral-500">
            do {listing.max_guests} os. ·{" "}
            {listing.booking_mode === "instant" ? "natychmiastowa" : "na prośbę"}
          </p>
        </div>
      </Link>
    </article>
  );
}
