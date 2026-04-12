"use client";

import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { api } from "@/lib/api";
import { LOCATION_TAG_GROUPS } from "@/lib/locationTags";
import { cn } from "@/lib/utils";
import type { ListingLocation } from "@/types/listing";

type Props = {
  location: Partial<ListingLocation>;
  onChange: (patch: Partial<ListingLocation>) => void;
};

export function Step3Location({ location, onChange }: Props) {
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reqIdRef = useRef(0);
  const lastQueryKeyRef = useRef("");
  const [geoState, setGeoState] = useState<
    "idle" | "searching" | "ok" | "not_found" | "rate_limited" | "error"
  >("idle");

  const lat = location.latitude ?? 52.2297;
  const lng = location.longitude ?? 21.0122;

  const addressLine = (location.address_line ?? "").trim();
  const city = (location.city ?? "").trim();
  const region = (location.region ?? "").trim();
  const postalCode = (location.postal_code ?? "").trim();
  const normalizedPostal = postalCode.replace(/\s/g, "");
  const hasHouseNumber = /\d/.test(addressLine);
  const hasStreetName = /[A-Za-z\u00C0-\u017F]/.test(addressLine);
  const hasValidPostal = /^\d{2}-?\d{3}$/.test(normalizedPostal);

  const geocodeCandidates = useMemo(() => {
    if (!addressLine || !city || !region || !normalizedPostal || !hasHouseNumber || !hasValidPostal) {
      return [];
    }

    if (city.length < 2 || region.length < 2) return [];

    const country = "Polska";
    const postal = normalizedPostal.includes("-")
      ? normalizedPostal
      : `${normalizedPostal.slice(0, 2)}-${normalizedPostal.slice(2)}`;

    if (hasStreetName) {
      return [
        `${addressLine}, ${postal} ${city}, ${region}, ${country}`,
        `${addressLine}, ${city}, ${region}, ${country}`,
        `${postal} ${city}, ${country}`,
      ];
    }

    // Miejscowości bez ulic: format "Miasto numer" jest zwykle lepiej rozpoznawany.
    return [
      `${city} ${addressLine}, ${postal}, ${region}, ${country}`,
      `${city} ${addressLine}, ${postal}, ${country}`,
      `${postal} ${city}, ${region}, ${country}`,
    ];
  }, [addressLine, city, region, normalizedPostal, hasHouseNumber, hasStreetName, hasValidPostal]);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;

    const map = L.map(el, { center: [lat, lng], zoom: 12, scrollWheelZoom: true });
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap",
      maxZoom: 19,
    }).addTo(map);

    const pinHtml =
      '<div style="width:32px;height:32px;border-radius:50% 50% 50% 0;background:#0f172a;transform:rotate(-45deg);border:3px solid #fff;box-shadow:0 4px 12px rgba(0,0,0,.35);display:flex;align-items:center;justify-content:center;"><div style="width:10px;height:10px;background:#fff;border-radius:50%;transform:rotate(45deg);"></div></div>';
    const icon = L.divIcon({
      className: "host-loc-pin",
      html: pinHtml,
      iconSize: [28, 36],
      iconAnchor: [14, 34],
    });
    const marker = L.marker([lat, lng], { icon, draggable: true }).addTo(map);

    markerRef.current = marker;
    mapRef.current = map;

    marker.on("dragend", () => {
      const pos = marker.getLatLng();
      onChange({ latitude: pos.lat, longitude: pos.lng });
    });

    map.on("click", (e) => {
      const { lat: la, lng: ln } = e.latlng;
      marker.setLatLng([la, ln]);
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
    const marker = markerRef.current;
    const map = mapRef.current;
    if (!marker || !map) return;
    const pos = marker.getLatLng();
    if (pos.lat !== lat || pos.lng !== lng) {
      marker.setLatLng([lat, lng]);
      map.setView([lat, lng], map.getZoom());
    }
  }, [lat, lng]);

  const runGeocode = useCallback(
    async (queries: string[]) => {
      if (queries.length === 0) return;

      const queryKey = queries.join(" | ");
      if (lastQueryKeyRef.current === queryKey) return;
      lastQueryKeyRef.current = queryKey;

      const myReqId = ++reqIdRef.current;
      setGeoState("searching");

      for (const q of queries) {
        try {
          const res = await api.get<{
            data: { lat: number; lng: number; display_name: string } | null;
            meta?: { found?: boolean };
          }>("/api/v1/geocode/", { q });

          if (reqIdRef.current !== myReqId) return;

          if (res.data && typeof res.data.lat === "number" && typeof res.data.lng === "number") {
            onChange({ latitude: res.data.lat, longitude: res.data.lng });
            setGeoState("ok");
            return;
          }
        } catch (e) {
          if (reqIdRef.current !== myReqId) return;
          const status = (e as { status?: number })?.status;
          if (status === 429) {
            setGeoState("rate_limited");
            return;
          }
          setGeoState("error");
          return;
        }
      }

      if (reqIdRef.current === myReqId) {
        setGeoState("not_found");
      }
    },
    [onChange]
  );

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (geocodeCandidates.length === 0) {
      setGeoState("idle");
      lastQueryKeyRef.current = "";
      return;
    }

    debounceRef.current = setTimeout(() => {
      void runGeocode(geocodeCandidates);
    }, 1000);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [geocodeCandidates, runGeocode]);

  return (
    <div>
      <h2 className="text-[22px] font-extrabold text-brand-dark">📍 Lokalizacja</h2>
      <p className="mt-1 text-sm text-text-muted">
        Adres, punkt na mapie i tagi okolicy (pomagają w wyszukiwarce).
      </p>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="block text-sm font-semibold text-brand-dark">
          Ulica i numer / sam numer domu
          <input
            className="input mt-2"
            value={location.address_line ?? ""}
            onChange={(e) => onChange({ address_line: e.target.value })}
            placeholder="np. ul. Krupówki 1 lub 12"
          />
        </label>

        <label className="text-sm font-semibold text-brand-dark">
          Miasto / Wieś
          <input
            className="input mt-2"
            value={location.city ?? ""}
            onChange={(e) => onChange({ city: e.target.value })}
            placeholder="np. Zakopane lub Kościelisko"
          />
        </label>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <label className="text-sm font-semibold text-brand-dark">
          Kod pocztowy
          <input
            className="input mt-2"
            value={location.postal_code ?? ""}
            onChange={(e) => onChange({ postal_code: e.target.value })}
            placeholder="00-000"
          />
        </label>
        <label className="block text-sm font-semibold text-brand-dark">
          Region / województwo
          <input
            className="input mt-2"
            value={location.region ?? ""}
            onChange={(e) => onChange({ region: e.target.value })}
            placeholder="np. Małopolskie"
          />
        </label>
      </div>

      <p className="mt-2 text-xs text-text-muted">
        Automatyczne ustawianie pinezki działa po uzupełnieniu: numer domu (z ulicą lub bez), miasto/wieś, kod pocztowy i region.
        {!hasValidPostal && normalizedPostal ? " Kod pocztowy podaj w formacie 00-000." : ""}
        {geoState === "searching" ? " Szukamy adresu…" : ""}
        {geoState === "ok" ? " Znaleziono lokalizację i ustawiono pinezkę." : ""}
        {geoState === "not_found" ? " Nie znaleźliśmy dokładnego adresu — popraw dane lub przesuń pinezkę ręcznie." : ""}
        {geoState === "rate_limited" ? " Limit geokodowania osiągnięty — spróbuj ponownie za kilkadziesiąt sekund." : ""}
        {geoState === "error" ? " Błąd geokodowania — spróbuj ponownie za chwilę." : ""}
      </p>

      <div
        ref={wrapRef}
        className="mt-6 h-[350px] overflow-hidden rounded-[24px] border border-brand-dark/[.06] shadow-inner"
      />
      <p className="mt-2 text-center text-[11px] text-text-muted">
        Możesz przeciągnąć pinezkę, aby dokładnie określić lokalizację.
      </p>

      <div className="mt-5 space-y-4">
        {LOCATION_TAG_GROUPS.map(({ title, chips }) => (
          <div key={title}>
            <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-text-muted">{title}</p>
            <div className="flex flex-wrap gap-2">
              {chips.map((c) => {
                const on = Boolean(location[c.key]);
                return (
                  <button
                    key={c.key}
                    type="button"
                    onClick={() => onChange({ [c.key]: !on } as Partial<ListingLocation>)}
                    className={cn(
                      "rounded-full border-[1.5px] px-3 py-1.5 text-xs font-semibold transition-colors",
                      on ? "border-brand bg-brand-muted text-brand-dark" : "border-brand-dark/[.06] text-text-secondary"
                    )}
                  >
                    {c.label}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
