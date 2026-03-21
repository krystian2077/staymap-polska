import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { BookingWidget } from "@/components/booking/BookingWidget";
import { DestinationScoreSection } from "@/components/listing/DestinationScoreSection";
import { ListingActionBar } from "@/components/listing/ListingActionBar";
import { NearbySection } from "@/components/listing/NearbySection";
import { PriceCalendar } from "@/components/listing/PriceCalendar";
import { SimilarListings } from "@/components/listing/SimilarListings";
import {
  HostStrip,
  ListingAmenities,
  ListingBreadcrumb,
  ListingDescription,
  TravelModeBadges,
} from "@/components/listings/ListingDetailClient";
import { ListingAreaSummary } from "@/components/listings/ListingAreaSummary";
import { ListingGallery } from "@/components/listings/ListingGallery";
import { ListingQuickFacts } from "@/components/listings/ListingQuickFacts";
import { ListingReviews } from "@/components/listings/ListingReviews";
import { ListingViewErrorBoundary } from "@/components/ui/ListingViewErrorBoundary";
import { AnimatedSection } from "@/components/ui/AnimatedSection";
import { apiUrl } from "@/lib/api";
import { normalizeListing } from "@/lib/listingNormalize";
import type { PricingRule } from "@/types/listing";

const EMPTY_PRICING_RULES: PricingRule[] = [];

type ApiEnvelope = { data: Record<string, unknown> };

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const res = await fetch(apiUrl(`/api/v1/listings/${params.slug}/`), {
    next: { revalidate: 60 },
  });
  if (!res.ok) return { title: "Oferta — StayMap Polska" };
  const { data } = (await res.json()) as ApiEnvelope;
  const title = typeof data.title === "string" ? data.title : "Oferta";
  return { title: `${title} — StayMap Polska` };
}

export default async function ListingPage({
  params,
  searchParams,
}: {
  params: { slug: string };
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const res = await fetch(apiUrl(`/api/v1/listings/${params.slug}/`), {
    next: { revalidate: 60 },
  });
  if (!res.ok) notFound();
  const { data: raw } = (await res.json()) as ApiEnvelope;
  const listing = normalizeListing(raw);

  const city = listing.location?.city ?? "";
  const rating =
    listing.average_rating != null ? `${listing.average_rating.toFixed(1)}` : "—";

  const travelMode =
    typeof searchParams?.travel_mode === "string"
      ? searchParams.travel_mode
      : undefined;

  return (
    <main className="min-h-screen bg-[#f8faf8]">
      <div className="mx-auto max-w-[1220px] px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
        <ListingViewErrorBoundary>
          <AnimatedSection delay={0}>
            <ListingBreadcrumb listing={listing} />
          </AnimatedSection>

          <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-[1fr_minmax(300px,380px)] lg:gap-12">
            <article className="min-w-0 lg:pr-2">
              <AnimatedSection delay={80}>
                <ListingGallery
                  images={listing.images}
                  typeIcon={listing.listing_type.icon || "🏠"}
                />
                <ListingActionBar
                  listingId={listing.id}
                  listingTitle={listing.title}
                  slug={listing.slug}
                />
              </AnimatedSection>

              <AnimatedSection delay={100}>
                <h1
                  className="text-[clamp(24px,3.2vw,32px)] font-extrabold leading-[1.15] tracking-tight text-brand-dark"
                  style={{ letterSpacing: "-0.7px" }}
                >
                  {listing.title}
                </h1>

                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-gray-600">
                  <span>
                    ★ {rating} · ({listing.review_count} opinii)
                  </span>
                  <span className="text-gray-300">·</span>
                  <span>📍 {city}</span>
                  <span className="text-gray-300">·</span>
                  <span>{listing.max_guests} gości maks.</span>
                  <span className="text-gray-300">·</span>
                  <span>
                    {listing.bedrooms} sypialnie · {listing.beds} łóżka
                  </span>
                  <span className="text-gray-300">·</span>
                  <span>Całe miejsce</span>
                </div>

                <ListingQuickFacts listing={listing} />
                <TravelModeBadges listing={listing} />
              </AnimatedSection>

              <AnimatedSection delay={180}>
                <HostStrip listing={listing} />
              </AnimatedSection>

              {listing.destination_score_cache ? (
                <AnimatedSection delay={220}>
                  <DestinationScoreSection
                    scores={listing.destination_score_cache}
                    amenities={listing.amenities}
                    listing={listing}
                  />
                </AnimatedSection>
              ) : null}

              {listing.area_summary ? (
                <AnimatedSection delay={260}>
                  <ListingAreaSummary text={listing.area_summary} />
                </AnimatedSection>
              ) : null}

              <AnimatedSection delay={300}>
                <ListingDescription
                  text={listing.description || listing.short_description}
                />
              </AnimatedSection>

              <AnimatedSection delay={380}>
                <ListingAmenities amenities={listing.amenities} />
              </AnimatedSection>

              {listing.location ? (
                <AnimatedSection delay={460}>
                  <NearbySection
                    listingSlug={listing.slug}
                    location={{
                      city: listing.location.city,
                      region: listing.location.region,
                      lat: listing.location.latitude,
                      lng: listing.location.longitude,
                    }}
                  />
                </AnimatedSection>
              ) : null}

              <AnimatedSection delay={540}>
                <ListingReviews listingSlug={listing.slug} />
              </AnimatedSection>

              <AnimatedSection delay={620}>
                <PriceCalendar
                  listingSlug={listing.slug}
                  basePrice={listing.base_price}
                  pricingRules={EMPTY_PRICING_RULES}
                />
              </AnimatedSection>
            </article>

            {listing.status === "approved" && (
              <aside className="lg:sticky lg:top-20">
                <AnimatedSection delay={120}>
                  <div className="rounded-[18px] border border-brand-border/90 bg-white p-1 shadow-sm">
                    <BookingWidget listing={listing} />
                  </div>
                </AnimatedSection>
              </aside>
            )}
          </div>

          <SimilarListings
            listingSlug={listing.slug}
            listingId={listing.id}
            currentCity={city || "Polska"}
            travelMode={travelMode}
          />

          <p className="mt-12 text-center text-sm text-gray-500">
            <Link href="/search" className="font-semibold text-brand hover:underline">
              ← Wróć do wyszukiwarki
            </Link>
          </p>
        </ListingViewErrorBoundary>
      </div>
    </main>
  );
}
