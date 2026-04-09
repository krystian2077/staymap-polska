"use client";

import { LOCATION_TAG_CHIPS, LOCATION_TAG_KEYS } from "@/lib/locationTags";
import type { SearchParamsState } from "@/lib/store/searchStore";
import { cn } from "@/lib/utils";

export const LISTING_TYPES = [
  { slug: "domek", name: "Domek", icon: "🏡" },
  { slug: "apartament", name: "Apartament", icon: "🏢" },
  { slug: "chata", name: "Chata", icon: "🪵" },
  { slug: "kemping", name: "Kemping", icon: "⛺" },
  { slug: "luksus", name: "Luksus", icon: "💎" },
  { slug: "pokoj", name: "Pokój", icon: "🛏️" },
  { slug: "dworek", name: "Dworek", icon: "🏰" },
];

export const AMENITY_CHIPS = [
  { id: "wifi", label: "Wi-Fi", icon: "📶" },
  { id: "pool", label: "Basen", icon: "🏊" },
  { id: "sauna", label: "Sauna", icon: "🧖" },
  { id: "jacuzzi", label: "Jacuzzi", icon: "🛁" },
  { id: "bbq", label: "Grill / BBQ", icon: "🔥" },
  { id: "parking", label: "Parking", icon: "🚗" },
  { id: "fireplace", label: "Kominek", icon: "🪵" },
  { id: "ev_charger", label: "Ładow. EV", icon: "⚡" },
  { id: "dishwasher", label: "Zmywarka", icon: "🍽️" },
  { id: "washing_machine", label: "Pralka", icon: "👕" },
  { id: "air_conditioning", label: "Klimatyzacja", icon: "❄️" },
  { id: "garden", label: "Ogród", icon: "🌿" },
  { id: "terrace", label: "Taras", icon: "🌅" },
  { id: "balcony", label: "Balkon", icon: "🏙️" },
  { id: "boat_access", label: "Dostęp do łodzi", icon: "⛵" },
];

type Props = {
  params: SearchParamsState;
  onRemove: (update: Partial<SearchParamsState>) => void;
  className?: string;
};

type Chip = { key: string; label: string };

export function SearchFiltersBar({ params, onRemove, className }: Props) {
  const chips: Chip[] = [];

  // Travel mode
  if (params.travel_mode) {
    chips.push({
      key: "travel_mode",
      label: travelModeLabel(params.travel_mode),
    });
  }

  // Listing types
  for (const lt of params.listing_types ?? []) {
    const t = LISTING_TYPES.find((x) => x.slug === lt);
    if (t) chips.push({ key: `lt:${lt}`, label: `${t.icon} ${t.name}` });
  }

  // Amenities
  for (const am of params.amenities ?? []) {
    const a = AMENITY_CHIPS.find((x) => x.id === am);
    if (a) chips.push({ key: `am:${am}`, label: `${a.icon} ${a.label}` });
  }

  // Pet friendly
  if (params.is_pet_friendly) {
    chips.push({ key: "is_pet_friendly", label: "🐾 Z psem" });
  }

  // Location tags
  for (const tag of LOCATION_TAG_KEYS) {
    if ((params as Record<string, unknown>)[tag] === true) {
      const chip = LOCATION_TAG_CHIPS.find((c) => c.key === tag);
      if (chip) chips.push({ key: `tag:${tag}`, label: chip.label });
    }
  }

  // Price range
  if (params.min_price != null || params.max_price != null) {
    const lo = params.min_price ? `${params.min_price} zł` : "";
    const hi = params.max_price ? `${params.max_price} zł` : "";
    const label = lo && hi ? `${lo} – ${hi}` : lo ? `min ${lo}` : `max ${hi}`;
    chips.push({ key: "price", label: `💰 ${label}` });
  }

  // Booking mode
  if (params.booking_mode) {
    const label =
      params.booking_mode === "instant"
        ? "⚡ Natychmiastowa"
        : "📩 Na prośbę";
    chips.push({ key: "booking_mode", label });
  }

  if (chips.length === 0) return null;

  const handleRemove = (chip: Chip) => {
    if (chip.key === "travel_mode") onRemove({ travel_mode: undefined });
    else if (chip.key.startsWith("lt:")) {
      const slug = chip.key.slice(3);
      onRemove({
        listing_types: (params.listing_types ?? []).filter((x) => x !== slug),
      });
    } else if (chip.key.startsWith("am:")) {
      const id = chip.key.slice(3);
      onRemove({
        amenities: (params.amenities ?? []).filter((x) => x !== id),
      });
    } else if (chip.key === "is_pet_friendly") {
      onRemove({ is_pet_friendly: undefined });
    } else if (chip.key.startsWith("tag:")) {
      const tag = chip.key.slice(4);
      onRemove({ [tag]: undefined } as Partial<SearchParamsState>);
    } else if (chip.key === "price") {
      onRemove({ min_price: undefined, max_price: undefined });
    } else if (chip.key === "booking_mode") {
      onRemove({ booking_mode: undefined });
    }
  };

  return (
    <div
      className={cn(
        "flex items-center gap-1.5 overflow-x-auto px-1 pb-0.5 [scrollbar-width:none]",
        "[&::-webkit-scrollbar]:hidden",
        className,
      )}
    >
      {chips.map((chip) => (
        <span
          key={chip.key}
          className="flex shrink-0 items-center gap-1.5 rounded-full border border-brand-border bg-brand-surface px-2.5 py-1 text-[11px] font-semibold text-brand-dark"
        >
          {chip.label}
          <button
            type="button"
            onClick={() => handleRemove(chip)}
            aria-label={`Usuń filtr: ${chip.label}`}
            className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-brand/20 text-[9px] text-brand-dark transition-colors hover:bg-brand hover:text-white"
          >
            ✕
          </button>
        </span>
      ))}
    </div>
  );
}

function travelModeLabel(mode: string): string {
  const map: Record<string, string> = {
    romantic: "💑 Romantyczny",
    family: "👨‍👩‍👧 Rodzinny",
    pet: "🐕 Z psem",
    workation: "💻 Workation",
    slow: "🌿 Slow escape",
    outdoor: "🏕️ Outdoor",
    lake: "🏊 Jezioro",
    mountains: "⛰️ Góry",
    wellness: "🧖 Wellness",
  };
  return map[mode] ?? mode;
}
