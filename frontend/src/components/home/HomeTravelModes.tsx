"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { TravelModeSelector } from "@/components/search/TravelModeSelector";

export function HomeTravelModes() {
  const router = useRouter();
  const [sel, setSel] = useState<string | null>(null);

  return (
    <section className="px-8 pb-0 pt-[52px]">
      <div className="mx-auto max-w-[1200px]">
        <h2 className="mb-4 text-lg font-bold text-brand-dark">Tryb podróży</h2>
        <TravelModeSelector
          variant="home"
          selected={sel}
          onChange={(m) => {
            setSel(m);
            if (m) router.push(`/search?travel_mode=${encodeURIComponent(m)}`);
          }}
        />
      </div>
    </section>
  );
}
