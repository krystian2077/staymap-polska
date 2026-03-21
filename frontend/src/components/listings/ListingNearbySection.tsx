"use client";

import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect, useRef, useState } from "react";

import { apiUrl } from "@/lib/api";
import type { NearbyApiPayload, NearbyPlaceItem } from "@/types/nearby";

const GROUP_LABELS: Record<string, string> = {
  eat_drink: "Jedzenie i kawa",
  nature_leisure: "Parki i rekreacja",
  family: "Rodzina",
  culture: "Kultura",
  transport: "Komunikacja",
  nightlife: "Nocne życie",
  outdoor: "Outdoor i widoki",
  services: "Usługi",
};

type Props = {
  slug: string;
  latitude: number;
  longitude: number;
};

function flattenForMap(groups: NearbyApiPayload["groups"]): NearbyPlaceItem[] {
  const out: NearbyPlaceItem[] = [];
  for (const items of Object.values(groups)) {
    if (Array.isArray(items)) out.push(...items);
  }
  return out;
}

export function ListingNearbySection({ slug, latitude, longitude }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);
  const [data, setData] = useState<NearbyApiPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setData(null);
      setLoading(true);
      setErr(null);
      try {
        const res = await fetch(apiUrl(`/api/v1/listings/${slug}/nearby/`), {
          cache: "no-store",
        });
        const json = (await res.json()) as { data?: NearbyApiPayload; error?: { message?: string } };
        if (!res.ok) {
          throw new Error(json.error?.message || res.statusText);
        }
        if (!cancelled) setData(json.data ?? null);
      } catch (e) {
        if (!cancelled) setErr(e instanceof Error ? e.message : "Błąd pobierania okolicy");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el || !data?.center) return;

    const map = L.map(el, {
      center: [latitude, longitude],
      zoom: 13,
      scrollWheelZoom: true,
    });
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);

    const markers = L.layerGroup().addTo(map);
    mapRef.current = map;
    layerRef.current = markers;

    const homeIcon = L.divIcon({
      className: "staymap-nearby-home",
      html: '<div class="staymap-nearby-home-dot">🏠</div>',
      iconSize: [36, 36],
      iconAnchor: [18, 34],
    });
    L.marker([latitude, longitude], { icon: homeIcon }).addTo(markers).bindPopup("Obiekt");

    const poiIcon = L.divIcon({
      className: "staymap-nearby-poi",
      html: '<div class="staymap-nearby-poi-dot"></div>',
      iconSize: [12, 12],
      iconAnchor: [6, 6],
    });

    for (const p of flattenForMap(data.groups || {})) {
      L.marker([p.lat, p.lng], { icon: poiIcon })
        .addTo(markers)
        .bindPopup(`<strong>${escapeHtml(p.name)}</strong><br/><span class="text-xs">${p.distance_m} m</span>`);
    }

    const bounds = L.latLngBounds([[latitude, longitude]]);
    for (const p of flattenForMap(data.groups || {})) {
      bounds.extend([p.lat, p.lng]);
    }
    if (bounds.isValid() && flattenForMap(data.groups || {}).length > 0) {
      try {
        map.fitBounds(bounds, { padding: [28, 28], maxZoom: 14 });
      } catch {
        map.setView([latitude, longitude], 13);
      }
    }

    const ro = new ResizeObserver(() => map.invalidateSize());
    ro.observe(el);

    return () => {
      ro.disconnect();
      map.remove();
      mapRef.current = null;
      layerRef.current = null;
    };
  }, [data, latitude, longitude]);

  if (loading) {
    return (
      <section className="mb-8">
        <h2 className="mb-3.5 text-lg font-extrabold text-brand-dark">W okolicy</h2>
        <p className="text-sm text-gray-500">Ładujemy mapę i punkty z OpenStreetMap…</p>
      </section>
    );
  }

  if (err) {
    return (
      <section className="mb-8">
        <h2 className="mb-3.5 text-lg font-extrabold text-brand-dark">W okolicy</h2>
        <p className="text-sm text-red-600">{err}</p>
      </section>
    );
  }

  if (!data?.center) {
    return (
      <section className="mb-8">
        <h2 className="mb-3.5 text-lg font-extrabold text-brand-dark">W okolicy</h2>
        <p className="text-sm text-gray-500">Brak współrzędnych do wyświetlenia mapy.</p>
      </section>
    );
  }

  const totalPoi = Object.values(data.groups || {}).reduce((n, g) => n + (g?.length ?? 0), 0);

  return (
    <section className="mb-8">
      <h2 className="mb-3.5 text-lg font-extrabold text-brand-dark">W okolicy</h2>
      <p className="mb-3 text-sm text-gray-600">
        Punkty z{" "}
        <a href="https://www.openstreetmap.org" className="font-semibold text-brand hover:underline" target="_blank" rel="noreferrer">
          OpenStreetMap
        </a>{" "}
        w promieniu ok. {(data.radius_m / 1000).toFixed(0)} km
        {data.overpass_error ? (
          <span className="ml-1 text-amber-700"> (częściowe dane — problem z siecią POI)</span>
        ) : null}
      </p>

      <div
        ref={wrapRef}
        className="mb-6 h-[280px] w-full overflow-hidden rounded-[14px] border border-brand-border bg-brand-surface [&_.leaflet-container]:h-[280px] [&_.leaflet-container]:w-full"
        aria-label="Mapa — obiekt i POI w pobliżu"
      />

      <style jsx global>{`
        .staymap-nearby-home-dot {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 36px;
          height: 36px;
          border-radius: 9999px;
          background: rgba(22, 101, 52, 0.95);
          border: 2px solid #fff;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          font-size: 16px;
        }
        .staymap-nearby-poi-dot {
          width: 10px;
          height: 10px;
          border-radius: 9999px;
          background: #0d9488;
          border: 2px solid #fff;
          box-shadow: 0 1px 4px rgba(0, 0, 0, 0.2);
        }
        .staymap-nearby-home,
        .staymap-nearby-poi {
          background: transparent !important;
          border: none !important;
        }
      `}</style>

      {totalPoi === 0 ? (
        <p className="text-sm text-gray-500">W tym promieniu nie znaleziono punktów z filtrów OSM (restauracje, parki, przystanki itd.).</p>
      ) : (
        <div className="space-y-6">
          {Object.entries(data.groups || {}).map(([key, items]) => {
            if (!items?.length) return null;
            return (
              <div key={key}>
                <h3 className="mb-2 text-sm font-extrabold text-brand-dark">
                  {GROUP_LABELS[key] ?? key}
                </h3>
                <ul className="space-y-1.5 text-sm text-gray-600">
                  {items.map((p) => (
                    <li key={`${key}-${p.osm_id ?? p.lat}-${p.lng}`} className="flex justify-between gap-3">
                      <span className="font-medium text-gray-700">{p.name}</span>
                      <span className="shrink-0 text-gray-400">{p.distance_m} m</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
