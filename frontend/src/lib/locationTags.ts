/**
 * Tagi okolicy — kolejność i etykiety zgodne z backendem (`apps.listings.location_tags`).
 */
export const LOCATION_TAG_KEYS = [
  "near_mountains",
  "near_forest",
  "near_lake",
  "near_sea",
  "near_river",
  "near_protected_area",
  "beach_access",
  "ski_slopes_nearby",
  "quiet_rural",
  "historic_center_nearby",
  "cycling_routes_nearby",
] as const;

export type LocationTagKey = (typeof LOCATION_TAG_KEYS)[number];

export const LOCATION_TAG_CHIPS: {
  key: LocationTagKey;
  label: string;
  group: "natura" | "woda" | "okolica" | "aktywnosc";
}[] = [
  { key: "near_mountains", label: "⛰️ Góry", group: "natura" },
  { key: "near_forest", label: "🌲 Las", group: "natura" },
  { key: "near_lake", label: "🏊 Jezioro", group: "woda" },
  { key: "near_sea", label: "🌊 Morze", group: "woda" },
  { key: "near_river", label: "🛶 Rzeka", group: "woda" },
  { key: "near_protected_area", label: "🌿 Park / rezerwat", group: "natura" },
  { key: "beach_access", label: "🏖️ Plaża / kąpielisko", group: "woda" },
  { key: "ski_slopes_nearby", label: "⛷️ Stoki / narty", group: "aktywnosc" },
  { key: "cycling_routes_nearby", label: "🚴 Trasy rowerowe", group: "aktywnosc" },
  { key: "quiet_rural", label: "🤫 Cicha okolica", group: "okolica" },
  { key: "historic_center_nearby", label: "🏛️ Zabytkowe centrum", group: "okolica" },
];

const GROUP_LABEL: Record<(typeof LOCATION_TAG_CHIPS)[number]["group"], string> = {
  natura: "Natura",
  woda: "Woda i wybrzeże",
  okolica: "Okolica i klimat",
  aktywnosc: "Aktywność",
};

export const LOCATION_TAG_GROUPS = (
  ["natura", "woda", "okolica", "aktywnosc"] as const
).map((group) => ({
  group,
  title: GROUP_LABEL[group],
  chips: LOCATION_TAG_CHIPS.filter((c) => c.group === group),
}));
