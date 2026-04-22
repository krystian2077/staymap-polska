import { create } from "zustand";

import { api } from "@/lib/api";
import { getAccessToken } from "@/lib/authStorage";

type WishlistStore = {
  ids: Set<string>;
  loaded: boolean;
  load: () => Promise<void>;
  add: (listingId: string) => void;
  remove: (listingId: string) => void;
};

function extractIds(payload: unknown): Set<string> {
  const items = (payload as { data?: unknown[] })?.data;
  if (!Array.isArray(items)) return new Set();
  const ids = items
    .map((x) => {
      if (x && typeof x === "object") {
        const o = x as Record<string, unknown>;
        if (o.listing && typeof o.listing === "object") {
          const id = (o.listing as { id?: string }).id;
          if (id) return String(id);
        }
      }
      return "";
    })
    .filter(Boolean);
  return new Set(ids);
}

export const useWishlistStore = create<WishlistStore>((set, get) => ({
  ids: new Set(),
  loaded: false,
  async load() {
    if (get().loaded) return;
    const token = typeof window !== "undefined" ? getAccessToken() : null;
    if (!token) {
      set({ loaded: true });
      return;
    }
    try {
      const data = await api.get<unknown>("/api/v1/wishlist/");
      set({ ids: extractIds(data), loaded: true });
    } catch {
      set({ loaded: true });
    }
  },
  add(listingId: string) {
    set((s) => {
      const next = new Set(s.ids);
      next.add(listingId);
      return { ids: next };
    });
  },
  remove(listingId: string) {
    set((s) => {
      const next = new Set(s.ids);
      next.delete(listingId);
      return { ids: next };
    });
  },
}));
