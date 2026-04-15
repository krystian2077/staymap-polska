"use client";

import type { LastMinuteListing } from "@/types/ai";
import { LastMinuteCard } from "@/components/discovery/LastMinuteCard";

type Props = {
  listings: LastMinuteListing[];
};

export function LastMinute3DSlider({ listings }: Props) {
  if (listings.length === 0) {
    return (
      <div className="mb-16 flex h-40 w-full items-center justify-center rounded-2xl border-2 border-dashed border-gray-100 bg-white dark:border-white/20 dark:bg-[var(--bg2)]">
        <p className="text-sm italic text-text-muted dark:text-white/70">Obecnie brak ofert last minute. Wroc niebawem!</p>
      </div>
    );
  }

  const railItems = [...listings, ...listings];
  const duration = `${Math.max(30, listings.length * 6)}s`;

  return (
    <div className="lm3d-shell relative mb-16">
      <div
        className="pointer-events-none absolute inset-y-0 left-0 z-10 w-10 bg-gradient-to-r from-[#fafbfc] to-transparent dark:from-[var(--background)] sm:w-12 md:w-14"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute inset-y-0 right-0 z-10 w-10 bg-gradient-to-l from-[#fafbfc] to-transparent dark:from-[var(--background)] sm:w-12 md:w-14"
        aria-hidden="true"
      />

      <div
        className="lm3d-rail"
        style={{ ["--lm3d-duration" as string]: duration }}
        role="region"
        aria-label="Slider z ofertami last minute"
      >
        <div className="lm3d-track">
          {railItems.map((listing, idx) => {
            return (
              <div
                key={`${listing.id}-${idx}`}
                className="lm3d-card w-[min(90vw,380px)] shrink-0 sm:w-[350px] md:w-[360px]"
                role="presentation"
              >
                <LastMinuteCard listing={listing} />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

