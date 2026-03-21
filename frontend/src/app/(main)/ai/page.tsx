"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { publicMediaUrl } from "@/lib/mediaUrl";
import { useAIStore } from "@/lib/store/aiStore";
import { MODE_EMOJI, TRAVEL_MODE_LABELS } from "@/lib/travelModes";
import { cn } from "@/lib/utils";
import type { AIFilterInterpretation, AIResult, AISession } from "@/types/ai";

const QUICK_PROMPTS = [
  "🧖 Weekend wellness z jacuzzi",
  "💑 Romantyczny domek w górach",
  "🐕 Z psem nad jeziorem",
  "💻 Workation z szybkim WiFi",
  "👨‍👩‍👧 Dla rodziny, min. 6 osób",
];

function StarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 2l2.4 7.4H22l-6 4.6 2.3 7L12 17.8 5.7 21l2.3-7-6-4.6h7.6L12 2z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ArrowUpIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 19V5M12 5l-7 7M12 5l7 7"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function filterTags(f: AIFilterInterpretation): { key: string; label: string; delay: number }[] {
  const out: { key: string; label: string; delay: number }[] = [];
  let i = 0;
  if (f.travel_mode) {
    const em = MODE_EMOJI[f.travel_mode] ?? "✨";
    const lb = TRAVEL_MODE_LABELS[f.travel_mode] ?? f.travel_mode;
    out.push({ key: "tm", label: `${em} ${lb}`, delay: i++ * 0.05 });
  }
  if (f.sauna) out.push({ key: "sauna", label: "🧖 Sauna wymagana", delay: i++ * 0.05 });
  if (f.near_mountains) out.push({ key: "nm", label: "⛰️ Góry", delay: i++ * 0.05 });
  if (f.near_lake) out.push({ key: "nl", label: "🏊 Jezioro", delay: i++ * 0.05 });
  if (f.near_forest) out.push({ key: "nf", label: "🌲 Las", delay: i++ * 0.05 });
  if (f.max_guests != null)
    out.push({ key: "mg", label: `👥 Max ${f.max_guests} gości`, delay: i++ * 0.05 });
  if (f.quiet_score_min != null)
    out.push({
      key: "q",
      label: `🔇 Cisza ≥ ${f.quiet_score_min}`,
      delay: i++ * 0.05,
    });
  for (const t of f.custom_tags ?? []) {
    out.push({ key: `c-${t}`, label: t, delay: i++ * 0.05 });
  }
  return out;
}

function AIProcessingState({
  session,
  prompt,
}: {
  session: AISession | null;
  prompt: string;
}) {
  const f = session?.filters;
  const status = session?.status ?? "pending";
  const showTyping = status === "pending" || (status === "processing" && !f);

  const processingLine =
    f && status === "processing"
      ? `Szukam ${f.travel_mode ? TRAVEL_MODE_LABELS[f.travel_mode] ?? f.travel_mode : "…"} · sauna:${f.sauna ? "tak" : "nie"} · góry:${f.near_mountains ? "tak" : "nie"}`
      : null;

  return (
    <section
      className="px-7 py-6"
      style={{
        background: "linear-gradient(135deg, #0a2e1a, #1a1035)",
      }}
    >
      <div className="mx-auto flex max-w-[680px] gap-3.5 rounded-2xl border border-[rgba(124,58,237,.3)] bg-[rgba(255,255,255,.06)] p-5 sm:p-6">
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[rgba(124,58,237,.4)] text-lg"
          style={{ background: "rgba(124,58,237,.3)" }}
        >
          🤖
        </div>
        <div className="min-w-0 flex-1">
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-[#a78bfa]">
            AI analizuje twoje zapytanie
          </p>
          {status === "pending" && (
            <p className="mb-3 text-sm leading-relaxed text-[rgba(255,255,255,.8)]">
              Rozumiem — {prompt.slice(0, 80)}
              {prompt.length > 80 ? "…" : ""}
            </p>
          )}
          {processingLine ? (
            <p className="mb-3 text-sm leading-relaxed text-[rgba(255,255,255,.8)]">{processingLine}</p>
          ) : null}

          {showTyping && (
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1">
                {[0, 1, 2].map((d) => (
                  <div
                    key={d}
                    className="h-1.5 w-1.5 rounded-full bg-[#a78bfa] animate-dot-bounce"
                    style={{ animationDelay: `${d * 150}ms` }}
                  />
                ))}
              </div>
              <span className="text-xs text-[rgba(255,255,255,.5)]">Filtruje 2 400+ ofert</span>
            </div>
          )}

          {f ? (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {filterTags(f).map((t) => (
                <span
                  key={t.key}
                  className="animate-fade-in-tag rounded-full border border-[rgba(124,58,237,.3)] px-2.5 py-1 text-[11px] font-semibold text-[#c4b5fd]"
                  style={{
                    background: "rgba(124,58,237,.2)",
                    animationDelay: `${t.delay}s`,
                  }}
                >
                  {t.label}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function AIResultCard({ result, index }: { result: AIResult; index: number }) {
  const img = result.images?.find((i) => i.is_cover)?.display_url ?? result.images?.[0]?.display_url;
  const src = publicMediaUrl(img);
  return (
    <Link
      href={`/listing/${result.slug}`}
      className={cn(
        "group block overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-card transition-all duration-300 ease-[cubic-bezier(.16,1,.3,1)] hover:-translate-y-1 hover:border-brand-border hover:shadow-hover"
      )}
      style={{ animationDelay: `${index * 80}ms` }}
    >
      <div className="relative h-[160px] overflow-hidden bg-brand-surface">
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt="" className="h-full w-full object-cover transition-transform group-hover:scale-[1.03]" />
        ) : (
          <div className="flex h-full items-center justify-center text-4xl">{result.listing_type?.icon ?? "🏠"}</div>
        )}
        <span
          className="absolute left-2 top-2 rounded-lg px-2 py-0.5 text-[10px] font-bold text-white"
          style={{ background: "rgba(124,58,237,.9)" }}
        >
          {result.match_score}% dopasowanie
        </span>
        <span className="absolute right-2 top-2 rounded bg-[#7c3aed] px-1.5 py-0.5 text-[10px] font-bold text-white">
          AI Pick
        </span>
      </div>
      <div className="px-3.5 py-3">
        <h3 className="mb-1 line-clamp-2 text-[13px] font-bold leading-snug text-text">{result.title}</h3>
        <p className="mb-2 text-[11px] text-text-muted">
          {result.location?.city}, {result.location?.region}
        </p>
        {result.match_reasons?.length ? (
          <div className="mb-2 rounded-md bg-[#ede9fe] px-2 py-1.5 text-[11px] font-medium text-[#6d28d9]">
            ✓ {result.match_reasons.join(" · ")}
          </div>
        ) : null}
        <div className="flex items-center justify-between text-sm">
          <span className="font-extrabold text-text">
            {result.base_price} {result.currency}
            <span className="text-xs font-normal text-text-muted"> / noc</span>
          </span>
          <span className="text-amber-500">
            ★ <span className="font-bold text-text">{result.average_rating ?? "—"}</span>
            <span className="text-[11px] text-text-muted"> ({result.review_count})</span>
          </span>
        </div>
      </div>
    </Link>
  );
}

export default function AiSearchPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const prompt = useAIStore((s) => s.prompt);
  const setPrompt = useAIStore((s) => s.setPrompt);
  const session = useAIStore((s) => s.session);
  const loading = useAIStore((s) => s.loading);
  const polling = useAIStore((s) => s.polling);
  const error = useAIStore((s) => s.error);
  const rateLimitRemaining = useAIStore((s) => s.rateLimitRemaining);
  const results = useAIStore((s) => s.results);
  const filters = useAIStore((s) => s.filters);
  const startSearch = useAIStore((s) => s.startSearch);
  const reset = useAIStore((s) => s.reset);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || typeof window === "undefined") return;
    if (!localStorage.getItem("access")) {
      router.replace("/login?next=/ai");
    }
  }, [mounted, router]);

  const resizeTa = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(120, Math.max(24, el.scrollHeight))}px`;
  }, []);

  useEffect(() => {
    resizeTa();
  }, [prompt, resizeTa]);

  async function submitSearch() {
    const token = localStorage.getItem("access");
    if (!token) {
      router.push("/login?next=/ai");
      return;
    }
    const p = prompt.trim();
    if (!p) return;
    await startSearch(p, token);
  }

  const busy = loading || polling;
  const complete = session?.status === "complete";
  const rateWarn = rateLimitRemaining <= 2 && rateLimitRemaining > 0;

  if (!mounted) {
    return <div className="min-h-[40vh] bg-[#0a2e1a]" />;
  }

  if (typeof window !== "undefined" && !localStorage.getItem("access")) {
    return null;
  }

  return (
    <div className="min-h-screen bg-white">
      <section
        className="relative overflow-hidden px-7 pb-[60px] pt-14 text-center"
        style={{
          background: "linear-gradient(135deg, #0a2e1a 0%, #1a1035 60%, #0f172a 100%)",
        }}
      >
        <div
          className="pointer-events-none absolute left-1/2 top-[-200px] h-[500px] w-[500px] -translate-x-1/2 rounded-full blur-[60px]"
          style={{
            background: "radial-gradient(circle, rgba(124,58,237,.15), transparent 70%)",
          }}
          aria-hidden
        />
        <div
          className="pointer-events-none absolute bottom-[-100px] right-[10%] h-[300px] w-[300px] rounded-full blur-[60px]"
          style={{
            background: "radial-gradient(circle, rgba(22,163,74,.1), transparent 70%)",
          }}
          aria-hidden
        />

        <div
          className="relative z-[1] mx-auto inline-flex animate-fade-up items-center gap-1.5 rounded-full border border-[rgba(124,58,237,.3)] px-4 py-1.5 text-xs font-bold uppercase tracking-wide text-[#c4b5fd]"
          style={{
            background: "rgba(124,58,237,.25)",
            animationDelay: "0ms",
          }}
        >
          <StarIcon className="text-[#c4b5fd]" />
          GPT-4o · Function Calling · 10 zapytań/h
        </div>

        <h1
          className="relative z-[1] mx-auto mt-5 max-w-3xl animate-fade-up text-[clamp(28px,5vw,50px)] font-extrabold leading-tight tracking-tight text-white"
          style={{ animationDelay: "120ms" }}
        >
          Opisz wymarzony nocleg{" "}
          <span
            className="bg-clip-text text-transparent"
            style={{
              backgroundImage: "linear-gradient(90deg, #a78bfa, #34d399)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            słowami
          </span>
        </h1>

        <p
          className="relative z-[1] mx-auto mb-9 mt-4 max-w-[480px] animate-fade-up text-base leading-relaxed text-[rgba(255,255,255,.6)]"
          style={{ animationDelay: "240ms" }}
        >
          AI zrozumie co lubisz i znajdzie idealne miejsce. Powiedz po polsku — nie musisz używać filtrów.
        </p>

        <div
          className="relative z-[1] mx-auto flex max-w-[680px] animate-fade-up flex-col gap-3 sm:flex-row sm:items-center"
          style={{ animationDelay: "360ms" }}
        >
          <div
            className="animate-ai-glow flex w-full items-center gap-3 rounded-[18px] border-[1.5px] border-[rgba(124,58,237,.4)] bg-[rgba(255,255,255,.07)] px-4 py-3.5 transition-all duration-300 hover:border-[rgba(124,58,237,.7)] hover:bg-[rgba(255,255,255,.1)] sm:pr-3"
          >
            <span className="shrink-0 text-xl" aria-hidden>
              🗣️
            </span>
            <textarea
              ref={textareaRef}
              value={prompt}
              onChange={(e) => {
                setPrompt(e.target.value);
                resizeTa();
              }}
              onInput={resizeTa}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void submitSearch();
                }
              }}
              rows={1}
              placeholder="np. domek z sauną dla dwojga, daleko od ludzi, z widokiem na góry..."
              className="max-h-[120px] min-h-[24px] flex-1 resize-none border-0 bg-transparent text-base font-medium text-white outline-none placeholder:text-[rgba(255,255,255,.35)]"
            />
            <button
              type="button"
              disabled={busy}
              onClick={() => void submitSearch()}
              className="flex shrink-0 items-center gap-1.5 rounded-xl bg-[#7c3aed] px-5 py-2.5 text-sm font-bold text-white transition-all hover:-translate-y-px hover:bg-[#6d28d9] hover:shadow-[0_6px_20px_rgba(124,58,237,.4)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              Szukaj
              <ArrowUpIcon />
            </button>
          </div>
        </div>

        <p
          className={cn(
            "relative z-[1] mt-3 text-xs",
            rateLimitRemaining === 0
              ? "text-[#fca5a5]"
              : rateWarn
                ? "text-[#fca5a5]"
                : "text-[rgba(255,255,255,.35)]"
          )}
        >
          {rateLimitRemaining === 0
            ? "Limit wyczerpany. Odczekaj do resetu limitu (do 1 h)."
            : `${rateLimitRemaining} z 10 zapytań pozostałych tej godziny`}
        </p>

        <div
          className="relative z-[1] mx-auto mt-4 flex flex-wrap justify-center gap-2 animate-fade-up"
          style={{ animationDelay: "480ms" }}
        >
          {QUICK_PROMPTS.map((text) => (
            <button
              key={text}
              type="button"
              onClick={() => setPrompt(text.replace(/^[^\s]+\s/, ""))}
              className="rounded-full border border-[rgba(255,255,255,.15)] bg-[rgba(255,255,255,.06)] px-3.5 py-1.5 text-xs text-[rgba(255,255,255,.7)] transition-all duration-200 hover:border-[rgba(124,58,237,.5)] hover:bg-[rgba(124,58,237,.15)] hover:text-[#c4b5fd]"
            >
              {text}
            </button>
          ))}
        </div>
      </section>

      {error ? (
        <div className="mx-auto max-w-[680px] px-7 py-4">
          <div
            className="rounded-xl border border-red-200 bg-red-50 px-4 py-3.5 text-sm text-red-600"
            role="alert"
          >
            ⚠️ {error}
            {error.includes("limit") || rateLimitRemaining === 0 ? (
              <span className="mt-1 block text-xs opacity-90">
                Limit resetuje się co godzinę od pierwszego zapytania w danym oknie.
              </span>
            ) : null}
          </div>
        </div>
      ) : null}

      {(loading || polling) && !complete ? (
        <AIProcessingState session={session} prompt={prompt} />
      ) : null}

      {complete ? (
        <section className="bg-white pb-8">
          <header className="flex flex-wrap items-end justify-between gap-2 px-7 pt-5">
            <div>
              <h2 className="text-base font-extrabold text-text">
                {results.length} ofert dla Ciebie ✨
              </h2>
              <p className="text-[13px] text-text-muted">Posortowane wg dopasowania AI</p>
            </div>
          </header>

          <div className="mx-7 mb-5 mt-4 flex items-center gap-2.5 rounded-[10px] border border-[#ddd6fe] bg-[#ede9fe] px-3.5 py-2.5 text-[13px] font-medium text-[#7c3aed]">
            <span aria-hidden>💬</span>
            <span className="min-w-0 flex-1 truncate">
              &quot;{prompt}&quot;
              {filters?.travel_mode ? (
                <>
                  {" "}
                  · Tryb: {TRAVEL_MODE_LABELS[filters.travel_mode] ?? filters.travel_mode}
                </>
              ) : null}
            </span>
            <button type="button" className="shrink-0 text-xs font-bold underline" onClick={() => reset()}>
              Zmień
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4 px-7 sm:grid-cols-2 lg:grid-cols-3">
            {results.map((r, i) => (
              <AIResultCard key={r.listing_id} result={r} index={i} />
            ))}
          </div>

          <div className="mt-6 flex justify-center px-7">
            <Link href="/search" className="btn-secondary">
              Pokaż więcej wyników
            </Link>
          </div>
        </section>
      ) : null}
    </div>
  );
}
