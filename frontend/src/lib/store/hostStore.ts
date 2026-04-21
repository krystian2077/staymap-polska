import { create } from "zustand";

import type { HostBooking, HostProfile, HostStats, ListingDraft } from "@/types/host";

interface HostStore {
  profile: HostProfile | null;
  stats: HostStats | null;
  bookings: HostBooking[];
  pendingCount: number;
  draft: ListingDraft | null;
  draftStep: number;
  isSaving: boolean;
  lastSaved: Date | null;

  setProfile: (p: HostProfile) => void;
  setStats: (s: HostStats) => void;
  setBookings: (b: HostBooking[]) => void;
  setDraft: (d: ListingDraft) => void;
  updateDraft: (patch: Partial<ListingDraft>) => void;
  setDraftStep: (step: number) => void;
  setSaving: (v: boolean) => void;
  markSaved: () => void;
}

export const useHostStore = create<HostStore>((set) => ({
  profile: null,
  stats: null,
  bookings: [],
  pendingCount: 0,
  draft: null,
  draftStep: 1,
  isSaving: false,
  lastSaved: null,
  setProfile: (p) => set({ profile: p }),
  setStats: (s) => set({ stats: s }),
  setBookings: (b) =>
    set({
      bookings: b,
      pendingCount: b.filter((x) => x.status === "pending").length,
    }),
  setDraft: (d) => set({ draft: d, draftStep: d.step || 1 }),
  updateDraft: (patch) =>
    set((s) => ({ draft: s.draft ? { ...s.draft, ...patch } : null })),
  setDraftStep: (step) => set({ draftStep: step }),
  setSaving: (v) => set({ isSaving: v }),
  markSaved: () => set({ isSaving: false, lastSaved: new Date() }),
}));
