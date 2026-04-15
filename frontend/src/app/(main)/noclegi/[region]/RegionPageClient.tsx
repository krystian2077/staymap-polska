"use client";

import Link from "next/link";
import { ListingCard } from "@/components/listings/ListingCard";
import type { SearchListing } from "@/lib/searchTypes";

export type RegionPageData = {
  title: string;
  description: string;
  listing_count: number;
  top_listings: SearchListing[];
  search_params: Record<string, unknown>;
};

function searchHrefFromParams(params: Record<string, unknown>): string {
  const pairs: [string, string][] = [];
  for (const [k, v] of Object.entries(params)) {
    if (v == null) continue;
    if (typeof v === "boolean") {
      if (v) pairs.push([k, "true"]);
      continue;
    }
    pairs.push([k, String(v)]);
  }
  return "/search?" + new URLSearchParams(pairs).toString();
}

export default function RegionPageClient({
  data,
}: {
  data: RegionPageData;
}) {
  const searchHref = searchHrefFromParams(data.search_params);

  return (
    <div className="relative">
      <div
        className="pointer-events-none absolute inset-x-0 -top-32 h-80 bg-gradient-to-b from-brand-muted/90 via-brand-surface/40 to-transparent blur-3xl"
        aria-hidden
      />
      <main className="relative mx-auto max-w-[1280px] px-4 py-12 sm:px-6 lg:px-10">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-brand">Region Polski</p>
        <h1 className="mt-3 text-4xl font-black tracking-tight text-brand-dark sm:text-5xl">
          Noclegi — {data.title}
        </h1>
        <p className="mt-4 max-w-2xl text-lg text-text-secondary">{data.description}</p>
        <p className="mt-2 text-sm font-semibold text-text-muted">
          {data.listing_count.toLocaleString("pl-PL")}{" "}
          {data.listing_count === 1 ? "oferta" : data.listing_count < 5 ? "oferty" : "ofert"} w tym
          obszarze
        </p>

        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {data.top_listings.map((listing) => (
            <ListingCard key={listing.id} listing={listing} />
          ))}
        </div>

        <div className="mt-14 flex justify-center">
          <Link
            href={searchHref}
            className="inline-flex rounded-2xl bg-brand px-8 py-3.5 text-sm font-bold text-white shadow-lg shadow-brand/30 transition hover:bg-brand-dark"
          >
            Zobacz wszystkie oferty w regionie →
          </Link>
        </div>
      </main>
    </div>
  );
}
