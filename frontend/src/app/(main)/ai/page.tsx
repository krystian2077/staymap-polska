"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
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
        "group animate-offer-card-in block h-full overflow-hidden rounded-[24px] border border-[#e4ebe7] bg-white shadow-[0_12px_34px_-24px_rgba(10,15,13,.32)] transition-all duration-300 ease-[cubic-bezier(.16,1,.3,1)] hover:-translate-y-[7px] hover:border-[#bbf7d0] hover:shadow-[0_30px_80px_-26px_rgba(10,15,13,.38)]"
      )}
      style={{ animationDelay: `${index * 80}ms` }}
    >
      <div className="relative h-[236px] overflow-hidden bg-[linear-gradient(145deg,#dff8e9,#bcefd4)]">
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

      <div className="flex min-h-[228px] flex-col px-5 pb-5 pt-4">
        <h3 className="mb-1.5 line-clamp-2 text-[16px] font-extrabold leading-[1.28] text-[#0a0f0d]">{result.title}</h3>
        <p className="mb-2.5 flex items-center gap-1 text-[12px] text-[#6e8378]">
          <span>📍</span>
          {result.location?.city}, {result.location?.region}
        </p>

        {short ? (
          <p className="mb-3 line-clamp-2 text-[12px] leading-relaxed text-[#5f746b]">{short}</p>
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

        {result.match_reasons?.length ? (
          <div className="mb-3 rounded-md bg-[#ede9fe] px-2.5 py-1.5 text-[11px] font-medium text-[#6d28d9]">
            ✓ {result.match_reasons.join(" · ")}
          </div>
        ) : null}

        <div className="mt-auto flex items-center justify-between border-t border-[#edf2ef] pt-3 text-sm">
          <span className="font-extrabold text-[#0a0f0d]">
            {result.base_price} {result.currency}
            <span className="text-xs font-normal text-[#7a8f84]"> / noc</span>
          </span>
          <span className="flex items-center gap-1 text-amber-500">
            ★ <span className="font-bold text-[#0a0f0d]">{result.average_rating ?? "—"}</span>
            <span className="text-[11px] text-[#7a8f84]"> ({result.review_count})</span>
          </span>
        </div>

        <div className="mt-3 inline-flex w-fit items-center gap-1 rounded-full border border-[#dcfce7] bg-[#f0fdf4] px-3 py-1 text-[11px] font-semibold text-[#15803d]">
          Zobacz szczegóły →
        </div>
      </div>
    </Link>
  );
}

function AIChatPanel({
  session,
  onUseSuggestion,
  prompt,
  setPrompt,
  onSubmit,
  busy,
}: {
  session: AISession;
  onUseSuggestion: (text: string) => void;
  prompt: string;
  setPrompt: (text: string) => void;
  onSubmit: () => void;
  busy: boolean;
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
    <section className="mx-auto mt-8 w-[calc(100%-3.5rem)] max-w-[980px] overflow-hidden rounded-[28px] border border-[#ececf3] bg-white shadow-[0_24px_64px_-34px_rgba(15,23,42,.35)]">
      <div className="border-b border-[#ececf3] bg-[linear-gradient(135deg,#ffffff_0%,#fafbfc_100%)] px-5 py-4 sm:px-6">
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
              <span className={cn("rounded-full border px-3 py-1.5 text-[11px] font-bold transition-all", statusPill.className)}>
                {statusPill.label}
              </span>
            </div>
          )}
      </div>

      <div className="px-5 pb-5 pt-4 sm:px-6 sm:pb-6">
        <div
          ref={feedRef}
          className="mb-4 max-h-[420px] space-y-3 overflow-auto rounded-2xl bg-[#fbfbfd] p-3 sm:p-4"
        >
          {showWelcome ? (
            <div className="flex justify-start">
              <div className="max-w-[92%] rounded-2xl border border-[#ececf3] bg-white px-4 py-3 text-[14px] leading-relaxed text-[#111827] shadow-sm">
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
                      ? "border border-[#ececf3] bg-white text-[#111827] shadow-sm"
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
                <div className="inline-flex items-center gap-2.5 rounded-2xl border border-[#ececf3] bg-white px-3.5 py-2.5 text-[#6b7280] shadow-sm">
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
                  AI przygotowuje odpowiedz...
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

        <div className="rounded-2xl border border-[#e5e7eb] bg-white p-3">
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
            className="min-h-[58px] w-full resize-none rounded-xl border border-[#d1d5db] bg-white px-3 py-2.5 text-sm text-[#111827] outline-none placeholder:text-[#9ca3af] focus:border-[#6b7280]"
          />
          <div className="mt-2 flex items-center justify-between gap-3">
            <span className="text-[11px] text-[#6b7280]">
              {session.status === "complete"
                ? "Możesz kontynuować rozmowę w tej samej sesji."
                : "AI analizuje bieżącą wiadomość i dopasowuje oferty live."}
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
              {busy ? "Wysyłanie..." : "Wyślij"}
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
  const error = useAIStore((s) => s.error);
  const reset = useAIStore((s) => s.reset);
  const results = useAIStore((s) => s.results);
  const startSearch = useAIStore((s) => s.startSearch);

  // Czyszczenie błędów przy montowaniu dla lepszego UX podczas testów
  useEffect(() => {
    if (error && error.includes("2312s")) {
      reset();
    }
  }, [error, reset]);

  useEffect(() => {
    setMounted(true);
  }, []);

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

  const resizeTa = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(120, Math.max(24, el.scrollHeight))}px`;
  }, []);

  useEffect(() => {
    resizeTa();
  }, [prompt, resizeTa]);

  async function submitSearch(overridePrompt?: string, overrideSessionId?: string) {
    if (busy) return;
    const token = getAccessToken();
    if (!token) {
      router.push("/login?next=/ai");
      return;
    }
    const p = (overridePrompt ?? prompt).trim();
    if (!p) return;
    setPrompt("");
    await startSearch(p, token, overrideSessionId ?? session?.session_id);
  }

  const busy = loading || polling;
  const complete = session?.status === "complete";

  if (!mounted) {
    return <div className="min-h-[40vh] bg-[#0a2e1a]" />;
  }

  if (typeof window !== "undefined" && !getAccessToken()) {
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
          className="relative z-[1] mx-auto inline-flex animate-fade-up items-center gap-1.5 rounded-full border border-[rgba(34,197,94,.3)] px-4 py-1.5 text-xs font-bold uppercase tracking-wide text-[#86efac]"
          style={{
            background: "rgba(34,197,94,.15)",
            animationDelay: "0ms",
          }}
        >
          <StarIcon className="text-[#86efac]" />
          Wyszukiwanie AI · Premium concierge
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
      </section>

      {error ? (
        <div className="mx-auto max-w-[680px] px-7 py-4">
          <div
            className="rounded-xl border border-red-200 bg-red-50 px-4 py-3.5 text-sm text-red-600"
            role="alert"
          >
            {error}
          </div>
        </div>
      ) : null}

      {(loading || polling) && !session ? (
        <AIProcessingState session={session} prompt={prompt} />
      ) : null}

      {session ? (
        <section className="bg-white pb-8">
          <div className="mx-auto w-full max-w-[1240px] px-7">
            <div className="pt-5" />

            <AIChatPanel
              session={session}
              prompt={prompt}
              setPrompt={setPrompt}
              busy={busy}
              onSubmit={() => void submitSearch()}
              onUseSuggestion={(text) => {
                void submitSearch(text, session.session_id);
              }}
            />

            {results.length > 0 && complete ? (
              <div className="mb-6 mt-6 rounded-2xl border border-[#ececf3] bg-[linear-gradient(135deg,#fbfbfd,#f9f9fd)] px-4 py-3.5">
                <p className="text-center text-sm font-semibold text-[#111827]">
                  ✨ Znalazłem <span className="text-[#7c3aed]">{results.length} ofert</span> dla Ciebie
                </p>
              </div>
            ) : null}

            <div className="mb-5 mt-4 flex items-center gap-2.5 rounded-[10px] border border-[#ddd6fe] bg-[#ede9fe] px-3.5 py-2.5 text-[13px] font-medium text-[#7c3aed]">
              <span aria-hidden>💬</span>
              <span className="min-w-0 flex-1 truncate">
                &quot;{prompt}&quot;
              </span>
              <button type="button" className="shrink-0 text-xs font-bold underline" onClick={() => reset()}>
                Zmień
              </button>
            </div>

            {complete ? (
              <>
                {results.length > 0 ? (
                  <>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {results.map((r, i) => (
                        <AIResultCard key={r.listing_id} result={r} index={i} />
                      ))}
                    </div>

                    <div className="mt-6 flex justify-center">
                      <Link href="/search" className="btn-secondary">
                        Pokaż więcej wyników
                      </Link>
                    </div>
                  </>
                ) : (
                  <div className="mt-4 rounded-2xl border border-[#ddd6fe] bg-[#faf8ff] px-4 py-5 text-sm text-[#5b21b6]">
                    Nie znalazłem jeszcze pasujących ofert dla tego zapytania. Spróbuj doprecyzować lokalizację,
                    budżet albo liczbę gości w czacie powyżej.
                  </div>
                )}
              </>
            ) : (
              <div className="mt-4 rounded-2xl border border-dashed border-[#ddd6fe] bg-[#faf5ff] px-4 py-5 text-sm text-[#6d28d9]">
                AI pracuje nad dopasowaniem ofert. Rozmowa już jest aktywna i możesz doprecyzować preferencje.
              </div>
            )}
          </div>
        </section>
      ) : null}
    </div>
  );
}


