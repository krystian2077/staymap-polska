"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { getAccessToken } from "@/lib/authStorage";
import { useCompareStore } from "@/lib/store/compareStore";

export function CompareBar() {
  const router = useRouter();
  const listings = useCompareStore((s) => s.listings);
  const sessionId = useCompareStore((s) => s.sessionId);
  const expiresAt = useCompareStore((s) => s.expiresAt);
  const removeListing = useCompareStore((s) => s.removeListing);
  const clearAll = useCompareStore((s) => s.clearAll);

  useEffect(() => {
    if (expiresAt && new Date(expiresAt) < new Date()) clearAll();
  }, [expiresAt, clearAll]);

  useEffect(() => {
    if (listings.length === 0) return;
    const pad = "72px";
    document.documentElement.style.setProperty("--compare-bar-pad", pad);
    return () => {
      document.documentElement.style.setProperty("--compare-bar-pad", "0px");
    };
  }, [listings.length]);

  if (listings.length === 0) return null;

  const token = typeof window !== "undefined" ? getAccessToken() : null;

  return (
    <div
      className="animate-slide-up-bar fixed bottom-0 left-0 right-0 z-[200] flex items-center justify-between gap-4 border-t border-white/10 px-7 py-3 shadow-[0_-4px_20px_rgba(0,0,0,.2)] sm:px-8"
      style={{ background: "#0a2e1a" }}
    >
      <div className="flex min-w-0 flex-1 items-center gap-3.5">
        <span className="hidden shrink-0 text-sm font-bold text-white sm:inline">Porównujesz:</span>
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
          {listings.map((l) => (
            <span
              key={l.id}
              className="flex max-w-[200px] items-center gap-1.5 rounded-full bg-white/12 py-1 pl-2.5 pr-1 text-xs font-semibold text-white"
            >
              <span className="shrink-0">{l.listing_type?.icon ?? "🏠"}</span>
              <span className="truncate">
                {l.title.length > 20 ? `${l.title.slice(0, 20)}…` : l.title}
              </span>
              <button
                type="button"
                className="ml-1 shrink-0 cursor-pointer px-1 opacity-70 hover:opacity-100"
                aria-label="Usuń z porównania"
                onClick={() => void removeListing(l.id, token ?? undefined)}
              >
                ×
              </button>
            </span>
          ))}
          {listings.length < 3 ? (
            <button
              type="button"
              onClick={() => router.push("/search")}
              className="rounded-full border border-dashed border-white/30 px-3 py-1 text-xs text-white/60 transition-colors hover:border-white/50 hover:text-white"
            >
              + Dodaj (max 3)
            </button>
          ) : null}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          onClick={() => clearAll()}
          className="rounded-lg bg-white/12 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-white/20"
        >
          Wyczyść
        </button>
        <button
          type="button"
          disabled={listings.length < 2}
          onClick={() => {
            if (sessionId && token) {
              void useCompareStore.getState().loadSession(sessionId, token);
            }
            router.push("/compare");
          }}
          className="rounded-lg bg-[#4ade80] px-3 py-2 text-xs font-extrabold text-[#0a2e1a] transition-all hover:-translate-y-px hover:bg-[#86efac] disabled:cursor-not-allowed disabled:opacity-50"
        >
          Porównaj
        </button>
      </div>
    </div>
  );
}
