"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import type { DestinationScore } from "@/types/listing";
import { MODE_EMOJI, SCORE_LABELS } from "@/lib/utils/booking";

type Props = {
  scores: DestinationScore;
};

function scoresToRecord(s: DestinationScore): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(s)) {
    if (k === "calculated_at" || k === "version") continue;
    if (typeof v === "number" && !Number.isNaN(v)) out[k] = v;
  }
  return out;
}

export function DestinationScoreSection({ scores }: Props) {
  const record = useMemo(() => scoresToRecord(scores), [scores]);

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
    <section className="w-full">
      <div ref={rowRef}>
        <h2 className="mb-4 text-[22px] font-black tracking-tight text-brand-dark">Inteligentna ocena miejsca</h2>
        <p className="mb-8 text-[15px] font-medium leading-relaxed text-gray-400">
          Nasza autorska ocena 0–10 obliczona na podstawie udogodnień, danych geograficznych i realnych opinii gości.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 lg:gap-x-20 gap-y-6">
          {sortedDims.map(({ key, score }, index) => {
            const label = SCORE_LABELS[key] ?? key;
            const emoji = MODE_EMOJI[key] ?? "✨";
            const pct = Math.min(100, Math.max(0, score * 10));
            return (
              <div key={key} className="flex flex-col gap-2.5">
                <div className="flex justify-between text-[13px] font-black uppercase tracking-widest text-gray-400">
                  <span className="flex items-center gap-2">
                    <span className="text-lg opacity-80" aria-hidden>{emoji}</span> 
                    {label}
                  </span>
                  <span className="text-brand-dark">{score.toFixed(1)}</span>
                </div>
                <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-gray-50 shadow-inner">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-brand/40 to-brand shadow-[0_0_12px_rgba(22,101,52,0.2)] transition-[width] duration-[1200ms] ease-[cubic-bezier(.16,1,.3,1)]"
                    style={{
                      width: barsOn ? `${pct}%` : "0%",
                      transitionDelay: barsOn ? `${100 * index}ms` : "0ms",
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
