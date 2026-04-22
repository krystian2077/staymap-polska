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

const AI_BENEFITS = ["Naturalny język", "Jasne uzasadnienie", "Wyniki gotowe od razu"];
const MOBILE_BENEFITS = AI_BENEFITS.slice(0, 2);

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
      className="relative overflow-hidden px-4 pb-10 pt-6 sm:px-6 sm:pb-20 sm:pt-14 md:px-10 md:pb-24 md:pt-16 xl:px-14"
    >
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(165deg,#04170e_0%,#0a2e1a_44%,#0f2a1f_70%,#10223a_100%)]" />
      <div className="pointer-events-none absolute -left-28 top-[-20px] h-[360px] w-[360px] rounded-full bg-emerald-400/20 blur-[95px] motion-safe:[animation:orb1_14s_ease-in-out_infinite]" />
      <div className="pointer-events-none absolute -right-24 bottom-[-80px] h-[330px] w-[330px] rounded-full bg-violet-500/20 blur-[100px] motion-safe:[animation:orb2_16s_ease-in-out_infinite]" />

      <div className="group relative mx-auto w-full max-w-[1440px] rounded-[22px] border border-white/15 bg-white/[0.06] p-2.5 shadow-[0_30px_80px_-44px_rgba(2,6,23,.75)] backdrop-blur transition-all duration-500 sm:rounded-[28px] sm:p-6 lg:rounded-[38px] lg:p-10 lg:hover:shadow-[0_44px_100px_-48px_rgba(2,6,23,.9)]">
        <div className="pointer-events-none absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />
        <div className="grid gap-6 sm:gap-9 lg:grid-cols-[1.08fr_.92fr] lg:items-center lg:gap-16 xl:gap-20">
          <div className="min-w-0 text-center lg:text-left">
            <div className="a1 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3.5 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.18em] text-emerald-100 sm:text-[11px]">
              AI Search
            </div>

            <h2
              id="ai-section-heading"
              className="a2 text-balance mx-auto mt-3.5 max-w-[14ch] break-words text-[clamp(23px,7.1vw,33px)] font-black leading-[1.08] tracking-[-0.02em] text-white sm:mt-4 sm:max-w-[20ch] sm:text-[clamp(31px,5.7vw,68px)] sm:leading-[1.03] sm:tracking-[-0.05em] lg:mx-0"
            >
              Opowiedz czego szukasz,
              <span className="mt-1.5 block max-w-full break-words bg-[linear-gradient(94deg,#7c3aed_0%,#16a34a_65%,#0ea5e9_100%)] bg-clip-text text-transparent">
                a AI znajdzie najlepsze miejsca
              </span>
            </h2>

            <p className="a3 text-balance mx-auto mt-3 max-w-[31ch] text-[13px] leading-relaxed text-white sm:mt-4 sm:max-w-[48ch] sm:text-[15px] sm:leading-7 md:text-[16px] lg:mx-0 lg:text-[17px]">
              <span className="sm:hidden">Napisz krótko, a AI od razu dobierze najlepsze oferty.</span>
              <span className="hidden sm:inline">
                Bez kolejnych filtrów - napisz naturalnie, a system dopasuje oferty i wyjaśni,
                czemu pasują do Twojego stylu podróży.
              </span>
            </p>

            <div className="a4 mx-auto mt-4 grid w-full max-w-[420px] grid-cols-2 gap-2 sm:mt-7 sm:max-w-[620px] sm:grid-cols-none sm:flex sm:flex-wrap sm:justify-center lg:mx-0 lg:justify-start">
              {MOBILE_BENEFITS.map((item) => (
                <span
                  key={`mobile-${item}`}
                  className="inline-flex min-h-[36px] items-center justify-center rounded-full border border-white/18 bg-white/10 px-2.5 py-1.5 text-[10px] font-semibold text-white/90 shadow-[0_8px_18px_-14px_rgba(2,6,23,.48)] transition-all duration-300 hover:border-white/30 hover:bg-white/16 sm:hidden"
                >
                  {item}
                </span>
              ))}
              {AI_BENEFITS.map((item) => (
                <span
                  key={item}
                  className="hidden min-h-[38px] items-center justify-center rounded-full border border-white/18 bg-white/10 px-3 py-1.5 text-[11px] font-semibold text-white/90 shadow-[0_8px_18px_-14px_rgba(2,6,23,.48)] transition-all duration-300 hover:border-white/30 hover:bg-white/16 sm:inline-flex sm:text-[12px]"
                >
                  {item}
                </span>
              ))}
            </div>

            <div className="a5 mx-auto mt-5 flex w-full max-w-[420px] flex-col gap-2.5 sm:mt-9 sm:max-w-none sm:flex-row sm:flex-wrap lg:mx-0">
              <Link
                href="/ai"
                data-testid="home-ai-cta-primary"
                className="inline-flex min-h-[52px] w-full items-center justify-center rounded-2xl bg-gradient-to-b from-[#8b5cf6] to-[#6d28d9] px-6 py-3.5 text-[15px] font-bold text-white shadow-[0_16px_40px_-18px_rgba(124,58,237,.55)] transition-all duration-300 ease-[cubic-bezier(.16,1,.3,1)] hover:-translate-y-0.5 hover:scale-[1.01] hover:shadow-[0_22px_46px_-18px_rgba(124,58,237,.6)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c4b5fd] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a2e1a] sm:w-auto sm:min-w-[210px] lg:min-h-[56px] lg:px-7 lg:text-[15.5px]"
              >
                Wypróbuj AI Search
              </Link>
              <Link
                href="/search"
                data-testid="home-ai-cta-secondary"
                className="inline-flex min-h-[50px] w-full items-center justify-center rounded-2xl border border-white/22 bg-white/10 px-6 py-3 text-[14px] font-bold text-white transition-all duration-300 ease-[cubic-bezier(.16,1,.3,1)] hover:-translate-y-0.5 hover:border-white/40 hover:bg-white/16 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/45 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a2e1a] sm:w-auto lg:min-h-[56px] lg:px-7"
              >
                Klasyczne wyszukiwanie
              </Link>
            </div>

            <p className="hidden mt-2 text-[11px] font-medium text-white sm:mt-4 sm:block sm:text-[12px] lg:text-[13px] lg:max-w-[44ch]">
              Premium UX, zero chaosu: Ty piszesz, AI znajduje i uzasadnia.
            </p>
          </div>

          <div className="relative mx-auto mt-1 w-full max-w-[560px] min-w-0 overflow-hidden a3 sm:mt-0 xl:max-w-[600px]">
            <div
              className="absolute -inset-[1.5px] rounded-[28px] bg-gradient-to-br from-emerald-200/65 via-violet-100/55 to-cyan-100/55 opacity-85 blur-[1px] sm:rounded-[30px]"
              aria-hidden
            />
            <div className="relative overflow-hidden rounded-[26px] border border-[#dce8e1] bg-[linear-gradient(170deg,#f8faf9_0%,#eef3f0_100%)] p-1.5 shadow-[0_28px_74px_-36px_rgba(15,23,42,.42)] transition-all duration-500 group-hover:shadow-[0_34px_90px_-34px_rgba(15,23,42,.55)] sm:rounded-[30px] lg:p-2">
              <div className="rounded-[18px] border border-white bg-[#fdfefd] p-3 sm:rounded-[22px] sm:p-5">
                <div className="mb-3 flex items-center justify-between border-b border-[#ecf1ee] pb-2 text-[11px] font-semibold text-[#6f8278] sm:border-0 sm:pb-0">
                  <span className="tracking-[0.01em]">StayMap AI Console</span>
                  <span className="rounded-full bg-[#ecfdf5] px-2.5 py-1 text-[10px] font-bold text-[#15803d]">Live</span>
                </div>

                <div className="rounded-2xl border border-[#e3ebe6] bg-white px-3.5 py-3 text-left text-[12.5px] font-medium leading-relaxed text-[#20342a] shadow-[inset_0_1px_0_rgba(255,255,255,.65)] sm:px-4 sm:text-[14px]">
                  <span className="font-serif text-[1.05em] text-[#8aa095]">&ldquo;</span>
                  Szukam spokojnego domku z sauną dla dwojga, blisko lasu, najlepiej w górach
                  <span className="font-serif text-[1.05em] text-[#8aa095]">&rdquo;</span>
                </div>

                <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-[#f5f3ff] px-2.5 py-1 text-[12px] font-semibold text-[#5b5f76] sm:mt-4">
                  <span className="relative flex h-2 w-2" aria-hidden>
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-violet-500/65 opacity-40 motion-reduce:animate-none" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-violet-500" />
                  </span>
                  <span className="tracking-wide">Analizuję 200+ ofert...</span>
                </div>

                <div className="relative mt-5">
                  <div
                    ref={scrollerRef}
                    onScroll={onScrollerScroll}
                    className="flex gap-3 overflow-x-auto pb-1 [scrollbar-width:none] snap-x snap-mandatory scroll-px-2 sm:mx-0 sm:flex-col sm:overflow-visible sm:snap-none sm:px-0 [&::-webkit-scrollbar]:hidden"
                    role="list"
                    aria-label="Przykładowe wyniki AI"
                  >
                    {AI_RESULTS.map((result, idx) => (
                      <div
                        key={result.title}
                        role="listitem"
                        className={cn(
                          "flex w-full min-w-full shrink-0 snap-center flex-col gap-2 rounded-2xl border border-[#e4ebe7] bg-white p-3 shadow-[0_12px_28px_-24px_rgba(15,23,42,.45)] transition-all duration-300 sm:w-auto sm:max-w-none sm:min-w-0 sm:flex-row sm:items-center sm:gap-3 sm:p-3 sm:hover:translate-x-1 sm:hover:border-emerald-200 motion-reduce:sm:hover:translate-x-0",
                          idx === activeIdx && "ring-2 ring-violet-300/60 ring-offset-2 ring-offset-[#f7faf8] sm:ring-1 sm:ring-offset-0"
                        )}
                      >
                        <div className="flex gap-3 sm:min-w-0 sm:flex-1 sm:items-center">
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-50 to-violet-50 text-lg shadow-inner sm:h-12 sm:w-12 sm:text-xl">
                            {result.emoji}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="line-clamp-2 text-[12.5px] font-bold leading-snug text-[#13251d] sm:text-[13.5px] sm:leading-tight">
                              {result.title}
                            </p>
                            <p className="mt-0.5 line-clamp-2 text-[10.5px] leading-snug text-[#6a7e73] sm:text-[11px]">{result.reasons}</p>
                          </div>
                        </div>
                        <div className="flex items-center justify-between gap-3 border-t border-[#edf2ef] pt-2.5 sm:shrink-0 sm:flex-col sm:items-end sm:justify-center sm:border-0 sm:pt-0">
                          <p className="rounded-full bg-violet-100 px-2.5 py-1 text-[10px] font-bold tabular-nums text-violet-700 sm:py-0.5">
                            <span className="sm:hidden">{result.matchShort}% dopas.</span>
                            <span className="hidden sm:inline">{result.match}</span>
                          </p>
                          <p className="text-right text-[13px] font-bold tabular-nums text-emerald-700">
                            {result.price}
                            <span className="text-[11px] font-semibold text-emerald-700/85">{result.priceSub}</span>
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>

                  
                </div>

                <div
                  className="mx-auto mt-3 flex w-fit items-center justify-center gap-1.5 rounded-full border border-[#ece7ff] bg-[#f6f3ff]/85 px-1.5 py-1 shadow-[0_10px_22px_-16px_rgba(124,58,237,.32)] sm:hidden"
                  role="tablist"
                  aria-label="Nawigacja kart AI"
                >
                  {AI_RESULTS.map((_, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => scrollToCard(i)}
                      className="inline-flex min-h-[34px] min-w-[18px] items-center justify-center rounded-full px-0.5"
                      aria-label={`Przykład ${i + 1}`}
                      aria-current={i === activeIdx ? "true" : "false"}
                    >
                      <span
                        className={cn(
                          "block rounded-full transition-all duration-200 ease-out",
                          i === activeIdx
                            ? "h-2 w-5 bg-gradient-to-r from-[#8b5cf6] to-[#6d28d9] shadow-[0_6px_16px_-10px_rgba(124,58,237,.75)]"
                            : "h-2 w-2 bg-violet-300"
                        )}
                      />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
