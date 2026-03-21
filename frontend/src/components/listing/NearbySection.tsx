"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";

import { useJsonGet } from "@/lib/hooks/useJsonGet";
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
  wellness: [],
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
    wellness: raw.wellness ?? [],
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

  const { data, error, isLoading } = useJsonGet<NearbyApi>(
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
    <section className="mb-8">
      <h2 className="sec-h mb-3">W pobliżu</h2>
      <p className="mb-4 text-sm text-gray-600">
        Punkty z OpenStreetMap i podsumowanie okolicy wokół{" "}
        <span className="font-semibold text-brand-dark">
          {location.city}, {location.region}
        </span>
        .
      </p>

      {isLoading && (
        <div className="space-y-5">
          <div className="h-[140px] animate-pulse rounded-2xl bg-[#0a2e1a]/20" />
          <div className="h-[240px] animate-pulse rounded-2xl bg-gray-100" />
        </div>
      )}

      {!isLoading && error && (
        <p className="text-sm text-red-600">Nie udało się załadować danych okolicy.</p>
      )}

      {!isLoading && !error && (
        <>
          {area && (
            <div
              className="mb-5 rounded-2xl px-[22px] py-[22px] text-white"
              style={{
                background: "#0a2e1a",
                animation: "fade-up 0.6s cubic-bezier(.16,1,.3,1)",
              }}
            >
              <div className="flex flex-col gap-1">
                <p className="text-base font-extrabold">
                  {area.city}, {area.region}
                </p>
                <p className="text-[13px] text-white/65">
                  Charakterystyka obszaru · dane z OpenStreetMap
                </p>
              </div>

              <div className="mt-3.5 grid grid-cols-3 gap-2.5">
                <div className="rounded-[10px] bg-white/10 px-3 py-3 text-center">
                  <p className="text-xl font-extrabold">{area.counts.restaurants}</p>
                  <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.04em] text-white/60">
                    Restauracji
                  </p>
                </div>
                <div className="rounded-[10px] bg-white/10 px-3 py-3 text-center">
                  <p className="text-xl font-extrabold">{area.counts.trails}</p>
                  <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.04em] text-white/60">
                    Szlaków
                  </p>
                </div>
                <div className="rounded-[10px] bg-white/10 px-3 py-3 text-center">
                  <p className="text-xl font-extrabold">{area.distance_to_center_km} km</p>
                  <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.04em] text-white/60">
                    Do centrum
                  </p>
                </div>
                {area.counts.ski_lifts > 0 ? (
                  <div className="rounded-[10px] bg-white/10 px-3 py-3 text-center">
                    <p className="text-xl font-extrabold">{area.counts.ski_lifts}</p>
                    <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.04em] text-white/60">
                      Wyciągów
                    </p>
                  </div>
                ) : null}
                <div className="rounded-[10px] bg-white/10 px-3 py-3 text-center">
                  <p className="line-clamp-2 min-h-[28px] text-sm font-extrabold leading-tight">
                    {area.character}
                  </p>
                  <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.04em] text-white/60">
                    Charakter
                  </p>
                </div>
                <div className="rounded-[10px] bg-white/10 px-3 py-3 text-center">
                  <p className="text-xl font-extrabold">{area.nature_score}/10</p>
                  <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.04em] text-white/60">
                    Natura
                  </p>
                </div>
              </div>

              {area.tags?.length ? (
                <div className="mt-3.5 flex flex-wrap gap-2">
                  {area.tags.map((t) => (
                    <span
                      key={t}
                      className="rounded-full px-3 py-1 text-xs font-semibold text-white/90"
                      style={{ background: "rgba(255,255,255,.12)" }}
                    >
                      {t}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
          )}

          <NearbyMap
            centerLat={location.lat}
            centerLng={location.lng}
            pois={list}
            categoryKey={tab}
            focusOsmId={focusOsmId}
          />

          <div className="mt-0 flex gap-0 overflow-x-auto border-b border-[#e5e7eb] bg-white [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
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
                  className={`shrink-0 border-b-2 px-3 py-2.5 text-sm font-semibold transition-colors ${
                    active
                      ? "border-brand text-[#0a2e1a]"
                      : "border-transparent text-gray-500 hover:bg-[#f0fdf4]"
                  }`}
                >
                  <span className="mr-1">{cfg.emoji}</span>
                  {cfg.label}{" "}
                  <span className="text-gray-400">({count})</span>
                </button>
              );
            })}
          </div>

          <div className="max-h-[280px] overflow-y-auto py-3">
            {list.length === 0 ? (
              <p className="py-8 text-center text-sm text-gray-500">
                Brak danych dla tej kategorii
              </p>
            ) : (
              <ul className="space-y-0">
                {list.map((p: POIItem) => {
                  const cfg = POI_CATEGORY_CONFIG[tab] ?? POI_CATEGORY_CONFIG.outdoor;
                  const osm = p.osm_id || p.id;
                  return (
                    <li key={osm}>
                      <button
                        type="button"
                        onClick={() => setFocusOsmId(osm)}
                        className="flex w-full cursor-pointer items-center gap-2.5 rounded-[10px] px-2.5 py-2 text-left transition-colors duration-150 hover:bg-[#f0fdf4]"
                      >
                        <div
                          className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[9px] text-lg"
                          style={{ background: cfg.bg }}
                        >
                          {cfg.emoji}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[13px] font-semibold text-[#111827]">
                            {p.name}
                          </p>
                          <p className="text-[11px] text-[#9ca3af]">
                            {p.subcategory || "—"}
                            {p.rating != null ? ` · ★${p.rating}` : ""}
                            {p.is_open !== null
                              ? ` · ${openStatus(p.is_open)}`
                              : ""}
                          </p>
                        </div>
                        <span className="shrink-0 text-xs font-bold text-brand">
                          {formatDistance(p.distance_m)}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </>
      )}
    </section>
  );
}
