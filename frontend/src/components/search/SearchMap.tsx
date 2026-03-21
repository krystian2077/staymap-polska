"use client";

import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import "leaflet.markercluster";
import type { MapPin } from "@/lib/searchTypes";

const PL_CENTER: L.LatLngExpression = [52, 19.5];

const OSM_TILE = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const OSM_ATTR =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

type Props = {
  pins: MapPin[];
  highlightId?: string | null;
  onPinHover?: (id: string | null) => void;
};

export function SearchMap({ pins, highlightId, onPinHover }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const clusterRef = useRef<L.Layer | null>(null);
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    if (!wrapRef.current) return;

    const map = L.map(wrapRef.current, {
      center: PL_CENTER,
      zoom: 6,
      scrollWheelZoom: true,
    });

    L.tileLayer(OSM_TILE, {
      attribution: OSM_ATTR,
      maxZoom: 19,
    }).addTo(map);

    // markercluster rozszerza L (brak typów)
    const cluster = (
      L as unknown as {
        markerClusterGroup: (o?: Record<string, unknown>) => L.Layer;
      }
    ).markerClusterGroup({
      maxClusterRadius: 56,
      spiderfyOnMaxZoom: true,
      showCoverageOnHover: false,
    });
    cluster.addTo(map);
    mapRef.current = map;
    clusterRef.current = cluster;
    setMapReady(true);

    const ro = new ResizeObserver(() => map.invalidateSize());
    ro.observe(wrapRef.current);

    return () => {
      ro.disconnect();
      map.removeLayer(cluster);
      map.remove();
      mapRef.current = null;
      clusterRef.current = null;
      setMapReady(false);
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const cluster = clusterRef.current;
    if (!map || !cluster || !mapReady) return;

    (cluster as L.Layer & { clearLayers: () => void }).clearLayers();

    for (const p of pins) {
      const hi = Boolean(highlightId && p.id === highlightId);
      const html = `<div class="leaflet-pin-wrap${hi ? " on" : ""}">${p.price}</div>`;
      const icon = L.divIcon({
        html,
        className: "staymap-leaflet-divicon",
        iconSize: [1, 1],
        iconAnchor: [24, 40],
      });
      const marker = L.marker([p.lat, p.lng], { icon });
      marker.on("mouseover", () => onPinHover?.(p.id));
      marker.on("mouseout", () => onPinHover?.(null));
      marker.bindPopup(
        `<div class="text-sm font-bold">${p.price} zł</div><p class="text-xs text-gray-500 mt-1">Kliknij kartę na liście po lewej.</p>`,
        { closeButton: true }
      );
      (cluster as L.Layer & { addLayer: (l: L.Layer) => void }).addLayer(marker);
    }

    if (pins.length === 0) {
      map.setView(PL_CENTER, 6);
      return;
    }
    try {
      const b = (cluster as unknown as { getBounds: () => L.LatLngBounds }).getBounds();
      if (b?.isValid()) {
        map.fitBounds(b, { padding: [56, 56], maxZoom: 11 });
      }
    } catch {
      if (pins.length === 1) {
        map.setView([pins[0].lat, pins[0].lng], 10);
      }
    }
  }, [pins, highlightId, mapReady, onPinHover]);

  return (
    <div className="relative flex h-full min-h-[320px] flex-col gap-2">
      <div
        ref={wrapRef}
        className="h-full min-h-[320px] w-full flex-1 overflow-hidden rounded-xl border border-gray-200 [&_.leaflet-container]:h-full [&_.leaflet-container]:min-h-[320px]"
        aria-label="Mapa wyników (OpenStreetMap)"
      />
      <p className="text-center text-[10px] leading-tight text-text-muted">
        Leaflet | © OpenStreetMap —{" "}
        <a className="underline" href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">
          ODbL
        </a>
      </p>
    </div>
  );
}
