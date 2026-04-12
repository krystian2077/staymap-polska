"use client";

import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { format, isToday, isYesterday } from "date-fns";
import { pl } from "date-fns/locale";
import toast from "react-hot-toast";

import { useConversationSocket } from "@/hooks/useConversationSocket";
import { api } from "@/lib/api";
import { getAccessToken } from "@/lib/authStorage";
import { useAuthStore } from "@/lib/store/authStore";
import { useMessagingStore } from "@/lib/store/messagingStore";
import { mapApiConversation, mapApiMessage } from "@/lib/utils/hostMap";
import { cn } from "@/lib/utils";
import type { Message } from "@/types/listing";

function hostName(displayName?: string): string {
  return (displayName ?? "").trim() || "Gospodarz";
}

function previewTime(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return isToday(d) ? format(d, "HH:mm") : format(d, "d MMM", { locale: pl });
}

function convoSubtitle(
  hostDisplayName?: string,
  listingTitle?: string,
  lastMessage?: string,
  fallback = "Gospodarz"
): string {
  const host = (hostDisplayName ?? fallback).trim() || fallback;
  const title = (listingTitle ?? "").trim();
  const msg = (lastMessage ?? "").trim();
  const parts = [host, title ? `oferta ${title}` : null, msg || null].filter(Boolean);
  return parts.join(" · ");
}

export default function GuestMessagesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const convFromQuery = searchParams.get("conv");

  const user = useAuthStore((s) => s.user);
  const conversations = useMessagingStore((s) => s.conversations);
  const setConversations = useMessagingStore((s) => s.setConversations);
  const activeConvId = useMessagingStore((s) => s.activeConvId);
  const setActiveConv = useMessagingStore((s) => s.setActiveConv);
  const messages = useMessagingStore((s) => s.messages);
  const setMessages = useMessagingStore((s) => s.setMessages);
  const addMessage = useMessagingStore((s) => s.addMessage);
  const typingUsers = useMessagingStore((s) => s.typingUsers);
  const unreadTotal = useMessagingStore((s) => s.unreadTotal);
  const markReadStore = useMessagingStore((s) => s.markRead);

  const [query, setQuery] = useState("");
  const [meId, setMeId] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const activeConv = useMemo(
    () => conversations.find((c) => c.id === activeConvId) ?? null,
    [conversations, activeConvId]
  );
  const activeMessages = activeConvId ? messages[activeConvId] ?? [] : [];

  useEffect(() => {
    if (!user) {
      router.replace("/login");
      return;
    }
    if (user.is_host) {
      router.replace("/host/messages");
      return;
    }
    setToken(typeof window !== "undefined" ? getAccessToken() : null);
    setMeId(user.id);
  }, [router, user]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await api.get<{ data: Record<string, unknown>[] }>("/api/v1/conversations/");
        if (!cancelled && Array.isArray(res.data)) {
          setConversations(res.data.map((row) => mapApiConversation(row)));
        }
      } catch {
        if (!cancelled) setConversations([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [setConversations]);

  useEffect(() => {
    if (convFromQuery) setActiveConv(convFromQuery);
  }, [convFromQuery, setActiveConv]);

  const { sendMessage: wsSend, sendTyping, status: wsStatus } = useConversationSocket(activeConvId, token);

  const loadMessages = useCallback(
    async (id: string) => {
      try {
        const res = await api.get<{ data: Record<string, unknown>[] }>(`/api/v1/conversations/${id}/messages/`);
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
        c.host.display_name.toLowerCase().includes(q) ||
        c.listing.title.toLowerCase().includes(q)
    );
  }, [conversations, query]);

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
      await api.post(`/api/v1/conversations/${activeConvId}/messages/`, { body: text });
      void loadMessages(activeConvId);
    } catch {
      // Fallback: jeśli REST chwilowo zawiedzie, spróbuj wysłać przez aktywny socket.
      const sentByWs = wsStatus === "open" ? wsSend(text) : false;
      if (!sentByWs) {
        toast.error("Nie wysłano wiadomości.");
      }
    }
  };

  return (
    <div className="mx-auto mt-6 grid h-[calc(100vh-130px)] max-w-[1400px] overflow-hidden rounded-[32px] border border-brand-dark/[.08] bg-white shadow-[0_30px_80px_-32px_rgba(15,23,42,0.35)] md:grid-cols-[340px_1fr]">
      <div className="flex max-h-full flex-col border-brand-dark/[.06] bg-gradient-to-b from-[#f8fbfa] to-white md:border-r">
        <div className="border-b border-brand-dark/[.06] bg-gradient-to-br from-brand-dark via-[#0f5f2e] to-[#15803d] px-4 py-4 text-white">
          <div className="flex items-center gap-2">
            <h1 className="text-base font-black tracking-tight">Wiadomości</h1>
            {unreadTotal > 0 ? (
              <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-bold text-white shadow-sm ring-1 ring-white/25">{unreadTotal}</span>
            ) : null}
          </div>
          <p className="mt-1 text-[11px] font-medium text-white/80">Twoje rozmowy z gospodarzami</p>
        </div>

        <div className="border-b border-brand-dark/[.06] px-3 py-2.5">
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-text-muted">🔎</span>
            <input
              className="input pl-8 text-sm"
              placeholder="Szukaj rozmowy..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
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
                  "m-2 flex w-[calc(100%-1rem)] gap-3 rounded-2xl border px-3.5 py-3 text-left transition-all",
                  activeConvId === c.id
                    ? "border-brand/30 bg-white shadow-[0_8px_24px_-16px_rgba(22,163,74,0.5)]"
                    : "border-transparent hover:border-brand-dark/[.08] hover:bg-white"
                )}
              >
                <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full bg-brand-muted text-xs font-bold text-brand-dark">
                  {c.host.avatar_url ? (
                    <Image src={c.host.avatar_url} alt="" width={40} height={40} className="object-cover" unoptimized />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center">
                      {(hostName(c.host.display_name)[0] ?? "?").toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-extrabold text-brand-dark">{hostName(c.host.display_name)}</p>
                  <p className="mt-0.5 truncate text-[11px] text-text-muted">
                    {convoSubtitle(c.host.display_name, c.listing.title, c.last_message?.content, "Gospodarz")}
                  </p>
                </div>
                <div className="shrink-0 text-right text-[10px] text-text-muted">
                  <p className="mb-1 text-[10px] font-semibold text-text-muted/90">
                    {previewTime(c.last_message?.created_at)}
                  </p>
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

      <div className="relative flex min-h-0 flex-col bg-gradient-to-b from-[#f4faf7] via-[#f8fafc] to-[#f8fbff]">
        <div className="pointer-events-none absolute -left-16 -top-16 h-48 w-48 rounded-full bg-emerald-100/60 blur-3xl" />
        <div className="pointer-events-none absolute -right-10 bottom-20 h-44 w-44 rounded-full bg-blue-100/50 blur-3xl" />
        {activeConv ? (
          <>
            <div className="flex items-center gap-3 border-b border-brand-dark/[.06] bg-white/90 px-5 py-4 backdrop-blur">
              <div className="h-9 w-9 overflow-hidden rounded-full bg-brand-muted">
                {activeConv.host.avatar_url ? (
                  <Image src={activeConv.host.avatar_url} alt="" width={38} height={38} className="object-cover" unoptimized />
                ) : (
                  <span className="flex h-full w-full items-center justify-center text-xs font-bold">
                    {(hostName(activeConv.host.display_name)[0] ?? "?").toUpperCase()}
                  </span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-extrabold text-brand-dark">{hostName(activeConv.host.display_name)}</p>
                <p className="truncate text-[11px] font-medium text-text-muted">
                  {convoSubtitle(activeConv.host.display_name, activeConv.listing.title, activeConv.last_message?.content, "Gospodarz")}
                </p>
              </div>
              <div className="hidden sm:block">
                <span className="rounded-full bg-gradient-to-r from-amber-50 to-yellow-50 px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-amber-800 ring-1 ring-amber-200 shadow-sm">
                  Premium Host
                </span>
              </div>
            </div>

            <div className="relative z-[1] flex flex-1 flex-col gap-2.5 overflow-y-auto px-4 py-4">
              {activeMessages.map((m, idx) => {
                const d = new Date(m.created_at);
                const prev = activeMessages[idx - 1];
                const showDate = !prev || format(new Date(prev.created_at), "yyyy-MM-dd") !== format(d, "yyyy-MM-dd");
                return (
                  <div key={m.id}>
                    {showDate ? (
                      <p className="my-2 text-center text-[11px] text-text-muted">
                        {isToday(d) ? "Dzisiaj" : isYesterday(d) ? "Wczoraj" : format(d, "d MMM yyyy", { locale: pl })}
                      </p>
                    ) : null}
                    <div className={cn("flex gap-2", m.sender_id === meId ? "flex-row-reverse" : "flex-row")}>
                      <div
                        className={cn(
                          "max-w-[78%] rounded-2xl px-3.5 py-2.5 text-[13px] shadow-[0_8px_24px_-18px_rgba(15,23,42,0.35)]",
                          m.sender_id === meId
                            ? "rounded-br-sm bg-gradient-to-br from-brand-dark to-[#0f5f2e] text-white"
                            : "rounded-bl-sm bg-white text-text ring-1 ring-black/[.04]"
                        )}
                      >
                        {m.content}
                        <p className={cn("mt-1 text-[10px]", m.sender_id === meId ? "text-right text-white/60" : "text-text-muted")}>
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

            <div className="border-t border-brand-dark/[.06] bg-white/95 px-4 py-3 backdrop-blur">
              <div className="flex items-end gap-2.5 rounded-2xl border border-brand-dark/[.08] bg-white px-2.5 py-2 shadow-[0_12px_24px_-22px_rgba(15,23,42,0.45)]">
              <textarea
                className="input max-h-[100px] min-h-[46px] flex-1 resize-none border-[1.5px] text-[13px] shadow-sm focus:border-brand"
                rows={2}
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  sendTyping(true);
                  if (typingTimer.current) clearTimeout(typingTimer.current);
                  typingTimer.current = setTimeout(() => sendTyping(false), 1000);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void onSend();
                  }
                }}
                placeholder="Napisz wiadomość do gospodarza..."
              />
              <button
                type="button"
                disabled={!input.trim()}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand to-[#15803d] text-white shadow-sm transition hover:-translate-y-px hover:from-[#15803d] hover:to-[#166534] disabled:opacity-40"
                onClick={() => void onSend()}
                aria-label="Wyślij"
              >
                ➤
              </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
            <div className="max-w-[520px] rounded-3xl border border-brand-dark/[.06] bg-white px-10 py-12 shadow-[0_24px_50px_-34px_rgba(15,23,42,0.45)]">
              <span className="mb-4 block text-[44px]">💬</span>
              <p className="text-lg font-extrabold tracking-tight text-brand-dark">Wybierz rozmowę z listy</p>
              <p className="mt-2 text-sm text-text-muted">Po wysłaniu wiadomości z oferty pojawi się tutaj pełna historia czatu z gospodarzem.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

