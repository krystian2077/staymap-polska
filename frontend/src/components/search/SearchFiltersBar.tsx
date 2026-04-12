"use client";

import { motion, AnimatePresence } from "framer-motion";
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

type Chip = { key: string; label: string; icon?: string };

export function SearchFiltersBar({ params, onRemove, className }: Props) {
  const chips: Chip[] = [];

  // Travel mode
  if (params.travel_mode) {
    const rawLabel = travelModeLabel(params.travel_mode);
    const [icon, ...rest] = rawLabel.split(" ");
    chips.push({
      key: "travel_mode",
      label: rest.join(" "),
      icon,
    });
  }

  // Listing types
  for (const lt of params.listing_types ?? []) {
    const t = LISTING_TYPES.find((x) => x.slug === lt);
    if (t) chips.push({ key: `lt:${lt}`, label: t.name, icon: t.icon });
  }

  // Amenities
  for (const am of params.amenities ?? []) {
    const a = AMENITY_CHIPS.find((x) => x.id === am);
    if (a) chips.push({ key: `am:${am}`, label: a.label, icon: a.icon });
  }

  // Pet friendly
  if (params.is_pet_friendly) {
    chips.push({ key: "is_pet_friendly", label: "Z psem", icon: "🐾" });
  }

  // Location tags
  for (const tag of LOCATION_TAG_KEYS) {
    if ((params as Record<string, unknown>)[tag] === true) {
      const chip = LOCATION_TAG_CHIPS.find((c) => c.key === tag);
      if (chip) {
        const [icon, ...rest] = chip.label.split(" ");
        chips.push({ key: `tag:${tag}`, label: rest.join(" "), icon });
      }
    }
  }

  // Price range
  if (params.min_price != null || params.max_price != null) {
    const lo = params.min_price ? `${params.min_price.toLocaleString("pl-PL")} zł` : "";
    const hi = params.max_price ? `${params.max_price.toLocaleString("pl-PL")} zł` : "";
    const label = lo && hi ? `${lo} – ${hi}` : lo ? `od ${lo}` : `do ${hi}`;
    chips.push({ key: "price", label, icon: "💰" });
  }

  // Booking mode
  if (params.booking_mode) {
    const label =
      params.booking_mode === "instant"
        ? "Natychmiastowa"
        : "Na prośbę";
    const icon = params.booking_mode === "instant" ? "⚡" : "📩";
    chips.push({ key: "booking_mode", label, icon });
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

  const handleClearAll = () => {
    onRemove({
      travel_mode: undefined,
      listing_types: undefined,
      amenities: undefined,
      is_pet_friendly: undefined,
      min_price: undefined,
      max_price: undefined,
      booking_mode: undefined,
      // clear all location tags
      ...LOCATION_TAG_KEYS.reduce((acc, k) => ({ ...acc, [k]: undefined }), {}),
    });
  };

  return (
    <div
      className={cn(
        "flex items-center gap-2.5 overflow-x-auto px-1 py-2.5 [scrollbar-width:none]",
        "[&::-webkit-scrollbar]:hidden",
        className,
      )}
    >
      <AnimatePresence mode="popLayout">
        {chips.map((chip) => (
          <motion.div
            key={chip.key}
            layout
            initial={{ opacity: 0, x: -10, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8, x: 10 }}
            transition={{
              type: "spring",
              stiffness: 400,
              damping: 30,
            }}
            className={cn(
              "group flex shrink-0 items-center gap-2 rounded-full border border-brand/20 bg-white py-2 pl-3.5 pr-2.5 shadow-sm transition-all hover:border-brand/40 active:scale-[0.98]",
            )}
          >
            {chip.icon && (
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-surface text-[14px] shadow-xs group-hover:bg-brand group-hover:text-white transition-all">
                {chip.icon}
              </span>
            )}
            <span className="text-[13px] font-bold tracking-tight text-brand-dark">
              {chip.label}
            </span>
            <button
              type="button"
              onClick={() => handleRemove(chip)}
              aria-label={`Usuń filtr: ${chip.label}`}
              className="ml-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-surface text-brand-dark/40 transition-all hover:bg-red-500 hover:text-white focus:outline-none focus:ring-2 focus:ring-red-500/20 active:scale-90"
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </motion.div>
        ))}

        {chips.length > 1 && (
          <motion.button
            key="clear-all"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            onClick={handleClearAll}
            className="flex shrink-0 items-center gap-1.5 rounded-full border border-brand/20 bg-white px-4 py-2 text-[13px] font-bold text-brand-dark transition-all hover:border-red-500/30 hover:bg-red-500/10 hover:text-red-500 active:scale-95"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M3 6h18m-2 0v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6m3 0V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
            </svg>
            Wyczyść
          </motion.button>
        )}
      </AnimatePresence>
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
