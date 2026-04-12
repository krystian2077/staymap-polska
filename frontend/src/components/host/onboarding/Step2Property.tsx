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
  beds: number;
  bathrooms: number;
  title: string;
  description: string;
  onChange: (patch: {
    max_guests?: number;
    bedrooms?: number;
    beds?: number;
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
  beds,
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
                "rounded-[20px] border-[1.5px] p-4 text-center transition-all",
                sel
                  ? "border-2 border-brand bg-brand-muted/40 shadow-sm"
                  : "border-brand-dark/[.06] hover:border-brand/40 hover:bg-brand-surface"
              )}
            >
              <span className="text-[28px] leading-none">{t.emoji}</span>
              <p className="mt-1 text-xs font-bold text-brand-dark">{t.name}</p>
            </button>
          );
        })}
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <label className="text-[11px] font-bold uppercase tracking-wider text-text-muted">
          Max gości
          <input
            type="number"
            min={1}
            max={50}
            className="input mt-1.5"
            value={maxGuests}
            onChange={(e) => onChange({ max_guests: Number(e.target.value) })}
          />
        </label>
        <label className="text-[11px] font-bold uppercase tracking-wider text-text-muted">
          Sypialnie
          <input
            type="number"
            min={1}
            className="input mt-1.5"
            value={bedrooms}
            onChange={(e) => onChange({ bedrooms: Number(e.target.value) })}
          />
        </label>
        <label className="text-[11px] font-bold uppercase tracking-wider text-text-muted">
          Łóżka
          <input
            type="number"
            min={1}
            className="input mt-1.5"
            value={beds}
            onChange={(e) => onChange({ beds: Number(e.target.value) })}
          />
        </label>
        <label className="text-[11px] font-bold uppercase tracking-wider text-text-muted">
          Łazienki
          <input
            type="number"
            min={1}
            className="input mt-1.5"
            value={bathrooms}
            onChange={(e) => onChange({ bathrooms: Number(e.target.value) })}
          />
        </label>
      </div>

      <label className="mt-8 block text-sm font-semibold text-brand-dark">
        Tytuł oferty
        <input
          className="input mt-2"
          value={title}
          onChange={(e) => onChange({ title: e.target.value })}
          placeholder="np. Przytulny domek z sauną na górskiej polanie"
        />
        <span className="mt-1.5 block text-[11px] font-medium text-text-muted">
          Minimum 5 znaków ({title.trim().length}/5)
        </span>
      </label>

      <label className="mt-5 block text-sm font-semibold text-brand-dark">
        Opis dla gości
        <textarea
          className="input mt-2 min-h-[120px] resize-y py-3"
          maxLength={1000}
          placeholder="Opisz swój obiekt, okolicę i co sprawia, że jest wyjątkowy..."
          value={description}
          onChange={(e) => onChange({ description: e.target.value })}
        />
        <span className="mt-1.5 block text-right text-[11px] font-medium text-text-muted">
          Min. 20 znaków ({description.trim().length}/20) · {description.length}/1000
        </span>
      </label>
    </div>
  );
}
