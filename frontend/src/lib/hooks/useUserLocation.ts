"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "staymap_user_location";
const CACHE_MAX_AGE_MS = 30 * 60 * 1000; // 30 min

type Coords = { lat: number; lng: number };

interface CachedLocation {
  lat: number;
  lng: number;
  ts: number;
}

function readCache(): Coords | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const cached: CachedLocation = JSON.parse(raw);
    if (Date.now() - cached.ts > CACHE_MAX_AGE_MS) return null;
    return { lat: cached.lat, lng: cached.lng };
  } catch {
    return null;
  }
}

function writeCache(c: Coords) {
  try {
    const entry: CachedLocation = { ...c, ts: Date.now() };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entry));
  } catch {
    /* storage full / blocked */
  }
}

/**
 * Returns user's approximate location via browser Geolocation API.
 * Caches the result in localStorage for 30 min to avoid repeated prompts.
 * Constrains the result to Poland's bounding box — if the user is outside
 * Poland, returns null so the map falls back to the default Poland center.
 */
export function useUserLocation(): Coords | null {
  const [loc, setLoc] = useState<Coords | null>(null);

  useEffect(() => {
    const cached = readCache();
    if (cached) {
      setLoc(cached);
      return;
    }

    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        const inPoland =
          latitude >= 49.0 &&
          latitude <= 54.9 &&
          longitude >= 14.1 &&
          longitude <= 24.2;
        if (inPoland) {
          const coords: Coords = { lat: latitude, lng: longitude };
          writeCache(coords);
          setLoc(coords);
        }
      },
      () => {
        /* user denied or error — keep null, fallback to PL_CENTER */
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 600_000 }
    );
  }, []);

  return loc;
}
