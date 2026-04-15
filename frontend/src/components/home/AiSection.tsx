"use client";

import Link from "next/link";
import { useCallback, useRef, useState } from "react";
import { cn } from "@/lib/utils";

const AI_RESULTS = [
  {
    emoji: "🏔️",
    title: "Domek z sauną i jacuzzi na polanie",
    reasons: "Sauna ✓ · Widok ✓ · Prywatność ✓",
    match: "98% dopasowania",
    matchShort: "98%",
    price: "320 zł",
    priceSub: "/ noc",
  },
  {
    emoji: "🏡",
    title: "Chata bieszczadzka z sauną fińską",
    reasons: "Cisza ✓ · Kominek ✓ · Szybki dojazd",
    match: "94% dopasowania",
    matchShort: "94%",
    price: "360 zł",
    priceSub: "/ noc",
  },
  {
    emoji: "🧖",
    title: "Willa SPA z hot tubem i tarasem",
    reasons: "Wellness ✓ · Rodzina ✓ · Las",
    match: "91% dopasowania",
    matchShort: "91%",
    price: "520 zł",
    priceSub: "/ noc",
  },
];

export function AiSection() {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [activeIdx, setActiveIdx] = useState(0);

  const scrollToCard = useCallback((index: number) => {
    const root = scrollerRef.current;
    const card = root?.children[index] as HTMLElement | undefined;
    card?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
    setActiveIdx(index);
  }, []);

  const onScrollerScroll = useCallback(() => {
    const root = scrollerRef.current;
    if (!root) return;
    const { scrollLeft, clientWidth } = root;
    const viewportCenter = scrollLeft + clientWidth / 2;
    const cards = Array.from(root.children) as HTMLElement[];
    let best = 0;
    let bestDist = Infinity;
    cards.forEach((el, i) => {
      const cardCenter = el.offsetLeft + el.offsetWidth / 2;
      const dist = Math.abs(cardCenter - viewportCenter);
      if (dist < bestDist) {
        bestDist = dist;
        best = i;
      }
    });
    setActiveIdx(best);
  }, []);

  return (
    <section
      aria-labelledby="ai-section-heading"
      data-testid="home-ai-section"
      className="relative overflow-hidden px-4 pb-20 pt-14 sm:px-6 sm:pb-20 sm:pt-16 md:px-10 md:pb-24 md:pt-20"
    >
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(165deg,#061a10_0%,#0a2e1a_38%,#142e1f_72%,#0a1f14_100%)]" />
      <div className="pointer-events-none absolute -left-32 top-0 h-[420px] w-[420px] rounded-full bg-[#16a34a]/25 blur-[100px]" />
      <div className="pointer-events-none absolute -right-40 bottom-[-80px] h-[380px] w-[380px] rounded-full bg-[#7c3aed]/22 blur-[100px]" />
      <div className="pointer-events-none absolute left-1/2 top-24 h-px w-[min(90%,480px)] -translate-x-1/2 bg-gradient-to-r from-transparent via-white/15 to-transparent" />

      <div className="relative mx-auto grid w-full max-w-[1100px] gap-12 lg:grid-cols-[1.05fr_.95fr] lg:items-center lg:gap-12">
        <div className="text-center lg:text-left">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-gradient-to-r from-white/[0.12] to-white/[0.05] px-3.5 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-[#d9f99d] shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] sm:text-[11px]">
            AI Search
          </div>
          <h2
            id="ai-section-heading"
            className="mx-auto mt-4 max-w-[22ch] text-[clamp(24px,6.2vw,54px)] font-black leading-[1.08] tracking-[-0.04em] text-white lg:mx-0 lg:max-w-none"
          >
            Opowiedz czego szukasz,
            <span className="mt-1 block bg-[linear-gradient(92deg,#e9d5ff_0%,#86efac_55%,#34d399_100%)] bg-clip-text text-transparent lg:mt-0 lg:inline lg:bg-[linear-gradient(90deg,#a78bfa_0%,#34d399_100%)]">
              a AI znajdzie najlepsze miejsca
            </span>
          </h2>
          <p className="mx-auto mt-4 max-w-[36ch] text-[14px] leading-relaxed text-white/[0.88] sm:mt-5 sm:max-w-[580px] sm:text-[15px] sm:leading-8 md:text-[16px] lg:mx-0">
            Bez kolejnych filtrów — napisz naturalnie, a system dopasuje oferty i wyjaśni, czemu pasują do
            Twojego stylu podróży.
          </p>

          <div className="mx-auto mt-9 flex max-w-md flex-col gap-3.5 sm:mt-9 sm:max-w-none sm:flex-row sm:flex-wrap sm:gap-3 lg:mx-0">
            <Link
              href="/ai"
              data-testid="home-ai-cta-primary"
              className="inline-flex min-h-[52px] w-full items-center justify-center rounded-2xl bg-gradient-to-b from-[#8b5cf6] to-[#6d28d9] px-6 py-3.5 text-[15px] font-bold text-white shadow-[0_14px_40px_rgba(124,58,237,0.42),inset_0_1px_0_rgba(255,255,255,0.18)] transition-all duration-300 ease-[cubic-bezier(.16,1,.3,1)] hover:-translate-y-0.5 hover:shadow-[0_18px_44px_rgba(124,58,237,0.5)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c4b5fd] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a1f14] active:translate-y-0 sm:w-auto sm:min-w-[200px] sm:rounded-[14px] sm:py-3 sm:text-sm"
            >
              Wypróbuj AI Search
            </Link>
            <Link
              href="/search"
              data-testid="home-ai-cta-secondary"
              className="inline-flex min-h-[50px] w-full items-center justify-center rounded-2xl border border-white/22 bg-white/[0.08] px-6 py-3 text-[14px] font-bold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] backdrop-blur-md transition-all duration-300 ease-[cubic-bezier(.16,1,.3,1)] hover:border-white/35 hover:bg-white/14 sm:w-auto sm:rounded-[14px] sm:text-sm"
            >
              Klasyczne wyszukiwanie
            </Link>
          </div>
        </div>

        <div className="relative mx-auto mt-2 w-full max-w-[400px] sm:mt-0 lg:max-w-none">
          <div
            className="absolute -inset-px rounded-[28px] bg-gradient-to-br from-white/25 via-white/[0.07] to-transparent opacity-80 blur-[1px] dark:opacity-60"
            aria-hidden
          />
          <div className="relative overflow-hidden rounded-[26px] border border-white/18 bg-[linear-gradient(165deg,rgba(255,255,255,0.16)_0%,rgba(255,255,255,0.05)_40%,rgba(0,0,0,0.14)_100%)] p-1 shadow-[0_28px_72px_rgba(0,0,0,0.42),inset_0_1px_0_rgba(255,255,255,0.14)] backdrop-blur-2xl sm:rounded-[28px] sm:p-1.5">
            <div className="rounded-[22px] border border-white/12 bg-black/20 p-4 sm:rounded-[24px] sm:p-5">
              <div className="rounded-2xl border border-white/14 bg-gradient-to-br from-white/[0.1] to-white/[0.03] px-3.5 py-3.5 text-left text-[13px] font-medium leading-relaxed text-white/95 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] sm:px-4 sm:py-3.5 sm:text-[14px]">
                <span className="font-serif text-[1.05em] text-white/50">&ldquo;</span>
                Szukam spokojnego domku z sauną dla dwojga, blisko lasu, najlepiej w górach
                <span className="font-serif text-[1.05em] text-white/50">&rdquo;</span>
              </div>
              <div className="mt-3 flex items-center gap-2 text-[12px] text-violet-200/90 sm:mt-4">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-violet-400 opacity-40 motion-reduce:animate-none" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-violet-400" />
                </span>
                <span className="font-semibold tracking-wide">Analizuję 2 400+ ofert…</span>
              </div>

              <div className="relative mt-5 sm:mt-5">
                <div
                  ref={scrollerRef}
                  onScroll={onScrollerScroll}
                  className="-mx-0 flex gap-3 overflow-x-auto pb-1 pt-0.5 [scrollbar-width:none] snap-x snap-mandatory scroll-pl-4 scroll-pr-4 sm:mx-0 sm:flex-col sm:gap-3 sm:overflow-visible sm:scroll-pl-0 sm:scroll-pr-0 sm:pb-0 sm:snap-none [&::-webkit-scrollbar]:hidden lg:flex-col"
                >
                  {AI_RESULTS.map((result, idx) => (
                    <div
                      key={result.title}
                      className={cn(
                        "flex w-[calc(100vw-2.25rem)] max-w-[340px] shrink-0 snap-center flex-col gap-2.5 rounded-2xl border border-white/14 bg-gradient-to-br from-white/[0.1] to-white/[0.04] p-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] transition-all duration-300 sm:w-auto sm:max-w-none sm:min-w-0 sm:flex-row sm:items-center sm:gap-3 sm:p-3 sm:hover:translate-x-1 sm:hover:bg-white/[0.12] motion-reduce:sm:hover:translate-x-0",
                        idx === activeIdx && "ring-2 ring-violet-400/45 ring-offset-2 ring-offset-[#0c2218] sm:ring-1 sm:ring-offset-0"
                      )}
                    >
                      <div className="flex gap-3 sm:min-w-0 sm:flex-1 sm:items-center">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-white/22 to-white/6 text-lg shadow-inner sm:h-12 sm:w-12 sm:text-xl">
                          {result.emoji}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="line-clamp-2 text-[13px] font-bold leading-snug text-white sm:text-[13.5px] sm:leading-tight">
                            {result.title}
                          </p>
                          <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-white/72">{result.reasons}</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between gap-3 border-t border-white/10 pt-2.5 sm:flex-col sm:items-end sm:justify-center sm:border-0 sm:pt-0 sm:shrink-0">
                        <p className="rounded-full bg-violet-500/40 px-2.5 py-1 text-[10px] font-bold tabular-nums text-violet-50 sm:bg-violet-500/35 sm:py-0.5">
                          <span className="sm:hidden">{result.matchShort}% dopas.</span>
                          <span className="hidden sm:inline">{result.match}</span>
                        </p>
                        <p className="text-right text-[13px] font-bold tabular-nums text-emerald-300">
                          {result.price}
                          <span className="text-[11px] font-semibold text-emerald-400/90">{result.priceSub}</span>
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
                <div
                  className="pointer-events-none absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-[#0a1f14] via-[#0a1f14]/70 to-transparent sm:hidden"
                  aria-hidden
                />
                <div
                  className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-[#0a1f14] via-[#0a1f14]/70 to-transparent sm:hidden"
                  aria-hidden
                />
              </div>

              <div className="mt-4 flex justify-center gap-1.5 sm:hidden">
                {AI_RESULTS.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => scrollToCard(i)}
                    className={cn(
                      "h-2 rounded-full transition-all duration-300",
                      i === activeIdx ? "w-6 bg-white" : "w-2 bg-white/35 hover:bg-white/55"
                    )}
                    aria-label={`Przykład ${i + 1}`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
