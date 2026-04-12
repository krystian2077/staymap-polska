"use client";

import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";

import { useConversationSocket } from "@/hooks/useConversationSocket";
import { api } from "@/lib/api";
import { getAccessToken } from "@/lib/authStorage";
import { mapApiConversation, mapApiMessage } from "@/lib/utils/hostMap";
import { useMessagingStore } from "@/lib/store/messagingStore";
import type { Message } from "@/types/listing";
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
  const bottomRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeMessages.length]);

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
    <section className="mx-auto w-full max-w-[1240px] px-3 py-3 md:px-5 md:py-4">
      <div
        className="grid h-[calc(100vh-132px)] max-h-[calc(100dvh-132px)] w-full overflow-hidden rounded-[28px] border border-brand-dark/[.08] bg-white shadow-[0_24px_60px_-38px_rgba(15,23,42,0.45)] md:grid-cols-[300px_1fr]"
      >
      <div className="flex max-h-full flex-col border-brand-dark/[.06] bg-gradient-to-b from-[#f8fbfa] to-white md:border-r">
        <div className="border-b border-brand-dark/[.06] bg-white/90 px-4 py-4 backdrop-blur">
          <div className="flex items-center gap-2">
            <h1 className="text-base font-black tracking-tight text-brand-dark">Wiadomości</h1>
            {unreadTotal > 0 ? (
              <span className="rounded-full bg-brand px-2 py-0.5 text-[10px] font-bold text-white shadow-sm">
                {unreadTotal}
              </span>
            ) : null}
          </div>
          <p className="mt-1 text-[11px] font-medium text-text-muted">Rozmowy z gośćmi StayMap</p>
        </div>
        <div className="border-b border-brand-dark/[.06] px-3 py-2.5">
          <input
            className="input rounded-xl text-sm"
            placeholder="Szukaj konwersacji..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <ul className="flex-1 overflow-y-auto">
          {filtered.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => {
                  setActiveConv(c.id);
                  markReadStore(c.id);
                }}
                className={cn(
                  "m-2 flex w-[calc(100%-1rem)] gap-3 rounded-2xl border px-3.5 py-3 text-left transition-all duration-200",
                  activeConvId === c.id
                    ? "border-brand/30 bg-white shadow-[0_8px_24px_-16px_rgba(22,163,74,0.5)]"
                    : c.unread_count > 0
                      ? "border-brand/20 bg-brand-surface/50 shadow-[0_8px_22px_-18px_rgba(22,163,74,0.45)] hover:border-brand/30"
                      : "border-transparent hover:border-brand-dark/[.08] hover:bg-white"
                )}
              >
                <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full bg-brand-muted text-xs font-bold text-brand-dark">
                  {c.guest.avatar_url ? (
                    <Image src={c.guest.avatar_url} alt="" width={40} height={40} className="object-cover" unoptimized />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center">
                      {(fullName(c.guest.first_name, c.guest.last_name)[0] ?? "?").toUpperCase()}
                    </span>
                  )}
                  {onlineUsers[c.guest.id] ? (
                    <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-white bg-brand" />
                  ) : null}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-extrabold text-brand-dark">
                    {fullName(c.guest.first_name, c.guest.last_name)}
                  </p>
                  <p className="mt-0.5 truncate text-[11px] text-text-muted">
                    {convoSubtitle(c.listing.title, c.last_message?.content, "Gość")}
                  </p>
                  {c.unread_count > 0 ? (
                    <p className="mt-1 inline-flex items-center gap-1 rounded-full bg-brand px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-white">
                      <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
                      Nowa wiadomość
                    </p>
                  ) : null}
                </div>
                <div className="shrink-0 text-right text-[10px] text-text-muted">
                  {c.unread_count > 0 ? (
                    <span className="inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-brand text-[10px] font-bold text-white">
                      {c.unread_count}
                    </span>
                  ) : null}
                </div>
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div className="flex min-h-0 flex-col bg-gradient-to-b from-[#f6faf8] via-[#f8fafc] to-[#f8fbff]">
        {activeConv ? (
          <>
            <div className="flex items-center gap-3 border-b border-brand-dark/[.06] bg-white/92 px-5 py-4 backdrop-blur">
              <div className="h-9 w-9 overflow-hidden rounded-full bg-brand-muted">
                {activeConv.guest.avatar_url ? (
                  <Image
                    src={activeConv.guest.avatar_url}
                    alt=""
                    width={38}
                    height={38}
                    className="object-cover"
                    unoptimized
                  />
                ) : (
                  <span className="flex h-full w-full items-center justify-center text-xs font-bold">
                    {(fullName(activeConv.guest.first_name, activeConv.guest.last_name)[0] ?? "?").toUpperCase()}
                  </span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-extrabold text-brand-dark">
                  {fullName(activeConv.guest.first_name, activeConv.guest.last_name)}
                </p>
                <p className="truncate text-[11px] font-medium text-text-muted">
                  {convoSubtitle(
                    activeConv.listing.title,
                    activeConv.last_message?.content,
                    "Gość"
                  )}
                </p>
              </div>
              {onlineUsers[activeConv.guest.id] ? (
                <span className="rounded-full bg-brand/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-brand">
                  ● Online teraz
                </span>
              ) : null}
            </div>

            <div className="flex flex-1 flex-col gap-2.5 overflow-y-auto px-4 py-4">
              {activeMessages.map((m, idx) => {
                const d = new Date(m.created_at);
                const prev = activeMessages[idx - 1];
                const showDate =
                  !prev || format(new Date(prev.created_at), "yyyy-MM-dd") !== format(d, "yyyy-MM-dd");
                return (
                  <div key={m.id}>
                    {showDate ? (
                      <p className="my-2 text-center text-[11px] text-text-muted">
                        {isToday(d)
                          ? "Dzisiaj"
                          : isYesterday(d)
                            ? "Wczoraj"
                            : format(d, "d MMM yyyy", { locale: pl })}
                      </p>
                    ) : null}
                    <div
                      className={cn(
                        "flex gap-2",
                        m.sender_id === meId ? "flex-row-reverse" : "flex-row"
                      )}
                    >
                      <div
                        className={cn(
                          "max-w-[74%] rounded-2xl px-3.5 py-2.5 text-[13px] shadow-sm",
                          m.sender_id === meId
                            ? "rounded-br-sm bg-gradient-to-br from-brand-dark to-[#0f5f2e] text-white"
                            : "rounded-bl-sm bg-white text-text ring-1 ring-black/[.04]"
                        )}
                      >
                        {m.content}
                        <p
                          className={cn(
                            "mt-1 text-[10px]",
                            m.sender_id === meId ? "text-right text-white/60" : "text-text-muted"
                          )}
                        >
                          {format(d, "HH:mm")}
                          {m.sender_id === meId ? (m.is_read ? " · ✓✓" : " · ✓") : ""}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
              {activeConvId && (typingUsers[activeConvId]?.length ?? 0) > 0 ? (
                <div className="flex w-fit gap-1 rounded-2xl bg-white px-3 py-2 text-sm text-text-muted ring-1 ring-black/[.04]">
                  <span className="animate-pulse">●</span>
                  <span className="animate-pulse [animation-delay:200ms]">●</span>
                  <span className="animate-pulse [animation-delay:400ms]">●</span>
                </div>
              ) : null}
              <div ref={bottomRef} />
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
            />
          </>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
            <div className="rounded-3xl border border-brand-dark/[.06] bg-white px-8 py-10 shadow-[0_18px_40px_-28px_rgba(15,23,42,0.45)]">
              <span className="mb-4 block text-[44px]">💬</span>
              <p className="text-base font-extrabold text-brand-dark">Wybierz rozmowę z listy</p>
              <p className="mt-2 text-sm text-text-muted">
              Lub napisz pierwszy do gościa z panelu rezerwacji
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
}: {
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
}) {
  return (
    <div className="flex items-end gap-2.5 border-t border-brand-dark/[.06] bg-white/95 px-4 py-3 backdrop-blur">
      <textarea
        className="input max-h-[100px] min-h-[46px] flex-1 resize-none rounded-xl border-[1.5px] text-[13px] shadow-sm focus:border-brand"
        rows={2}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            onSend();
          }
        }}
        placeholder="Napisz wiadomość…"
      />
      <button
        type="button"
        disabled={!value.trim()}
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand to-[#15803d] text-white shadow-sm transition hover:-translate-y-px hover:from-[#15803d] hover:to-[#166534] disabled:opacity-40"
        onClick={onSend}
        aria-label="Wyślij"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M4 12L20 4 14 20 11 13 4 12Z"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinejoin="round"
          />
        </svg>
      </button>
    </div>
  );
}
