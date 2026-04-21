import { create } from "zustand";

import type { LocationTagKey } from "@/lib/locationTags";
import type { MapPin, SearchListing } from "@/lib/searchTypes";

export type SearchParamsState = {
  location: string;
  lat?: number;
  lng?: number;
  radius_km?: number;
  date_from?: string;
  date_to?: string;
  guests?: number;
  adults?: number;
  children?: number;
  infants?: number;
  pets?: number;
  travel_mode?: string;
  min_price?: number;
  max_price?: number;
  booking_mode?: string;
  ordering?: string;
  // Filtry premium
  listing_types?: string[];
  amenities?: string[];
  is_pet_friendly?: boolean;
  // Tagi otoczenia
  near_mountains?: boolean;
  near_forest?: boolean;
  near_lake?: boolean;
  near_sea?: boolean;
  near_river?: boolean;
  near_protected_area?: boolean;
  beach_access?: boolean;
  ski_slopes_nearby?: boolean;
  quiet_rural?: boolean;
  historic_center_nearby?: boolean;
  cycling_routes_nearby?: boolean;
  // Viewport mapy (opcjonalny bbox, kiedy "Szukaj w tym obszarze")
  bbox_south?: number;
  bbox_west?: number;
  bbox_north?: number;
  bbox_east?: number;
};

export type MapBounds = {
  south: number;
  west: number;
  north: number;
  east: number;
};

interface SearchStore {
  params: SearchParamsState;
  results: SearchListing[];
  mapPins: MapPin[];
  count: number;
  loading: boolean;
  hoveredListingId: string | null;
  selectedListingId: string | null;
  mobileBottomSheetOpen: boolean;
  searchThisArea: boolean;
  mapBounds: MapBounds | null;
  setParams: (p: Partial<SearchParamsState>) => void;
  replaceParams: (p: SearchParamsState) => void;
  setResults: (r: SearchListing[], count: number) => void;
  setMapPins: (pins: MapPin[]) => void;
  setLoading: (v: boolean) => void;
  setHoveredListing: (id: string | null) => void;
  setSelectedListing: (id: string | null) => void;
  setMobileBottomSheetOpen: (v: boolean) => void;
  setSearchThisArea: (v: boolean) => void;
  setMapBounds: (bounds: MapBounds | null) => void;
  reset: () => void;
}

const defaultParams: SearchParamsState = {
  location: "",
  ordering: "recommended",
};

export const useSearchStore = create<SearchStore>((set) => ({
  params: { ...defaultParams },
  results: [],
  mapPins: [],
  count: 0,
  loading: false,
  hoveredListingId: null,
  selectedListingId: null,
  mobileBottomSheetOpen: false,
  searchThisArea: false,
  mapBounds: null,
  setParams: (p) =>
    set((s) => {
      const next = { ...s.params, ...p };
      for (const k of Object.keys(p)) {
        if ((p as Record<string, unknown>)[k] === undefined) {
          delete (next as Record<string, unknown>)[k];
        }
      }
      return { params: next };
    }),
  replaceParams: (p) => set({ params: p }),
  setResults: (r, c) => set({ results: r, count: c }),
  setMapPins: (pins) => set({ mapPins: pins }),
  setLoading: (v) => set({ loading: v }),
  setHoveredListing: (id) => set({ hoveredListingId: id }),
  setSelectedListing: (id) => set({ selectedListingId: id }),
  setMobileBottomSheetOpen: (v) => set({ mobileBottomSheetOpen: v }),
  setSearchThisArea: (v) => set({ searchThisArea: v }),
  setMapBounds: (bounds) => set({ mapBounds: bounds }),
  reset: () =>
    set({
      params: { ...defaultParams },
      results: [],
      mapPins: [],
      count: 0,
      hoveredListingId: null,
      selectedListingId: null,
      mobileBottomSheetOpen: false,
      searchThisArea: false,
      mapBounds: null,
    }),
}));

/** Helper: pobiera wartość tagu otoczenia z params */
export function getLocationTagValue(params: SearchParamsState, key: LocationTagKey): boolean {
  return (params as Record<string, unknown>)[key] === true;
}
