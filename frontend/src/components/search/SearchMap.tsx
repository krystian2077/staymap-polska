"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import "leaflet.markercluster";
import type { MapBounds } from "@/lib/store/searchStore";
import type { MapPin, SearchListing } from "@/lib/searchTypes";
import { cn } from "@/lib/utils";
import {
  buildPolandMaskGeoJSON,
  loadPolandGeoData,
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

const VIEWPORT_ANIM = {
  default: { duration: 0.85, easeLinearity: 0.14 },
  locationOn: { duration: 1.25, easeLinearity: 0.16 },
  locationOff: { duration: 1.05, easeLinearity: 0.14 },
  cardFocus: { duration: 0.95, easeLinearity: 0.2 },
} as const;

type ViewportIntent = "location-on" | "location-off" | null;

export type SearchMapProps = {
  pins: MapPin[];
  results: SearchListing[];
  highlightId?: string | null;
  selectedId?: string | null;
  onPinHover?: (id: string | null) => void;
  onPinSelect?: (id: string | null) => void;
  onLocationFound?: (lat: number, lng: number) => void;
  onClearLocation?: () => void;
  isLocationActive?: boolean;
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
  onLocationFound,
  onClearLocation,
  isLocationActive = false,
  center,
  onBoundsChange,
}: SearchMapProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const clusterRef = useRef<ClusterLayer | null>(null);
  const markersRef = useRef<Map<string, L.Marker>>(new Map());
  const [mapReady, setMapReady] = useState(false);
  const [popupPin, setPopupPin] = useState<MapPin | null>(null);
  const [popupPos, setPopupPos] = useState<{ x: number; y: number } | null>(null);
  const [isGeoPending, setIsGeoPending] = useState(false);
  const [isMapMoving, setIsMapMoving] = useState(false);
  const [isZooming, setIsZooming] = useState(false);
  const boundsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const viewportIntentRef = useRef<ViewportIntent>(null);

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

  const formatPinPrice = useCallback((rawPrice: string) => {
    const trimmed = rawPrice.trim();
    const numeric = Number.parseFloat(trimmed.replace(/[^\d,.-]/g, "").replace(",", "."));
    if (Number.isFinite(numeric)) {
      return `${Math.round(numeric).toLocaleString("pl-PL")} zł`;
    }
    return trimmed
      .replace(/\s*zł\b/i, " zł")
      .replace(/\s*pln\b/i, " PLN");
  }, []);

  const stopAndRunViewport = useCallback((run: (map: L.Map) => void) => {
    const map = mapRef.current;
    if (!map) return;
    map.stop();
    run(map);
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

    const overlayLayers: L.Layer[] = [];

    const renderPolandOverlays = async () => {
      const geoData = await loadPolandGeoData();
      if (mapRef.current !== map) return;

      const countryGeometry = geoData.country?.features.find((f) => f.geometry)?.geometry ?? null;
      const maskGeo = buildPolandMaskGeoJSON(countryGeometry);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const maskLayer = L.geoJSON(maskGeo as any, {
        style: {
          fillColor: "#ffffff",
          fillOpacity: 0.85,
          stroke: false,
          weight: 0,
        },
      }).addTo(map);
      overlayLayers.push(maskLayer);

      if (geoData.country) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const countryLayer = L.geoJSON(geoData.country as any, {
          style: {
            color: "#15803d",
            weight: 2.2,
            opacity: 0.75,
            fillOpacity: 0,
          },
        }).addTo(map);
        overlayLayers.push(countryLayer);
      } else {
        // Fallback na obecny uproszczony obrys
        const borderCoords: [number, number][] = POLAND_BORDER_COORDS.map(([lng, lat]) => [lat, lng]);
        const borderLine = L.polyline(borderCoords, {
          color: "#15803d",
          weight: 2.5,
          opacity: 0.6,
          smoothFactor: 1,
        }).addTo(map);
        overlayLayers.push(borderLine);
      }

      if (geoData.voivodeships) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const voivodeshipsLayer = L.geoJSON(geoData.voivodeships as any, {
          style: {
            color: "#166534",
            weight: 1,
            opacity: 0.45,
            fillColor: "#dcfce7",
            fillOpacity: 0.04,
          },
          onEachFeature: (feature, layer) => {
            const name =
              (feature.properties?.name as string | undefined) ||
              (feature.properties?.wojewodztwo as string | undefined) ||
              (feature.properties?.NAME_1 as string | undefined);
            if (!name) return;
            layer.bindTooltip(name, {
              sticky: true,
              direction: "center",
              className: "map-voiv-label",
            });
          },
        }).addTo(map);
        overlayLayers.push(voivodeshipsLayer);
      }

      if (geoData.cities) {
        const cityLayers: L.Layer[] = [];
        for (const feature of geoData.cities.features) {
          if (!feature.geometry) {
            continue;
          }
          const props = feature.properties ?? {};
          const label =
            (props.name as string | undefined) ||
            (props.city as string | undefined) ||
            (props.NAME as string | undefined);
          const latFromProps = Number(props.lat ?? props.latitude);
          const lngFromProps = Number(props.lng ?? props.longitude);
          const lat = feature.geometry.type === "Point" ? feature.geometry.coordinates[1] : latFromProps;
          const lng = feature.geometry.type === "Point" ? feature.geometry.coordinates[0] : lngFromProps;
          if (!label || !Number.isFinite(lat) || !Number.isFinite(lng)) continue;
          const marker = L.circleMarker([lat, lng], {
            radius: 2.8,
            color: "#15803d",
            weight: 1,
            fillColor: "#16a34a",
            fillOpacity: 0.9,
          }).addTo(map);
          marker.bindTooltip(label, { direction: "top", className: "map-city-label" });
          cityLayers.push(marker);
        }
        cityLayers.forEach((l) => overlayLayers.push(l));
      }
    };

    void renderPolandOverlays();

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
    const onMoveEndForBounds = () => {
      if (boundsTimerRef.current) clearTimeout(boundsTimerRef.current);
      boundsTimerRef.current = setTimeout(emitBounds, 400);
    };
    map.on("moveend", onMoveEndForBounds);

    const onMoveStart = () => setIsMapMoving(true);
    const onZoomStart = () => {
      setIsMapMoving(true);
      setIsZooming(true);
    };
    const onMoveOrZoomEnd = () => setIsMapMoving(false);
    const onZoomEnd = () => {
      setIsZooming(false);
      setIsMapMoving(false);
    };
    map.on("movestart", onMoveStart);
    map.on("zoomstart", onZoomStart);
    map.on("moveend", onMoveOrZoomEnd);
    map.on("zoomend", onZoomEnd);

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
      map.off("moveend", onMoveEndForBounds);
      map.off("movestart", onMoveStart);
      map.off("zoomstart", onZoomStart);
      map.off("moveend", onMoveOrZoomEnd);
      map.off("zoomend", onZoomEnd);
      overlayLayers.forEach((layer) => {
        try {
          map.removeLayer(layer);
        } catch {
          // no-op
        }
      });
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

    for (const [i, p] of pins.entries()) {
      if (!Number.isFinite(p.lat) || !Number.isFinite(p.lng)) continue;
      const priceNum = parseFloat(p.price);
      const priceLabel = !Number.isNaN(priceNum) ? `${Math.round(priceNum).toLocaleString("pl-PL")} zł` : formatPinPrice(p.price);
      const enterDelayMs = Math.min(i * 16, 220);

      const icon = L.divIcon({
        html: `<div class="smap-pin" data-id="${p.id}" style="--pin-enter-delay:${enterDelayMs}ms"><span class="smap-pin__tag">od&nbsp;</span><span class="smap-pin__price">${priceLabel}</span></div>`,
        className: "smap-pin-host",
        iconSize: [1, 1],
        iconAnchor: [24, 36],
      });
      const marker = L.marker([p.lat, p.lng], { icon, riseOnHover: true });

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

    const intent = viewportIntentRef.current;

    if (pins.length === 0) {
      if (hasCenter) {
        stopAndRunViewport((m) => {
          m.flyTo([lat!, lng!], 9.2, {
            animate: true,
            duration: VIEWPORT_ANIM.default.duration,
            easeLinearity: VIEWPORT_ANIM.default.easeLinearity,
          });
        });
      } else {
        stopAndRunViewport((m) => {
          m.flyToBounds(PL_BOUNDS, {
            padding: [24, 24],
            animate: true,
            duration: VIEWPORT_ANIM.locationOff.duration,
            easeLinearity: VIEWPORT_ANIM.locationOff.easeLinearity,
          });
        });
      }
      if (intent === "location-off") viewportIntentRef.current = null;
      return;
    }

    if (hasCenter) {
      try {
        const b = cluster.getBounds();
        if (b?.isValid?.()) {
          const anim = intent === "location-on" ? VIEWPORT_ANIM.locationOn : VIEWPORT_ANIM.default;
          stopAndRunViewport((m) => {
            m.flyToBounds(b, {
              padding: [64, 64],
              maxZoom: 11,
              animate: true,
              duration: anim.duration,
              easeLinearity: anim.easeLinearity,
            });
          });
          if (intent === "location-on") viewportIntentRef.current = null;
          return;
        }
      } catch {
        // fallback
      }
      stopAndRunViewport((m) => {
        m.flyTo([lat!, lng!], 9.4, {
          animate: true,
          duration: VIEWPORT_ANIM.default.duration,
          easeLinearity: VIEWPORT_ANIM.default.easeLinearity,
        });
      });
      if (intent === "location-on") viewportIntentRef.current = null;
      return;
    }

    stopAndRunViewport((m) => {
      m.flyToBounds(PL_BOUNDS, {
        padding: [24, 24],
        animate: true,
        duration: VIEWPORT_ANIM.locationOff.duration,
        easeLinearity: VIEWPORT_ANIM.locationOff.easeLinearity,
      });
    });
    if (intent === "location-off") viewportIntentRef.current = null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pins, mapReady, center?.lat, center?.lng, getPinWithCover, stopAndRunViewport]);

  // ── hover + selected highlight ─────────────────────────────────────────────
  useEffect(() => {
    markersRef.current.forEach((marker, id) => {
      const el = marker.getElement();
      if (!el) return;
      const pin = el.querySelector(".smap-pin");
      if (!pin) return;
      const isSelected = selectedId === id;
      const isHovered = highlightId === id;
      pin.classList.toggle("is-hovered", isHovered && !isSelected && !isZooming);
      pin.classList.toggle("is-selected", isSelected);
    });
  }, [highlightId, selectedId, isZooming]);

   // ── fly-to gdy wybrana karta po lewej ─────────────────────────────────────
   useEffect(() => {
     if (!selectedId || !mapRef.current) return;
     const marker = markersRef.current.get(selectedId);
     if (!marker) return;
     const latlng = marker.getLatLng();
     const currentZoom = mapRef.current.getZoom();
     mapRef.current.stop();
     mapRef.current.flyTo(latlng, Math.max(currentZoom, 10), {
       animate: true,
       duration: VIEWPORT_ANIM.cardFocus.duration,
       easeLinearity: VIEWPORT_ANIM.cardFocus.easeLinearity,
     });
   }, [selectedId]);

    // ── lokalizacja użytkownika ────────────────────────────────────────────────
    const handleGeolocate = useCallback(() => {
      const map = mapRef.current;
      if (!map || isGeoPending) return;

      // Odczytujemy AKTUALNY stan z props (nie ze starego closu)
      // Jeśli jest aktywna, wyłączamy; jeśli nie, włączamy
      if (isLocationActive) {
        viewportIntentRef.current = "location-off";
        onClearLocation?.();
        map.stop();
        map.flyToBounds(PL_BOUNDS, {
          padding: [24, 24],
          animate: true,
          duration: VIEWPORT_ANIM.locationOff.duration,
          easeLinearity: VIEWPORT_ANIM.locationOff.easeLinearity,
        });
        return;
      }

      setIsGeoPending(true);
      navigator.geolocation?.getCurrentPosition(
        (pos) => {
          viewportIntentRef.current = "location-on";
          onLocationFound?.(pos.coords.latitude, pos.coords.longitude);
          map.stop();
          map.flyTo([pos.coords.latitude, pos.coords.longitude], 11, {
            animate: true,
            duration: VIEWPORT_ANIM.locationOn.duration,
            easeLinearity: VIEWPORT_ANIM.locationOn.easeLinearity,
          });
          setIsGeoPending(false);
        },
        () => {
          setIsGeoPending(false);
        },
        { timeout: 8000 },
      );
    }, [isGeoPending, isLocationActive, onClearLocation, onLocationFound]);

   // ── reset do widoku Polski ─────────────────────────────────────────────────
   const handleResetPoland = useCallback(() => {
     const map = mapRef.current;
     if (!map) return;
     viewportIntentRef.current = null;
     map.stop();
     map.flyToBounds(PL_BOUNDS, {
       padding: [24, 24],
       animate: true,
       duration: VIEWPORT_ANIM.locationOff.duration,
       easeLinearity: VIEWPORT_ANIM.locationOff.easeLinearity,
     });
   }, []);

  // Update popup position on map move
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !popupPin) return;
    const markers = markersRef.current;
    let rafId = 0;
    const updatePos = () => {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
      const marker = markers.get(popupPin.id);
      if (!marker) return;
      const point = map.latLngToContainerPoint(marker.getLatLng());
      setPopupPos({
        x: point.x,
        y: point.y,
      });
      });
    };
    updatePos();
    map.on("move", updatePos);
    map.on("zoom", updatePos);
    return () => {
      if (rafId) cancelAnimationFrame(rafId);
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
    <div className={cn(
      "relative flex h-full w-full flex-col overflow-hidden rounded-[24px] border border-white/70 bg-gradient-to-br from-white via-white to-emerald-50/40",
      "shadow-[0_30px_80px_rgba(15,23,42,.14)] ring-1 ring-black/5",
      isMapMoving && "is-map-moving",
      isZooming && "is-map-zooming",
    )}>
      <div className="pointer-events-none absolute inset-0 z-[1] overflow-hidden">
        <div className="absolute -left-16 -top-16 h-40 w-40 rounded-full bg-brand/10 blur-3xl" />
        <div className="absolute right-[-5rem] top-16 h-44 w-44 rounded-full bg-emerald-400/10 blur-3xl" />
        <div className="absolute bottom-[-4rem] left-1/3 h-32 w-32 rounded-full bg-sky-400/10 blur-3xl" />
      </div>

      {/* Mapa */}
      <div
        ref={wrapRef}
        className={cn(
          "relative z-[2] h-full w-full flex-1 bg-gradient-to-br from-white via-white to-emerald-50/30",
          "[&_.leaflet-container]:h-full [&_.leaflet-container]:w-full [&_.leaflet-container]:bg-transparent",
          "[&_.leaflet-control-container]:z-[850]",
        )}
        aria-label="Mapa ofert (OpenStreetMap, CARTO)"
      />

       {/* Kontrolki mapy */}
       <div className="pointer-events-none absolute left-3 top-3 z-[900] flex flex-col gap-1.5 rounded-2xl border border-white/60 bg-white/70 p-1.5 shadow-[0_12px_30px_rgba(15,23,42,.14)] backdrop-blur-md">
         <button
           type="button"
           className="pointer-events-auto flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200/80 bg-white/90 shadow-[0_6px_18px_rgba(15,23,42,.10)] backdrop-blur-sm transition-all duration-300 hover:-translate-y-px hover:scale-105 hover:border-brand/30 hover:shadow-[0_12px_24px_rgba(22,163,74,.16)] active:scale-95"
           onClick={handleResetPoland}
           title="Pokaż całą Polskę"
         >
           <svg className="h-[18px] w-[18px] text-brand-dark transition-transform duration-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
             <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" strokeLinecap="round" strokeLinejoin="round"/>
           </svg>
         </button>
         <button
           type="button"
           aria-pressed={isLocationActive}
           disabled={isGeoPending}
           className={cn(
             "pointer-events-auto flex h-10 w-10 items-center justify-center rounded-xl border backdrop-blur-sm transition-all duration-300 hover:-translate-y-px hover:scale-105 active:scale-95 disabled:cursor-wait disabled:opacity-70 disabled:hover:scale-100",
             isLocationActive
               ? "border-brand/20 bg-brand text-white shadow-[0_10px_26px_rgba(22,163,74,.28)] ring-2 ring-brand/15 ring-offset-0"
               : "border-slate-200/80 bg-white/90 text-brand-dark shadow-[0_6px_18px_rgba(15,23,42,.10)] hover:border-brand/30 hover:shadow-[0_12px_24px_rgba(22,163,74,.16)]",
           )}
           onClick={handleGeolocate}
           title={isLocationActive ? "Wyłącz moją lokalizację" : "Moja lokalizacja"}
         >
            <svg className={cn("h-[18px] w-[18px] transition-all duration-300", isGeoPending ? "text-brand animate-pulse" : isLocationActive ? "text-white animate-pulse" : "text-brand-dark")} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
             <circle cx="12" cy="12" r="3" strokeLinecap="round" strokeLinejoin="round"/>
             <path d="M12 1v4M12 19v4M1 12h4M19 12h4" strokeLinecap="round"/>
           </svg>
         </button>
       </div>

       {/* Popup karty */}
       {popupPin && popupPos && (
         <div
           className="pointer-events-none absolute z-[1000] animate-in fade-in zoom-in-95 duration-300"
           style={{
             left: Math.min(
                Math.max(8, popupPos.x - 137),
                (wrapRef.current?.offsetWidth ?? 400) - 284,
             ),
              top: Math.max(8, popupPos.y - 322),
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
      <div className="pointer-events-none absolute bottom-3 right-10 z-[900] rounded-full border border-white/60 bg-white/70 px-2 py-0.5 text-[9px] text-gray-600 shadow-[0_6px_18px_rgba(15,23,42,.10)] backdrop-blur-md">
        <span className="pointer-events-auto">
          © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer" className="underline">OSM</a>
          {" "}© <a href="https://opentopomap.org" target="_blank" rel="noreferrer" className="underline">OpenTopoMap</a>
        </span>
      </div>
    </div>
  );
}
