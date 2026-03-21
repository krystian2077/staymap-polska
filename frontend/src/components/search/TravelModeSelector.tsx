"use client";

import { TRAVEL_MODES } from "@/lib/searchTypes";

type Props = {
  value: string;
  onChange: (v: string) => void;
  id?: string;
};

export function TravelModeSelector({ value, onChange, id }: Props) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="font-medium text-neutral-700 dark:text-neutral-300">
        Tryb podróży
      </span>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-lg border border-neutral-300 bg-white px-3 py-2 dark:border-neutral-600 dark:bg-neutral-900"
      >
        {TRAVEL_MODES.map((m) => (
          <option key={m.value || "any"} value={m.value}>
            {m.label}
          </option>
        ))}
      </select>
    </label>
  );
}
