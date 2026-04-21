import type { SearchQuerySchema } from "@/types/listing";

/** Aktualny URL wyszukiwania → payload zgodny z API saved-searches. */
export function urlSearchParamsToQueryPayload(sp: URLSearchParams): SearchQuerySchema {
  const out: SearchQuerySchema = {};
  const str = (k: string) => {
    const v = sp.get(k);
    return v && v.length > 0 ? v : undefined;
  };
  const num = (k: string) => {
    const v = sp.get(k);
    if (v == null || v === "") return undefined;
    const n = Number(v);
    return Number.isNaN(n) ? undefined : n;
  };
  const bool = (k: string) => {
    const v = sp.get(k);
    if (v === "true") return true;
    if (v === "false") return false;
    return undefined;
  };

  const location = str("location");
  if (location) out.location = location;
  const lat = num("latitude");
  const lng = num("longitude");
  if (lat != null) out.latitude = lat;
  if (lng != null) out.longitude = lng;
  const rk = num("radius_km");
  if (rk != null) out.radius_km = rk;
  const df = str("date_from");
  const dt = str("date_to");
  if (df) out.date_from = df;
  if (dt) out.date_to = dt;
  const g = num("guests");
  if (g != null) out.guests = g;
  const ad = num("adults");
  if (ad != null) out.adults = ad;
  const ch = num("children");
  if (ch != null) out.children = ch;
  const tm = str("travel_mode");
  if (tm) out.travel_mode = tm;
  const minp = num("min_price");
  const maxp = num("max_price");
  if (minp != null) out.min_price = minp;
  if (maxp != null) out.max_price = maxp;
  const bm = str("booking_mode");
  if (bm) out.booking_mode = bm;
  const ord = str("ordering");
  if (ord) out.ordering = ord;
  const pet = bool("is_pet_friendly");
  if (pet != null) out.is_pet_friendly = pet;
  const nl = bool("near_lake");
  if (nl != null) out.near_lake = nl;
  const nm = bool("near_mountains");
  if (nm != null) out.near_mountains = nm;
  const nf = bool("near_forest");
  if (nf != null) out.near_forest = nf;
  const lt = sp.getAll("listing_types");
  if (lt.length) out.listing_types = lt;
  const am = sp.getAll("amenities");
  if (am.length) out.amenities = am;
  return out;
}

export function buildSearchURL(params: SearchQuerySchema): string {
  const q = new URLSearchParams();
  for (const [key, val] of Object.entries(params)) {
    if (val === undefined || val === null || val === "") continue;
    if (Array.isArray(val)) {
      for (const item of val) {
        if (item !== undefined && item !== null && item !== "") q.append(key, String(item));
      }
    } else if (typeof val === "boolean") {
      q.set(key, val ? "true" : "false");
    } else {
      q.set(key, String(val));
    }
  }
  const s = q.toString();
  return s ? `/search?${s}` : "/search";
}
