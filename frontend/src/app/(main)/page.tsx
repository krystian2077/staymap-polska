import { AiSection } from "@/components/home/AiSection";
import { CtaSection } from "@/components/home/CtaSection";
import { FeaturedListings } from "@/components/home/FeaturedListings";
import { HeroSection } from "@/components/home/HeroSection";
import { HostCta } from "@/components/home/HostCta";
import { LastMinute } from "@/components/home/LastMinute";
import { MarqueeTicker } from "@/components/home/MarqueeTicker";
import { MountainCollection } from "@/components/home/MountainCollection";
import { RegionsGrid } from "@/components/home/RegionsGrid";
import { StatsStrip } from "@/components/home/StatsStrip";
import { TravelModes } from "@/components/home/TravelModes";
import { type CollectionCardData, WaterCollection } from "@/components/home/WaterCollection";
import { Footer } from "@/components/layout/Footer";
import { apiUrl } from "@/lib/api";
import { similarListingToSearch } from "@/lib/listingAdapters";
import type { SearchListing } from "@/lib/searchTypes";
import type { DiscoveryHomepageData } from "@/types/listing";

async function loadFeatured(): Promise<SearchListing[]> {
  try {
    const res = await fetch(apiUrl("/api/v1/search/?ordering=recommended&page_size=8"), {
      cache: "no-store",
    });
    if (!res.ok) return [];
    const json = (await res.json()) as { data?: SearchListing[] };
    return json.data ?? [];
  } catch {
    return [];
  }
}

async function loadDiscoveryFallback(): Promise<SearchListing[]> {
  try {
    const res = await fetch(apiUrl("/api/v1/discovery/homepage/"), { cache: "no-store" });
    if (!res.ok) return [];
    const json = (await res.json()) as { data?: DiscoveryHomepageData };
    const firstCollection = json.data?.featured_collections?.[0];
    if (!firstCollection?.listings?.length) return [];
    return firstCollection.listings.slice(0, 8).map(similarListingToSearch);
  } catch {
    return [];
  }
}

async function loadDiscovery(): Promise<DiscoveryHomepageData | null> {
  try {
    const res = await fetch(apiUrl("/api/v1/discovery/homepage/"), { cache: "no-store" });
    if (!res.ok) return null;
    const json = (await res.json()) as { data?: DiscoveryHomepageData };
    return json.data ?? null;
  } catch {
    return null;
  }
}

function parseRating(value: SearchListing["average_rating"]): number {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const n = Number(value);
    return Number.isFinite(n) ? n : 4.8;
  }
  return 4.8;
}

function searchToCollectionCard(listing: SearchListing, fallback: CollectionCardData): CollectionCardData {
  const loc = [listing.location?.city, listing.location?.region].filter(Boolean).join(", ");
  return {
    ...fallback,
    title: listing.title || fallback.title,
    loc: loc || fallback.loc,
    price: Math.round(Number(listing.base_price) || fallback.price),
    rating: parseRating(listing.average_rating),
    reviews: listing.review_count ?? fallback.reviews,
    href: `/listing/${listing.slug}`,
  };
}

function countRegions(listings: SearchListing[]) {
  const text = (l: SearchListing) => `${l.title} ${l.location?.city ?? ""} ${l.location?.region ?? ""}`.toLowerCase();
  const by = (needle: string[]) => listings.filter((l) => needle.some((n) => text(l).includes(n))).length;
  return {
    zakopane: by(["zakop", "tatry", "bukowina", "nowy targ"]),
    mazury: by(["mazur", "mikolaj", "gizyck", "augustow"]),
    bieszczady: by(["bieszcz", "ustrzyki"]),
    baltyk: by(["ustka", "baltyk", "sopot", "gdyn", "kolobrzeg"]),
    szklarska: by(["szklars", "karpacz"]),
  };
}

export default async function HomePage() {
  const featured = await loadFeatured();
  const discovery = await loadDiscovery();
  const fallbackListings = featured.length ? [] : await loadDiscoveryFallback();
  const listings = featured.length ? featured : fallbackListings;

  const discoveryListings =
    discovery?.featured_collections?.flatMap((collection) =>
      collection.listings.map(similarListingToSearch)
    ) ?? [];

  const allPool = [...listings, ...discoveryListings].filter(Boolean);
  const regionCounts = countRegions(allPool);

  const waterDefaults: CollectionCardData[] = [
    {
      title: "Dom na Mazurach z prywatna plaza",
      loc: "Gizycko",
      price: 490,
      rating: 4.95,
      reviews: 134,
      badge: "Jezioro",
      dist: "Plaza 0m",
      emoji: "🏊",
      href: "/search?location=Mazury",
      bg: "linear-gradient(145deg,#dbeafe,#bfdbfe)",
    },
    {
      title: "Willa na klifie z widokiem na Baltyk",
      loc: "Ustka",
      price: 620,
      rating: 4.91,
      reviews: 88,
      badge: "Morze",
      dist: "Plaza 50m",
      emoji: "🌊",
      href: "/search?location=Baltyk",
      bg: "linear-gradient(145deg,#bfdbfe,#93c5fd)",
    },
    {
      title: "Chatka na Mazurach - kajaki gratis",
      loc: "Mikolajki",
      price: 280,
      rating: 4.83,
      reviews: 61,
      badge: "Kajaki",
      emoji: "🛶",
      href: "/search?location=Mazury",
      bg: "linear-gradient(145deg,#ccfbf1,#99f6e4)",
    },
    {
      title: "Dom na pomoście nad jeziorem",
      loc: "Augustow",
      price: 380,
      rating: 4.89,
      reviews: 42,
      badge: "Pomost",
      dist: "Widok na jezioro",
      emoji: "🏡",
      href: "/search?location=Augustow",
      bg: "linear-gradient(145deg,#dbeafe,#c7d2fe)",
    },
    {
      title: "Glamping przy rzece Wda",
      loc: "Tuchola",
      price: 195,
      rating: 4.76,
      reviews: 29,
      badge: "Rzeka",
      emoji: "🏕️",
      href: "/search?location=Tuchola",
      bg: "linear-gradient(145deg,#d9f99d,#bef264)",
    },
    {
      title: "Apartament z basenem outdoor",
      loc: "Sopot",
      price: 720,
      rating: 4.94,
      reviews: 167,
      badge: "Basen",
      dist: "Plaza 200m",
      emoji: "🏖️",
      href: "/search?location=Sopot",
      bg: "linear-gradient(145deg,#bfdbfe,#a5f3fc)",
    },
  ];

  const mountainDefaults: CollectionCardData[] = [
    {
      title: "Domek z sauna na gorskiej polanie",
      loc: "Zakopane",
      price: 320,
      rating: 4.92,
      reviews: 87,
      badge: "Sauna",
      dist: "Tatry widok",
      emoji: "🏔️",
      href: "/search?location=Zakopane",
      bg: "linear-gradient(145deg,#d1fae5,#a7f3d0)",
    },
    {
      title: "Chata przy szlaku - Karpacz",
      loc: "Karpacz",
      price: 245,
      rating: 4.85,
      reviews: 53,
      badge: "Szlak",
      dist: "Sniezka 3km",
      emoji: "🏕️",
      href: "/search?location=Karpacz",
      bg: "linear-gradient(145deg,#dcfce7,#bbf7d0)",
    },
    {
      title: "Drewniany domek z kominkiem",
      loc: "Wisla",
      price: 290,
      rating: 4.88,
      reviews: 71,
      badge: "Kominek",
      emoji: "🔥",
      href: "/search?location=Wisla",
      bg: "linear-gradient(145deg,#fef3c7,#fde68a)",
    },
    {
      title: "Apartament z panorama Tatr",
      loc: "Bukowina",
      price: 250,
      rating: 4.76,
      reviews: 88,
      badge: "Panorama",
      dist: "Tatry 2km",
      emoji: "🌄",
      href: "/search?location=Bukowina",
      bg: "linear-gradient(145deg,#e0f2fe,#bae6fd)",
    },
    {
      title: "Stodola SPA - Bieszczady",
      loc: "Ustrzyki",
      price: 390,
      rating: 4.85,
      reviews: 44,
      badge: "SPA",
      emoji: "🧖",
      href: "/search?location=Bieszczady",
      bg: "linear-gradient(145deg,#fce7f3,#fbcfe8)",
    },
    {
      title: "Goralski domek z jacuzzi",
      loc: "Nowy Targ",
      price: 410,
      rating: 4.9,
      reviews: 38,
      badge: "Jacuzzi",
      dist: "Gorce 1km",
      emoji: "🏡",
      href: "/search?location=Nowy%20Targ",
      bg: "linear-gradient(145deg,#d1fae5,#86efac)",
    },
  ];

  const waterPool = allPool.filter((l) => {
    const text = `${l.title} ${l.location?.city ?? ""} ${l.location?.region ?? ""}`.toLowerCase();
    return ["mazur", "jezior", "balty", "sopot", "ustka", "augustow"].some((k) => text.includes(k));
  });

  const mountainPool = allPool.filter((l) => {
    const text = `${l.title} ${l.location?.city ?? ""} ${l.location?.region ?? ""}`.toLowerCase();
    return ["zakop", "tatry", "karp", "szklars", "wisla", "bieszcz", "gor"].some((k) => text.includes(k));
  });

  const waterCards = waterDefaults.map((fallback, index) =>
    waterPool[index] ? searchToCollectionCard(waterPool[index], fallback) : fallback
  );

  const mountainCards = mountainDefaults.map((fallback, index) =>
    mountainPool[index] ? searchToCollectionCard(mountainPool[index], fallback) : fallback
  );

  const lastMinuteItems = discovery?.last_minute?.slice(0, 3) ?? [];

  return (
    <>
      <HeroSection />
      <MarqueeTicker />
      <TravelModes />
      <AiSection />
      <FeaturedListings listings={listings} />
      <CtaSection />
      <StatsStrip />
      <RegionsGrid counts={regionCounts} />
      <LastMinute items={lastMinuteItems} />
      <WaterCollection cards={waterCards} />
      <MountainCollection cards={mountainCards} />
      <HostCta />
      <Footer />
    </>
  );
}
