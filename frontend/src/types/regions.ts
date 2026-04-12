export type RegionKey = "gory" | "baltyk" | "jeziora" | "lasy" | "uzdrowiska";

export type RegionSearchQueryValue = string | number | boolean;

export type RegionFilters = Partial<
  Record<"near_mountains" | "near_sea" | "near_lake" | "near_forest", true>
>;

export interface HomeRegionTile {
  key: RegionKey;
  title: string;
  subtitle: string;
  emoji: string;
  bg: string;
  glow: string;
  anchorLabel: string;
  large?: boolean;
  tag?: string;
  priceLabel?: string;
  count: number;
  location: string;
  mapCenter: { lat: number; lng: number };
  radiusKm: number;
  filters?: RegionFilters;
  searchQuery?: Record<string, RegionSearchQueryValue>;
  mapPinCount?: number;
  startingPrice?: number | null;
  highlights?: string[];
  href: string;
}

