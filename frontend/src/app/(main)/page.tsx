import { format, parseISO } from "date-fns";
import { pl } from "date-fns/locale";
import Link from "next/link";
import { HomeHero } from "@/components/home/HomeHero";
import { HomeTravelModes } from "@/components/home/HomeTravelModes";
import { ListingCard } from "@/components/listings/ListingCard";
import { SiteFooter } from "@/components/SiteFooter";
import { AnimatedSection } from "@/components/ui/AnimatedSection";
import { apiUrl } from "@/lib/api";
import { publicMediaUrl } from "@/lib/mediaUrl";
import type { SearchListing } from "@/lib/searchTypes";
import type { DiscoveryHomepageData, SimilarListing } from "@/types/listing";
import { MODE_EMOJI, TRAVEL_MODE_LABELS } from "@/lib/utils/booking";

async function FeaturedGrid() {
  const res = await fetch(apiUrl("/api/v1/search/?ordering=recommended&page_size=6"), {
    cache: "no-store",
  });
  if (!res.ok) {
    return <p className="text-sm text-text-muted">Nie udało się załadować ofert.</p>;
  }
  const j = (await res.json()) as { data: SearchListing[] };
  if (!j.data?.length) {
    return <p className="text-sm text-text-muted">Brak publicznych ofert.</p>;
  }
  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {j.data.map((l, i) => (
        <AnimatedSection key={l.id} delay={i * 80}>
          <ListingCard listing={l} variant="grid" />
        </AnimatedSection>
      ))}
    </div>
  );
}

function similarToSearchListing(s: SimilarListing): SearchListing {
  const raw =
    (typeof s.cover_image === "string" && s.cover_image) ||
    s.images?.find((i) => i.is_cover)?.display_url ||
    s.images?.[0]?.display_url ||
    null;
  const cover = publicMediaUrl(raw) ?? raw;
  const loc = s.location;
  return {
    id: String(s.id ?? ""),
    title: String(s.title ?? ""),
    slug: String(s.slug ?? ""),
    base_price: String(s.base_price ?? ""),
    currency: String(s.currency ?? "PLN"),
    status: "approved",
    max_guests: 0,
    booking_mode: "instant",
    location: {
      lat: 0,
      lng: 0,
      city: loc?.city ?? "",
      region: loc?.region ?? "",
      country: "PL",
    },
    cover_image: cover,
    created_at: "",
    distance_km: s.distance_km ?? null,
  };
}

function lastMinuteBadge(s: SimilarListing): string | null {
  if (!s.available_from) return null;
  try {
    return `Dostępne od ${format(parseISO(s.available_from), "d.MM.yyyy", { locale: pl })}`;
  } catch {
    return `Dostępne od ${s.available_from}`;
  }
}

async function DiscoveryFeed() {
  let data: DiscoveryHomepageData | null = null;
  try {
    const res = await fetch(apiUrl("/api/v1/discovery/homepage/"), {
      cache: "no-store",
    });
    if (res.ok) {
      const j = (await res.json()) as { data?: DiscoveryHomepageData };
      data = j.data ?? null;
    }
  } catch {
    data = null;
  }

  if (!data) return null;

  const collections = (data.featured_collections ?? []).slice(0, 2);
  const lastMinute = data.last_minute ?? [];

  return (
    <>
      {lastMinute.length > 0 ? (
        <section className="pb-6 pt-2">
          <div className="mx-auto max-w-[1200px] px-8">
            <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="sec-h">⚡ Last minute — ten weekend</h2>
                <p className="mt-1 text-sm text-[#9ca3af]">
                  Dostępne w najbliższe dni · automatycznie aktualizowane
                </p>
              </div>
              <span className="rounded-full bg-[#dcfce7] px-2.5 py-1 text-[10px] font-bold text-[#166534]">
                Aktualizacja co 30 min
              </span>
            </div>
            <div className="flex gap-3.5 overflow-x-auto pb-1.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {lastMinute.map((s, i) => (
                <div
                  key={s.id ?? `lm-${i}`}
                  className="min-w-[240px] shrink-0"
                  style={{ animationDelay: `${i * 70}ms` }}
                >
                  <ListingCard
                    listing={similarToSearchListing(s)}
                    variant="compact"
                    availabilityBadge={lastMinuteBadge(s) ?? undefined}
                  />
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {collections.map((col) => (
        <section key={col.id} className="border-t border-brand-border/60 py-8">
          <div className="mx-auto max-w-[1200px] px-8">
            <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="sec-h">{col.title}</h2>
                <p className="mt-1 max-w-2xl text-sm text-[#6b7280]">{col.description}</p>
              </div>
              {col.mode ? (
                <span className="inline-flex items-center gap-1 rounded-full border border-[#bbf7d0] bg-[#f0fdf4] px-3 py-1 text-xs font-bold text-[#166534]">
                  {MODE_EMOJI[col.mode] ?? "✨"} {TRAVEL_MODE_LABELS[col.mode] ?? col.mode}
                </span>
              ) : null}
            </div>
            <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
              {(col.listings ?? []).map((s, i) => (
                <AnimatedSection key={s.id ?? `${col.id}-${i}`} delay={i * 70}>
                  <ListingCard listing={similarToSearchListing(s)} variant="grid" />
                </AnimatedSection>
              ))}
            </div>
            <Link
              href={
                col.mode
                  ? `/search?travel_mode=${encodeURIComponent(col.mode)}`
                  : `/search?collection=${encodeURIComponent(col.id)}`
              }
              className="mt-4 inline-block text-sm font-bold text-brand hover:underline"
            >
              Zobacz więcej w tej kategorii →
            </Link>
          </div>
        </section>
      ))}
    </>
  );
}

export default function HomePage() {
  return (
    <>
      <HomeHero />
      <HomeTravelModes />
      <section className="px-8 py-9">
        <div className="mx-auto max-w-[1200px]">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
            <h2 className="text-2xl font-extrabold text-brand-dark">Polecane noclegi</h2>
            <Link href="/search" className="text-sm font-bold text-brand hover:underline">
              Zobacz wszystkie →
            </Link>
          </div>
          <FeaturedGrid />
        </div>
      </section>

      <DiscoveryFeed />

      <section className="border-y border-brand-border bg-brand-surface px-8 py-11">
        <div className="mx-auto grid max-w-[1200px] grid-cols-2 gap-8 md:grid-cols-4">
          {[
            { n: "2400+", d: "ofert w Polsce" },
            { n: "98%", d: "zadowolonych gości" },
            { n: "16", d: "trybów podróży" },
            { n: "24/7", d: "wsparcie klientów" },
          ].map((x) => (
            <div key={x.d}>
              <p className="text-[32px] font-extrabold tracking-tight text-brand-dark">{x.n}</p>
              <p className="mt-1 text-[13px] text-gray-400">{x.d}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="relative overflow-hidden bg-brand-dark px-8 py-20 text-center">
        <div
          className="pointer-events-none absolute -left-20 top-10 h-64 w-64 rounded-full bg-brand-light/10"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -right-10 bottom-0 h-48 w-48 rounded-full bg-brand-light/[0.08]"
          aria-hidden
        />
        <span className="relative inline-block rounded-full bg-brand-light/15 px-3 py-1 text-xs font-bold uppercase tracking-widest text-brand-light">
          Dla gospodarzy
        </span>
        <h2 className="relative mx-auto mt-4 max-w-xl text-[clamp(28px,4vw,42px)] font-extrabold tracking-tight text-white">
          Zarabiaj na swojej nieruchomości
        </h2>
        <p className="relative mx-auto mt-3 max-w-md text-sm text-white/60">
          Dołącz do gospodarzy StayMap — proste narzędzia, bezpieczne płatności, widoczność na mapie.
        </p>
        <Link
          href="/host/onboarding"
          className="relative mt-8 inline-flex rounded-xl bg-brand-light px-8 py-3 text-sm font-extrabold text-brand-dark shadow-xl transition-all duration-200 hover:-translate-y-0.5 hover:bg-green-300"
        >
          Zostań gospodarzem
        </Link>
      </section>

      <SiteFooter />
    </>
  );
}
