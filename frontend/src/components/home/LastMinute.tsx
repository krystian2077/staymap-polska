"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { SimilarListing } from "@/types/listing";

type Card = {
  emoji: string;
  bg: string;
  discount: number;
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
    discount: 29,
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
    discount: 27,
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
    discount: 34,
    avail: "Ostatnie!",
    title: "Chatka w borach",
    loc: "Roztocze",
    newPrice: 145,
    oldPrice: 220,
    href: "/search?location=Roztocze",
  },
  {
    emoji: "🏕️",
    bg: "linear-gradient(135deg,#243b2f,#1f2a3f)",
    discount: 31,
    avail: "Weekend",
    title: "Kemping premium pod gwiazdami",
    loc: "Kaszuby",
    newPrice: 189,
    oldPrice: 274,
    href: "/search?location=Kaszuby",
  },
  {
    emoji: "🛶",
    bg: "linear-gradient(135deg,#133749,#1f5a5e)",
    discount: 26,
    avail: "Dzis",
    title: "Dom przy jeziorze z kajakami",
    loc: "Mikolajki",
    newPrice: 219,
    oldPrice: 296,
    href: "/search?location=Mikolajki",
  },
  {
    emoji: "🏡",
    bg: "linear-gradient(135deg,#2f244a,#49306c)",
    discount: 35,
    avail: "2 noce",
    title: "Willa z jacuzzi i sauna",
    loc: "Bieszczady",
    newPrice: 269,
    oldPrice: 414,
    href: "/search?location=Bieszczady",
  },
  {
    emoji: "🌊",
    bg: "linear-gradient(135deg,#1f395c,#2b5f86)",
    discount: 30,
    avail: "Last call",
    title: "Apartament 200m od plazy",
    loc: "Ustka",
    newPrice: 239,
    oldPrice: 341,
    href: "/search?location=Ustka",
  },
  {
    emoji: "🔥",
    bg: "linear-gradient(135deg,#3b1d1d,#5f2b2b)",
    discount: 33,
    avail: "Tylko dzis",
    title: "Domek z kominkiem i tarasem",
    loc: "Gory Stolowe",
    newPrice: 199,
    oldPrice: 297,
    href: "/search?location=Gory%20Stolowe",
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
    return items.slice(0, 8).map((item, idx) => {
      const discount = [34, 31, 29, 27, 35, 26, 30, 33][idx] ?? 25;
      const now = Math.round(Number(item.base_price) || 199);
      const old = Math.round(now / (1 - discount / 100));
      return {
        emoji: ["⛺", "🏔️", "🌲", "🏕️", "🛶", "🏡", "🌊", "🔥"][idx] ?? "✨",
        bg: FALLBACK_CARDS[idx]?.bg ?? "linear-gradient(135deg,#1a2a3a,#2a3a4a)",
        discount,
        avail: ["Jutro!", "2 wolne", "Ostatnie!", "Weekend", "Dzis", "2 noce", "Last call", "Tylko dzis"][idx] ?? "Szybko",
        title: item.title,
        loc: [item.location?.city, item.location?.region].filter(Boolean).join(", "),
        newPrice: now,
        oldPrice: old,
        href: `/listing/${item.slug}`,
      };
    });
  }, [items]);

  const avgDiscount = useMemo(() => {
    const total = cards.reduce((sum, card) => sum + card.discount, 0);
    return cards.length ? Math.round(total / cards.length) : 0;
  }, [cards]);

  const freeSlots = Math.max(18, cards.length * 4 - 3);
  const railCards = useMemo(() => [...cards, ...cards], [cards]);
  const scrollDuration = `${Math.max(26, cards.length * 6)}s`;

  return (
    <section className="mx-auto w-full max-w-[1240px] px-4 pb-16 sm:px-6 md:px-12 md:pb-20">
      <div className="relative overflow-hidden rounded-[28px] border border-[#9f7aea]/25 bg-[linear-gradient(125deg,#1a0d3d_0%,#2d1264_36%,#190f38_100%)] px-5 py-9 shadow-[0_28px_80px_rgba(76,29,149,.28)] sm:px-6 sm:py-10 md:px-[52px] md:py-12">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 420px 320px at 8% 52%, rgba(124,58,237,.24), transparent), radial-gradient(ellipse 320px 280px at 88% 18%, rgba(45,212,191,.16), transparent)",
          }}
          aria-hidden
        />
        <div className="pointer-events-none absolute left-0 right-0 top-0 h-[2px] animate-[scanline_4s_linear_infinite] bg-[linear-gradient(90deg,transparent,rgba(124,58,237,.4),transparent)]" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-[linear-gradient(180deg,transparent,rgba(10,6,23,.42))]" aria-hidden />

        <div className="relative z-[1] flex flex-col gap-7 md:gap-8">
          <div className="max-w-[980px]">
            <span className="mb-4 inline-flex items-center gap-2 rounded-pill border border-[rgba(239,68,68,.3)] bg-[rgba(239,68,68,.18)] px-3 py-1 text-[11px] font-bold text-[#fca5a5]">
              <span className="h-[7px] w-[7px] animate-pulse rounded-full bg-[#ef4444]" />
              DOSTEPNE W TEN WEEKEND
            </span>

            <h2 className="max-w-[720px] text-balance text-[clamp(32px,4vw,52px)] font-black leading-[1.02] tracking-[-1.8px] text-white">
              Last minute - <span className="bg-[linear-gradient(90deg,#a78bfa_0%,#2dd4bf_55%,#34d399_100%)] bg-clip-text text-transparent">ostatnie wolne terminy</span>
            </h2>
            <p className="mt-3 max-w-[640px] text-[15px] leading-[1.7] text-white/65 md:text-[16px]">
              Wyselekcjonowane oferty premium na najblizsze dni. Ceny odswiezamy automatycznie co 30 minut, a najlepsze okazje pojawiaja sie w czasie rzeczywistym.
            </p>

            <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
              {[
                { n: display, d: "do kolejnej aktualizacji" },
                { n: String(freeSlots), d: "wolnych miejsc" },
                { n: `-${avgDiscount}%`, d: "srednia obnizka" },
              ].map((s) => (
                <div key={s.d} className="rounded-2xl border border-white/15 bg-white/[0.06] px-4 py-3 backdrop-blur-sm">
                  <p className="text-[30px] font-black leading-none text-white">{s.n}</p>
                  <p className="mt-1 text-[11px] text-white/55">{s.d}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="relative w-full">
            <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-10 bg-[linear-gradient(90deg,rgba(26,13,61,1),rgba(26,13,61,0))]" aria-hidden />
            <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-10 bg-[linear-gradient(270deg,rgba(26,13,61,1),rgba(26,13,61,0))]" aria-hidden />
            <div className="lm-rail overflow-hidden pt-1">
              <div className="lm-rail-track flex w-max gap-4 pb-1" style={{ animationDuration: scrollDuration }}>
                {railCards.map((card, idx) => {
                  const isDuplicate = idx >= cards.length;
                  return (
                    <Link
                      key={`${card.title}-${idx}`}
                      href={card.href}
                      aria-hidden={isDuplicate}
                      tabIndex={isDuplicate ? -1 : 0}
                      className="group w-[214px] shrink-0 overflow-hidden rounded-[20px] border border-white/15 bg-[linear-gradient(180deg,rgba(255,255,255,.14),rgba(255,255,255,.06))] shadow-[0_16px_40px_rgba(5,8,20,.35)] transition-all duration-300 ease-[cubic-bezier(.16,1,.3,1)] hover:-translate-y-1 hover:border-white/35 hover:shadow-[0_20px_46px_rgba(0,0,0,.42)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2dd4bf]"
                    >
                      <div className="relative flex h-[118px] items-center justify-center text-4xl" style={{ background: card.bg }}>
                        <span className="drop-shadow-[0_4px_10px_rgba(0,0,0,.35)]">{card.emoji}</span>
                        <span className="absolute left-2 top-2 rounded-pill bg-[rgba(239,68,68,.92)] px-2 py-0.5 text-[10px] font-bold text-white">
                          -{card.discount}%
                        </span>
                        <span className="absolute bottom-2 right-2 rounded-pill bg-black/55 px-2 py-0.5 text-[10px] font-semibold text-white/90 backdrop-blur-sm">
                          {card.avail}
                        </span>
                      </div>
                      <div className="px-3.5 py-3">
                        <p className="mb-1 line-clamp-2 text-[13px] font-bold text-white">{card.title}</p>
                        <p className="mb-2 text-[11px] text-white/60">{card.loc || "Polska"}</p>
                        <div className="flex items-end justify-between">
                          <div>
                            <p className="text-[15px] font-black text-[#34d399]">{card.newPrice} zl</p>
                            <p className="text-[11px] text-white/35 line-through">{card.oldPrice} zl</p>
                          </div>
                          <span className="rounded-[11px] bg-[linear-gradient(135deg,#7c3aed,#4f46e5)] px-2.5 py-1 text-[11px] font-bold text-white transition-transform duration-300 group-hover:translate-x-0.5">
                            Zarezerwuj →
                          </span>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
