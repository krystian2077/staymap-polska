/**
 * Pomocnicze stałe i dane geograficzne dla mapy Polski.
 * Uproszczona granica (wystarczająca do efektu wizualnego).
 */

/** Główny bounding box Polski [south, west, north, east] */
export const PL_BBOX = {
  south: 49.0,
  west: 14.15,
  north: 54.9,
  east: 24.25,
} as const;

/** Środek Polski */
export const PL_CENTER: [number, number] = [52.1, 19.4];

/** Bazowy zoom dla widoku całej Polski */
export const PL_DEFAULT_ZOOM = 6;

/** Minimalna odległość od granic, poniżej której mapa może wyjść za Polskę */
export const PL_MAX_BOUNDS_VISCOSITY = 0.9;

/**
 * Uproszczona granica Polski jako GeoJSON polygon (coords: [lng, lat]).
 * Approximately 80 points — wystarczający dla efektu wizualnego maski.
 */
export const POLAND_BORDER_COORDS: [number, number][] = [
  // Wybrzeże Bałtyku (W→E) — dokładniejszy przebieg linii brzegowej
  [14.12, 53.84],
  [14.22, 53.92],
  [14.27, 53.95],
  [14.45, 53.93],
  [14.59, 53.97],
  [14.73, 54.01],
  [14.96, 54.06],
  [15.32, 54.14],
  [15.57, 54.18],
  [15.87, 54.22],
  [16.06, 54.26],
  [16.32, 54.38],
  [16.55, 54.47],
  [16.72, 54.55],
  [16.86, 54.59],
  [17.05, 54.66],
  [17.28, 54.72],
  [17.56, 54.76],
  [17.84, 54.78],
  [18.10, 54.80],
  [18.33, 54.80],
  // Półwysep Helski — tip i powrót
  [18.52, 54.77],
  [18.68, 54.70],
  [18.81, 54.60],
  // Trójmiasto → Żuławy → Mierzeja Wiślana
  [18.63, 54.44],
  [18.78, 54.37],
  [19.03, 54.33],
  [19.24, 54.36],
  [19.45, 54.38],
  [19.65, 54.40],
  [19.85, 54.38],
  [20.25, 54.42],
  [20.59, 54.40],
  // NE — granica z Obwodem Kaliningradzkim
  [21.20, 54.38],
  [22.03, 54.35],
  [22.78, 54.36],
  // Granica wschodnia (S↓) — Litwa, Białoruś, Ukraina
  [23.48, 54.13],
  [23.54, 53.92],
  [23.91, 53.38],
  [23.68, 52.96],
  [23.89, 52.72],
  [23.91, 52.50],
  [24.00, 52.22],
  [23.98, 51.91],
  [23.88, 51.60],
  [23.63, 51.30],
  [24.10, 50.85],
  [23.58, 50.43],
  [23.12, 50.15],
  [22.90, 49.84],
  [22.66, 49.55],
  // SE — Bieszczady
  [22.15, 49.20],
  [21.73, 49.24],
  // Południe — Tatry, Sudety (W↑)
  [21.16, 49.41],
  [20.75, 49.18],
  [20.20, 49.26],
  [19.98, 49.22],
  [19.77, 49.19],
  [19.49, 49.59],
  [18.97, 49.49],
  [18.56, 49.88],
  [18.24, 49.97],
  [17.87, 50.24],
  [17.07, 50.31],
  [16.70, 50.23],
  [16.27, 50.41],
  [16.00, 50.60],
  [15.65, 50.83],
  [15.02, 50.79],
  // Granica zachodnia (N↑) — Odra/Nysa
  [14.84, 51.07],
  [14.64, 51.80],
  [14.37, 52.26],
  [14.13, 52.84],
  [14.22, 53.34],
  [14.18, 53.65],
  [14.12, 53.84], // zamknięcie
];

type GeoJSONGeometry =
  | {
      type: "Polygon" | "MultiPolygon";
      coordinates: number[][][] | number[][][][];
    }
  | {
      type: "Point";
      coordinates: [number, number];
    };

type GeoJSONFeature = {
  type: "Feature";
  properties?: Record<string, unknown>;
  geometry: GeoJSONGeometry | null;
};

export type GeoJSONFeatureCollection = {
  type: "FeatureCollection";
  features: GeoJSONFeature[];
};

export type PolandGeoData = {
  country: GeoJSONFeatureCollection | null;
  voivodeships: GeoJSONFeatureCollection | null;
  cities: GeoJSONFeatureCollection | null;
};

/**
 * Zwraca GeoJSON feature z maską poza Polską.
 * Używany do przyciemnienia obszaru poza granicami.
 */
export function buildPolandMaskGeoJSON(countryGeometry?: GeoJSONGeometry | null): object {
  // Duży prostokąt otaczający cały glob, z dziurą w kształcie Polski
  const worldRing: [number, number][] = [
    [-180, -90],
    [180, -90],
    [180, 90],
    [-180, 90],
    [-180, -90],
  ];
  // Granica Polski jako dziura (musi być w odwrotnej kolejności)
  let holes: [number, number][][] = [[...POLAND_BORDER_COORDS].reverse()];

  if (countryGeometry?.type === "Polygon") {
    const rings = countryGeometry.coordinates as number[][][];
    const outer = rings[0];
    if (outer?.length) {
      holes = [outer.map(([lng, lat]) => [lng, lat] as [number, number]).reverse()];
    }
  }
  if (countryGeometry?.type === "MultiPolygon") {
    const polys = countryGeometry.coordinates as number[][][][];
    const extracted = polys
      .map((poly) => poly[0])
      .filter((ring) => Array.isArray(ring) && ring.length > 0)
      .map((ring) => ring.map(([lng, lat]) => [lng, lat] as [number, number]).reverse());
    if (extracted.length) holes = extracted;
  }

  return {
    type: "Feature",
    properties: {},
    geometry: {
      type: "Polygon",
      coordinates: [worldRing, ...holes],
    },
  };
}

async function fetchGeoJSON(path: string): Promise<GeoJSONFeatureCollection | null> {
  try {
    const res = await fetch(path, { cache: "force-cache" });
    if (!res.ok) return null;
    const json = (await res.json()) as GeoJSONFeatureCollection;
    if (json?.type !== "FeatureCollection" || !Array.isArray(json.features)) return null;
    return json;
  } catch {
    return null;
  }
}

/**
 * Ładuje dokładniejsze dane administracyjne (jeśli istnieją w public/data/maps/poland).
 * Brak plików nie jest błędem — mapa przechodzi na wbudowany fallback.
 */
export async function loadPolandGeoData(): Promise<PolandGeoData> {
  const [country, voivodeships, cities] = await Promise.all([
    fetchGeoJSON("/data/maps/poland/poland-border.geojson"),
    fetchGeoJSON("/data/maps/poland/voivodeships.geojson"),
    fetchGeoJSON("/data/maps/poland/cities.geojson"),
  ]);
  return { country, voivodeships, cities };
}

/** Dopasowanie zoom do szerokości kontenera. */
export function calcPolandZoom(containerWidthPx: number): number {
  const targetKm = 750;
  const kmPerPx = 40075 * Math.cos((52 * Math.PI) / 180);
  const z = Math.log2((containerWidthPx * kmPerPx) / (targetKm * 256));
  return Math.max(5, Math.min(8, Math.round(z * 2) / 2));
}
