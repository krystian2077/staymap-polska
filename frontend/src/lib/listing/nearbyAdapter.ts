import type { AreaSummary, NearbyPlaces, POIItem } from "@/types/listing";

/** Element POI z backendu (grupy OSM) */
type BackendPoi = {
  name: string;
  lat: number;
  lng: number;
  distance_m: number;
  kind?: string;
  osm_id?: number;
};

type BackendGroups = Record<string, BackendPoi[] | undefined>;

function toPoi(item: BackendPoi, category: POIItem["category"]): POIItem {
  const osm = item.osm_id != null ? String(item.osm_id) : `${item.lat},${item.lng}`;
  return {
    id: osm,
    name: item.name || "POI",
    category,
    subcategory: item.kind || "",
    distance_m: item.distance_m,
    rating: null,
    is_open: null,
    lat: item.lat,
    lng: item.lng,
    osm_id: osm,
  };
}

/**
 * Mapuje `groups` z Django (eat_drink, nature_leisure, …) na zakładki UI.
 */
export function backendGroupsToNearbyPlaces(groups: BackendGroups | null | undefined): NearbyPlaces {
  if (!groups || typeof groups !== "object") {
    return {
      restaurant: [],
      outdoor: [],
      shop: [],
      transport: [],
    };
  }

  const restaurant = (groups.eat_drink ?? []).map((p) => toPoi(p, "restaurant"));
  const outdoor = [
    ...(groups.outdoor ?? []),
    ...(groups.nature_leisure ?? []),
  ].map((p) => toPoi(p, "outdoor"));
  const shop = (groups.services ?? []).map((p) => toPoi(p, "shop"));
  const transport = (groups.transport ?? []).map((p) => toPoi(p, "transport"));

  return { restaurant, outdoor, shop, transport };
}

export function buildAreaSummaryFromNearbyPayload(
  location: { city: string; region: string },
  groups: BackendGroups | null | undefined,
  stats: Record<string, number> | null | undefined
): AreaSummary | null {
  if (!groups || typeof groups !== "object") return null;

  const eat = groups.eat_drink?.length ?? 0;
  const out = (groups.outdoor?.length ?? 0) + (groups.nature_leisure?.length ?? 0);
  const trans = groups.transport?.length ?? 0;
  const shops = groups.services?.length ?? 0;
  const outdoorScore = stats?.outdoor_score_nodes ?? out + eat;

  if (eat + out + trans + shops === 0) return null;

  const character =
    out > 6 ? "Aktywny outdoor" : eat > 5 ? "Tętniący życiem" : "Spokojny";

  return {
    city: location.city || "Okolica",
    region: location.region || "",
    character,
    distance_to_center_km: 5,
    counts: {
      restaurants: eat,
      trails: out,
      ski_lifts: 0,
      shops: shops,
    },
    tags: [],
    nature_score: Math.min(10, Math.max(1, Math.round(outdoorScore / 3 + 3))),
  };
}
