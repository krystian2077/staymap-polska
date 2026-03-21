"use client";

import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { MapPin } from "@/lib/searchTypes";

const PL_CENTER: L.LatLngExpression = [51.919, 19.145];

const OSM_TILE =
  "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const OSM_ATTR =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

type Props = {
  pins: MapPin[];
  highlightId?: string | null;
};

function makePinElement(p: MapPin, highlight: boolean): HTMLElement {
  const el = document.createElement("button");
  el.type = "button";
  el.className = highlight
    ? "flex h-8 min-w-8 items-center justify-center rounded-full border-2 border-amber-300 bg-amber-600 px-2 text-xs font-bold text-white shadow-md"
    : "flex h-8 min-w-8 items-center justify-center rounded-full border-2 border-white bg-emerald-700 px-2 text-xs font-bold text-white shadow-md";
  el.textContent = `${p.price}`;
  el.title = `${p.price} zł`;
  return el;
}

export function SearchMap({ pins, highlightId }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);
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

    const layer = L.layerGroup().addTo(map);
    mapRef.current = map;
    layerRef.current = layer;
    setMapReady(true);

    const ro = new ResizeObserver(() => {
      map.invalidateSize();
    });
    ro.observe(wrapRef.current);

    return () => {
      ro.disconnect();
      layer.clearLayers();
      map.remove();
      mapRef.current = null;
      layerRef.current = null;
      setMapReady(false);
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const layer = layerRef.current;
    if (!map || !layer || !mapReady) return;

    layer.clearLayers();

    for (const p of pins) {
      const hi = Boolean(highlightId && p.id === highlightId);
      const el = makePinElement(p, hi);
      const icon = L.divIcon({
        html: el,
        className: "staymap-leaflet-divicon",
        iconSize: [48, 32],
        iconAnchor: [24, 32],
      });
      L.marker([p.lat, p.lng], { icon }).addTo(layer);
    }

    if (pins.length === 0) {
      map.setView(PL_CENTER, 6);
      return;
    }
    if (pins.length === 1) {
      map.setView([pins[0].lat, pins[0].lng], 10);
      return;
    }
    const b = L.latLngBounds(
      pins.map((p) => [p.lat, p.lng] as L.LatLngExpression)
    );
    map.fitBounds(b, { padding: [56, 56], maxZoom: 11 });
  }, [pins, highlightId, mapReady]);

  return (
    <div className="flex h-full min-h-[320px] flex-col gap-2">
      <div
        ref={wrapRef}
        className="h-full min-h-[320px] w-full flex-1 overflow-hidden rounded-xl border border-neutral-200 dark:border-neutral-700 [&_.leaflet-container]:h-full [&_.leaflet-container]:min-h-[320px]"
        aria-label="Mapa wyników (OpenStreetMap)"
      />
      <p className="text-center text-[10px] leading-tight text-neutral-500">
        Kafelki mapy: © OpenStreetMap —{" "}
        <a
          className="underline"
          href="https://www.openstreetmap.org/copyright"
          target="_blank"
          rel="noreferrer"
        >
          licencja ODbL
        </a>
      </p>
    </div>
  );
}
