"use client";

import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect, useRef } from "react";

import { cn } from "@/lib/utils";
import type { ListingLocation } from "@/types/listing";

const CHIPS: { key: keyof Pick<ListingLocation, "near_mountains" | "near_forest" | "near_lake" | "near_sea">; label: string }[] = [
  { key: "near_mountains", label: "⛰️ Góry" },
  { key: "near_forest", label: "🌲 Las" },
  { key: "near_lake", label: "🏊 Jezioro" },
  { key: "near_sea", label: "🌊 Morze" },
];

type Props = {
  location: Partial<ListingLocation>;
  onChange: (patch: Partial<ListingLocation>) => void;
};

export function Step3Location({ location, onChange }: Props) {
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  const lat = location.latitude ?? 52.2297;
  const lng = location.longitude ?? 21.0122;

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const map = L.map(el, { center: [lat, lng], zoom: 12, scrollWheelZoom: true });
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap",
      maxZoom: 19,
    }).addTo(map);
    const pinHtml = `<div style="width:28px;height:28px;border-radius:50% 50% 50% 0;background:#16a34a;transform:rotate(-45deg);border:2px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.2)"></div>`;
    const icon = L.divIcon({ className: "host-loc-pin", html: pinHtml, iconSize: [28, 36], iconAnchor: [14, 34] });
    const m = L.marker([lat, lng], { icon }).addTo(map);
    markerRef.current = m;
    mapRef.current = map;
    map.on("click", (e) => {
      const { lat: la, lng: ln } = e.latlng;
      m.setLatLng([la, ln]);
      onChange({ latitude: la, longitude: ln });
    });
    const ro = new ResizeObserver(() => map.invalidateSize());
    ro.observe(el);
    return () => {
      ro.disconnect();
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- init map once
  }, []);

  useEffect(() => {
    const m = markerRef.current;
    const map = mapRef.current;
    if (!m || !map) return;
    m.setLatLng([lat, lng]);
    map.setView([lat, lng], map.getZoom());
  }, [lat, lng]);

  return (
    <div>
      <h2 className="text-[22px] font-extrabold text-brand-dark">📍 Lokalizacja</h2>
      <p className="mt-1 text-sm text-text-muted">Adres i punkt na mapie.</p>

      <label className="mt-6 block text-sm font-semibold text-brand-dark">
        Ulica i numer
        <input
          className="input mt-2"
          value={location.address_line ?? ""}
          onChange={(e) => onChange({ address_line: e.target.value })}
        />
      </label>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <label className="text-sm font-semibold text-brand-dark">
          Miasto
          <input
            className="input mt-2"
            value={location.city ?? ""}
            onChange={(e) => onChange({ city: e.target.value })}
          />
        </label>
        <label className="text-sm font-semibold text-brand-dark">
          Kod pocztowy
          <input
            className="input mt-2"
            value={location.postal_code ?? ""}
            onChange={(e) => onChange({ postal_code: e.target.value })}
          />
        </label>
      </div>

      <label className="mt-3 block text-sm font-semibold text-brand-dark">
        Region / województwo
        <input
          className="input mt-2"
          value={location.region ?? ""}
          onChange={(e) => onChange({ region: e.target.value })}
        />
      </label>

      <div ref={wrapRef} className="mt-3 h-[180px] overflow-hidden rounded-xl border border-[#e5e7eb]" />

      <div className="mt-3 flex flex-wrap gap-2">
        {CHIPS.map((c) => {
          const on = Boolean(location[c.key]);
          return (
            <button
              key={c.key}
              type="button"
              onClick={() => onChange({ [c.key]: !on } as Partial<ListingLocation>)}
              className={cn(
                "rounded-full border-[1.5px] px-3 py-1.5 text-xs font-semibold transition-colors",
                on ? "border-brand bg-brand-muted text-brand-dark" : "border-[#e5e7eb] text-text-secondary"
              )}
            >
              {c.label}
            </button>
          );
        })}
        <span className="rounded-full border border-[#e5e7eb] px-3 py-1.5 text-xs text-text-muted">
          🤫 Cisza
        </span>
        <span className="rounded-full border border-[#e5e7eb] px-3 py-1.5 text-xs text-text-muted">
          🏘️ Blisko centrum
        </span>
      </div>
    </div>
  );
}
