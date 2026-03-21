"use client";

import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";

import { useConversationSocket } from "@/hooks/useConversationSocket";
import { api } from "@/lib/api";
import { mapApiConversation, mapApiMessage } from "@/lib/utils/hostMap";
import { useMessagingStore } from "@/lib/store/messagingStore";
import type { Message } from "@/types/listing";
import { cn } from "@/lib/utils";
import { format, isToday, isYesterday } from "date-fns";
import { pl } from "date-fns/locale";

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
    setToken(typeof window !== "undefined" ? localStorage.getItem("access") : null);
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
      (c) =>
        c.guest.first_name.toLowerCase().includes(q) ||
        c.listing.title.toLowerCase().includes(q)
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
      if (wsStatus === "open") {
        wsSend(text);
      } else {
        await sendViaRest(activeConvId, text);
        void loadMessages(activeConvId);
      }
    } catch {
      toast.error("Nie wysłano wiadomości.");
    }
  };

  return (
    <div
      className="grid h-[calc(100vh-108px)] max-h-[calc(100dvh-108px)] w-full overflow-hidden border-t border-[#e5e7eb] md:grid-cols-[300px_1fr]"
    >
      <div className="flex max-h-full flex-col border-[#e5e7eb] md:border-r">
        <div className="border-b border-[#e5e7eb] px-4 py-3.5">
          <div className="flex items-center gap-2">
            <h1 className="text-base font-extrabold text-brand-dark">Wiadomości</h1>
            {unreadTotal > 0 ? (
              <span className="rounded-full bg-brand px-2 py-0.5 text-[10px] font-bold text-white">
                {unreadTotal}
              </span>
            ) : null}
          </div>
        </div>
        <div className="border-b border-[#e5e7eb] px-3 py-2.5">
          <input
            className="input text-sm"
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
                  "flex w-full gap-2.5 border-b border-[#e5e7eb] px-3.5 py-3 text-left transition-colors",
                  activeConvId === c.id ? "bg-brand-surface" : "hover:bg-[#f9fafb]"
                )}
              >
                <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full bg-brand-muted text-xs font-bold text-brand-dark">
                  {c.guest.avatar_url ? (
                    <Image src={c.guest.avatar_url} alt="" width={40} height={40} className="object-cover" unoptimized />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center">
                      {(c.guest.first_name[0] ?? "?").toUpperCase()}
                    </span>
                  )}
                  {onlineUsers[c.guest.id] ? (
                    <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-white bg-brand" />
                  ) : null}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-bold text-brand-dark">{c.guest.first_name}</p>
                  <p className="truncate text-[11px] text-text-muted">
                    {c.last_message?.content ?? "—"}
                  </p>
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

      <div className="flex min-h-0 flex-col bg-[#f9fafb]">
        {activeConv ? (
          <>
            <div className="flex items-center gap-3 border-b border-[#e5e7eb] bg-white px-4 py-3.5">
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
                    {activeConv.guest.first_name[0]}
                  </span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold">{activeConv.guest.first_name}</p>
                <p className="truncate text-[11px] text-text-muted">
                  📅 {activeConv.related_booking?.check_in ?? "—"} –{" "}
                  {activeConv.related_booking?.check_out ?? "—"} · {activeConv.listing.title}
                </p>
              </div>
              <span className="text-[11px] text-brand">
                {onlineUsers[activeConv.guest.id] ? "● Online teraz" : ""}
              </span>
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
                          "max-w-[78%] rounded-2xl px-3.5 py-2 text-[13px]",
                          m.sender_id === meId
                            ? "rounded-br-sm bg-brand-dark text-white"
                            : "rounded-bl-sm border border-[#e5e7eb] bg-white text-text"
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
                <div className="flex w-fit gap-1 rounded-2xl border border-[#e5e7eb] bg-white px-3 py-2 text-sm text-text-muted">
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
            <span className="mb-4 text-[44px]">💬</span>
            <p className="text-base font-bold text-brand-dark">Wybierz rozmowę z listy</p>
            <p className="mt-2 text-sm text-text-muted">
              Lub napisz pierwszy do gościa z panelu rezerwacji
            </p>
          </div>
        )}
      </div>
    </div>
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
    <div className="flex items-end gap-2.5 border-t border-[#e5e7eb] bg-white px-4 py-3">
      <textarea
        className="input max-h-[100px] min-h-[44px] flex-1 resize-none border-[1.5px] text-[13px] focus:border-brand"
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
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-brand text-white transition hover:bg-brand-700 hover:-translate-y-px disabled:opacity-40"
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
