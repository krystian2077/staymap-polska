"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { SimilarListing } from "@/types/listing";

type Card = {
  emoji: string;
  bg: string;
  disc: string;
  avail: string;
  title: string;
  loc: string;
  newPrice: number;
  oldPrice: number;
  href: string;
};

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const secs = Math.floor(seconds % 60)
    .toString()
    .padStart(2, "0");
  return `${mins}:${secs}`;
}

const FALLBACK_CARDS: Card[] = [
  {
    emoji: "⛺",
    bg: "linear-gradient(135deg,#1a3a1a,#2a4a2a)",
    disc: "-29%",
    avail: "Jutro!",
    title: "Glamping Eco nad rzeka",
    loc: "Dolina Baryczy",
    newPrice: 149,
    oldPrice: 210,
    href: "/search?location=Dolina%20Baryczy",
  },
  {
    emoji: "🏔️",
    bg: "linear-gradient(135deg,#1a2a3a,#2a3a4a)",
    disc: "-27%",
    avail: "2 wolne",
    title: "Apartament z widokiem",
    loc: "Szklarska Poreba",
    newPrice: 175,
    oldPrice: 240,
    href: "/search?location=Szklarska%20Poreba",
  },
  {
    emoji: "🌲",
    bg: "linear-gradient(135deg,#1a2e1a,#1f351f)",
    disc: "-34%",
    avail: "Ostatnie!",
    title: "Chatka w borach",
    loc: "Roztocze",
    newPrice: 145,
    oldPrice: 220,
    href: "/search?location=Roztocze",
  },
];

export function LastMinute({ items }: { items: SimilarListing[] }) {
  const secsRef = useRef(872);
  const [display, setDisplay] = useState(formatTime(secsRef.current));

  useEffect(() => {
    const id = setInterval(() => {
      secsRef.current -= 1;
      if (secsRef.current < 0) secsRef.current = 1799;
      setDisplay(formatTime(secsRef.current));
    }, 1000);
    return () => clearInterval(id);
  }, []);

  const cards = useMemo<Card[]>(() => {
    if (!items.length) return FALLBACK_CARDS;
    return items.slice(0, 3).map((item, idx) => {
      const discount = [29, 27, 34][idx] ?? 25;
      const now = Math.round(Number(item.base_price) || 199);
      const old = Math.round(now / (1 - discount / 100));
      return {
        emoji: idx === 0 ? "⛺" : idx === 1 ? "🏔️" : "🌲",
        bg: FALLBACK_CARDS[idx]?.bg ?? "linear-gradient(135deg,#1a2a3a,#2a3a4a)",
        disc: `-${discount}%`,
        avail: idx === 0 ? "Jutro!" : idx === 1 ? "2 wolne" : "Ostatnie!",
        title: item.title,
        loc: [item.location?.city, item.location?.region].filter(Boolean).join(", "),
        newPrice: now,
        oldPrice: old,
        href: `/listing/${item.slug}`,
      };
    });
  }, [items]);

  return (
    <section className="mx-auto w-full max-w-[1240px] px-6 pb-20 md:px-12">
      <div className="relative overflow-hidden rounded-[28px] bg-[linear-gradient(135deg,#1e0a42_0%,#2d1264_40%,#1a0f38_100%)] px-6 py-10 md:px-[52px] md:py-12">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 400px 300px at 10% 50%, rgba(124,58,237,.2), transparent), radial-gradient(ellipse 300px 300px at 90% 20%, rgba(74,222,128,.1), transparent)",
          }}
          aria-hidden
        />
        <div className="pointer-events-none absolute left-0 right-0 top-0 h-[2px] animate-[scanline_4s_linear_infinite] bg-[linear-gradient(90deg,transparent,rgba(124,58,237,.4),transparent)]" />

        <div className="relative z-[1] flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-[420px]">
            <span className="mb-4 inline-flex items-center gap-2 rounded-pill border border-[rgba(239,68,68,.3)] bg-[rgba(239,68,68,.18)] px-3 py-1 text-[11px] font-bold text-[#fca5a5]">
              <span className="h-[7px] w-[7px] animate-pulse rounded-full bg-[#ef4444]" />
              DOSTEPNE W TEN WEEKEND
            </span>

            <h2 className="text-[clamp(26px,4vw,44px)] font-black leading-[1.05] tracking-[-1.5px] text-white">
              Last minute -
              <br />
              <span className="bg-[linear-gradient(90deg,#a78bfa_0%,#34d399_100%)] bg-clip-text text-transparent">
                ostatnie wolne terminy
              </span>
            </h2>
            <p className="mb-5 mt-3 text-[14px] leading-[1.65] text-white/55">
              Oferty dostepne na najblizsze dni. Ceny odswiezamy automatycznie co 30 minut.
            </p>

            <div className="flex flex-wrap items-center gap-5">
              {[{ n: display, d: "do kolejnej aktualizacji" }, { n: "23", d: "wolnych miejsc" }, { n: "-38%", d: "srednia obnizka" }].map(
                (s) => (
                  <div key={s.d} className="pr-4 last:pr-0 md:border-r md:border-r-white/15 md:last:border-r-0">
                    <p className="text-[26px] font-black text-white">{s.n}</p>
                    <p className="text-[11px] text-white/45">{s.d}</p>
                  </div>
                )
              )}
            </div>
          </div>

          <div className="flex gap-3 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {cards.map((card) => (
              <Link
                key={card.title}
                href={card.href}
                className="w-[200px] shrink-0 overflow-hidden rounded-[18px] border border-white/10 bg-white/10 transition-all duration-300 ease-[cubic-bezier(.16,1,.3,1)] hover:-translate-y-1 hover:bg-white/15 hover:shadow-[0_16px_40px_rgba(0,0,0,.3)]"
              >
                <div className="relative flex h-[110px] items-center justify-center text-4xl" style={{ background: card.bg }}>
                  {card.emoji}
                  <span className="absolute left-2 top-2 rounded-pill bg-[rgba(239,68,68,.9)] px-2 py-0.5 text-[10px] font-bold text-white">
                    {card.disc}
                  </span>
                  <span className="absolute bottom-2 right-2 rounded-pill bg-black/50 px-2 py-0.5 text-[10px] font-semibold text-white/90 backdrop-blur-sm">
                    {card.avail}
                  </span>
                </div>
                <div className="px-3 py-2.5">
                  <p className="mb-1 line-clamp-2 text-xs font-bold text-white">{card.title}</p>
                  <p className="mb-1.5 text-[10px] text-white/55">{card.loc}</p>
                  <div className="flex items-end justify-between">
                    <div>
                      <p className="text-[13px] font-black text-[#4ade80]">{card.newPrice} zl</p>
                      <p className="text-[11px] text-white/35 line-through">{card.oldPrice} zl</p>
                    </div>
                    <span className="rounded-[10px] bg-[rgba(124,58,237,.8)] px-2 py-1 text-[11px] font-bold text-white">
                      Zarezerwuj →
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
