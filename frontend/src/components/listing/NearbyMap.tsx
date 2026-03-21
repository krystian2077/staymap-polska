"use client";

import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect, useRef } from "react";

import { formatDistance, POI_CATEGORY_CONFIG } from "@/lib/utils/booking";
import type { POIItem } from "@/types/listing";

type Props = {
  centerLat: number;
  centerLng: number;
  pois: POIItem[];
  categoryKey: string;
  focusOsmId: string | null;
};

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function NearbyMap({
  centerLat,
  centerLng,
  pois,
  categoryKey,
  focusOsmId,
}: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<Map<string, L.Marker>>(new Map());
  const layerRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const markerMap = markersRef.current;

    const map = L.map(el, {
      center: [centerLat, centerLng],
      zoom: 14,
      scrollWheelZoom: true,
    });
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);

    const layer = L.layerGroup().addTo(map);
    mapRef.current = map;
    layerRef.current = layer;

    const homeHtml = `
      <div class="nearby-home-wrap">
        <span class="nearby-home-ping" aria-hidden="true"></span>
        <div class="nearby-home-pin">🏠 Tu mieszkasz</div>
      </div>`;
    const homeIcon = L.divIcon({
      className: "nearby-map-home-icon",
      html: homeHtml,
      iconSize: [180, 56],
      iconAnchor: [90, 56],
    });
    L.marker([centerLat, centerLng], { icon: homeIcon, zIndexOffset: 1000 }).addTo(
      layer
    );

    const ro = new ResizeObserver(() => map.invalidateSize());
    ro.observe(el);

    return () => {
      ro.disconnect();
      markerMap.clear();
      map.remove();
      mapRef.current = null;
      layerRef.current = null;
    };
  }, [centerLat, centerLng]);

  useEffect(() => {
    const map = mapRef.current;
    const layer = layerRef.current;
    if (!map || !layer) return;

    markersRef.current.forEach((m) => m.remove());
    markersRef.current.clear();

    for (const p of pois) {
      const cfg = POI_CATEGORY_CONFIG[categoryKey] ?? POI_CATEGORY_CONFIG.outdoor;
      const html = `
        <div class="nearby-poi-marker" style="background:${cfg.bg}">
          <span>${cfg.emoji}</span>
        </div>`;
      const icon = L.divIcon({
        className: "nearby-map-poi-icon",
        html,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });
      const popupHtml = `<div class="nearby-poi-popup"><strong>${escapeHtml(
        p.name
      )}</strong><div class="nearby-poi-sub">${escapeHtml(
        p.subcategory || ""
      )}</div><div class="nearby-poi-dist">${formatDistance(p.distance_m)}</div></div>`;
      const m = L.marker([p.lat, p.lng], { icon })
        .bindPopup(popupHtml, { minWidth: 150, className: "nearby-poi-popup-wrap" })
        .addTo(layer);
      markersRef.current.set(p.osm_id || p.id, m);
    }

    if (pois.length > 0) {
      const b = L.latLngBounds([[centerLat, centerLng]]);
      for (const p of pois) b.extend([p.lat, p.lng]);
      try {
        map.fitBounds(b, { padding: [36, 36], maxZoom: 15 });
      } catch {
        map.setView([centerLat, centerLng], 14);
      }
    } else {
      map.setView([centerLat, centerLng], 14);
    }
  }, [pois, categoryKey, centerLat, centerLng]);

  useEffect(() => {
    if (!focusOsmId) return;
    const map = mapRef.current;
    const m = markersRef.current.get(focusOsmId);
    if (!map || !m) return;
    const ll = m.getLatLng();
    map.flyTo(ll, Math.max(map.getZoom(), 15), { duration: 0.45 });
    m.openPopup();
  }, [focusOsmId]);

  return (
    <>
      <div
        ref={wrapRef}
        className="h-[240px] w-full overflow-hidden rounded-2xl border border-[#e5e7eb] [&_.leaflet-container]:h-[240px] [&_.leaflet-container]:w-full"
        aria-label="Mapa — obiekt i POI"
      />
      <style jsx global>{`
        .nearby-map-home-icon,
        .nearby-map-poi-icon {
          background: transparent !important;
          border: none !important;
        }
        .nearby-home-wrap {
          position: relative;
          display: flex;
          align-items: flex-end;
          justify-content: center;
          width: 180px;
          height: 56px;
          pointer-events: none;
        }
        .nearby-home-ping {
          position: absolute;
          bottom: 8px;
          left: 50%;
          margin-left: -18px;
          width: 36px;
          height: 36px;
          border-radius: 9999px;
          background: rgba(10, 46, 26, 0.2);
          animation: nearby-ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;
        }
        @keyframes nearby-ping {
          0% {
            transform: scale(0.85);
            opacity: 0.55;
          }
          100% {
            transform: scale(1.85);
            opacity: 0;
          }
        }
        .nearby-home-pin {
          position: relative;
          background: #0a2e1a;
          color: #fff;
          padding: 6px 12px;
          border-radius: 9px;
          font-size: 12px;
          font-weight: 700;
          white-space: nowrap;
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.22);
        }
        .nearby-home-pin::after {
          content: "";
          position: absolute;
          bottom: -6px;
          left: 50%;
          transform: translateX(-50%);
          border-left: 6px solid transparent;
          border-right: 6px solid transparent;
          border-top: 6px solid #0a2e1a;
        }
        .nearby-poi-marker {
          width: 32px;
          height: 32px;
          border-radius: 9999px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 15px;
          border: 2px solid #fff;
          box-shadow: 0 3px 10px rgba(0, 0, 0, 0.2);
        }
        .nearby-poi-popup {
          padding: 10px;
          min-width: 140px;
        }
        .nearby-poi-sub {
          font-size: 11px;
          color: #6b7280;
          margin-top: 4px;
        }
        .nearby-poi-dist {
          font-size: 12px;
          font-weight: 700;
          color: #16a34a;
          margin-top: 6px;
        }
      `}</style>
    </>
  );
}
