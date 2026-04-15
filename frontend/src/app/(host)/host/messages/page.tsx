"use client";

import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import toast from "react-hot-toast";

import { useConversationSocket } from "@/hooks/useConversationSocket";
import { api } from "@/lib/api";
import { getAccessToken } from "@/lib/authStorage";
import { mapApiConversation, mapApiMessage } from "@/lib/utils/hostMap";
import { useMessagingStore } from "@/lib/store/messagingStore";
import type { Message } from "@/types/listing";
import { MessageTemplateDropdown } from "@/components/host/MessageTemplateDropdown";
import { cn } from "@/lib/utils";
import { format, isToday, isYesterday } from "date-fns";
import { pl } from "date-fns/locale";

function fullName(first?: string, last?: string): string {
  const name = `${first ?? ""} ${last ?? ""}`.trim();
  return name || "Gość";
}

function convoSubtitle(
  listingTitle?: string,
  lastMessage?: string,
  fallback = "Gość"
): string {
  const title = (listingTitle ?? "").trim();
  const msg = (lastMessage ?? "").trim();
  const parts = [fallback, title ? `oferta ${title}` : null, msg || null].filter(Boolean);
  return parts.join(" · ");
}

function previewTime(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return isToday(d) ? format(d, "HH:mm") : format(d, "d MMM", { locale: pl });
}

export default function HostMessagesPage() {
  const searchParams = useSearchParams();
  const convFromQuery = searchParams.get("conv");

  const conversations = useMessagingStore((s) => s.conversations);
  const setConversations = useMessagingStore((s) => s.setConversations);
  const activeConvId = useMessagingStore((s) => s.activeConvId);
  const setActiveConv = useMessagingStore((s) => s.setActiveConv);
  const messages = useMessagingStore((s) => s.messages);
  const setMessages = useMessagingStore((s) => s.setMessages);
  const addMessage = useMessagingStore((s) => s.addMessage);
  const typingUsers = useMessagingStore((s) => s.typingUsers);
  const onlineUsers = useMessagingStore((s) => s.onlineUsers);
  const unreadTotal = useMessagingStore((s) => s.unreadTotal);
  const markReadStore = useMessagingStore((s) => s.markRead);

  const [query, setQuery] = useState("");
  const [meId, setMeId] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const messagesScrollRef = useRef<HTMLDivElement>(null);

  const activeConv = useMemo(
    () => conversations.find((c) => c.id === activeConvId) ?? null,
    [conversations, activeConvId]
  );

  const activeMessages = activeConvId ? messages[activeConvId] ?? [] : [];

  useEffect(() => {
    setToken(typeof window !== "undefined" ? getAccessToken() : null);
  }, []);

  useEffect(() => {
    let c = false;
    (async () => {
      try {
        const me = await api.get<{ data: { id: string } }>("/api/v1/auth/me/");
        if (!c) setMeId(me.data.id);
      } catch {
        if (!c) setMeId(null);
      }
    })();
    return () => {
      c = true;
    };
  }, []);

  useEffect(() => {
    let c = false;
    (async () => {
      try {
        const res = await api.get<{ data: Record<string, unknown>[] }>("/api/v1/conversations/");
        if (!c && Array.isArray(res.data)) {
          setConversations(res.data.map((row) => mapApiConversation(row)));
        }
      } catch {
        if (!c) setConversations([]);
      }
    })();
    return () => {
      c = true;
    };
  }, [setConversations]);

  useEffect(() => {
    if (convFromQuery) setActiveConv(convFromQuery);
  }, [convFromQuery, setActiveConv]);

  const { sendMessage: wsSend, sendTyping, status: wsStatus } = useConversationSocket(
    activeConvId,
    token
  );

  const loadMessages = useCallback(
    async (id: string) => {
      try {
        const res = await api.get<{ data: Record<string, unknown>[] }>(
          `/api/v1/conversations/${id}/messages/`
        );
        const rows = res.data || [];
        setMessages(
          id,
          rows.map((r) => mapApiMessage(r, id))
        );
      } catch {
        toast.error("Nie udało się wczytać wiadomości.");
      }
    },
    [setMessages]
  );

  useEffect(() => {
    if (activeConvId) void loadMessages(activeConvId);
  }, [activeConvId, loadMessages]);

  // Tylko wewnętrzny kontener listy — scrollIntoView na elemencie końcowym przewijało całą stronę.
  useEffect(() => {
    const el = messagesScrollRef.current;
    if (!el) return;
    const t = window.setTimeout(() => {
      el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    }, 0);
    return () => window.clearTimeout(t);
  }, [activeMessages.length, activeConvId]);

  const isHostView = useMemo(() => {
    if (!meId || !activeConv) return false;
    return activeConv.host.id === meId;
  }, [meId, activeConv]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return conversations;
    return conversations.filter(
      (c) => {
        const guestName = fullName(c.guest.first_name, c.guest.last_name).toLowerCase();
        return guestName.includes(q) || c.listing.title.toLowerCase().includes(q);
      }
    );
  }, [conversations, query]);

  const sendViaRest = async (convId: string, body: string) => {
    await api.post(`/api/v1/conversations/${convId}/messages/`, { body });
  };

  const [input, setInput] = useState("");
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const onSend = async () => {
    const text = input.trim();
    if (!text || !activeConvId || !meId) return;
    const temp: Message = {
      id: `temp-${Date.now()}`,
      conversation_id: activeConvId,
      sender_id: meId,
      content: text,
      is_read: false,
      created_at: new Date().toISOString(),
    };
    addMessage(activeConvId, temp);
    setInput("");
    sendTyping(false);
    try {
      await sendViaRest(activeConvId, text);
      void loadMessages(activeConvId);
    } catch {
      const sentByWs = wsStatus === "open" ? wsSend(text) : false;
      if (!sentByWs) {
        toast.error("Nie wysłano wiadomości.");
      }
    }
  };

  return (
    <section className="mx-auto w-full max-w-[1440px] px-3 py-6 md:px-6 md:py-8">
      <div
        className={cn(
          "grid w-full overflow-hidden rounded-[16px] border border-brand-dark/[.07] bg-white sm:rounded-[24px]",
          "shadow-[0_2px_0_0_rgba(15,23,42,0.03),0_28px_56px_-30px_rgba(15,23,42,0.26),0_0_0_1px_rgba(255,255,255,0.8)_inset]",
          "md:grid-cols-[minmax(260px,320px)_1fr]",
          "h-[calc(100dvh-var(--nav-h)-1rem)] min-h-[520px] md:h-[min(920px,calc(100dvh-6rem))]"
        )}
      >
        {/* Lista konwersacji */}
        <div className={cn("flex min-h-0 flex-col border-brand-dark/[.06] bg-gradient-to-b from-[#f6faf8] via-[#fbfcfb] to-[#f0f5f2] md:border-r md:border-brand-dark/[.05]", activeConv ? "hidden md:flex" : "flex")}>
          <div className="relative overflow-hidden border-b border-white/10 bg-gradient-to-br from-[#0c4d26] via-brand-dark to-[#14532d] px-4 py-4 text-white md:px-5">
            <div className="pointer-events-none absolute -right-8 -top-10 h-28 w-28 rounded-full bg-white/10 blur-2xl" />
            <div className="pointer-events-none absolute -bottom-6 left-1/4 h-20 w-36 rounded-full bg-emerald-400/15 blur-2xl" />
            <div className="relative flex items-start justify-between gap-3">
              <div>
                <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-white/55">Inbox</p>
                <div className="mt-0.5 flex items-center gap-2">
                  <h1 className="text-base font-black tracking-tight md:text-lg">Wiadomości</h1>
                  {unreadTotal > 0 ? (
                    <span className="rounded-full bg-white/18 px-2 py-0.5 text-[10px] font-bold tabular-nums text-white ring-1 ring-white/25">
                      {unreadTotal}
                    </span>
                  ) : null}
                </div>
                <p className="mt-1 max-w-[200px] text-[11px] font-medium leading-snug text-white/72">
                  Rozmowy z gośćmi StayMap.
                </p>
              </div>
            </div>
          </div>

          <div className="border-b border-brand-dark/[.06] bg-white/60 px-4 py-3 backdrop-blur-sm">
            <div className="relative">
              <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[13px] opacity-50">
                ⌕
              </span>
              <input
                className="input w-full rounded-xl border-brand-dark/[.08] bg-white py-2.5 pl-10 pr-3 text-[13px] shadow-[0_1px_2px_rgba(15,23,42,0.04)] placeholder:text-text-muted/70 focus:border-brand/35 focus:ring-2 focus:ring-brand/15"
                placeholder="Szukaj po gościu lub ofercie…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
          </div>

          <ul className="flex-1 space-y-0 overflow-y-auto overscroll-y-contain py-2">
            {filtered.map((c) => (
              <li key={c.id} className="px-3">
                <button
                  type="button"
                  onClick={() => {
                    setActiveConv(c.id);
                    markReadStore(c.id);
                  }}
                  className={cn(
                    "group flex w-full gap-3 rounded-2xl border px-3 py-3 text-left transition-all duration-200",
                    activeConvId === c.id
                      ? "border-brand/35 bg-white shadow-[0_12px_36px_-20px_rgba(22,163,74,0.55)] ring-1 ring-brand/15"
                      : c.unread_count > 0
                        ? "border-brand/18 bg-white/90 shadow-[0_8px_24px_-18px_rgba(22,163,74,0.25)] hover:border-brand/28"
                        : "border-transparent hover:border-brand-dark/[.08] hover:bg-white/80"
                  )}
                >
                  <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-full bg-gradient-to-br from-brand-muted to-brand-surface text-[13px] font-bold text-brand-dark ring-2 ring-white shadow-sm">
                    {c.guest.avatar_url ? (
                      <Image
                        src={c.guest.avatar_url}
                        alt=""
                        width={44}
                        height={44}
                        className="object-cover"
                        unoptimized
                      />
                    ) : (
                      <span className="flex h-full w-full items-center justify-center">
                        {(fullName(c.guest.first_name, c.guest.last_name)[0] ?? "?").toUpperCase()}
                      </span>
                    )}
                    {onlineUsers[c.guest.id] ? (
                      <span className="absolute bottom-0.5 right-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-emerald-500 shadow-sm" />
                    ) : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-[13px] font-extrabold tracking-tight text-brand-dark">
                          {fullName(c.guest.first_name, c.guest.last_name)}
                        </p>
                        <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-text-muted">
                          {convoSubtitle(c.listing.title, c.last_message?.content, "Gość")}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-[10px] font-semibold tabular-nums text-text-muted/90">
                          {previewTime(c.last_message?.created_at)}
                        </p>
                        {c.unread_count > 0 ? (
                          <span className="mt-1 inline-flex h-[20px] min-w-[20px] items-center justify-center rounded-full bg-gradient-to-br from-brand to-[#15803d] text-[10px] font-bold text-white shadow-sm">
                            {c.unread_count}
                          </span>
                        ) : null}
                      </div>
                    </div>
                    {c.unread_count > 0 ? (
                      <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-brand/12 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.12em] text-brand-dark">
                        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand" />
                        Nowa wiadomość
                      </p>
                    ) : null}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </div>

        {/* Panel wątku */}
        <div className={cn("relative min-h-0 flex-col overflow-hidden bg-[#f3f7f5] dark:bg-[var(--bg1)]", activeConv ? "flex" : "hidden md:flex")}>
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.35]"
            style={{
              backgroundImage: `radial-gradient(circle at 1px 1px, rgba(15,23,42,0.06) 1px, transparent 0)`,
              backgroundSize: "20px 20px",
            }}
          />
          <div className="pointer-events-none absolute -left-20 top-0 h-56 w-56 rounded-full bg-emerald-200/35 blur-3xl" />
          <div className="pointer-events-none absolute bottom-0 right-0 h-48 w-48 rounded-full bg-sky-200/25 blur-3xl" />

          {activeConv ? (
            <>
              <header className="relative z-[1] flex flex-col gap-3 border-b border-brand-dark/[.07] bg-white/85 px-3.5 py-3 backdrop-blur-md sm:flex-row sm:items-center sm:gap-4 sm:px-6 sm:py-4">
                <div className="flex min-w-0 flex-1 items-center gap-3.5">
                  <button
                    type="button"
                    onClick={() => setActiveConv(null)}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-brand-dark/[.08] bg-white text-brand-dark md:hidden"
                    aria-label="Wróć do listy rozmów"
                  >
                    ←
                  </button>
                  <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-2xl bg-gradient-to-br from-brand-muted to-emerald-100/80 text-sm font-bold text-brand-dark shadow-inner ring-2 ring-white">
                    {activeConv.guest.avatar_url ? (
                      <Image
                        src={activeConv.guest.avatar_url}
                        alt=""
                        width={48}
                        height={48}
                        className="object-cover"
                        unoptimized
                      />
                    ) : (
                      <span className="flex h-full w-full items-center justify-center">
                        {(fullName(activeConv.guest.first_name, activeConv.guest.last_name)[0] ?? "?").toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-base font-black tracking-tight text-brand-dark md:text-[17px]">
                        {fullName(activeConv.guest.first_name, activeConv.guest.last_name)}
                      </p>
                      {onlineUsers[activeConv.guest.id] ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-800 ring-1 ring-emerald-200/80 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-800/50">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.9)]" />
                          Online
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-slate-100/90 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600 ring-1 ring-slate-200/90 dark:bg-slate-800/60 dark:text-slate-400 dark:ring-slate-700">
                          Ostatnio offline
                        </span>
                      )}
                    </div>
                    <p className="mt-1 line-clamp-2 text-[12px] leading-snug text-text-muted">
                      {convoSubtitle(
                        activeConv.listing.title,
                        activeConv.last_message?.content,
                        "Gość"
                      )}
                    </p>
                  </div>
                </div>
              </header>

              <div
                ref={messagesScrollRef}
                className="relative z-[1] flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto overscroll-y-contain px-3.5 py-3.5 sm:px-6 sm:py-5"
              >
                {activeMessages.map((m, idx) => {
                  const d = new Date(m.created_at);
                  const prev = activeMessages[idx - 1];
                  const showDate =
                    !prev || format(new Date(prev.created_at), "yyyy-MM-dd") !== format(d, "yyyy-MM-dd");
                  const mine = m.sender_id === meId;
                  return (
                    <div key={m.id}>
                      {showDate ? (
                        <div className="my-4 flex justify-center">
                          <span className="rounded-full bg-white/90 px-3 py-1 text-[11px] font-semibold text-text-muted shadow-sm ring-1 ring-black/[.05] dark:bg-[var(--bg2)] dark:ring-white/10">
                            {isToday(d)
                              ? "Dzisiaj"
                              : isYesterday(d)
                                ? "Wczoraj"
                                : format(d, "d MMM yyyy", { locale: pl })}
                          </span>
                        </div>
                      ) : null}
                      <div className={cn("flex gap-2.5", mine ? "flex-row-reverse" : "flex-row")}>
                        <div
                          className={cn(
                            "max-w-[92%] rounded-[20px] px-3.5 py-3 text-[14px] leading-relaxed shadow-[0_10px_40px_-24px_rgba(15,23,42,0.45)] sm:max-w-[min(92%,520px)] sm:px-4",
                            mine
                              ? "rounded-br-md bg-gradient-to-br from-[#0f5f2e] via-brand-dark to-[#134e2e] text-white"
                              : "rounded-bl-md bg-white text-text shadow-sm ring-1 ring-black/[.05] dark:bg-[var(--bg2)] dark:ring-white/10"
                          )}
                        >
                          <p className="whitespace-pre-wrap break-words">{m.content}</p>
                          <p
                            className={cn(
                              "mt-2 text-[10px] font-medium tabular-nums",
                              mine ? "text-right text-white/55" : "text-text-muted"
                            )}
                          >
                            {format(d, "HH:mm")}
                            {mine ? (m.is_read ? " · ✓✓" : " · ✓") : ""}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
                {activeConvId && (typingUsers[activeConvId]?.length ?? 0) > 0 ? (
                  <div className="flex w-fit items-center gap-2 rounded-2xl bg-white/95 px-4 py-2.5 text-sm text-text-muted shadow-sm ring-1 ring-black/[.06] dark:bg-[var(--bg2)]">
                    <span className="flex gap-1">
                      <span className="inline-block h-1.5 w-1.5 animate-bounce rounded-full bg-brand" />
                      <span className="inline-block h-1.5 w-1.5 animate-bounce rounded-full bg-brand [animation-delay:150ms]" />
                      <span className="inline-block h-1.5 w-1.5 animate-bounce rounded-full bg-brand [animation-delay:300ms]" />
                    </span>
                    <span className="text-[12px] font-medium">Gość pisze…</span>
                  </div>
                ) : null}
              </div>

              <ChatInput
                value={input}
                onChange={(v) => {
                  setInput(v);
                  sendTyping(true);
                  if (typingTimer.current) clearTimeout(typingTimer.current);
                  typingTimer.current = setTimeout(() => sendTyping(false), 1000);
                }}
                onSend={() => void onSend()}
                templateSlot={
                  isHostView && activeConv ? (
                    <MessageTemplateDropdown
                      guestName={fullName(activeConv.guest.first_name, activeConv.guest.last_name)}
                      listingTitle={activeConv.listing.title}
                      onApply={(text) => {
                        setInput(text);
                        sendTyping(true);
                        if (typingTimer.current) clearTimeout(typingTimer.current);
                        typingTimer.current = setTimeout(() => sendTyping(false), 1000);
                      }}
                    />
                  ) : null
                }
              />
            </>
          ) : (
            <div className="relative z-[1] flex flex-1 flex-col items-center justify-center px-6 py-12 text-center">
              <div className="max-w-md rounded-[28px] border border-white/60 bg-gradient-to-b from-white to-[#f3f7f5] p-10 shadow-[0_24px_60px_-40px_rgba(15,23,42,0.35)] ring-1 ring-brand-dark/[.05] dark:from-[var(--bg2)] dark:to-[var(--bg1)] dark:ring-white/10">
                <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-muted to-emerald-100/80 text-3xl shadow-inner ring-2 ring-white">
                  💬
                </div>
                <p className="text-[18px] font-black tracking-tight text-brand-dark md:text-xl">
                  Wybierz rozmowę
                </p>
                <p className="mt-2 text-sm leading-relaxed text-text-muted">
                  Lista po lewej — kliknij wątek, aby odpowiedzieć gościowi. Nowe zapytania zobaczysz też w
                  rezerwacjach.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function ChatInput({
  value,
  onChange,
  onSend,
  templateSlot,
}: {
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
  templateSlot?: ReactNode;
}) {
  return (
    <div className="relative z-[2] border-t border-brand-dark/[.07] bg-gradient-to-t from-white via-white to-[#f6faf8] shadow-[0_-12px_40px_-32px_rgba(15,23,42,0.2)] dark:from-[var(--bg2)] dark:via-[var(--bg2)] dark:to-[var(--bg1)]">
      {templateSlot ? (
        <div className="border-b border-brand-dark/[.06] bg-gradient-to-b from-[#ecfdf5]/80 via-white to-white px-3 py-3 dark:from-emerald-950/25 dark:via-[var(--bg2)] dark:to-[var(--bg2)] sm:px-5">
          <div className="mx-auto max-w-[960px]">{templateSlot}</div>
        </div>
      ) : null}
      <div className="px-3 pb-[calc(10px+var(--mobile-safe-bottom))] pt-2.5 sm:px-5 sm:pb-5 sm:pt-3">
        <div className="mx-auto max-w-[960px]">
          <div className="flex flex-col gap-3 rounded-2xl border border-brand-dark/[.06] bg-white p-2.5 shadow-[0_18px_50px_-38px_rgba(15,23,42,0.45),inset_0_1px_0_rgba(255,255,255,0.9)] ring-1 ring-black/[.03] dark:border-brand-border dark:bg-[var(--bg2)] dark:ring-white/5 sm:flex-row sm:items-stretch sm:gap-3 sm:p-3">
            <textarea
              className="input min-h-[100px] w-full flex-1 resize-y rounded-xl border-0 bg-transparent px-3 py-2.5 text-[14px] leading-relaxed text-brand-dark shadow-none placeholder:text-text-muted/65 focus:ring-0 dark:text-[var(--foreground)] md:min-h-[120px]"
              style={{ maxHeight: "min(280px, 38vh)" }}
              rows={4}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  onSend();
                }
              }}
              placeholder="Napisz wiadomość do gościa… (Shift+Enter — nowa linia)"
            />
            <div className="flex shrink-0 justify-end sm:items-end sm:pb-0.5">
              <button
                type="button"
                disabled={!value.trim()}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-brand-dark to-[#15803d] px-5 text-sm font-bold text-white shadow-[0_8px_24px_-12px_rgba(22,163,74,0.65)] transition hover:brightness-[1.03] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40 sm:h-14 sm:w-14 sm:shrink-0 sm:px-0"
                onClick={onSend}
                aria-label="Wyślij wiadomość"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden className="shrink-0">
                  <path
                    d="M4 12L20 4 14 20 11 13 4 12Z"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinejoin="round"
                  />
                </svg>
                <span className="sm:hidden">Wyślij</span>
              </button>
            </div>
          </div>
          <p className="mt-2 text-center text-[11px] text-text-muted/85 sm:text-left">
            Enter wysyła wiadomość · Shift+Enter dodaje akapit
          </p>
        </div>
      </div>
    </div>
  );
}
