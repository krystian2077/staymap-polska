"use client";

import Link from "next/link";
import type {
  HomeRegionTile,
  RegionFilters,
  RegionKey,
  RegionSearchQueryValue,
} from "@/types/regions";

type LocalRegionSeed = {
  key: RegionKey;
  title: string;
  subtitle: string;
  emoji: string;
  bg: string;
  mapCenter: { lat: number; lng: number };
  radiusKm: number;
  location: string;
  filters?: RegionFilters;
  anchorLabel: string;
  large?: boolean;
  tag?: string;
  fallbackCount: number;
  fallbackStartingPrice?: number;
  fallbackMapPinCount?: number;
  highlights: string[];
  searchQuery: Record<string, RegionSearchQueryValue>;
  priceLabel?: string;
  glow: string;
};

const DEFAULT_TILES: LocalRegionSeed[] = [
  {
    key: "gory",
    title: "Góry",
    subtitle: "Tatry, Beskidy i Bieszczady",
    emoji: "🏔️",
    bg: "radial-gradient(circle at 12% 12%,rgba(152,251,196,.35),transparent 38%),linear-gradient(135deg,#09241a,#174330 55%,#23533d)",
    mapCenter: { lat: 49.2992, lng: 19.9496 },
    radiusKm: 90,
    location: "Zakopane",
    filters: { near_mountains: true },
    anchorLabel: "Zakopane i okolice",
    large: true,
    tag: "SIGNATURE",
    fallbackCount: 847,
    fallbackStartingPrice: 180,
    fallbackMapPinCount: 180,
    highlights: ["widoki premium", "domki z sauna", "tatry i chill"],
    searchQuery: {
      location: "Zakopane",
      latitude: 49.2992,
      longitude: 19.9496,
      radius_km: 90,
      near_mountains: true,
      ordering: "recommended",
    },
    glow: "rgba(34,197,94,.26)",
  },
  {
    key: "baltyk",
    title: "Bałtyk",
    subtitle: "Sopot, Hel, Kołobrzeg",
    emoji: "🌊",
    bg: "radial-gradient(circle at 80% 14%,rgba(125,211,252,.3),transparent 35%),linear-gradient(135deg,#0b2940,#114b6f 52%,#1b658e)",
    mapCenter: { lat: 54.45, lng: 18.67 },
    radiusKm: 120,
    location: "Bałtyk",
    filters: { near_sea: true },
    anchorLabel: "Pas nadmorski",
    fallbackCount: 428,
    fallbackStartingPrice: 260,
    fallbackMapPinCount: 140,
    highlights: ["plaze i molo", "apartamenty z widokiem", "weekend nad morzem"],
    searchQuery: {
      location: "Bałtyk",
      latitude: 54.45,
      longitude: 18.67,
      radius_km: 120,
      near_sea: true,
      ordering: "recommended",
    },
    glow: "rgba(56,189,248,.24)",
  },
  {
    key: "jeziora",
    title: "Jeziora",
    subtitle: "Mazury i relaks nad wodą",
    emoji: "🏊",
    bg: "radial-gradient(circle at 16% 20%,rgba(110,231,183,.26),transparent 40%),linear-gradient(135deg,#12332f,#1c5a52 54%,#216f64)",
    mapCenter: { lat: 53.8, lng: 21.5 },
    radiusKm: 100,
    location: "Mazury",
    filters: { near_lake: true },
    anchorLabel: "Kraina Wielkich Jezior",
    fallbackCount: 523,
    fallbackStartingPrice: 220,
    fallbackMapPinCount: 160,
    highlights: ["pomost i kajaki", "domki nad woda", "slow mornings"],
    searchQuery: {
      location: "Mazury",
      latitude: 53.8,
      longitude: 21.5,
      radius_km: 100,
      near_lake: true,
      ordering: "recommended",
    },
    glow: "rgba(16,185,129,.23)",
  },
  {
    key: "lasy",
    title: "Lasy",
    subtitle: "Bory, puszcze i totalny reset",
    emoji: "🌿",
    bg: "radial-gradient(circle at 74% 18%,rgba(163,230,53,.26),transparent 34%),linear-gradient(135deg,#1b2b1f,#24452b 52%,#356b3b)",
    mapCenter: { lat: 52.74, lng: 23.86 },
    radiusKm: 120,
    location: "Białowieża",
    filters: { near_forest: true },
    anchorLabel: "Puszcza i dzika przyroda",
    fallbackCount: 218,
    fallbackStartingPrice: 190,
    fallbackMapPinCount: 110,
    highlights: ["reset offline", "mikrodomki", "natura 360"],
    searchQuery: {
      location: "Białowieża",
      latitude: 52.74,
      longitude: 23.86,
      radius_km: 120,
      near_forest: true,
      ordering: "recommended",
    },
    glow: "rgba(132,204,22,.18)",
  },
  {
    key: "uzdrowiska",
    title: "Uzdrowiska & SPA",
    subtitle: "Kotlina Kłodzka, Cieplice, Świeradów",
    emoji: "♨️",
    bg: "radial-gradient(circle at 82% 20%,rgba(216,180,254,.28),transparent 34%),linear-gradient(135deg,#1d1c39,#302a57 50%,#4a3d78)",
    mapCenter: { lat: 50.366, lng: 16.386 },
    radiusKm: 115,
    location: "Kotlina Kłodzka",
    filters: { near_forest: true, near_mountains: true },
    anchorLabel: "Slow travel i regeneracja",
    fallbackCount: 287,
    fallbackStartingPrice: 260,
    fallbackMapPinCount: 120,
    highlights: ["wellness i termy", "gorski mikroklimat", "weekend detox"],
    searchQuery: {
      location: "Kotlina Kłodzka",
      latitude: 50.366,
      longitude: 16.386,
      radius_km: 115,
      near_forest: true,
      near_mountains: true,
      ordering: "recommended",
    },
    glow: "rgba(167,139,250,.25)",
  },
];

const REGION_ORDER: RegionKey[] = ["gory", "baltyk", "jeziora", "lasy", "uzdrowiska"];

function buildRegionHrefFromQuery(searchQuery?: Record<string, RegionSearchQueryValue>): string {
  if (!searchQuery) return "/search";
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(searchQuery)) {
    if (value == null) continue;
    if (typeof value === "boolean") {
      if (value) params.set(key, "true");
      continue;
    }
    params.set(key, String(value));
  }
  const qs = params.toString();
  return qs ? `/search?${qs}` : "/search";
}

function pluralizeOffers(count: number): string {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (count === 1) return "oferta";
  if (mod10 >= 2 && mod10 <= 4 && !(mod100 >= 12 && mod100 <= 14)) return "oferty";
  return "ofert";
}

function buildFallbackTiles(): HomeRegionTile[] {
  return DEFAULT_TILES.map((tile) => ({
    ...tile,
    count: tile.fallbackCount,
    mapPinCount: tile.fallbackMapPinCount,
    startingPrice: tile.fallbackStartingPrice ?? null,
    href: buildRegionHrefFromQuery(tile.searchQuery),
  }));
}

function formatPrice(value: number | null | undefined): string {
  if (value == null) return "ceny aktualizowane na zywo";
  return `od ${Math.round(value).toLocaleString("pl-PL")} zl / noc`;
}

function formatCompact(value: number): string {
  return value.toLocaleString("pl-PL");
}

function getFilterLabels(filters?: RegionFilters): string[] {
  if (!filters) return [];
  const labels: Array<[keyof RegionFilters, string]> = [
    ["near_mountains", "gory"],
    ["near_sea", "morze"],
    ["near_lake", "jeziora"],
    ["near_forest", "lasy"],
  ];
  return labels.filter(([key]) => filters[key]).map(([, label]) => label);
}

function byPreferredOrder(a: HomeRegionTile, b: HomeRegionTile): number {
  return REGION_ORDER.indexOf(a.key) - REGION_ORDER.indexOf(b.key);
}

export function RegionsGrid({ regions }: { regions?: HomeRegionTile[] }) {
  const initialTiles = regions?.length ? regions : buildFallbackTiles();
  const tiles = [...initialTiles].sort(byPreferredOrder);
  const heroTile = tiles.find((tile) => tile.large) ?? tiles[0];
  const sideTiles = tiles.filter((tile) => tile.key !== heroTile.key);

  return (
    <section className="mx-auto w-full max-w-[1280px] px-4 py-20 sm:px-6 lg:px-10">
      <div className="relative overflow-hidden rounded-[32px] border border-[#1f4a35] bg-[radial-gradient(circle_at_12%_8%,rgba(57,255,170,.18),transparent_36%),radial-gradient(circle_at_82%_16%,rgba(56,189,248,.2),transparent_34%),linear-gradient(140deg,#051a12_0%,#0a2a1e_44%,#112d23_100%)] px-5 py-8 shadow-[0_30px_90px_rgba(2,12,8,.45)] sm:px-8 sm:py-10 lg:px-12 lg:py-12">
        <div className="pointer-events-none absolute inset-0 opacity-25 [background-image:radial-gradient(circle_at_1px_1px,rgba(255,255,255,.35)_1px,transparent_0)] [background-size:22px_22px]" />

        <div className="relative z-[1] mb-7 flex flex-wrap items-end justify-between gap-4">
          <div>
            <span className="inline-flex items-center rounded-full border border-emerald-200/30 bg-emerald-400/15 px-3 py-1 text-[10px] font-bold uppercase tracking-[.11em] text-emerald-100">
              Premium Discovery
            </span>
            <h2 className="mt-3 text-[28px] font-black tracking-[-0.03em] text-white sm:text-[36px]">
              Odkryj regiony
            </h2>
            <p className="mt-2 max-w-[58ch] text-sm text-emerald-50/80 sm:text-[15px]">
              Sekcja zsynchronizowana z Twoim Search API, mapą i pinezkami - klik regionu otwiera ten sam query zestaw, co widzisz w danych.
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-white/70">
            <span className="inline-flex h-2.5 w-2.5 rounded-full bg-emerald-300 shadow-[0_0_16px_rgba(110,231,183,.9)]" />
            LIVE: mapa i filtry w czasie rzeczywistym
          </div>
        </div>

        <div className="relative z-[1] grid gap-4 lg:grid-cols-[1.45fr_1fr]">
          <Link
            href={heroTile.href}
            className="group relative overflow-hidden rounded-[26px] border border-white/15 p-7 transition duration-300 hover:border-emerald-200/45"
            style={{ background: heroTile.bg }}
          >
            <div
              className="pointer-events-none absolute -left-16 -top-16 h-44 w-44 rounded-full blur-3xl transition-opacity duration-500 group-hover:opacity-90"
              style={{ backgroundColor: heroTile.glow, opacity: 0.75 }}
            />
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_top,rgba(4,13,9,.9)_0%,rgba(4,13,9,.48)_45%,transparent_100%)]" />
            <div className="relative z-[1] flex min-h-[280px] flex-col justify-between sm:min-h-[340px]">
              <div className="flex items-start justify-between gap-3">
                <div>
                  {heroTile.tag ? (
                    <span className="inline-flex rounded-full border border-emerald-200/35 bg-emerald-300/20 px-3 py-1 text-[10px] font-bold uppercase tracking-[.1em] text-emerald-100">
                      {heroTile.tag}
                    </span>
                  ) : null}
                  <p className="mt-3 text-5xl" aria-hidden>
                    {heroTile.emoji}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-2 text-right">
                  <div className="rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-[11px] font-semibold text-white/90">
                    {formatCompact(heroTile.mapPinCount ?? heroTile.count)} pinezek
                  </div>
                  <p className="text-[11px] font-medium uppercase tracking-[.08em] text-white/65">promień {heroTile.radiusKm} km</p>
                </div>
              </div>

              <div className="max-w-[90%]">
                <h3 className="text-[34px] font-black tracking-[-0.03em] text-white">{heroTile.title}</h3>
                <p className="mt-1 text-sm text-white/80">{heroTile.subtitle}</p>
                <p className="mt-3 text-sm font-semibold text-emerald-100">
                  {formatCompact(heroTile.count)} {pluralizeOffers(heroTile.count)} - {formatPrice(heroTile.startingPrice)}
                </p>
                <p className="mt-1 text-xs text-white/75">📍 {heroTile.anchorLabel} • promień {heroTile.radiusKm} km</p>
                <div className="mt-4 flex flex-wrap gap-2.5">
                  {(heroTile.highlights ?? []).slice(0, 3).map((item) => (
                    <span key={item} className="rounded-full border border-white/20 bg-white/12 px-2.5 py-1 text-[11px] text-white/85">
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </Link>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-2">
            {sideTiles.map((tile) => {
              const featureLabels = getFilterLabels(tile.filters);
              return (
                <Link
                  key={tile.key}
                  href={tile.href}
                  className="group relative overflow-hidden rounded-[22px] border border-white/12 p-4 transition duration-300 hover:border-white/35"
                  style={{ background: tile.bg }}
                >
                  <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_top,rgba(4,12,9,.88)_0%,rgba(4,12,9,.45)_58%,transparent_100%)]" />
                  <div
                    className="pointer-events-none absolute -left-12 -top-12 h-32 w-32 rounded-full blur-3xl transition-opacity duration-500 group-hover:opacity-90"
                    style={{ backgroundColor: tile.glow, opacity: 0.6 }}
                  />
                  <div className="relative z-[1] flex min-h-[196px] flex-col justify-between">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[32px]" aria-hidden>{tile.emoji}</p>
                        <h3 className="mt-1 text-[24px] font-black leading-[1.05] tracking-[-0.02em] text-white">{tile.title}</h3>
                        <p className="mt-1 line-clamp-2 text-xs text-white/75">{tile.subtitle}</p>
                      </div>
                      <span className="shrink-0 rounded-full border border-white/20 bg-white/12 px-2 py-1 text-[10px] font-semibold text-white/90">
                        {formatCompact(tile.mapPinCount ?? tile.count)} pin
                      </span>
                    </div>

                    <div>
                      <p className="mt-3 text-[12px] font-semibold text-emerald-100">
                        {formatCompact(tile.count)} {pluralizeOffers(tile.count)} • {formatPrice(tile.startingPrice)}
                      </p>
                      <p className="mt-1 text-[11px] text-white/72">📍 {tile.anchorLabel} • {tile.radiusKm} km</p>
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {(tile.highlights ?? []).slice(0, 2).map((item) => (
                          <span key={item} className="rounded-full bg-white/12 px-2 py-0.5 text-[10px] text-white/85">
                            {item}
                          </span>
                        ))}
                        {featureLabels.slice(0, 2).map((item) => (
                          <span key={item} className="rounded-full border border-emerald-100/30 bg-emerald-200/15 px-2 py-0.5 text-[10px] uppercase tracking-[.06em] text-emerald-100">
                            {item}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        <div className="relative z-[1] mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-white/12 pt-4">
          <p className="text-xs text-white/70">Klik regionu otwiera `/search` z tym samym query do listy i mapy.</p>
          <Link
            href="/search"
            className="inline-flex rounded-full border border-white/30 bg-white/10 px-4 py-2 text-xs font-bold uppercase tracking-[.08em] text-white transition hover:bg-white/18"
          >
            Zobacz cala mape
          </Link>
        </div>
      </div>
    </section>
  );
}
