import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { apiUrl } from "@/lib/api";
import type { Listing } from "@/types/listing";

const HOURS_48_MS = 48 * 60 * 60 * 1000;

interface CompareStore {
  sessionId: string | null;
  listings: Listing[];
  expiresAt: string | null;
  loading: boolean;
  error: string | null;

  addListing: (listing: Listing, token?: string) => Promise<void>;
  removeListing: (listingId: string, token?: string) => Promise<void>;
  clearAll: () => void;
  loadSession: (sessionId: string, token: string) => Promise<void>;
  createSession: (token: string) => Promise<string>;
}

async function postListing(sessionId: string, listingId: string, token: string) {
  const res = await fetch(apiUrl(`/api/v1/compare/${sessionId}/listings/`), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ listing_id: listingId }),
  });
  return res.ok;
}

export const useCompareStore = create<CompareStore>()(
  persist(
    (set, get) => ({
      sessionId: null,
      listings: [],
      expiresAt: null,
      loading: false,
      error: null,

      addListing: async (listing, token) => {
        if (get().listings.length >= 3) return;
        if (get().listings.some((l) => l.id === listing.id)) return;

        set((s) => ({ listings: [...s.listings, listing] }));

        if (!token) return;

        try {
          let sid = get().sessionId;
          if (!sid) {
            const res = await fetch(apiUrl("/api/v1/compare/"), {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({}),
            });
            const data = await res.json().catch(() => ({}));
            sid = data?.data?.session_id;
            if (!sid) {
              set((s) => ({ listings: s.listings.filter((l) => l.id !== listing.id) }));
              return;
            }
            const exp: string =
              data?.data?.expires_at ||
              new Date(Date.now() + HOURS_48_MS).toISOString();
            set({ sessionId: sid, expiresAt: exp });
            const all = get().listings;
            for (const l of all) {
              const ok = await postListing(sid, l.id, token);
              if (!ok) {
                set({ listings: [], sessionId: null, expiresAt: null });
                return;
              }
            }
            return;
          }

          const ok = await postListing(sid, listing.id, token);
          if (!ok) {
            set((s) => ({ listings: s.listings.filter((l) => l.id !== listing.id) }));
          }
        } catch {
          set((s) => ({ listings: s.listings.filter((l) => l.id !== listing.id) }));
        }
      },

      removeListing: async (listingId, token) => {
        const sid = get().sessionId;
        set((s) => ({ listings: s.listings.filter((l) => l.id !== listingId) }));
        if (token && sid) {
          try {
            await fetch(apiUrl(`/api/v1/compare/${sid}/listings/${listingId}/`), {
              method: "DELETE",
              headers: { Authorization: `Bearer ${token}` },
            });
          } catch {
            /* ignore */
          }
        }
      },

      clearAll: () => set({ listings: [], sessionId: null, expiresAt: null }),

      createSession: async (token) => {
        const res = await fetch(apiUrl("/api/v1/compare/"), {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({}),
        });
        const data = await res.json();
        const sid = data?.data?.session_id as string;
        const exp: string =
          data?.data?.expires_at || new Date(Date.now() + HOURS_48_MS).toISOString();
        set({ sessionId: sid, expiresAt: exp });
        return sid;
      },

      loadSession: async (sessionId, token) => {
        set({ loading: true, error: null });
        try {
          const res = await fetch(apiUrl(`/api/v1/compare/${sessionId}/`), {
            headers: { Authorization: `Bearer ${token}` },
          });
          const raw = await res.json().catch(() => ({}));
          const listings = (raw?.data?.listings ?? []) as Listing[];
          const exp = raw?.data?.expires_at as string | undefined;
          set({
            listings,
            sessionId,
            expiresAt: exp || get().expiresAt,
            loading: false,
          });
        } catch {
          set({ loading: false, error: "Błąd wczytywania sesji" });
        }
      },
    }),
    {
      name: "staymap-compare",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        sessionId: s.sessionId,
        listings: s.listings,
        expiresAt: s.expiresAt,
      }),
      onRehydrateStorage: () => (state) => {
        if (!state?.expiresAt) return;
        if (new Date(state.expiresAt) < new Date()) {
          state.listings = [];
          state.sessionId = null;
          state.expiresAt = null;
        }
      },
    }
  )
);
