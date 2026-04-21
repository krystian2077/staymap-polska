import { create } from "zustand";

import type { Conversation, Message } from "@/types/listing";

interface MessagingStore {
  conversations: Conversation[];
  activeConvId: string | null;
  messages: Record<string, Message[]>;
  typingUsers: Record<string, string[]>;
  onlineUsers: Record<string, boolean>;
  unreadTotal: number;

  setConversations: (c: Conversation[]) => void;
  setActiveConv: (id: string | null) => void;
  addMessage: (convId: string, msg: Message) => void;
  setMessages: (convId: string, msgs: Message[]) => void;
  setTyping: (convId: string, userId: string, isTyping: boolean) => void;
  setOnline: (userId: string, isOnline: boolean) => void;
  markRead: (convId: string) => void;
  markAllRead: () => void;
  setUnreadTotal: (value: number) => void;
}

export const useMessagingStore = create<MessagingStore>((set) => ({
  conversations: [],
  activeConvId: null,
  messages: {},
  typingUsers: {},
  onlineUsers: {},
  unreadTotal: 0,

  setConversations: (c) =>
    set({
      conversations: c,
      unreadTotal: c.reduce((acc, x) => acc + (x.unread_count || 0), 0),
    }),
  setActiveConv: (id) => set({ activeConvId: id }),
  addMessage: (convId, msg) =>
    set((s) => {
      const existing = s.messages[convId] || [];
      const withoutStaleTemp = existing.filter(
        (m) =>
          !(
            m.id.startsWith("temp-") &&
            m.sender_id === msg.sender_id &&
            m.content === msg.content
          )
      );
      const merged = withoutStaleTemp.some((m) => m.id === msg.id)
        ? withoutStaleTemp.map((m) => (m.id === msg.id ? msg : m))
        : [...withoutStaleTemp, msg];
      return {
        messages: { ...s.messages, [convId]: merged },
        conversations: s.conversations.map((c) =>
          c.id === convId ? { ...c, last_message: msg } : c
        ),
      };
    }),
  setMessages: (convId, msgs) =>
    set((s) => ({
      messages: { ...s.messages, [convId]: msgs },
    })),
  setTyping: (convId, userId, isTyping) =>
    set((s) => {
      const cur = s.typingUsers[convId] || [];
      return {
        typingUsers: {
          ...s.typingUsers,
          [convId]: isTyping
            ? [...cur.filter((u) => u !== userId), userId]
            : cur.filter((u) => u !== userId),
        },
      };
    }),
  setOnline: (userId, isOnline) =>
    set((s) => ({
      onlineUsers: { ...s.onlineUsers, [userId]: isOnline },
    })),
  markRead: (convId) =>
    set((s) => {
      const prev = s.conversations.find((c) => c.id === convId);
      const prevUnread = prev?.unread_count ?? 0;
      return {
        conversations: s.conversations.map((c) =>
          c.id === convId ? { ...c, unread_count: 0 } : c
        ),
        unreadTotal: Math.max(0, s.unreadTotal - prevUnread),
      };
    }),
  markAllRead: () =>
    set((s) => ({
      conversations: s.conversations.map((c) => ({ ...c, unread_count: 0 })),
      unreadTotal: 0,
    })),
  setUnreadTotal: (value) =>
    set({ unreadTotal: Math.max(0, Number.isFinite(value) ? Math.floor(value) : 0) }),
}));
