"use client";

import { FormEvent, useEffect, useState } from "react";
import { TravelModeSelector } from "./TravelModeSelector";

export type HeroSearchValues = {
  location: string;
  latitude: string;
  longitude: string;
  radiusKm: string;
  guests: string;
  travelMode: string;
};

type Props = {
  initial: HeroSearchValues;
  onSubmit: (values: HeroSearchValues) => void | Promise<void>;
  statusMessage?: string | null;
};

export function HeroSearchBar({ initial, onSubmit, statusMessage }: Props) {
  const [location, setLocation] = useState(initial.location);
  const [latitude, setLatitude] = useState(initial.latitude);
  const [longitude, setLongitude] = useState(initial.longitude);
  const [radiusKm, setRadiusKm] = useState(initial.radiusKm || "50");
  const [guests, setGuests] = useState(initial.guests);
  const [travelMode, setTravelMode] = useState(initial.travelMode);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    setLocation(initial.location);
    setLatitude(initial.latitude);
    setLongitude(initial.longitude);
    setRadiusKm(initial.radiusKm || "50");
    setGuests(initial.guests);
    setTravelMode(initial.travelMode);
  }, [
    initial.location,
    initial.latitude,
    initial.longitude,
    initial.radiusKm,
    initial.guests,
    initial.travelMode,
  ]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setPending(true);
    try {
      await onSubmit({
        location,
        latitude,
        longitude,
        radiusKm,
        guests,
        travelMode,
      });
    } finally {
      setPending(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-neutral-200/80 bg-white/90 p-4 shadow-lg backdrop-blur dark:border-neutral-700 dark:bg-neutral-900/90"
    >
      <div className="mb-3">
        <p className="text-xs font-semibold uppercase tracking-widest text-emerald-700 dark:text-emerald-400">
          Etap 2 · Search &amp; Map
        </p>
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-50">
          Znajdź nocleg na mapie
        </h1>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
        <label className="flex flex-col gap-1 text-sm sm:col-span-2">
          <span className="font-medium text-neutral-700 dark:text-neutral-300">
            Lokalizacja (tekst)
          </span>
          <input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="np. Zakopane, Mazury…"
            className="rounded-lg border border-neutral-300 px-3 py-2 dark:border-neutral-600 dark:bg-neutral-900"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-neutral-700 dark:text-neutral-300">
            Szer. geogr.
          </span>
          <input
            value={latitude}
            onChange={(e) => setLatitude(e.target.value)}
            placeholder="np. 52.23"
            inputMode="decimal"
            className="rounded-lg border border-neutral-300 px-3 py-2 dark:border-neutral-600 dark:bg-neutral-900"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-neutral-700 dark:text-neutral-300">
            Dł. geogr.
          </span>
          <input
            value={longitude}
            onChange={(e) => setLongitude(e.target.value)}
            placeholder="np. 21.01"
            inputMode="decimal"
            className="rounded-lg border border-neutral-300 px-3 py-2 dark:border-neutral-600 dark:bg-neutral-900"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-neutral-700 dark:text-neutral-300">
            Promień (km)
          </span>
          <input
            value={radiusKm}
            onChange={(e) => setRadiusKm(e.target.value)}
            placeholder="50"
            inputMode="numeric"
            className="rounded-lg border border-neutral-300 px-3 py-2 dark:border-neutral-600 dark:bg-neutral-900"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-neutral-700 dark:text-neutral-300">
            Goście
          </span>
          <input
            value={guests}
            onChange={(e) => setGuests(e.target.value)}
            placeholder="2"
            inputMode="numeric"
            className="rounded-lg border border-neutral-300 px-3 py-2 dark:border-neutral-600 dark:bg-neutral-900"
          />
        </label>
        <div className="sm:col-span-2 lg:col-span-2">
          <TravelModeSelector
            value={travelMode}
            onChange={setTravelMode}
            id="travel-mode"
          />
        </div>
      </div>
      {statusMessage && (
        <p className="mt-3 text-sm text-emerald-800 dark:text-emerald-300">{statusMessage}</p>
      )}
      <div className="mt-4 flex flex-wrap gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-full bg-emerald-700 px-6 py-2.5 text-sm font-semibold text-white shadow hover:bg-emerald-800 disabled:opacity-60 dark:bg-emerald-600 dark:hover:bg-emerald-500"
        >
          {pending ? "Geokodowanie…" : "Szukaj"}
        </button>
        <p className="max-w-xl self-center text-xs text-neutral-500">
          Wpisz miejscowość bez współrzędnych — backend użyje darmowego Nominatim (OpenStreetMap).
          Możesz też podać lat/lng ręcznie; z promieniem włącza się wyszukiwanie po odległości
          (ST_DWithin).
        </p>
      </div>
    </form>
  );
}
