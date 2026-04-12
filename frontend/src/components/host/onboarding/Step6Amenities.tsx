"use client";

import { cn } from "@/lib/utils";

type AmenityOption = {
  id: string;
  label: string;
  emoji: string;
};

const AMENITY_OPTIONS: AmenityOption[] = [
  { id: "wifi", label: "Wi-Fi", emoji: "📶" },
  { id: "kitchen", label: "Kuchnia", emoji: "🍳" },
  { id: "parking", label: "Parking", emoji: "🚗" },
  { id: "air_conditioning", label: "Klimatyzacja", emoji: "❄️" },
  { id: "heating", label: "Ogrzewanie", emoji: "🔥" },
  { id: "washer", label: "Pralka", emoji: "🧺" },
  { id: "tv", label: "TV", emoji: "📺" },
  { id: "workspace", label: "Miejsce do pracy", emoji: "💻" },
  { id: "pet_friendly", label: "Przyjazne zwierzętom", emoji: "🐾" },
  { id: "pool", label: "Basen", emoji: "🏊" },
  { id: "sauna", label: "Sauna", emoji: "🧖" },
  { id: "grill", label: "Grill", emoji: "🔥" },
  { id: "fireplace", label: "Kominek", emoji: "🪵" },
  { id: "hot_tub", label: "Jacuzzi", emoji: "🛁" },
  { id: "child_friendly", label: "Dla rodzin z dziećmi", emoji: "👨‍👩‍👧" },
  { id: "accessible", label: "Udogodnienia dla osób z niepełnosprawnością", emoji: "♿" },
];

type Props = {
  selectedAmenityIds: string[];
  onChange: (amenityIds: string[]) => void;
};

export function Step6Amenities({ selectedAmenityIds, onChange }: Props) {
  const toggleAmenity = (amenityId: string) => {
    if (selectedAmenityIds.includes(amenityId)) {
      onChange(selectedAmenityIds.filter((id) => id !== amenityId));
      return;
    }
    onChange([...selectedAmenityIds, amenityId]);
  };

  return (
    <div>
      <h2 className="text-[22px] font-extrabold text-brand-dark">✨ Udogodnienia</h2>
      <p className="mt-1 text-sm text-text-muted">
        Wybierz to, co oferujesz gościom. Minimum 1 udogodnienie jest wymagane.
      </p>

      <div className="mt-5 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
        {AMENITY_OPTIONS.map((amenity) => {
          const active = selectedAmenityIds.includes(amenity.id);
          return (
            <button
              key={amenity.id}
              type="button"
              onClick={() => toggleAmenity(amenity.id)}
              className={cn(
                "rounded-xl border-[1.5px] px-3 py-3 text-left text-sm transition-all",
                active
                  ? "border-2 border-brand bg-brand-muted"
                  : "border-brand-dark/[.06] hover:border-brand"
              )}
            >
              <span className="text-base">{amenity.emoji}</span>
              <p className="mt-1 font-semibold text-brand-dark">{amenity.label}</p>
            </button>
          );
        })}
      </div>

      <p className="mt-4 text-sm font-semibold text-brand-dark">
        Wybrane: {selectedAmenityIds.length}
      </p>
    </div>
  );
}

