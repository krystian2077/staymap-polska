"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import "leaflet.markercluster";
import type { MapBounds } from "@/lib/store/searchStore";
import type { MapPin, SearchListing } from "@/lib/searchTypes";
import {
  buildPolandMaskGeoJSON,
  PL_BBOX,
  POLAND_BORDER_COORDS,
} from "@/lib/maps/poland";
import { SearchMapPopupCard } from "./SearchMapPopupCard";

// OpenTopoMap — kolorowa mapa topograficzna z cieniowaniem terenu, żywymi lasami i jeziorami
const BASE_TILE = "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png";
const BASE_ATTR =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://opentopomap.org">OpenTopoMap</a> (CC-BY-SA)';

const PL_BOUNDS = L.latLngBounds(
  L.latLng(PL_BBOX.south, PL_BBOX.west),
  L.latLng(PL_BBOX.north, PL_BBOX.east),
);

type Props = {
  pins: MapPin[];
  results: SearchListing[];
  highlightId?: string | null;
  selectedId?: string | null;
  onPinHover?: (id: string | null) => void;
  onPinSelect?: (id: string | null) => void;
  center?: { lat: number; lng: number } | null;
  onBoundsChange?: (bounds: MapBounds) => void;
};

type ClusterLayer = L.Layer & {
  clearLayers: () => void;
  addLayer: (l: L.Layer) => void;
  getBounds: () => L.LatLngBounds;
};

export function SearchMap({
  pins,
  results,
  highlightId,
  selectedId,
  onPinHover,
  onPinSelect,
  center,
  onBoundsChange,
}: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const clusterRef = useRef<ClusterLayer | null>(null);
  const markersRef = useRef<Map<string, L.Marker>>(new Map());
  const [mapReady, setMapReady] = useState(false);
  const [popupPin, setPopupPin] = useState<MapPin | null>(null);
  const [popupPos, setPopupPos] = useState<{ x: number; y: number } | null>(null);
  const boundsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Lookup listing data by id for rich popup
  const resultsById = useRef<Map<string, SearchListing>>(new Map());
  useEffect(() => {
    const m = new Map<string, SearchListing>();
    for (const r of results) m.set(r.id, r);
    resultsById.current = m;
  }, [results]);

  // Merge cover_image from results into pins for popup
  const getPinWithCover = useCallback((pin: MapPin): MapPin => {
    const listing = resultsById.current.get(pin.id);
    if (listing?.cover_image) return { ...pin, cover_image: listing.cover_image };
    return pin;
  }, []);

  // ── inicjalizacja mapy ─────────────────────────────────────────────────────
  useEffect(() => {
    const el = wrapRef.current;
    if (!el || mapRef.current) return;

    // Initial center+zoom MUST be provided; without them Leaflet keeps internal
    // pixel-bounds undefined, causing fitBounds/setView to crash with "min" errors.
    const map = L.map(el, {
      center: [52.1, 19.4],
      zoom: 6,
      scrollWheelZoom: true,
      zoomSnap: 0.5,
      zoomDelta: 0.5,
      minZoom: 5,
      maxZoom: 17,
    });

    // Kolorowa basemap
    L.tileLayer(BASE_TILE, {
      attribution: BASE_ATTR,
      maxZoom: 18,
    }).addTo(map);

    // Maska — delikatne wygaszenie obszaru POZA Polską (kolory wewnątrz pełne)
    const maskGeo = buildPolandMaskGeoJSON();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    L.geoJSON(maskGeo as any, {
      style: {
        fillColor: "#d8dee6",
        fillOpacity: 0.52,
        stroke: false,
        weight: 0,
      },
    }).addTo(map);

    // Obrys granicy Polski
    const borderCoords: [number, number][] = POLAND_BORDER_COORDS.map(([lng, lat]) => [lat, lng]);
    L.polyline(borderCoords, {
      color: "#15803d",
      weight: 2.5,
      opacity: 0.6,
      smoothFactor: 1,
    }).addTo(map);

    // Klaster markerów
    const cluster = (
      L as unknown as {
        markerClusterGroup: (o?: Record<string, unknown>) => L.Layer;
      }
    ).markerClusterGroup({
      maxClusterRadius: 48,
      spiderfyOnMaxZoom: true,
      showCoverageOnHover: false,
      animate: true,
      animateAddingMarkers: false,
      disableClusteringAtZoom: 12,
    }) as ClusterLayer;
    cluster.addTo(map);

    mapRef.current = map;
    clusterRef.current = cluster;

    // Debounced bounds change callback
    const emitBounds = () => {
      const b = map.getBounds();
      if (onBoundsChange) {
        onBoundsChange({
          south: b.getSouth(),
          west: b.getWest(),
          north: b.getNorth(),
          east: b.getEast(),
        });
      }
    };
    map.on("moveend", () => {
      if (boundsTimerRef.current) clearTimeout(boundsTimerRef.current);
      boundsTimerRef.current = setTimeout(emitBounds, 400);
    });

    // Kliknięcie w mapę zamyka popup
    map.on("click", () => {
      setPopupPin(null);
      setPopupPos(null);
      onPinSelect?.(null);
    });

    // ResizeObserver: fit to Poland once the container has real pixel dimensions
    let initialized = false;
    const ro = new ResizeObserver(() => {
      if (mapRef.current !== map) return;
      const { width, height } = el.getBoundingClientRect();
      if (width < 8 || height < 8) return;

      map.invalidateSize({ animate: false });

      if (!initialized) {
        initialized = true;
        // Now pixel size is valid — safe to call fitBounds and add maxBounds
        requestAnimationFrame(() => {
          if (mapRef.current !== map) return;
          map.invalidateSize({ animate: false });
          map.fitBounds(PL_BOUNDS, { animate: false, padding: [20, 20] });
          map.setMaxBounds(
            L.latLngBounds(
              L.latLng(PL_BBOX.south - 2.5, PL_BBOX.west - 2.5),
              L.latLng(PL_BBOX.north + 2.5, PL_BBOX.east + 2.5),
            ),
          );
          map.options.maxBoundsViscosity = 0.85;
          setMapReady(true);
        });
      }
    });
    ro.observe(el);

    return () => {
      setMapReady(false);
      ro.disconnect();
      if (boundsTimerRef.current) clearTimeout(boundsTimerRef.current);
      // eslint-disable-next-line react-hooks/exhaustive-deps
      markersRef.current.clear();
      mapRef.current = null;
      clusterRef.current = null;
      map.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── piny + viewport ────────────────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    const cluster = clusterRef.current;
    if (!map || !cluster || !mapReady) return;

    cluster.clearLayers();
    markersRef.current.clear();
    setPopupPin(null);
    setPopupPos(null);

    for (const p of pins) {
      if (!Number.isFinite(p.lat) || !Number.isFinite(p.lng)) continue;
      const priceNum = parseFloat(p.price);
      const priceLabel = !Number.isNaN(priceNum) ? `${Math.round(priceNum)} zł` : p.price;

      const icon = L.divIcon({
        html: `<div class="smap-pin" data-id="${p.id}">${priceLabel}</div>`,
        className: "smap-pin-host",
        iconSize: [1, 1],
        iconAnchor: [24, 36],
      });
      const marker = L.marker([p.lat, p.lng], { icon });

      marker.on("mouseover", () => onPinHover?.(p.id));
      marker.on("mouseout", () => onPinHover?.(null));
      marker.on("click", (e) => {
        L.DomEvent.stopPropagation(e);
        const el2 = marker.getElement();
        if (el2) {
          const rect = el2.getBoundingClientRect();
          const mapRect = wrapRef.current?.getBoundingClientRect();
          if (mapRect) {
            setPopupPos({
              x: rect.left - mapRect.left + rect.width / 2,
              y: rect.top - mapRect.top,
            });
          }
        }
        setPopupPin(getPinWithCover(p));
        onPinSelect?.(p.id);
      });

      cluster.addLayer(marker);
      markersRef.current.set(p.id, marker);
    }

    const lat = center?.lat;
    const lng = center?.lng;
    const hasCenter = lat != null && lng != null;
    map.invalidateSize({ animate: false });

    if (pins.length === 0) {
      if (hasCenter) {
        map.setView([lat!, lng!], 9, { animate: true });
      } else {
        map.fitBounds(PL_BOUNDS, { padding: [24, 24], animate: true });
      }
      return;
    }

    if (hasCenter) {
      try {
        const b = cluster.getBounds();
        if (b?.isValid?.()) {
          map.fitBounds(b, { padding: [64, 64], maxZoom: 11, animate: true });
          return;
        }
      } catch { /* fallback */ }
      map.setView([lat!, lng!], 9, { animate: true });
      return;
    }

    map.fitBounds(PL_BOUNDS, { padding: [24, 24], animate: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pins, mapReady, center?.lat, center?.lng, getPinWithCover]);

  // ── hover + selected highlight ─────────────────────────────────────────────
  useEffect(() => {
    markersRef.current.forEach((marker, id) => {
      const el = marker.getElement();
      if (!el) return;
      const pin = el.querySelector(".smap-pin");
      if (!pin) return;
      const isSelected = selectedId === id;
      const isHovered = highlightId === id;
      pin.classList.toggle("is-hovered", isHovered && !isSelected);
      pin.classList.toggle("is-selected", isSelected);
    });
  }, [highlightId, selectedId]);

  // ── fly-to gdy wybrana karta po lewej ─────────────────────────────────────
  useEffect(() => {
    if (!selectedId || !mapRef.current) return;
    const marker = markersRef.current.get(selectedId);
    if (!marker) return;
    const latlng = marker.getLatLng();
    const currentZoom = mapRef.current.getZoom();
    mapRef.current.flyTo(latlng, Math.max(currentZoom, 10), {
      animate: true,
      duration: 0.6,
    });
  }, [selectedId]);

  // ── lokalizacja użytkownika ────────────────────────────────────────────────
  const handleGeolocate = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;
    navigator.geolocation?.getCurrentPosition(
      (pos) => {
        map.flyTo([pos.coords.latitude, pos.coords.longitude], 11, {
          animate: true,
          duration: 1.2,
        });
      },
      () => {/* silently ignore */},
      { timeout: 8000 },
    );
  }, []);

  // ── reset do widoku Polski ─────────────────────────────────────────────────
  const handleResetPoland = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;
    map.flyToBounds(PL_BOUNDS, { padding: [24, 24], animate: true, duration: 0.8 });
  }, []);

  // Update popup position on map move
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !popupPin) return;
    const markers = markersRef.current;
    const wrap = wrapRef.current;
    const updatePos = () => {
      const marker = markers.get(popupPin.id);
      if (!marker || !wrap) return;
      const el = marker.getElement();
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const mapRect = wrap.getBoundingClientRect();
      setPopupPos({
        x: rect.left - mapRect.left + rect.width / 2,
        y: rect.top - mapRect.top,
      });
    };
    map.on("move", updatePos);
    map.on("zoom", updatePos);
    return () => {
      map.off("move", updatePos);
      map.off("zoom", updatePos);
    };
  }, [popupPin]);

  const closePopup = useCallback(() => {
    setPopupPin(null);
    setPopupPos(null);
    onPinSelect?.(null);
  }, [onPinSelect]);

  const popupListing = popupPin ? (resultsById.current.get(popupPin.id) ?? null) : null;

  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden rounded-[18px]">
      {/* Mapa */}
      <div
        ref={wrapRef}
        className="h-full w-full flex-1 [&_.leaflet-container]:h-full [&_.leaflet-container]:w-full"
        aria-label="Mapa ofert (OpenStreetMap, CARTO)"
      />

      {/* Kontrolki mapy */}
      <div className="pointer-events-none absolute left-3 top-3 z-[900] flex flex-col gap-1.5">
        <button
          type="button"
          className="pointer-events-auto flex h-9 w-9 items-center justify-center rounded-xl bg-white/95 shadow-elevated backdrop-blur-sm transition-all hover:-translate-y-px hover:shadow-hover active:scale-95"
          onClick={handleResetPoland}
          title="Pokaż całą Polskę"
        >
          <svg className="h-4 w-4 text-brand-dark" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <button
          type="button"
          className="pointer-events-auto flex h-9 w-9 items-center justify-center rounded-xl bg-white/95 shadow-elevated backdrop-blur-sm transition-all hover:-translate-y-px hover:shadow-hover active:scale-95"
          onClick={handleGeolocate}
          title="Moja lokalizacja"
        >
          <svg className="h-4 w-4 text-brand-dark" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <circle cx="12" cy="12" r="3" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M12 1v4M12 19v4M1 12h4M19 12h4" strokeLinecap="round"/>
          </svg>
        </button>
      </div>

      {/* Popup karty */}
      {popupPin && popupPos && (
        <div
          className="pointer-events-none absolute z-[1000]"
          style={{
            left: Math.min(
              Math.max(8, popupPos.x - 120),
              (wrapRef.current?.offsetWidth ?? 400) - 256,
            ),
            top: Math.max(8, popupPos.y - 310),
          }}
        >
          <div className="pointer-events-auto">
            <SearchMapPopupCard
              pin={popupPin}
              listing={popupListing}
              onClose={closePopup}
            />
          </div>
        </div>
      )}

      {/* Atrybucja */}
      <div className="pointer-events-none absolute bottom-2 right-10 z-[900] text-[9px] text-gray-500">
        <span className="pointer-events-auto">
          © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer" className="underline">OSM</a>
          {" "}© <a href="https://opentopomap.org" target="_blank" rel="noreferrer" className="underline">OpenTopoMap</a>
        </span>
      </div>
    </div>
  );
}
