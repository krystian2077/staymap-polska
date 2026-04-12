"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";

import { AnimatedSection } from "@/components/ui/AnimatedSection";
import { useAuthJsonGet } from "@/lib/hooks/useJsonGet";
import {
  backendGroupsToNearbyPlaces,
  buildAreaSummaryFromNearbyPayload,
} from "@/lib/listing/nearbyAdapter";
import { formatDistance, POI_CATEGORY_CONFIG } from "@/lib/utils/booking";
import type { AreaSummary, NearbyPlaces, POIItem } from "@/types/listing";

const NearbyMap = dynamic(
  () => import("./NearbyMap").then((m) => m.NearbyMap),
  { ssr: false, loading: () => <div className="h-[240px] animate-pulse rounded-2xl bg-gray-100" /> }
);

const CATEGORY_KEYS = Object.keys(POI_CATEGORY_CONFIG) as (keyof typeof POI_CATEGORY_CONFIG)[];

const EMPTY_PLACES: NearbyPlaces = {
  restaurant: [],
  outdoor: [],
  shop: [],
  transport: [],
};

type NearbyApi = {
  data?: {
    area_summary?: AreaSummary | null;
    places?: Partial<NearbyPlaces> | null;
    groups?: Record<string, { name: string; lat: number; lng: number; distance_m: number; kind?: string; osm_id?: number }[]>;
    stats?: Record<string, number>;
  };
};

function mergePlaces(raw: Partial<NearbyPlaces> | null | undefined): NearbyPlaces {
  if (!raw) return { ...EMPTY_PLACES };
  return {
    restaurant: raw.restaurant ?? [],
    outdoor: raw.outdoor ?? [],
    shop: raw.shop ?? [],
    transport: raw.transport ?? [],
  };
}

function hasAnyPoiInPlaces(raw: Partial<NearbyPlaces>): boolean {
  return CATEGORY_KEYS.some((k) => {
    const cat = k as keyof NearbyPlaces;
    return (raw[cat]?.length ?? 0) > 0;
  });
}

type Props = {
  /** Slug listingu — backend: GET /api/v1/listings/{slug}/nearby/ */
  listingSlug: string;
  location: { city: string; region: string; lat: number; lng: number };
};

export function NearbySection({ listingSlug, location }: Props) {
  const [tab, setTab] = useState<string>("restaurant");
  const [focusOsmId, setFocusOsmId] = useState<string | null>(null);

  const { data, error, isLoading } = useAuthJsonGet<NearbyApi>(
    listingSlug ? `/api/v1/listings/${listingSlug}/nearby/` : null
  );

  const inner = data?.data;

  const places = useMemo(() => {
    if (inner?.places && hasAnyPoiInPlaces(inner.places)) {
      return mergePlaces(inner.places);
    }
    if (inner?.groups && typeof inner.groups === "object") {
      return backendGroupsToNearbyPlaces(inner.groups);
    }
    return { ...EMPTY_PLACES };
  }, [inner?.places, inner?.groups]);

  const area = useMemo(() => {
    if (inner?.area_summary) return inner.area_summary;
    return buildAreaSummaryFromNearbyPayload(
      { city: location.city, region: location.region },
      inner?.groups,
      inner?.stats
    );
  }, [inner?.area_summary, inner?.groups, inner?.stats, location.city, location.region]);

  const list: POIItem[] = places[tab as keyof NearbyPlaces] ?? [];

  function openStatus(open: boolean | null): string {
    if (open === true) return "otwarte";
    if (open === false) return "zamknięte";
    return "";
  }

  return (
    <AnimatedSection className="mb-12">
      <div className="rounded-[2.5rem] border border-gray-100 bg-white p-8 shadow-sm lg:p-10">
        <div className="mb-8">
          <h2 className="text-3xl font-black tracking-tight text-[#0a2e1a] lg:text-4xl">
            W pobliżu
          </h2>
          <p className="mt-2 text-sm text-gray-500">
            Punkty z OpenStreetMap i podsumowanie okolicy wokół{" "}
            <span className="font-semibold text-brand-dark">
              {location.city}, {location.region}
            </span>
            .
          </p>
        </div>

        {isLoading && (
          <div className="space-y-6">
            <div className="h-[180px] animate-pulse rounded-[2rem] bg-[#0a2e1a]/10" />
            <div className="h-[300px] animate-pulse rounded-[2rem] bg-gray-50" />
          </div>
        )}

        {!isLoading && error && (
          <div className="rounded-2xl bg-red-50 p-6 text-center">
            <p className="text-sm font-medium text-red-600">
              Nie udało się załadować danych okolicy.
            </p>
          </div>
        )}

        {!isLoading && !error && (
          <div className="flex flex-col gap-8">
            {area && (
              <div
                className="overflow-hidden rounded-[2rem] px-8 py-8 text-white shadow-lg"
                style={{
                  background: "linear-gradient(135deg, #0a2e1a 0%, #1a4a30 100%)",
                  animation: "fade-up 0.6s cubic-bezier(.16,1,.3,1)",
                }}
              >
                <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
                  <div>
                    <p className="text-2xl font-black tracking-tight">
                      {area.city}, {area.region}
                    </p>
                    <p className="mt-1 text-sm font-medium text-white/60">
                      Charakterystyka obszaru · dane z OpenStreetMap
                    </p>
                  </div>
                  {area.tags?.length ? (
                    <div className="flex flex-wrap gap-2">
                      {area.tags.map((t) => (
                        <span
                          key={t}
                          className="rounded-full bg-white/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white/90 backdrop-blur-md"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>

                <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
                  <div className="rounded-2xl bg-white/5 p-4 transition-colors hover:bg-white/10">
                    <p className="text-2xl font-black">{area.counts.restaurants}</p>
                    <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.06em] text-white/40">
                      Restauracji
                    </p>
                  </div>
                  <div className="rounded-2xl bg-white/5 p-4 transition-colors hover:bg-white/10">
                    <p className="text-2xl font-black">{area.counts.trails}</p>
                    <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.06em] text-white/40">
                      Szlaków
                    </p>
                  </div>
                  <div className="rounded-2xl bg-white/5 p-4 transition-colors hover:bg-white/10">
                    <p className="text-2xl font-black">{area.distance_to_center_km} km</p>
                    <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.06em] text-white/40">
                      Do centrum
                    </p>
                  </div>
                  {area.counts.ski_lifts > 0 && (
                    <div className="rounded-2xl bg-white/5 p-4 transition-colors hover:bg-white/10">
                      <p className="text-2xl font-black">{area.counts.ski_lifts}</p>
                      <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.06em] text-white/40">
                        Wyciągów
                      </p>
                    </div>
                  )}
                  <div className="rounded-2xl bg-white/5 p-4 transition-colors hover:bg-white/10">
                    <p className="line-clamp-1 text-lg font-black">{area.character}</p>
                    <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.06em] text-white/40">
                      Charakter
                    </p>
                  </div>
                  <div className="rounded-2xl bg-white/5 p-4 transition-colors hover:bg-white/10">
                    <p className="text-2xl font-black">{area.nature_score}/10</p>
                    <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.06em] text-white/40">
                      Natura
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="overflow-hidden rounded-[2rem] border border-gray-100 shadow-sm">
              <NearbyMap
                centerLat={location.lat}
                centerLng={location.lng}
                pois={list}
                categoryKey={tab}
                focusOsmId={focusOsmId}
              />

              <div className="flex gap-2 overflow-x-auto bg-gray-50/50 p-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {CATEGORY_KEYS.map((key) => {
                  const cfg = POI_CATEGORY_CONFIG[key];
                  const cat = key as keyof NearbyPlaces;
                  const count = (places[cat] ?? []).length;
                  const active = tab === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => {
                        setTab(key);
                        setFocusOsmId(null);
                      }}
                      className={`flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition-all ${
                        active
                          ? "bg-[#0a2e1a] text-white shadow-md shadow-emerald-900/20"
                          : "bg-white text-gray-500 hover:bg-gray-100"
                      }`}
                    >
                      <span>{cfg.emoji}</span>
                      {cfg.label}
                      <span className={active ? "text-white/50" : "text-gray-400"}>
                        ({count})
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="max-h-[340px] overflow-y-auto bg-white p-4">
                {list.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                    <span className="text-4xl">📍</span>
                    <p className="mt-2 text-sm font-medium">Brak danych dla tej kategorii</p>
                  </div>
                ) : (
                  <div className="grid gap-2 sm:grid-cols-2">
                    {list.map((p: POIItem) => {
                      const cfg = POI_CATEGORY_CONFIG[tab] ?? POI_CATEGORY_CONFIG.outdoor;
                      const osm = p.osm_id || p.id;
                      const isFocused = focusOsmId === osm;
                      return (
                        <button
                          key={osm}
                          type="button"
                          onClick={() => setFocusOsmId(osm)}
                          className={`flex items-center gap-4 rounded-2xl border p-3 text-left transition-all duration-200 ${
                            isFocused
                              ? "border-brand bg-brand/5 ring-1 ring-brand"
                              : "border-transparent hover:border-gray-200 hover:bg-gray-50"
                          }`}
                        >
                          <div
                            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-xl shadow-sm"
                            style={{ background: cfg.bg }}
                          >
                            {cfg.emoji}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-bold text-gray-900">{p.name}</p>
                            <p className="mt-0.5 text-[11px] font-medium text-gray-500">
                              {p.subcategory || "Miejsce"}
                              {p.rating != null ? ` · ★${p.rating}` : ""}
                              {p.is_open !== null ? ` · ${openStatus(p.is_open)}` : ""}
                            </p>
                          </div>
                          <div className="flex flex-col items-end gap-1 shrink-0">
                            <span className="text-xs font-black text-[#0a2e1a]">
                              {formatDistance(p.distance_m)}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </AnimatedSection>
  );
}
