import { apiUrl } from "@/lib/api";

export type GeocodeHit = {
  lat: number;
  lng: number;
  placeName: string;
};

/** Geokodowanie przez backend (Nominatim / OSM) — bez kluczy, bez Mapbox. */
export async function geocodePoland(query: string): Promise<GeocodeHit | null> {
  const q = query.trim();
  if (!q) return null;
  const params = new URLSearchParams({ q });
  const res = await fetch(apiUrl(`/api/v1/geocode/?${params.toString()}`), {
    cache: "no-store",
  });
  const body = (await res.json()) as {
    data?: { lat: number; lng: number; display_name?: string };
    meta?: { found?: boolean };
  };
  if (!res.ok) return null;
  const d = body.data;
  if (!d || body.meta?.found === false) return null;
  return {
    lat: d.lat,
    lng: d.lng,
    placeName: typeof d.display_name === "string" ? d.display_name : q,
  };
}
