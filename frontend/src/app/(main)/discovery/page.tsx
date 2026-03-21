import Link from "next/link";
import { ListingCard } from "@/components/listings/ListingCard";
import { LastMinuteBanner, LastMinuteCard } from "@/components/discovery/LastMinuteCard";
import { similarListingToSearch } from "@/lib/listingAdapters";
import { MODE_EMOJI, TRAVEL_MODE_LABELS } from "@/lib/travelModes";
import type { Collection, DiscoveryHomepage, LastMinuteListing } from "@/types/ai";

function siteOrigin(): string {
  const u = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  if (u) return u;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

async function loadDiscovery(): Promise<DiscoveryHomepage> {
  const empty: DiscoveryHomepage = { featured_collections: [], last_minute: [] };
  try {
    const res = await fetch(`${siteOrigin()}/api/v1/discovery/homepage/`, {
      next: { revalidate: 1800 },
    });
    if (!res.ok) return empty;
    const json = await res.json();
    const raw = json?.data ?? json;
    const collections: Collection[] =
      raw?.featured_collections ?? raw?.collections ?? [];
    const last_minute: LastMinuteListing[] = raw?.last_minute ?? [];
    return { featured_collections: collections, last_minute };
  } catch {
    return empty;
  }
}

export default async function DiscoveryPage() {
  const data = await loadDiscovery();

  return (
    <div className="min-h-screen bg-white pb-16">
      <section
        className="px-7 py-12 text-center"
        style={{
          background: "linear-gradient(175deg, #f0fdf4 0%, rgba(240,253,244,.3) 50%, #fff 100%)",
        }}
      >
        <div className="animate-fade-up mx-auto inline-flex items-center rounded-full border border-brand-border bg-[#dcfce7] px-3 py-1 text-xs font-bold text-green-800">
          🗺️ Odkrywaj Polskę
        </div>
        <h1
          className="animate-fade-up mx-auto mt-4 max-w-3xl text-[clamp(28px,5vw,48px)] font-extrabold tracking-tight text-brand-dark"
          style={{ animationDelay: "0.1s" }}
        >
          Kolekcje stworzone przez nasz zespół
        </h1>
        <p
          className="animate-fade-up mx-auto mt-4 max-w-[500px] text-base text-text-secondary"
          style={{ animationDelay: "0.2s" }}
        >
          Kuratorowane zestawienia najlepszych miejsc — dobrane tematycznie, sezonowo i wg trybu podróży.
        </p>
      </section>

      <div className="mx-auto max-w-[1100px] px-5">
        <LastMinuteBanner />

        <div className="mb-10 flex gap-3.5 overflow-x-auto pb-1.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {data.last_minute.length === 0 ? (
            <p className="text-sm text-text-muted">Brak ofert last minute.</p>
          ) : (
            data.last_minute.map((l) => <LastMinuteCard key={l.id} listing={l} />)
          )}
        </div>

        {data.featured_collections.map((collection, collectionIndex) => (
          <div key={collection.id}>
            {collectionIndex > 0 ? <div className="my-10 border-t border-gray-100" /> : null}
            <div
              className="animate-fade-up mb-4 flex flex-wrap items-center justify-between gap-2"
              style={{ animationDelay: `${collectionIndex * 100}ms` }}
            >
              <div className="flex flex-wrap items-center gap-2.5">
                <h2 className="text-xl font-extrabold tracking-tight text-brand-dark">{collection.title}</h2>
                {collection.mode ? (
                  <span className="inline-flex items-center rounded-full border border-brand-border bg-[#dcfce7] px-2.5 py-0.5 text-[11px] font-bold text-green-800">
                    {MODE_EMOJI[collection.mode] ?? "✨"}{" "}
                    {TRAVEL_MODE_LABELS[collection.mode] ?? collection.mode}
                  </span>
                ) : null}
              </div>
              <Link
                href={
                  collection.mode
                    ? `/search?travel_mode=${encodeURIComponent(collection.mode)}`
                    : `/search?collection=${encodeURIComponent(collection.id)}`
                }
                className="text-[13px] font-bold text-brand hover:underline"
              >
                Wszystkie →
              </Link>
            </div>
            <p className="mb-3.5 text-sm text-text-muted">{collection.description}</p>
            <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 lg:grid-cols-4">
              {collection.listings.map((listing, cardIndex) => (
                <div
                  key={listing.id}
                  className="animate-fade-up"
                  style={{ animationDelay: `${collectionIndex * 100 + cardIndex * 60}ms` }}
                >
                  <div className="relative">
                    <ListingCard
                      listing={similarListingToSearch(listing)}
                      variant="grid"
                      availabilityBadge="⚡"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
