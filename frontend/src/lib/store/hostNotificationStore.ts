import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export type HostNotificationItem = {
  id: string;
  type: string;
  title: string;
  body: string;
  link: string;
  created_at: string;
  is_read: boolean;
};

type HostNotificationStore = {
  items: HostNotificationItem[];
  unreadCount: number;
  addNotification: (item: Omit<HostNotificationItem, "is_read"> & { is_read?: boolean }) => void;
  seedNotifications: (items: HostNotificationItem[]) => void;
  markAllRead: () => void;
  markRead: (id: string) => void;
};

export const useHostNotificationStore = create<HostNotificationStore>()(
  persist(
    (set) => ({
      items: [],
      unreadCount: 0,
      addNotification: (item) =>
        set((s) => {
          const existing = s.items.find((x) => x.id === item.id);
          const nextItem: HostNotificationItem = {
            ...item,
            is_read: existing ? existing.is_read : Boolean(item.is_read),
          };
          const items = existing
            ? s.items.map((x) => (x.id === item.id ? { ...x, ...nextItem } : x))
            : [nextItem, ...s.items].slice(0, 300);
          return {
            items,
            unreadCount: items.reduce((acc, x) => acc + (x.is_read ? 0 : 1), 0),
          };
        }),
      seedNotifications: (incoming) =>
        set((s) => {
          const previousReadById = new Map(s.items.map((x) => [x.id, x.is_read]));
          const items = incoming
            .map((x) => ({
              ...x,
              is_read: previousReadById.get(x.id) ?? x.is_read,
            }))
            .sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at))
            .slice(0, 300);
          return {
            items,
            unreadCount: items.reduce((acc, x) => acc + (x.is_read ? 0 : 1), 0),
          };
        }),
      markAllRead: () =>
        set((s) => ({
          items: s.items.map((x) => ({ ...x, is_read: true })),
          unreadCount: 0,
        })),
      markRead: (id) =>
        set((s) => {
          const items = s.items.map((x) => (x.id === id ? { ...x, is_read: true } : x));
          return {
            items,
            unreadCount: items.reduce((acc, x) => acc + (x.is_read ? 0 : 1), 0),
          };
        }),
    }),
    {
      name: "staymap-host-notifications",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ items: s.items, unreadCount: s.unreadCount }),
    }
  )
);

