"use client";

import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import "leaflet.markercluster";
import type { MapPin } from "@/lib/searchTypes";

const PL_CENTER: L.LatLngExpression = [52.0, 19.4];
/** Bbox lądu Polski – górna granica ~54.35°N minimalizuje widoczność Bałtyku */
const PL_BOUNDS = L.latLngBounds(L.latLng(49.0, 14.15), L.latLng(54.35, 24.25));

const OSM_TILE = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const OSM_ATTR =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

type Props = {
  pins: MapPin[];
  highlightId?: string | null;
  onPinHover?: (id: string | null) => void;
  center?: { lat: number; lng: number } | null;
};

type ClusterLayer = L.Layer & {
  clearLayers: () => void;
  addLayer: (l: L.Layer) => void;
  getBounds: () => L.LatLngBounds;
};

export function SearchMap({ pins, highlightId, onPinHover, center }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const clusterRef = useRef<ClusterLayer | null>(null);
  const markersRef = useRef<Map<string, L.Marker>>(new Map());
  const [mapReady, setMapReady] = useState(false);

  // ── inicjalizacja mapy ─────────────────────────────────────────────────────
  useEffect(() => {
    const el = wrapRef.current;
    if (!el || mapRef.current) return; // guard Strict Mode

    // Inicjujemy mapę bez ustawiania view — zrobimy to dopiero gdy
    // kontener ma rzeczywiste wymiary (getBoundingClientRect() > 0)
    const map = L.map(el, {
      scrollWheelZoom: true,
      zoomSnap: 0.5,
      minZoom: 4,
    });

    L.tileLayer(OSM_TILE, { attribution: OSM_ATTR, maxZoom: 19 }).addTo(map);

    const cluster = (
      L as unknown as {
        markerClusterGroup: (o?: Record<string, unknown>) => L.Layer;
      }
    ).markerClusterGroup({
      maxClusterRadius: 56,
      spiderfyOnMaxZoom: true,
      showCoverageOnHover: false,
    }) as ClusterLayer;
    cluster.addTo(map);

    mapRef.current = map;
    clusterRef.current = cluster;

    // ResizeObserver: gdy kontener dostaje wymiary po raz pierwszy → setView
    let initialized = false;
    const ro = new ResizeObserver(() => {
      if (mapRef.current !== map) return;
      const { width, height } = el.getBoundingClientRect();
      if (width < 8 || height < 8) return;

      map.invalidateSize({ animate: false });

      if (!initialized) {
        initialized = true;
        // Oblicz zoom dopasowany do szerokości kontenera
        // Polska ~630km szerokości, 512km wysokości
        const { width } = el.getBoundingClientRect();
        // Przy zoom z, jeden kafelek 256px = 40075km/2^z w ekwatorze
        // Na szer. 52°N: effective_km = 40075/2^z * cos(52°) ≈ 40075/2^z * 0.616
        // Chcemy żeby ~700km (szer. Polski + margin) mieściło się w width px
        // width/256 * 40075*0.616/2^z ≈ 700 → z ≈ log2(width/256 * 40075*0.616/700)
        const targetKm = 720; // km do pokazania w poziomie
        const kmPerPx = 40075 * Math.cos((52 * Math.PI) / 180);
        const calcZoom = Math.log2((width * kmPerPx) / (targetKm * 256));
        const clampedZoom = Math.max(5, Math.min(8, Math.round(calcZoom * 2) / 2));
        map.setView([52.1, 19.4], clampedZoom, { animate: false });
        setMapReady(true);
      }
    });
    ro.observe(el);

    return () => {
      setMapReady(false);
      ro.disconnect();
      markersRef.current.clear();
      mapRef.current = null;
      clusterRef.current = null;
      map.remove();
    };
  }, []);

  // ── piny + viewport ────────────────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    const cluster = clusterRef.current;
    if (!map || !cluster || !mapReady) return;

    cluster.clearLayers();
    markersRef.current.clear();

    for (const p of pins) {
      if (!Number.isFinite(p.lat) || !Number.isFinite(p.lng)) continue;
      const icon = L.divIcon({
        html: `<div class="leaflet-pin-wrap">${p.price}</div>`,
        className: "staymap-leaflet-divicon",
        iconSize: [1, 1],
        iconAnchor: [24, 40],
      });
      const marker = L.marker([p.lat, p.lng], { icon });
      marker.on("mouseover", () => onPinHover?.(p.id));
      marker.on("mouseout", () => onPinHover?.(null));
      marker.bindPopup(
        `<div class="text-sm font-bold">${p.price} zł</div>` +
          `<p class="text-xs text-gray-500 mt-1">Kliknij kartę po lewej.</p>`,
        { closeButton: true },
      );
      cluster.addLayer(marker);
      markersRef.current.set(p.id, marker);
    }

    const lat = center?.lat;
    const lng = center?.lng;
    const hasCenter = lat != null && lng != null;

    map.invalidateSize({ animate: false });

    if (pins.length === 0) {
      if (hasCenter) {
        map.setView([lat!, lng!], 9, { animate: false });
      } else {
        map.fitBounds(PL_BOUNDS, { padding: [20, 20], animate: false });
      }
      return;
    }

    if (hasCenter) {
      try {
        const b = cluster.getBounds();
        if (b?.isValid?.()) {
          map.fitBounds(b, { padding: [56, 56], maxZoom: 11, animate: false });
          return;
        }
      } catch { /* fallback */ }
      map.setView([lat!, lng!], 9, { animate: false });
      return;
    }

    // Ogólnopolski widok: dopasuj Polskę do rozmiarów kontenera
    map.fitBounds(PL_BOUNDS, { padding: [20, 20], animate: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pins, mapReady, center?.lat, center?.lng]);

  // ── wyróżnienie pinu (hover) ───────────────────────────────────────────────
  useEffect(() => {
    markersRef.current.forEach((marker, id) => {
      const el = marker.getElement();
      if (!el) return;
      const wrap = el.querySelector(".leaflet-pin-wrap");
      if (!wrap) return;
      wrap.classList.toggle("on", highlightId === id);
    });
  }, [highlightId]);

  return (
    <div className="relative flex h-full min-h-[320px] flex-col gap-2">
      <div
        ref={wrapRef}
        className="h-full min-h-[320px] w-full flex-1 overflow-hidden rounded-xl border border-gray-200 [&_.leaflet-container]:h-full [&_.leaflet-container]:min-h-[320px]"
        aria-label="Mapa wyników (OpenStreetMap)"
      />
      <p className="text-center text-[10px] leading-tight text-text-muted">
        Leaflet | &copy; OpenStreetMap &mdash;{" "}
        <a
          className="underline"
          href="https://www.openstreetmap.org/copyright"
          target="_blank"
          rel="noreferrer"
        >
          ODbL
        </a>
      </p>
    </div>
  );
}
