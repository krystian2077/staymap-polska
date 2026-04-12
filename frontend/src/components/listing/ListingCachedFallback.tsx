"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { ListingAmenities } from "@/components/listings/ListingDetailClient";
import { ListingGallery } from "@/components/listings/ListingGallery";
import { ListingDescription } from "@/components/listings/ListingDetailClient";
import { normalizeListing } from "@/lib/listingNormalize";
import type { Listing } from "@/types/listing";

function readCachedListing(slug: string): Record<string, unknown> | null {
  if (typeof window === "undefined") return null;
  const key = `listing-cache:${slug}`;
  const raw = window.localStorage.getItem(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function ListingCachedFallback({ slug }: { slug: string }) {
  const [raw, setRaw] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    setRaw(readCachedListing(slug));
  }, [slug]);

  const listing = useMemo<Listing | null>(() => {
    if (!raw) return null;
    try {
      return normalizeListing(raw);
    } catch {
      return null;
    }
  }, [raw]);

  if (!listing) {
    return (
      <main className="min-h-screen bg-[#f9fafb] px-4 py-20">
        <div className="mx-auto max-w-2xl rounded-[2rem] bg-white p-8 text-center shadow-sm ring-1 ring-black/[0.03]">
          <h1 className="text-2xl font-black text-brand-dark">Nie udało się pobrać pełnych danych oferty</h1>
          <p className="mt-3 text-sm text-text-secondary">
            Możliwe, że backend jeszcze nie zwrócił aktualnych danych tej oferty. Wróć do wyszukiwarki lub odśwież stronę po zapisaniu zmian.
          </p>
          <Link href="/search" className="btn-primary mt-8 inline-flex px-6 py-3">
            Wyszukiwarka
          </Link>
        </div>
      </main>
    );
  }

  const title = listing.title || "Oferta";
  const hasAmenities = listing.amenities.length > 0;

  return (
    <main className="min-h-screen bg-[#f9fafb] px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1320px] space-y-10">
        <div className="rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-black/[0.03] sm:p-8">
          <p className="text-xs font-black uppercase tracking-[.2em] text-brand">Podgląd z pamięci przeglądarki</p>
          <h1 className="mt-3 text-3xl font-black tracking-tight text-brand-dark">{title}</h1>
          <p className="mt-2 text-sm text-text-secondary">
            Ta oferta została otwarta z zapisanego podglądu, bo pełne dane nie były chwilowo dostępne z backendu.
          </p>
        </div>

        {listing.images.length > 0 ? (
          <div className="overflow-hidden rounded-[2rem] shadow-sm ring-1 ring-black/[0.03]">
            <ListingGallery images={listing.images} typeIcon={listing.listing_type?.icon || "🏠"} />
          </div>
        ) : null}

        <section className="rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-black/[0.03] sm:p-8">
          <h2 className="text-2xl font-black tracking-tight text-brand-dark">Co oferuje to miejsce</h2>
          {hasAmenities ? (
            <div className="mt-6">
              <ListingAmenities amenities={listing.amenities} />
            </div>
          ) : (
            <p className="mt-4 text-sm text-text-secondary">
              Brak zapisanych udogodnień w zapamiętanym podglądzie. Wróć do kreatora i opublikuj ofertę ponownie.
            </p>
          )}
        </section>

        {listing.description ? (
          <ListingDescription text={listing.description} />
        ) : null}

        <div className="text-center">
          <Link href="/search" className="btn-primary inline-flex px-6 py-3">
            Wróć do wyszukiwarki
          </Link>
        </div>
      </div>
    </main>
  );
}

