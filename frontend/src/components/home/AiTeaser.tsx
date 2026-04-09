"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

const PROMPTS = [
  "romantyczny domek z sauna w gorach",
  "spokojne miejsce z psem nad woda",
  "workation z szybkim WiFi i cisza",
  "rodzinny nocleg dla 6 osob",
  "slow escape bez tlumow",
];

const CHIPS = [
  "🧖 Domek z sauna dla dwojga",
  "🐕 Z psem nad jeziorem",
  "💻 Workation z szybkim WiFi",
  "👨‍👩‍👧 Rodzina min. 6 osob",
  "🌿 Slow escape bez halasu",
  "💑 Romantyczny weekend",
];

export function AiTeaser() {
  const [mounted, setMounted] = useState(false);
  const [activePrompt, setActivePrompt] = useState(0);
  const [text, setText] = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const full = PROMPTS[activePrompt] ?? "";
    const doneTyping = text === full;
    const doneDeleting = text.length === 0;

    const timeout = setTimeout(
      () => {
        if (!deleting && !doneTyping) {
          setText(full.slice(0, text.length + 1));
          return;
        }
        if (!deleting && doneTyping) {
          setDeleting(true);
          return;
        }
        if (deleting && !doneDeleting) {
          setText((v) => v.slice(0, -1));
          return;
        }
        setDeleting(false);
        setActivePrompt((v) => (v + 1) % PROMPTS.length);
      },
      deleting ? 34 : doneTyping ? 1200 : 62
    );

    return () => clearTimeout(timeout);
  }, [activePrompt, deleting, mounted, text]);

  const tags = useMemo(
    () => ["💑 Romantyczny", "🧖 Sauna", "⛰️ Gory", "🤫 Cisza", "max 4 os."],
    []
  );

  return (
    <section className="mx-auto w-full max-w-[1240px] px-6 pb-20 md:px-12">
      <div className="relative grid gap-10 overflow-hidden rounded-[28px] bg-[linear-gradient(135deg,#0a2e1a_0%,#0f1e3a_55%,#150a2e_100%)] px-6 py-12 md:grid-cols-2 md:gap-16 md:px-[60px] md:py-14">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 500px 400px at -5% 50%, rgba(22,163,74,.12), transparent), radial-gradient(ellipse 400px 400px at 105% 20%, rgba(124,58,237,.15), transparent), radial-gradient(ellipse 300px 300px at 60% 110%, rgba(74,222,128,.07), transparent)",
          }}
          aria-hidden
        />

        <div className="relative z-[1]">
          <span className="mb-4 inline-flex items-center gap-2 rounded-pill border border-[rgba(124,58,237,.28)] bg-[rgba(124,58,237,.18)] px-3 py-1 text-[11px] font-bold uppercase tracking-[.05em] text-[#c4b5fd]">
            ✦ GPT-4o · 10 zapytan / h
          </span>
          <h2 className="mb-3 text-[clamp(26px,3.5vw,40px)] font-black leading-[1.08] tracking-[-1.5px] text-white">
            Powiedz czego szukasz
            <br />
            <span className="bg-[linear-gradient(90deg,#a78bfa_0%,#34d399_100%)] bg-clip-text text-transparent">
              wlasnymi slowami
            </span>
          </h2>
          <p className="mb-6 max-w-[560px] text-[15px] leading-[1.72] text-white/55">
            Nie musisz klikac w filtry. Opisz wymarzony nocleg po polsku - AI zrozumie nastroj,
            styl i potrzeby, i pokaze idealne miejsca z wyjasnieniem dlaczego pasuja.
          </p>

          <p className="mb-2 text-[11px] font-bold uppercase tracking-[.05em] text-white/35">Przykladowe zapytania:</p>
          <div className="mb-6 flex flex-wrap gap-2">
            {CHIPS.map((chip) => (
              <button
                type="button"
                key={chip}
                onClick={() => {
                  const cleaned = chip.replace(/^[^\s]+\s/, "").toLowerCase();
                  setText(cleaned);
                  setDeleting(false);
                }}
                className="rounded-pill border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white/75 transition-all duration-200 hover:-translate-y-0.5 hover:border-[rgba(124,58,237,.5)] hover:bg-[rgba(124,58,237,.15)] hover:text-[#c4b5fd]"
              >
                {chip}
              </button>
            ))}
          </div>

          <Link
            href="/ai"
            className="inline-flex items-center gap-2 rounded-[12px] bg-[rgba(124,58,237,.85)] px-6 py-3 text-sm font-bold text-white shadow-[0_4px_18px_rgba(124,58,237,.3)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[rgba(109,40,217,.95)]"
          >
            <span>✦</span>
            Wyprobuj AI Search
            <span className="transition-transform duration-200 hover:translate-x-1">→</span>
          </Link>
        </div>

        <div className="relative z-[1] rounded-[20px] border border-white/10 bg-white/5 p-[22px]">
          <div className="mb-4 rounded-[12px] border-[1.5px] border-white/15 bg-white/10 px-4 py-3">
            <div className="text-sm font-medium text-white/75">
              {mounted ? text : " "}
              <span className="ml-1 inline-block h-4 w-[2px] animate-[typing_1.1s_infinite] rounded-[1px] bg-[#a78bfa] align-middle" />
            </div>
          </div>

          <div className="mb-3 flex items-center gap-2 text-[11px] text-white/35">
            <span className="h-[7px] w-[7px] animate-[dotBounce_1s_infinite] rounded-full bg-[#a78bfa]" />
            <span className="h-[7px] w-[7px] animate-[dotBounce_1s_.15s_infinite] rounded-full bg-[#a78bfa]" />
            <span className="h-[7px] w-[7px] animate-[dotBounce_1s_.3s_infinite] rounded-full bg-[#a78bfa]" />
            Analizuje 2 400+ ofert...
          </div>

          <div className="mb-3 flex flex-wrap gap-1.5">
            {tags.map((tag, idx) => (
              <span
                key={tag}
                className="rounded-pill border border-[rgba(124,58,237,.3)] bg-[rgba(124,58,237,.22)] px-2.5 py-1 text-[11px] font-semibold text-[#c4b5fd]"
                style={{ animation: `fadeUp .5s ${idx * 0.07}s cubic-bezier(.16,1,.3,1) both` }}
              >
                {tag}
              </span>
            ))}
          </div>

          {["Domek z sauna i jacuzzi na polanie", "Chata bieszczadzka z sauna finska", "Willa SPA z hot tubem i tarasem"].map(
            (row, idx) => (
              <div
                key={row}
                className="mb-2 flex items-center gap-3 rounded-[12px] border border-white/10 bg-white/10 px-3 py-2.5 transition-all duration-200 hover:translate-x-0.5 hover:bg-white/15"
                style={{ animation: `slideRight .45s ${idx * 0.1}s cubic-bezier(.16,1,.3,1) both` }}
              >
                <span className="flex h-[46px] w-[46px] items-center justify-center rounded-[8px] bg-white/10 text-xl">
                  {idx === 0 ? "🏔️" : idx === 1 ? "🏡" : "🧖"}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-bold text-white">{row}</p>
                  <p className="text-[10px] text-white/45">Dopasowanie stylu i preferencji</p>
                </div>
                <div className="text-right">
                  <p className="rounded-pill bg-[rgba(124,58,237,.25)] px-2 py-0.5 text-[10px] font-bold text-[#c4b5fd]">
                    {98 - idx * 4}%
                  </p>
                  <p className="mt-1 text-sm font-black text-[#4ade80]">{320 + idx * 40} zl</p>
                </div>
              </div>
            )
          )}

          <div className="mt-3 border-t border-white/10 pt-2 text-[11px] text-white/30">
            10 zapytan / godzine · Zaloguj sie aby korzystac
          </div>
        </div>
      </div>
    </section>
  );
}
