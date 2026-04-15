import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";

import { BookingWidget } from "@/components/booking/BookingWidget";
import { DestinationScoreSection } from "@/components/listing/DestinationScoreSection";
import { ListingActionBar } from "@/components/listing/ListingActionBar";
import { NearbySection } from "@/components/listing/NearbySection";
import { PriceCalendar } from "@/components/listing/PriceCalendar";
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
import { ListingStickyHeader } from "@/components/listings/ListingStickyHeader";
import { ListingViewErrorBoundary } from "@/components/ui/ListingViewErrorBoundary";
import { AnimatedSection } from "@/components/ui/AnimatedSection";
import { ListingCachedFallback } from "@/components/listing/ListingCachedFallback";
import { apiUrl } from "@/lib/api";
import { fetchOpenMeteoForecastServer } from "@/lib/openMeteoForecast";
import { normalizeListing } from "@/lib/listingNormalize";
import type { PricingRule } from "@/types/listing";
import { ListingBookingStoreSync } from "@/components/listing/ListingBookingStoreSync";
import { ListingWeatherSection } from "@/components/listing/ListingWeatherSection";

const EMPTY_PRICING_RULES: PricingRule[] = [];

type ApiEnvelope = { data: Record<string, unknown> };

async function fetchListingEnvelope(slug: string): Promise<Response> {
  const endpoint = apiUrl(`/api/v1/listings/${slug}/`);
  const publicRes = await fetch(endpoint, { cache: "no-store" });
  if (publicRes.ok) return publicRes;

  // Fallback: właściciel oferty może oglądać własny niepubliczny listing.
  const token = cookies().get("access_token")?.value;
  if (!token) return publicRes;
  return fetch(endpoint, {
    cache: "no-store",
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const res = await fetchListingEnvelope(params.slug);
  if (!res.ok) return { title: "Oferta — StayMap Polska" };
  const { data } = (await res.json()) as ApiEnvelope;
  const title = typeof data.title === "string" ? data.title : "Oferta";
  return { title: `${title} — StayMap Polska` };
}

export default async function ListingPage({
  params,
}: {
  params: { slug: string };
}) {
  const res = await fetchListingEnvelope(params.slug);
  if (!res.ok) return <ListingCachedFallback slug={params.slug} />;
  const { data: raw } = (await res.json()) as ApiEnvelope;
  const listing = normalizeListing(raw);

  const weatherForecast =
    listing.location != null
      ? await fetchOpenMeteoForecastServer(
          listing.location.latitude,
          listing.location.longitude
        )
      : null;

  const city = listing.location?.city ?? "";
  const rating =
    listing.average_rating != null ? `${Number(listing.average_rating).toFixed(1)}` : "—";


  return (
    <main className="min-h-screen bg-[#f9fafb] selection:bg-brand/10 dark:bg-[var(--background)]">
      <div className="fixed inset-0 -z-10 bg-[radial-gradient(circle_at_top_right,rgba(240,253,244,0.4),transparent_50%),radial-gradient(circle_at_bottom_left,rgba(240,249,255,0.4),transparent_50%)]" />
      <ListingStickyHeader listing={listing} />
      <div className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-12">
        <ListingViewErrorBoundary>
          <ListingBookingStoreSync listing={listing} />
          {/* Header Section */}
          <AnimatedSection delay={0} className="mb-8">
            <ListingBreadcrumb listing={listing} />
            <div className="mt-6 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-4xl">
                <h1
                  className="text-[clamp(32px,5vw,52px)] font-black leading-[1.05] tracking-tight text-brand-dark"
                  style={{ letterSpacing: "-0.04em" }}
                >
                  {listing.title}
                </h1>
                <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-3 text-[15.5px] font-semibold text-gray-500">
                  <div className="flex items-center gap-2 rounded-full bg-white px-4 py-1.5 shadow-sm ring-1 ring-black/[0.03]">
                    <span className="text-yellow-400">★</span>
                    <span className="text-brand-dark">{rating}</span>
                    <span className="h-4 w-[1px] bg-gray-200 mx-1" />
                    <span className="text-gray-400 font-medium">{listing.review_count} opinii</span>
                  </div>
                  
                  <div className="flex items-center gap-2 rounded-full bg-white px-4 py-1.5 shadow-sm ring-1 ring-black/[0.03]">
                    <svg className="h-4 w-4 text-brand" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span className="text-brand-dark">{city}</span>
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 pb-1">
                <TravelModeBadges listing={listing} />
              </div>
            </div>
          </AnimatedSection>

          {/* Gallery - Full Width within Container */}
          <AnimatedSection delay={80} className="mb-12">
            <div className="group relative overflow-hidden rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.12)] transition-all duration-700 hover:shadow-[0_40px_80px_rgba(0,0,0,0.18)]">
              <ListingGallery
                images={listing.images}
                typeIcon={listing.listing_type?.icon || "🏠"}
              />
              <div className="pointer-events-none absolute inset-0 rounded-[2.5rem] ring-1 ring-inset ring-black/5" />
            </div>
          </AnimatedSection>

          <div className="grid grid-cols-1 items-start gap-12 lg:grid-cols-[1fr_540px] lg:gap-16">
            <article className="min-w-0 space-y-12">
              <AnimatedSection delay={150}>
                <div className="flex flex-col gap-8">
                  <ListingActionBar
                    listingId={listing.id}
                    listingTitle={listing.title}
                    slug={listing.slug}
                    latitude={listing.location?.latitude}
                    longitude={listing.location?.longitude}
                  />

                  <div className="flex flex-wrap gap-x-12 gap-y-6 rounded-[2.5rem] border border-slate-100 bg-white px-10 py-8 shadow-2xl ring-1 ring-slate-200/50">
                    <div className="flex items-center gap-4 transition-transform hover:scale-105">
                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-light/10 text-brand-dark shadow-inner ring-1 ring-brand-light/20">
                        <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-lg font-black text-slate-900 leading-tight">{listing.max_guests} gości</p>
                        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Maksymalnie</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 transition-transform hover:scale-105">
                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-light/10 text-brand-dark shadow-inner ring-1 ring-brand-light/20">
                        <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-lg font-black text-slate-900 leading-tight">{listing.bedrooms} sypialnie</p>
                        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{listing.beds} {listing.beds === 1 ? 'łóżko' : listing.beds < 5 ? 'łóżka' : 'łóżek'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 transition-transform hover:scale-105">
                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-light/10 text-brand-dark shadow-inner ring-1 ring-brand-light/20">
                        <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 14v1a3 3 0 003 3h10a3 3 0 003-3v-1M4 14h16M4 14V9a3 3 0 013-3h10a3 3 0 013 3v5" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-lg font-black text-slate-900 leading-tight">{listing.bathrooms} {listing.bathrooms === 1 ? 'łazienka' : listing.bathrooms < 5 ? 'łazienki' : 'łazienek'}</p>
                        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Prywatne</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 transition-transform hover:scale-105">
                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-light/10 text-brand-dark shadow-inner ring-1 ring-brand-light/20">
                        <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A3.323 3.323 0 0010.603 2L2 2v8.603a3.323 3.323 0 002.016 3.015L10.746 15l1.396.35c.102.025.204.05.306.075" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-lg font-black text-slate-900 leading-tight">Całe miejsce</p>
                        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Na wyłączność</p>
                      </div>
                    </div>
                  </div>
                </div>
              </AnimatedSection>

              <AnimatedSection delay={200}>
                <HostStrip listing={listing} />
              </AnimatedSection>

              {listing.destination_score_cache ? (
                <AnimatedSection delay={250}>
                  <div className="rounded-[2.5rem] bg-white p-8 shadow-sm ring-1 ring-black/[0.03] sm:p-10">
                    <DestinationScoreSection
                      scores={listing.destination_score_cache}
                    />
                  </div>
                </AnimatedSection>
              ) : null}

              {listing.area_summary ? (
                <AnimatedSection delay={300}>
                  <ListingAreaSummary text={listing.area_summary} />
                </AnimatedSection>
              ) : null}

              <AnimatedSection delay={350}>
                <ListingDescription
                  text={listing.description || listing.short_description}
                />
              </AnimatedSection>

              <AnimatedSection delay={400}>
                <ListingAmenities amenities={listing.amenities} />
              </AnimatedSection>

              {weatherForecast && weatherForecast.days.length > 0 && listing.location ? (
                <AnimatedSection delay={420}>
                  <ListingWeatherSection
                    days={weatherForecast.days}
                    city={listing.location.city}
                    region={listing.location.region}
                    listingId={listing.id}
                  />
                </AnimatedSection>
              ) : null}

              {listing.location ? (
                <AnimatedSection delay={450}>
                  <div className="rounded-[2.5rem] bg-white p-8 shadow-sm ring-1 ring-black/[0.03] sm:p-10">
                    <NearbySection
                      listingSlug={listing.slug}
                      location={{
                        city: listing.location.city,
                        region: listing.location.region,
                        lat: listing.location.latitude,
                        lng: listing.location.longitude,
                      }}
                    />
                  </div>
                </AnimatedSection>
              ) : null}

              <AnimatedSection delay={500}>
                <div className="rounded-[2.5rem] bg-white p-8 shadow-sm ring-1 ring-black/[0.03] sm:p-10">
                  <ListingReviews
                    listingSlug={listing.slug}
                    averageSubscores={listing.average_subscores}
                  />
                </div>
              </AnimatedSection>

              <AnimatedSection delay={550}>
                <div className="rounded-[2.5rem] bg-white p-8 shadow-sm ring-1 ring-black/[0.03] sm:p-10">
                  <PriceCalendar
                    listingSlug={listing.slug}
                    basePrice={listing.base_price}
                    pricingRules={EMPTY_PRICING_RULES}
                    applyTravelPeakExtras={listing.apply_pl_travel_peak_extras !== false}
                  />
                </div>
              </AnimatedSection>
            </article>

            {/* Sidebar Column */}
            <aside className="space-y-8 lg:sticky lg:top-28">
              {listing.status === "approved" && (
                <BookingWidget listing={listing} />
              )}
              <AnimatedSection delay={300}>
                <ListingQuickFacts listing={listing} sidebar />
              </AnimatedSection>
            </aside>
          </div>

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
