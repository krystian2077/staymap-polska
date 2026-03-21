"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import type { Amenity, DestinationScore, Listing } from "@/types/listing";
import { generateBadges, MODE_EMOJI, SCORE_LABELS } from "@/lib/utils/booking";

type Props = {
  scores: DestinationScore;
  amenities: Amenity[];
  listing: Listing;
};

function scoresToRecord(s: DestinationScore): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(s)) {
    if (k === "calculated_at" || k === "version") continue;
    if (typeof v === "number" && !Number.isNaN(v)) out[k] = v;
  }
  return out;
}

export function DestinationScoreSection({ scores, amenities, listing }: Props) {
  const record = useMemo(() => scoresToRecord(scores), [scores]);
  const badges = useMemo(
    () =>
      generateBadges(
        record,
        amenities.map((a) => a.icon),
        listing
      ),
    [record, amenities, listing]
  );

  const sortedDims = useMemo(() => {
    return Object.entries(record)
      .map(([key, score]) => ({ key, score }))
      .sort((a, b) => b.score - a.score);
  }, [record]);

  const rowRef = useRef<HTMLDivElement>(null);
  const [barsOn, setBarsOn] = useState(false);

  useEffect(() => {
    const el = rowRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e?.isIntersecting) setBarsOn(true);
      },
      { threshold: 0.15 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <section className="mb-8 grid grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-8">
      <div ref={rowRef}>
        <h2 className="sec-h mb-2">Destination Score</h2>
        <p className="text-sm text-[#6b7280]">
          Heurystyczna ocena 0–10 obliczona z udogodnień, danych OSM i recenzji.
        </p>
        <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          {sortedDims.map(({ key, score }, index) => {
            const label = SCORE_LABELS[key] ?? key;
            const emoji = MODE_EMOJI[key] ?? "✨";
            const pct = Math.min(100, Math.max(0, score * 10));
            return (
              <div key={key} className="flex items-center gap-2">
                <span className="w-[100px] shrink-0 text-xs font-semibold text-[#6b7280]">
                  {emoji} {label}
                </span>
                <div className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-[#e5e7eb]">
                  <div
                    className="h-full rounded-full bg-brand transition-[width] duration-[800ms] ease-[cubic-bezier(.16,1,.3,1)]"
                    style={{
                      width: barsOn ? `${pct}%` : "0%",
                      transitionDelay: barsOn ? `${100 * index}ms` : "0ms",
                    }}
                  />
                </div>
                <span className="w-7 shrink-0 text-right text-xs font-extrabold text-[#0a2e1a]">
                  {score.toFixed(1)}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div>
        <h2 className="sec-h mb-2">Dlaczego to miejsce pasuje</h2>
        <p className="text-sm text-[#6b7280]">
          Każdy badge wyjaśnia, co konkretnie sprawia, że oferta pasuje do trybu podróży.
        </p>
        <ul className="mt-4">
          {badges.map((b, i) => (
            <li
              key={`${b.mode}-${b.is_positive ? "p" : "n"}`}
              className={`mb-2.5 flex cursor-pointer items-start gap-2.5 rounded-xl border-[1.5px] px-3.5 py-3 transition-all duration-200 ease-[cubic-bezier(.16,1,.3,1)] ${
                b.is_positive
                  ? "border-[#bbf7d0] bg-[#f0fdf4] hover:translate-x-[3px] hover:border-brand hover:bg-[#dcfce7]"
                  : "border-[#e5e7eb] bg-[#f9fafb] hover:bg-[#f3f4f6]"
              }`}
              style={{
                opacity: 0,
                transform: "translateY(20px)",
                animation: `fade-up 0.55s cubic-bezier(.16,1,.3,1) forwards`,
                animationDelay: `${i * 80}ms`,
              }}
            >
              <span className="mt-0.5 shrink-0 text-xl" aria-hidden>
                {MODE_EMOJI[b.mode] ?? "✨"}
              </span>
              <div className="min-w-0 flex-1">
                <p
                  className={`text-[13px] font-bold ${
                    b.is_positive ? "text-[#0a2e1a]" : "text-[#6b7280]"
                  }`}
                >
                  {b.title}
                </p>
                <p
                  className={`mt-0.5 text-xs leading-relaxed ${
                    b.is_positive ? "text-[#6b7280]" : "text-[#9ca3af]"
                  }`}
                >
                  {b.reason}
                </p>
              </div>
              <span
                className={`shrink-0 text-lg font-extrabold ${
                  b.is_positive ? "text-brand" : "text-[#9ca3af]"
                }`}
              >
                {b.score.toFixed(1)}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
