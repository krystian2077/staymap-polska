"use client";

import { cn } from "@/lib/utils";

const TYPES: { emoji: string; name: string; slug: string }[] = [
  { emoji: "🏠", name: "Domek", slug: "domek" },
  { emoji: "⛺", name: "Glamping", slug: "glamping" },
  { emoji: "🏡", name: "Willa", slug: "willa" },
  { emoji: "🏕️", name: "Chatka", slug: "chatka" },
  { emoji: "🏢", name: "Apartament", slug: "apartament" },
  { emoji: "🌿", name: "Eko-domek", slug: "eko-domek" },
];

type Props = {
  selectedSlug: string | null;
  onSelectType: (slug: string) => void;
  maxGuests: number;
  bedrooms: number;
  bathrooms: number;
  title: string;
  description: string;
  onChange: (patch: {
    max_guests?: number;
    bedrooms?: number;
    bathrooms?: number;
    title?: string;
    description?: string;
  }) => void;
};

export function Step2Property({
  selectedSlug,
  onSelectType,
  maxGuests,
  bedrooms,
  bathrooms,
  title,
  description,
  onChange,
}: Props) {
  return (
    <div>
      <h2 className="text-[22px] font-extrabold text-brand-dark">🏠 Twój obiekt</h2>
      <p className="mt-1 text-sm text-text-muted">Wybierz typ i podstawowe parametry.</p>

      <div className="mt-6 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
        {TYPES.map((t) => {
          const sel = selectedSlug === t.slug;
          return (
            <button
              key={t.slug}
              type="button"
              onClick={() => onSelectType(t.slug)}
              className={cn(
                "rounded-xl border-[1.5px] p-3.5 text-center transition-all",
                sel
                  ? "border-2 border-brand bg-brand-muted"
                  : "border-[#e5e7eb] hover:border-brand hover:bg-brand-surface"
              )}
            >
              <span className="text-[28px] leading-none">{t.emoji}</span>
              <p className="mt-1 text-xs font-bold text-brand-dark">{t.name}</p>
            </button>
          );
        })}
      </div>

      <div className="mt-4 grid grid-cols-3 gap-3">
        <label className="text-xs font-semibold text-text-secondary">
          Max gości
          <input
            type="number"
            min={1}
            max={20}
            className="input mt-1"
            value={maxGuests}
            onChange={(e) => onChange({ max_guests: Number(e.target.value) })}
          />
        </label>
        <label className="text-xs font-semibold text-text-secondary">
          Sypialnie
          <input
            type="number"
            min={1}
            className="input mt-1"
            value={bedrooms}
            onChange={(e) => onChange({ bedrooms: Number(e.target.value) })}
          />
        </label>
        <label className="text-xs font-semibold text-text-secondary">
          Łazienki
          <input
            type="number"
            min={1}
            className="input mt-1"
            value={bathrooms}
            onChange={(e) => onChange({ bathrooms: Number(e.target.value) })}
          />
        </label>
      </div>

      <label className="mt-6 block text-sm font-semibold text-brand-dark">
        Tytuł oferty
        <input
          className="input mt-2"
          value={title}
          onChange={(e) => onChange({ title: e.target.value })}
          placeholder="np. Domek z sauną na górskiej polanie"
        />
      </label>

      <label className="mt-4 block text-sm font-semibold text-brand-dark">
        Krótki opis
        <textarea
          className="input mt-2 min-h-[88px] resize-y"
          maxLength={300}
          value={description}
          onChange={(e) => onChange({ description: e.target.value })}
        />
        <span className="mt-1 block text-right text-[11px] text-text-muted">
          {description.length}/300
        </span>
      </label>
    </div>
  );
}
