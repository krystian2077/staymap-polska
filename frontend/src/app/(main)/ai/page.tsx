"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getAccessToken } from "@/lib/authStorage";
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

const DRAFT_SESSION: AISession = {
  session_id: "draft-session",
  status: "complete",
  prompt: "",
  filters: null,
  search_params: null,
  results: [],
  latest_response: "",
  assistant_reply: "",
  follow_up_suggestions: [],
  messages: [],
  conversation: [],
  error_message: null,
  matching_strategy: null,
  tokens_used: 0,
  cost_usd: 0,
  model_used: null,
  created_at: new Date().toISOString(),
  expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
};

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
  const img =
    result.cover_image ??
    result.images?.find((i) => i.is_cover)?.display_url ??
    result.images?.[0]?.display_url;
  const src = publicMediaUrl(img);
  const bookingModeLabel =
    result.booking_mode === "instant"
      ? "Natychmiast"
      : result.booking_mode === "request"
        ? "Na zapytanie"
        : null;
  const short = (result.short_description || "").trim();
  const imageCount = Array.isArray(result.images) ? result.images.length : 0;
  return (
    <Link
      href={`/listing/${result.slug}`}
      className={cn(
        "group animate-offer-card-in block h-full overflow-hidden rounded-[28px] border border-[#dde7e2] bg-white shadow-[0_20px_54px_-28px_rgba(10,15,13,.34)] transition-all duration-300 ease-[cubic-bezier(.16,1,.3,1)] hover:-translate-y-[8px] hover:border-[#86efac] hover:shadow-[0_34px_88px_-30px_rgba(10,15,13,.38)] dark:border-white/15 dark:bg-[var(--bg2)] dark:shadow-[0_20px_44px_-26px_rgba(0,0,0,.55)]",
        "ai-premium-card"
      )}
      style={{ animationDelay: `${index * 80}ms` }}
    >
      <div className="relative h-[292px] overflow-hidden bg-[linear-gradient(145deg,#dff8e9,#bcefd4)]">
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={src}
            alt={result.title}
            className="h-full w-full object-cover transition-transform duration-700 ease-[cubic-bezier(.16,1,.3,1)] group-hover:scale-[1.08]"
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-white/90">
            <span className="text-6xl drop-shadow">{result.listing_type?.icon ?? "🏠"}</span>
            <span className="rounded-full bg-black/20 px-3 py-1 text-[11px] font-semibold backdrop-blur-sm">
              Brak zdjęcia oferty
            </span>
          </div>
        )}
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_bottom,rgba(255,255,255,.04)_18%,rgba(10,46,26,.25)_100%)]" />
        <span
          className="absolute left-3 top-3 rounded-pill px-3 py-1 text-[11px] font-bold text-white"
          style={{ background: "rgba(124,58,237,.9)" }}
        >
          {result.match_score}% dopasowanie
        </span>
        <span className="absolute right-3 top-3 rounded-pill bg-[#7c3aed] px-2.5 py-1 text-[11px] font-bold text-white">
          AI Pick
        </span>

        {imageCount > 0 ? (
          <span className="absolute bottom-3 right-3 rounded-full bg-black/45 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur-sm">
            📷 {imageCount}
          </span>
        ) : null}
      </div>

      <div className="flex min-h-[300px] flex-col px-6 pb-6 pt-5">
        <h3 className="mb-2 line-clamp-2 text-[27px] font-extrabold leading-[1.2] text-[#0a0f0d]">{result.title}</h3>
        <p className="mb-3 flex items-center gap-1 text-[14px] text-[#6e8378]">
          <span>📍</span>
          {result.location?.city}, {result.location?.region}
        </p>

        {short ? (
          <p className="mb-4 line-clamp-2 text-[15px] leading-relaxed text-[#5f746b]">{short}</p>
        ) : null}

        <div className="mb-2 flex flex-wrap gap-1.5">
          {typeof result.max_guests === "number" ? (
            <span className="rounded-full bg-[#f3f4f6] px-2.5 py-1 text-[11px] font-semibold text-[#475569]">
              👥 do {result.max_guests}
            </span>
          ) : null}
          {bookingModeLabel ? (
            <span className="rounded-full bg-[#ecfdf5] px-2.5 py-1 text-[11px] font-semibold text-[#047857]">
              ⚡ {bookingModeLabel}
            </span>
          ) : null}
          {typeof result.distance_km === "number" ? (
            <span className="rounded-full bg-[#eff6ff] px-2.5 py-1 text-[11px] font-semibold text-[#1d4ed8]">
              🧭 {result.distance_km.toFixed(1)} km
            </span>
          ) : null}
        </div>


        <div className="mt-auto flex items-center justify-between border-t border-[#edf2ef] pt-3 text-base">
          <span className="font-extrabold text-[#0a0f0d]">
            {result.base_price} {result.currency}
            <span className="text-sm font-normal text-[#7a8f84]"> / noc</span>
          </span>
          <span className="flex items-center gap-1 text-amber-500">
            ★ <span className="font-bold text-[#0a0f0d]">{result.average_rating ?? "—"}</span>
            <span className="text-[11px] text-[#7a8f84]"> ({result.review_count})</span>
          </span>
        </div>

        <div className="mt-4 inline-flex w-fit items-center gap-1 rounded-full border border-[#dcfce7] bg-[#f0fdf4] px-4 py-1.5 text-[13px] font-semibold text-[#15803d]">
          Zobacz szczegóły →
        </div>
      </div>
    </Link>
  );
}

function AIResultSkeletonCard({ index }: { index: number }) {
  return (
    <div
      className="overflow-hidden rounded-[28px] border border-[#e8e7f8] bg-white shadow-[0_18px_46px_-28px_rgba(76,29,149,.32)] dark:border-white/15 dark:bg-[var(--bg2)]"
      style={{ animationDelay: `${index * 70}ms` }}
    >
      <div className="relative h-[292px] overflow-hidden bg-[linear-gradient(135deg,#f4f1ff,#ebe9fe)]">
        <div className="absolute inset-0 animate-pulse bg-[linear-gradient(90deg,rgba(255,255,255,.25),rgba(255,255,255,.55),rgba(255,255,255,.25))]" />
      </div>
      <div className="space-y-4 px-6 pb-6 pt-5">
        <div className="h-7 w-4/5 animate-pulse rounded-lg bg-[#ede9fe]" />
        <div className="h-4 w-2/3 animate-pulse rounded bg-[#f1f5f9]" />
        <div className="h-4 w-full animate-pulse rounded bg-[#f3f4f6]" />
        <div className="h-4 w-5/6 animate-pulse rounded bg-[#f3f4f6]" />
        <div className="rounded-2xl border border-[#e9d5ff] bg-[linear-gradient(135deg,#faf5ff,#f5f3ff)] p-4">
          <div className="mb-2 h-3 w-2/5 animate-pulse rounded bg-[#ddd6fe]" />
          <div className="mb-2 h-4 w-full animate-pulse rounded bg-[#ede9fe]" />
          <div className="h-4 w-4/5 animate-pulse rounded bg-[#ede9fe]" />
        </div>
        <div className="flex items-center justify-between border-t border-[#edf2ef] pt-3">
          <div className="h-6 w-1/3 animate-pulse rounded bg-[#e2e8f0]" />
          <div className="h-5 w-16 animate-pulse rounded bg-[#fef3c7]" />
        </div>
      </div>
    </div>
  );
}

function AIResultsSkeletonGrid() {
  return (
    <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2">
      {[0, 1, 2, 3, 4, 5].map((idx) => (
        <AIResultSkeletonCard key={idx} index={idx} />
      ))}
    </div>
  );
}

function AIChatPanel({
  session,
  onUseSuggestion,
  prompt,
  setPrompt,
  onSubmit,
  busy,
  submitting,
  pendingUserMessage,
}: {
  session: AISession;
  onUseSuggestion: (text: string) => void;
  prompt: string;
  setPrompt: (text: string) => void;
  onSubmit: () => void;
  busy: boolean;
  submitting: boolean;
  pendingUserMessage: string;
}) {
  const rawConversation = session.messages ?? session.conversation ?? [];
  const assistantReply = session.latest_response ?? session.assistant_reply ?? "";
  const isProcessing = session.status === "pending" || session.status === "processing";
  const [conversation, setConversation] = useState(rawConversation);
  const [assistantRevealPending, setAssistantRevealPending] = useState(false);
  const showWelcome = !assistantReply && conversation.length === 0;
  const feedRef = useRef<HTMLDivElement>(null);
  const revealTimerRef = useRef<number | null>(null);
  const lastAssistantKeyRef = useRef<string>("");
  const [sendPulse, setSendPulse] = useState(false);

  const lastRaw = rawConversation[rawConversation.length - 1];
  const lastRawKey = lastRaw ? `${lastRaw.role}:${lastRaw.created_at}:${lastRaw.text}` : "";

  useEffect(() => {
    if (revealTimerRef.current) {
      window.clearTimeout(revealTimerRef.current);
      revealTimerRef.current = null;
    }

    if (!lastRaw) {
      setConversation(rawConversation);
      setAssistantRevealPending(false);
      lastAssistantKeyRef.current = "";
      return;
    }

    if (lastRaw.role !== "assistant") {
      setConversation(rawConversation);
      setAssistantRevealPending(false);
      return;
    }

    const assistantKey = `${lastRaw.created_at}:${lastRaw.text}`;
    if (assistantKey === lastAssistantKeyRef.current) {
      setConversation(rawConversation);
      setAssistantRevealPending(false);
      return;
    }

    lastAssistantKeyRef.current = assistantKey;
    setConversation(rawConversation.slice(0, -1));
    setAssistantRevealPending(true);

    // Naturalny reveal odpowiedzi AI: 2-3 sekundy animacji pisania.
    const revealDelayMs = 2000 + Math.floor(Math.random() * 1000);
    const snapshot = rawConversation;
    revealTimerRef.current = window.setTimeout(() => {
      revealTimerRef.current = null;
      setConversation(snapshot);
      setAssistantRevealPending(false);
    }, revealDelayMs);
  }, [lastRawKey, session.session_id]);

  useEffect(() => {
    return () => {
      if (revealTimerRef.current) {
        window.clearTimeout(revealTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!busy) setSendPulse(false);
  }, [busy]);

  const handleSubmit = () => {
    setSendPulse(true);
    onSubmit();
  };

  const shouldShowTyping =
    assistantRevealPending || (isProcessing && (!lastRaw || lastRaw.role !== "assistant"));
  const shouldShowPendingUserBubble =
    Boolean(submitting && pendingUserMessage.trim()) &&
    !(lastRaw?.role === "user" && (lastRaw?.text || "").trim() === pendingUserMessage.trim());

  useEffect(() => {
    const el = feedRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [conversation.length, assistantReply, isProcessing, assistantRevealPending]);

  const fmtTime = (value: string) => {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" });
  };

  const statusPill = isProcessing
    ? { label: "AI analizuje", className: "bg-amber-50 text-amber-700 border-amber-200" }
    : session.status === "failed"
      ? { label: "Błąd odpowiedzi", className: "bg-rose-50 text-rose-700 border-rose-200" }
      : { label: "", className: "" };

  return (
    <section className="staymap-ai-chat-shell mx-auto mt-8 w-[calc(100%-3.5rem)] max-w-[980px] overflow-hidden rounded-[28px] border border-[#ececf3] bg-white/95 backdrop-blur-sm shadow-[0_24px_64px_-34px_rgba(15,23,42,.35)] dark:border-white/15 dark:bg-[var(--bg2)]/95 dark:shadow-[0_28px_70px_-30px_rgba(0,0,0,.6)]">
      <div className="sticky top-0 z-[5] border-b border-[#ececf3] bg-[linear-gradient(135deg,rgba(255,255,255,.95)_0%,rgba(250,251,252,.92)_100%)] px-5 py-4 backdrop-blur-xl dark:border-white/10 dark:bg-[rgba(17,24,39,.78)] sm:px-6">
          <div className="grid grid-cols-3 items-center py-2">
            {/* Lewa kolumna: napis */}
            <div className="flex items-center justify-start">
              <span
                className="text-4xl font-extrabold bg-gradient-to-r from-[#15803d] via-[#34d399] to-[#bbf7d0] bg-clip-text text-transparent drop-shadow-lg pl-2 pr-6 select-none whitespace-nowrap"
                style={{ WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}
              >
                StayMap AI
              </span>
            </div>
            {/* Środek: awatar wyśrodkowany */}
            <div className="flex items-center justify-center">
              <span className="inline-flex h-20 w-20 shrink-0 items-center justify-center rounded-full shadow-[0_8px_24px_rgba(26,74,46,.3)] bg-white border-2 border-[#1a4a2e]">
                <svg className="h-16 w-16" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="100" cy="100" r="97" fill="#ffffff"/>
                  <circle cx="100" cy="100" r="95" fill="none" stroke="#1a4a2e" strokeWidth="2.5"/>
                  <text x="100" y="120" textAnchor="middle" fill="#1a4a2e" fontSize="64" fontWeight="700" fontFamily="Georgia,'Times New Roman',serif" letterSpacing="-3">SM</text>
                  <circle cx="153" cy="54" r="8" fill="#43a047"/>
                  <circle cx="153" cy="54" r="12" fill="none" stroke="#43a047" strokeWidth="1" opacity=".3"/>
                </svg>
              </span>
            </div>
            {/* Prawa kolumna: pusta (na przyszłość) */}
            <div />
          </div>
          {statusPill.label && (
            <div className="flex justify-center">
              <span className={cn("rounded-full border px-3 py-1.5 text-[11px] font-bold transition-all ai-chat-status-pill", statusPill.className)}>
                {statusPill.label}
              </span>
            </div>
          )}
      </div>

      <div className="px-5 pb-5 pt-4 sm:px-6 sm:pb-6">
        <div
          ref={feedRef}
          className="mb-4 max-h-[420px] space-y-3 overflow-auto rounded-2xl bg-[#fbfbfd] p-3 dark:bg-[var(--bg3)] sm:p-4"
        >
          {showWelcome ? (
            <div className="flex justify-start">
              <div className="max-w-[92%] rounded-2xl border border-[#ececf3] bg-white px-4 py-3 text-[14px] leading-relaxed text-[#111827] shadow-sm dark:border-white/15 dark:bg-[var(--bg2)] dark:text-white">
                Cześć! Opisz, czego szukasz, a pomogę dobrać najlepsze oferty.
              </div>
            </div>
          ) : null}

          {conversation.map((m, idx) => (
            <div
              key={`${m.created_at}-${idx}`}
              className={cn(
                "flex animate-chat-msg-in",
                m.role === "assistant" ? "justify-start animate-chat-assistant-in" : "justify-end animate-chat-user-in"
              )}
              style={{ animationDelay: `${Math.min(idx, 8) * 50}ms` }}
            >
              <div className={cn("flex max-w-[94%] items-end gap-2", m.role === "assistant" ? "flex-row" : "flex-row-reverse")}>
                <span
                  className={cn(
                    "animate-chat-avatar-pop inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                  )}
                  aria-hidden
                >
                  <svg className="h-full w-full" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="100" cy="100" r="97" fill="#ffffff"/>
                    <circle cx="100" cy="100" r="95" fill="none" stroke="#1a4a2e" strokeWidth="2.5"/>
                    <text x="100" y="120" textAnchor="middle" fill="#1a4a2e" fontSize="52" fontWeight="700" fontFamily="Georgia,'Times New Roman',serif" letterSpacing="-3">SM</text>
                    <circle cx="153" cy="54" r="8" fill="#43a047"/>
                    <circle cx="153" cy="54" r="12" fill="none" stroke="#43a047" strokeWidth="1" opacity=".3"/>
                  </svg>
                </span>
                <div
                  className={cn(
                    "rounded-2xl px-4 py-3 text-[14px] leading-relaxed",
                    m.role === "assistant"
                      ? "border border-[#ececf3] bg-white text-[#111827] shadow-sm dark:border-white/15 dark:bg-[var(--bg2)] dark:text-white"
                      : "bg-[#111827] text-white",
                    m.role === "assistant" && idx === conversation.length - 1 && !isProcessing
                      ? "animate-chat-ai-reveal"
                      : ""
                  )}
                >
                  <div>{m.text}</div>
                  <div
                    className={cn("mt-1 text-[10px]", m.role === "assistant" ? "text-[#9ca3af]" : "text-white/60")}
                  >
                    {fmtTime(m.created_at)}
                  </div>
                </div>
              </div>
            </div>
          ))}

          {shouldShowPendingUserBubble ? (
            <div className="flex justify-end animate-chat-msg-in animate-chat-user-in">
              <div className="flex max-w-[94%] items-end gap-2 flex-row-reverse">
                <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#111827] text-xs font-bold text-white">
                  Ty
                </span>
                <div className="rounded-2xl bg-[#111827] px-4 py-3 text-[14px] leading-relaxed text-white shadow-sm">
                  <div>{pendingUserMessage}</div>
                  <div className="mt-1 text-[10px] text-white/60">Wysyłam...</div>
                </div>
              </div>
            </div>
          ) : null}

          {shouldShowTyping ? (
            <div className="flex justify-start animate-chat-typing-shell">
              <div className="flex items-end gap-2">
                <span
                  className="animate-chat-avatar-pop inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
                  aria-hidden
                >
                  <svg className="h-full w-full" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="100" cy="100" r="97" fill="#ffffff"/>
                    <circle cx="100" cy="100" r="95" fill="none" stroke="#1a4a2e" strokeWidth="2.5"/>
                    <text x="100" y="120" textAnchor="middle" fill="#1a4a2e" fontSize="52" fontWeight="700" fontFamily="Georgia,'Times New Roman',serif" letterSpacing="-3">SM</text>
                    <circle cx="153" cy="54" r="8" fill="#43a047"/>
                    <circle cx="153" cy="54" r="12" fill="none" stroke="#43a047" strokeWidth="1" opacity=".3"/>
                  </svg>
                </span>
                <div className="inline-flex items-center gap-2.5 rounded-2xl border border-[#ececf3] bg-white px-3.5 py-2.5 text-[#6b7280] shadow-sm dark:border-white/15 dark:bg-[var(--bg2)] dark:text-white/70">
                <div className="flex items-center gap-1">
                  {[0, 1, 2].map((d) => (
                    <span
                      key={d}
                      className="h-1.5 w-1.5 rounded-full bg-[#9ca3af] animate-dot-bounce"
                      style={{ animationDelay: `${d * 150}ms` }}
                    />
                  ))}
                </div>
                <span className="text-[11px] font-medium text-[#9ca3af] animate-chat-typing-text">
                  {submitting ? "Wysyłam Twoją wiadomość..." : "AI aktualizuje propozycje..."}
                </span>
                </div>
              </div>
            </div>
          ) : null}

          {!showWelcome && !conversation.length && !isProcessing ? (
            <div className="rounded-xl border border-dashed border-[#d1d5db] bg-white px-3 py-2 text-xs text-[#6b7280]">
              Rozmowa startuje po pierwszym zapytaniu.
            </div>
          ) : null}
        </div>

        {session.follow_up_suggestions?.length ? (
          <div className="mb-4 flex flex-wrap gap-2">
            {session.follow_up_suggestions.map((s, idx) => (
              <button
                key={s}
                type="button"
                onClick={() => onUseSuggestion(s)}
                className="animate-chat-chip-in rounded-full border border-[#ddd6fe] bg-[#f5f3ff] px-3.5 py-1.5 text-xs font-bold text-[#5b21b6] transition-all hover:-translate-y-px hover:bg-[#ede9fe]"
                style={{ animationDelay: `${idx * 55}ms` }}
              >
                {s}
              </button>
            ))}
          </div>
        ) : null}

        <div className="rounded-2xl border border-[#e5e7eb] bg-white p-3 dark:border-white/15 dark:bg-[var(--bg3)]">
          <label className="mb-2 block text-[11px] font-bold uppercase tracking-wide text-[#6b7280]">
            Napisz kolejną wiadomość
          </label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit();
              }
            }}
            rows={2}
            placeholder="Doprecyzuj preferencje, np. tylko z jacuzzi, bliżej jeziora, albo tańsze opcje."
            className="min-h-[58px] w-full resize-none rounded-xl border border-[#d1d5db] bg-white px-3 py-2.5 text-sm text-[#111827] outline-none placeholder:text-[#9ca3af] focus:border-[#6b7280] dark:border-white/20 dark:bg-[var(--bg2)] dark:text-white dark:placeholder:text-white/45"
          />
          <div className="mt-2 flex items-center justify-between gap-3">
            <span className="text-[11px] text-[#6b7280] dark:text-white/65">
              {session.status === "complete"
                ? "Możesz kontynuować rozmowę w tej samej sesji."
                : "AI aktualizuje propozycje do Twojej wiadomości i dopasowuje oferty live."}
            </span>
            <button
              type="button"
              disabled={busy || !prompt.trim()}
              onClick={handleSubmit}
              className={cn(
                "rounded-full bg-[#111827] px-4 py-2 text-xs font-bold text-white transition-all hover:-translate-y-px hover:bg-[#000000] disabled:cursor-not-allowed disabled:opacity-60",
                sendPulse ? "animate-chat-send-pulse" : ""
              )}
            >
              {submitting ? "Wysyłanie..." : busy ? "Aktualizacja..." : "Wyślij"}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function AiSearchPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0a2e1a]" />}>
      <AiSearchContent />
    </Suspense>
  );
}

function AiSearchContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mounted, setMounted] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const searchStartedFor = useRef<string | null>(null);

  const prompt = useAIStore((s) => s.prompt);
  const setPrompt = useAIStore((s) => s.setPrompt);
  const session = useAIStore((s) => s.session);
  const loading = useAIStore((s) => s.loading);
  const polling = useAIStore((s) => s.polling);
  const submitting = useAIStore((s) => s.submitting);
  const error = useAIStore((s) => s.error);
  const reset = useAIStore((s) => s.reset);
  const results = useAIStore((s) => s.results);
  const [visibleCount, setVisibleCount] = useState(6);
  const startSearch = useAIStore((s) => s.startSearch);
  const [pendingUserMessage, setPendingUserMessage] = useState("");
  const [heroParallax, setHeroParallax] = useState(0);
  const [visibleCardCount, setVisibleCardCount] = useState(0);

  // Czyszczenie błędów przy montowaniu dla lepszego UX podczas testów
  useEffect(() => {
    if (error && error.includes("2312s")) {
      reset();
    }
  }, [error, reset]);

  useEffect(() => {
    reset();
    setMounted(true);
  }, [reset]);

  useEffect(() => {
    const p = searchParams.get("prompt");
    if (p && mounted && !session && !loading && !polling && !error && searchStartedFor.current !== p) {
      searchStartedFor.current = p;
      setPrompt(p);
      const token = typeof window !== "undefined" ? getAccessToken() : null;
      if (token) {
        void startSearch(p, token);
      }
    }
  }, [searchParams, mounted, session, loading, polling, error, setPrompt, startSearch]);

  useEffect(() => {
    if (!mounted || typeof window === "undefined") return;
    if (!getAccessToken()) {
      router.replace("/login?next=/ai");
    }
  }, [mounted, router]);

  useEffect(() => {
    setVisibleCount(6);
  }, [session?.session_id, results.length]);

  useEffect(() => {
    const onScroll = () => {
      const y = typeof window !== "undefined" ? window.scrollY : 0;
      setHeroParallax(Math.min(120, y * 0.12));
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const resizeTa = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(120, Math.max(24, el.scrollHeight))}px`;
  }, []);

  useEffect(() => {
    resizeTa();
  }, [prompt, resizeTa]);

  /**
   * Hero "Szukaj" = zawsze nowa sesja (bez historii), żeby kolejne zapytania nie były
   * zakotwiczone w poprzedniej interpretacji. Czat pod wynikami = kontynuacja sesji.
   */
  async function submitSearch(
    overridePrompt?: string,
    options?: { newSession?: boolean; sessionId?: string }
  ) {
    if (busy) return;
    const token = getAccessToken();
    if (!token) {
      router.push("/login?next=/ai");
      return;
    }
    const p = (overridePrompt ?? prompt).trim();
    if (!p) return;
    setPendingUserMessage(p);
    setPrompt("");
    const sid = options?.newSession
      ? undefined
      : (options?.sessionId ?? session?.session_id);
    await startSearch(p, token, sid);
    setPendingUserMessage("");
  }

  const busy = loading || submitting || polling;
  const complete = session?.status === "complete";
  const displaySession = session ?? DRAFT_SESSION;
  const activeSessionId = session?.session_id;
  const contextPrompt = pendingUserMessage || session?.prompt || prompt;
  const targetResults = useMemo(() => results.slice(0, visibleCount), [results, visibleCount]);
  const visibleResults = targetResults.slice(0, visibleCardCount);
  const canLoadMoreResults = complete && visibleCount < results.length;

  useEffect(() => {
    if (!complete) {
      setVisibleCardCount(0);
      return;
    }
    if (targetResults.length === 0) {
      setVisibleCardCount(0);
      return;
    }
    let current = 0;
    setVisibleCardCount((prev) => {
      current = Math.max(0, Math.min(prev || 2, targetResults.length));
      return current;
    });
    const timer = window.setInterval(() => {
      current = Math.min(current + 2, targetResults.length);
      setVisibleCardCount(current);
      if (current >= targetResults.length) {
        window.clearInterval(timer);
      }
    }, 120);
    return () => window.clearInterval(timer);
  }, [complete, targetResults.length]);

  if (!mounted) {
    return <div className="min-h-[40vh] bg-[#0a2e1a]" />;
  }

  if (typeof window !== "undefined" && !getAccessToken()) {
    return null;
  }

  const stayMapAiSummary =
    session?.status === "complete"
      ? (session.latest_response || session.assistant_reply || "").trim()
      : "";

  return (
    <div className="staymap-ai-page min-h-screen bg-white dark:bg-[var(--background)]">
      <section
        className="staymap-ai-hero relative overflow-hidden px-7 pb-[60px] pt-14 text-center"
        style={{
          background: "linear-gradient(135deg, #0a2e1a 0%, #1a1035 60%, #0f172a 100%)",
        }}
      >
        <div
          className="pointer-events-none absolute left-1/2 top-[-200px] h-[500px] w-[500px] -translate-x-1/2 rounded-full blur-[60px]"
          style={{
            background: "radial-gradient(circle, rgba(124,58,237,.15), transparent 70%)",
            transform: `translate3d(-50%, ${-heroParallax * 0.4}px, 0)`,
          }}
          aria-hidden
        />
        <div
          className="pointer-events-none absolute bottom-[-100px] right-[10%] h-[300px] w-[300px] rounded-full blur-[60px]"
          style={{
            background: "radial-gradient(circle, rgba(22,163,74,.1), transparent 70%)",
            transform: `translate3d(0, ${heroParallax * 0.3}px, 0)`,
          }}
          aria-hidden
        />

        <div
          className="relative z-[1] mx-auto inline-flex animate-fade-up items-center gap-1.5 rounded-full border border-[rgba(34,197,94,.3)] px-4 py-1.5 text-xs font-bold uppercase tracking-wide text-[#86efac]"
          style={{
            background: "rgba(34,197,94,.15)",
            animationDelay: "0ms",
          }}
        >
          <StarIcon className="text-[#86efac]" />
          StayMap AI · wyszukiwanie naturalnym językiem
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
          StayMap AI rozumie kontekst, przeszukuje katalog i dobiera oferty dopasowane do Ciebie. Pisz po polsku — bez filtrów.
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
                  void submitSearch(undefined, { newSession: true });
                }
              }}
              rows={1}
              placeholder="np. domek z sauną dla dwojga, daleko od ludzi, z widokiem na góry..."
              className="max-h-[120px] min-h-[24px] flex-1 resize-none border-0 bg-transparent text-base font-medium text-white outline-none placeholder:text-[rgba(255,255,255,.35)]"
            />
            <button
              type="button"
              disabled={busy}
              onClick={() => void submitSearch(undefined, { newSession: true })}
              className="flex shrink-0 items-center gap-1.5 rounded-xl bg-[#7c3aed] px-5 py-2.5 text-sm font-bold text-white transition-all hover:-translate-y-px hover:bg-[#6d28d9] hover:shadow-[0_6px_20px_rgba(124,58,237,.4)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              Szukaj
              <ArrowUpIcon />
            </button>
          </div>
        </div>

        <div className="h-4" />

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

        <p
          className="relative z-[1] mx-auto mt-6 max-w-lg px-4 text-center text-[12px] leading-relaxed text-[rgba(255,255,255,.5)]"
          style={{ animationDelay: "560ms" }}
        >
          <span className="rounded-md bg-[rgba(124,58,237,.2)] px-2 py-0.5 font-semibold text-[#e9d5ff]">
            Nowe wyszukiwanie
          </span>{" "}
          — fioletowe pole u góry zawsze startuje od zera (bez historii). Doprecyzowania wpisuj w czacie pod wynikami.
        </p>
      </section>

      {error ? (
        <div className="mx-auto max-w-[680px] px-7 py-4">
          <div
            className="rounded-xl border border-red-200 bg-red-50 px-4 py-3.5 text-sm text-red-600 dark:border-red-500/35 dark:bg-red-950/30 dark:text-red-300"
            role="alert"
          >
            {error}
          </div>
        </div>
      ) : null}

      {(loading || polling) && !session ? <AIProcessingState session={session} prompt={prompt} /> : null}

      <section className="relative bg-[linear-gradient(180deg,#ffffff_0%,#faf7ff_45%,#ffffff_100%)] pb-8 dark:bg-[var(--background)]">
        <div
          className="pointer-events-none absolute left-1/2 top-12 h-[320px] w-[320px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(124,58,237,.13),transparent_68%)] blur-3xl"
          style={{ transform: `translate3d(-50%, ${heroParallax * 0.28}px, 0)` }}
        />
        <div
          className="pointer-events-none absolute right-[8%] top-[120px] h-[220px] w-[220px] rounded-full bg-[radial-gradient(circle,rgba(52,211,153,.12),transparent_68%)] blur-3xl"
          style={{ transform: `translate3d(0, ${-heroParallax * 0.22}px, 0)` }}
        />
        <div className="mx-auto w-full max-w-[1240px] px-7">
          <div className="pt-5" />

          <AIChatPanel
            session={displaySession}
            prompt={prompt}
            setPrompt={setPrompt}
            busy={busy}
            submitting={submitting}
            pendingUserMessage={pendingUserMessage}
            onSubmit={() => void submitSearch(undefined, { newSession: false })}
            onUseSuggestion={(text) => {
              void submitSearch(text, { sessionId: activeSessionId ?? undefined, newSession: false });
            }}
          />

          {complete && stayMapAiSummary ? (
            <div
              className={cn(
                "staymap-ai-verdict animate-staymap-ai-verdict-in mb-8 mt-2 px-5 py-4 sm:px-8 sm:py-5",
                results.length === 0 ? "opacity-95" : ""
              )}
            >
              <p className="mb-2 pl-1 text-[10px] font-bold uppercase tracking-[0.22em] text-[#6d28d9] dark:text-[#c4b5fd]">
                Rekomendacja StayMap AI
              </p>
              <p className="max-w-[920px] pl-4 text-[15px] font-medium leading-relaxed text-[#312e81] sm:text-[16px] dark:text-[#e9e7ff]">
                {stayMapAiSummary}
              </p>
            </div>
          ) : null}

          {results.length > 0 && complete ? (
            <div className="mb-6 mt-6 rounded-2xl border border-[#ececf3] bg-[linear-gradient(135deg,#fbfbfd,#f9f9fd)] px-4 py-3.5 dark:border-white/15 dark:bg-[var(--bg3)]">
              <p className="text-center text-sm font-semibold text-[#111827] dark:text-white">
                ✨ Pokazuję <span className="text-[#7c3aed]">{Math.min(visibleCount, results.length)}</span> z <span className="text-[#7c3aed]">{results.length} ofert</span>
              </p>
            </div>
          ) : null}

          {contextPrompt ? (
            <div className="mb-5 mt-4 flex items-center gap-2.5 rounded-[10px] border border-[#ddd6fe] bg-[#ede9fe] px-3.5 py-2.5 text-[13px] font-medium text-[#7c3aed] dark:border-white/20 dark:bg-[var(--bg3)] dark:text-white/85">
              <span aria-hidden>💬</span>
              <span className="min-w-0 flex-1 truncate">
                &quot;{contextPrompt}&quot;
              </span>
              <button type="button" className="shrink-0 text-xs font-bold underline" onClick={() => reset()}>
                Zmień
              </button>
            </div>
          ) : null}

          {complete ? (
            <>
              {results.length > 0 ? (
                <>
                  <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                    {visibleResults.map((r, i) => (
                      <AIResultCard key={r.listing_id} result={r} index={i} />
                    ))}
                  </div>

                  {canLoadMoreResults ? (
                    <div className="mt-7 flex justify-center">
                      <button
                        type="button"
                        onClick={() => setVisibleCount((c) => Math.min(c + 6, results.length))}
                        className="inline-flex items-center gap-2 rounded-full border border-[#c4b5fd] bg-[#f5f3ff] px-6 py-3 text-sm font-bold text-[#5b21b6] transition-all hover:-translate-y-px hover:border-[#a78bfa] hover:bg-[#ede9fe]"
                      >
                        ✨ Przygotuj więcej ofert
                      </button>
                    </div>
                  ) : (
                    <div className="mt-6 flex justify-center">
                      <Link href="/search" className="btn-secondary">
                        Pokaż więcej wyników
                      </Link>
                    </div>
                  )}
                </>
              ) : (
                <div className="mt-4 rounded-2xl border border-[#ddd6fe] bg-[#faf8ff] px-4 py-5 text-sm text-[#5b21b6] dark:border-white/20 dark:bg-[var(--bg3)] dark:text-white/80">
                  Nie znalazłem jeszcze pasujących ofert dla tego zapytania. Spróbuj doprecyzować lokalizację,
                  budżet albo liczbę gości w czacie powyżej.
                </div>
              )}
            </>
          ) : (
            <div className="mt-4">
              <div className="rounded-2xl border border-[#ddd6fe] bg-[linear-gradient(135deg,#faf5ff,#f5f3ff)] px-4 py-5 text-sm text-[#6d28d9] dark:border-white/20 dark:bg-[var(--bg3)] dark:text-white/80">
                <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-[#c4b5fd] bg-white/70 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-[#5b21b6]">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#7c3aed]" />
                  AI aktualizuje propozycje...
                </div>
                <p>Analizuję Twoją ostatnią wiadomość i przeliczam nowe, lepiej dopasowane oferty.</p>
              </div>
              <AIResultsSkeletonGrid />
            </div>
          )}
        </div>
      </section>
    </div>
  );
}


