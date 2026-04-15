"use client";

import Link from "next/link";
import { useRef } from "react";
import type { CollectionCardData } from "@/components/home/WaterCollection";

export function MountainCollection({ cards }: { cards: CollectionCardData[] }) {
  const railRef = useRef<HTMLDivElement>(null);

  const scrollRail = (direction: "left" | "right") => {
    const el = railRef.current;
    if (!el) return;
    const delta = Math.round(el.clientWidth * 0.85) * (direction === "right" ? 1 : -1);
    el.scrollBy({ left: delta, behavior: "smooth" });
  };

  return (
    <section className="mx-auto w-full max-w-[1240px] px-4 pb-16 sm:px-6 md:px-12 md:pb-20">
      <div className="relative overflow-hidden rounded-[24px] bg-[linear-gradient(135deg,#f0fdf4_0%,#dcfce7_50%,#f0fdf4_100%)] px-4 pt-8 sm:px-6 sm:pt-9 md:px-10">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <span className="inline-flex rounded-pill border border-[#bbf7d0] bg-[#dcfce7] px-3 py-1 text-xs font-bold text-[#166534]">
              ⛰️ Gory
            </span>
            <h2 className="mt-3 text-[clamp(22px,5vw,28px)] font-black tracking-[-.7px] text-[#0a2e1a]">Gory na weekend</h2>
            <p className="mt-1 text-[14px] text-[#7a8f84]">Domki, apartamenty i chaty blisko szlakow i punktow widokowych</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => scrollRail("left")}
              className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full border border-[#bbf7d0] bg-white text-[#16a34a] transition hover:bg-[#dcfce7]"
              aria-label="Przewin oferty w lewo"
            >
              ←
            </button>
            <button
              type="button"
              onClick={() => scrollRail("right")}
              className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full border border-[#bbf7d0] bg-white text-[#16a34a] transition hover:bg-[#dcfce7]"
              aria-label="Przewin oferty w prawo"
            >
              →
            </button>
            <Link
              href="/search?travel_mode=mountains"
              className="ml-1 inline-flex min-h-[44px] items-center text-sm font-bold text-[#16a34a] hover:underline"
            >
              Wszystkie
            </Link>
          </div>
        </div>

        <span className="pointer-events-none absolute bottom-0 right-10 text-[80px] opacity-[.06] grayscale">⛰️</span>

        <div
          ref={railRef}
          className="flex snap-x snap-mandatory gap-4 overflow-x-auto overscroll-x-contain pb-9 pr-4 [scrollbar-width:none] sm:pr-6 [&::-webkit-scrollbar]:hidden"
        >
          {cards.map((card, index) => (
            <Link
              key={card.listingId ? `${card.listingId}-${index}` : `${card.href}-${index}`}
              href={card.href}
              className="group min-w-[264px] shrink-0 snap-start overflow-hidden rounded-[20px] border border-[#e4ebe7] bg-white shadow-[0_1px_3px_rgba(10,15,13,.05)] transition-all duration-300 ease-[cubic-bezier(.16,1,.3,1)] hover:-translate-y-1.5 hover:border-[#bbf7d0] hover:shadow-[0_24px_64px_rgba(10,15,13,.16)]"
            >
              <div className="relative flex h-[188px] items-center justify-center overflow-hidden" style={{ background: card.bg }}>
                <span className="text-[56px] transition-transform duration-500 group-hover:scale-110">{card.emoji}</span>
                <div className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent,rgba(10,46,26,.14))]" />
                <span className="absolute left-3 top-3 rounded-pill bg-[#16a34a] px-2 py-0.5 text-[10px] font-bold text-white">{card.badge}</span>
                <span className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-sm">🤍</span>
                {card.dist ? (
                  <span className="absolute bottom-2.5 right-2.5 rounded-pill bg-black/45 px-2 py-0.5 text-[10px] font-semibold text-white backdrop-blur-sm">
                    {card.dist}
                  </span>
                ) : null}
              </div>

              <div className="px-4 pb-4 pt-3.5">
                <p className="mb-1 line-clamp-2 text-[14px] font-bold leading-[1.3] text-[#0a0f0d]">{card.title}</p>
                <p className="mb-2.5 text-[11px] text-[#7a8f84]">📍 {card.loc}</p>
                <div className="flex items-center justify-between">
                  <p className="text-[16px] font-black text-[#0a0f0d]">{card.price} zl</p>
                  <p className="text-xs font-bold text-[#0a0f0d]">★ {card.rating.toFixed(2)} ({card.reviews})</p>
                </div>
              </div>
            </Link>
          ))}
        </div>

        <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-[linear-gradient(90deg,#16a34a,#4ade80,#16a34a)]" />
      </div>
    </section>
  );
}
