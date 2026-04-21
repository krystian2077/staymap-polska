/** Open-Meteo forecast (no API key). https://open-meteo.com/ */

export const OPEN_METEO_FORECAST_URL = "https://api.open-meteo.com/v1/forecast";

/** Open-Meteo /v1/forecast: maks. 16 dni prognozy (darmowe API — nie ma 30 dni w jednym żądaniu). */
export const FORECAST_DAYS = 16;

/** Ile dni pokazujemy naraz w UI (domyślnie 2 tygodnie; reszta pod strzałkami). */
export const WEATHER_WINDOW_DAYS = 14;

export type WeatherIconKind =
  | "clear"
  | "partly"
  | "cloudy"
  | "fog"
  | "drizzle"
  | "rain"
  | "snow"
  | "thunder";

/** WMO weather interpretation codes (Open-Meteo daily). */
export function weatherCodeToKind(code: number): WeatherIconKind {
  if (code === 0) return "clear";
  if (code >= 1 && code <= 3) return code === 3 ? "cloudy" : "partly";
  if (code === 45 || code === 48) return "fog";
  if (code >= 51 && code <= 57) return "drizzle";
  if (code >= 61 && code <= 67) return "rain";
  if (code >= 71 && code <= 77) return "snow";
  if (code >= 80 && code <= 82) return "rain";
  if (code === 85 || code === 86) return "snow";
  if (code >= 95 && code <= 99) return "thunder";
  return "partly";
}

export interface DailyForecastDay {
  date: string;
  tempMax: number;
  tempMin: number;
  weathercode: number;
  kind: WeatherIconKind;
  precipProbMax: number | null;
  precipSum: number | null;
}

export interface OpenMeteoForecastResult {
  days: DailyForecastDay[];
}

function num(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

export function buildOpenMeteoForecastUrl(latitude: number, longitude: number): string {
  const params = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    daily: [
      "temperature_2m_max",
      "temperature_2m_min",
      "weathercode",
      "precipitation_sum",
      "precipitation_probability_max",
    ].join(","),
    forecast_days: String(FORECAST_DAYS),
    timezone: "auto",
  });
  return `${OPEN_METEO_FORECAST_URL}?${params.toString()}`;
}

export function parseOpenMeteoForecast(json: unknown): OpenMeteoForecastResult | null {
  if (!json || typeof json !== "object") return null;
  const root = json as Record<string, unknown>;
  const daily = root.daily;
  if (!daily || typeof daily !== "object") return null;
  const d = daily as Record<string, unknown>;
  const times = d.time;
  if (!Array.isArray(times) || times.length === 0) return null;

  const maxT = d.temperature_2m_max;
  const minT = d.temperature_2m_min;
  const codes = d.weathercode;
  const precSum = d.precipitation_sum;
  const precProb = d.precipitation_probability_max;

  const days: DailyForecastDay[] = [];
  for (let i = 0; i < times.length; i++) {
    const date = times[i];
    if (typeof date !== "string") continue;
    const tMx = Array.isArray(maxT) ? num(maxT[i]) : null;
    const tMn = Array.isArray(minT) ? num(minT[i]) : null;
    const wcRaw = Array.isArray(codes) ? num(codes[i]) : null;
    if (tMx == null || tMn == null || wcRaw == null) continue;
    const wc = Math.round(wcRaw);
    const ps = Array.isArray(precSum) ? num(precSum[i]) : null;
    const pp = Array.isArray(precProb) ? num(precProb[i]) : null;
    days.push({
      date,
      tempMax: tMx,
      tempMin: tMn,
      weathercode: wc,
      kind: weatherCodeToKind(wc),
      precipSum: ps,
      precipProbMax: pp,
    });
  }

  return days.length > 0 ? { days } : null;
}

export async function fetchOpenMeteoForecastServer(
  latitude: number,
  longitude: number
): Promise<OpenMeteoForecastResult | null> {
  const url = buildOpenMeteoForecastUrl(latitude, longitude);
  try {
    const res = await fetch(url, { next: { revalidate: 3600 } });
    if (!res.ok) return null;
    const json: unknown = await res.json();
    return parseOpenMeteoForecast(json);
  } catch {
    return null;
  }
}
