export type NearbyPlaceItem = {
  name: string;
  lat: number;
  lng: number;
  distance_m: number;
  kind: string;
  osm_id?: number;
};

export type NearbyGroups = Record<string, NearbyPlaceItem[]>;

export type NearbyApiPayload = {
  center: { lat: number; lng: number } | null;
  radius_m: number;
  groups: NearbyGroups;
  stats: Record<string, number>;
  fetched_at?: string;
  source?: string;
  error?: string;
  overpass_error?: string;
};
