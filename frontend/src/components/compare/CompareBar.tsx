"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { getAccessToken } from "@/lib/authStorage";
import { useCompareStore } from "@/lib/store/compareStore";
import { cn } from "@/lib/utils";

export function CompareBar() {
  const router = useRouter();
  const listings = useCompareStore((s) => s.listings);
  const sessionId = useCompareStore((s) => s.sessionId);
  const expiresAt = useCompareStore((s) => s.expiresAt);
  const removeListing = useCompareStore((s) => s.removeListing);
  const clearAll = useCompareStore((s) => s.clearAll);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [isNarrow, setIsNarrow] = useState(false);

  useEffect(() => {
    if (expiresAt && new Date(expiresAt) < new Date()) clearAll();
  }, [expiresAt, clearAll]);

  useEffect(() => {
    if (listings.length === 0) return;
    const pad = "84px";
    document.documentElement.style.setProperty("--compare-bar-pad", pad);
    return () => {
      document.documentElement.style.setProperty("--compare-bar-pad", "0px");
    };
  }, [listings.length]);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const apply = () => setIsNarrow(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  if (listings.length === 0) return null;

  const token = typeof window !== "undefined" ? getAccessToken() : null;

  const goCompare = () => {
    if (sessionId && token) {
      void useCompareStore.getState().loadSession(sessionId, token);
    }
    router.push("/compare");
    setSheetOpen(false);
  };

  const sheetBody = (
    <div className="flex max-h-[min(70dvh,560px)] flex-col gap-3 overflow-y-auto px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-2">
      <p className="text-center text-[11px] font-bold uppercase tracking-wide text-white/60">
        Wybrane oferty ({listings.length}/3)
      </p>
      <div className="flex flex-col gap-2">
        {listings.map((l) => (
          <div
            key={l.id}
            className="flex items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-3 py-2.5 text-[13px] font-semibold text-white"
          >
            <span className="shrink-0 text-lg">{l.listing_type?.icon ?? "🏠"}</span>
            <span className="min-w-0 flex-1 truncate">{l.title}</span>
            <button
              type="button"
              className="tap-target flex shrink-0 items-center justify-center rounded-full px-2 text-lg text-white/80 hover:bg-white/10 hover:text-white"
              aria-label="Usuń z porównania"
              onClick={() => void removeListing(l.id, token ?? undefined)}
            >
              ×
            </button>
          </div>
        ))}
      </div>
      {listings.length < 3 ? (
        <button
          type="button"
          onClick={() => {
            setSheetOpen(false);
            router.push("/search");
          }}
          className="rounded-xl border border-dashed border-white/35 py-3 text-[13px] font-semibold text-white/80"
        >
          + Dodaj kolejną (max 3)
        </button>
      ) : null}
      <div className="grid grid-cols-2 gap-2 pt-2">
        <button
          type="button"
          onClick={() => {
            clearAll();
            setSheetOpen(false);
          }}
          className="min-h-[48px] rounded-xl bg-white/12 px-3 text-sm font-semibold text-white"
        >
          Wyczyść
        </button>
        <button
          type="button"
          disabled={listings.length < 2}
          onClick={goCompare}
          className="min-h-[48px] rounded-xl bg-[#4ade80] px-3 text-sm font-extrabold text-[#0a2e1a] transition-all hover:bg-[#86efac] disabled:cursor-not-allowed disabled:opacity-50"
        >
          Porównaj
        </button>
      </div>
    </div>
  );

  return (
    <>
      <div
        className={cn(
          "animate-slide-up-bar fixed left-0 right-0 z-[var(--z-compare-bar)] border-t border-white/10 shadow-[0_-4px_20px_rgba(0,0,0,.2)] sm:px-5 sm:py-3 md:px-8",
          isNarrow ? "px-3 pb-[calc(10px+var(--mobile-safe-bottom))] pt-2" : "px-3 pb-[calc(10px+var(--mobile-safe-bottom))] pt-2.5"
        )}
        style={{ background: "#0a2e1a", bottom: "var(--guest-nav-bottom-offset, 0px)" }}
      >
        {isNarrow ? (
          <div className="flex items-center gap-2">
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-bold text-white">
                Porównanie · {listings.length}/3
              </p>
              <p className="truncate text-[11px] text-white/65">Dotknij Szczegóły, by zarządzać listą</p>
            </div>
            <button
              type="button"
              onClick={() => setSheetOpen(true)}
              className="tap-target shrink-0 rounded-xl border border-white/25 bg-white/10 px-3 text-xs font-bold text-white"
            >
              Szczegóły
            </button>
            <button
              type="button"
              disabled={listings.length < 2}
              onClick={goCompare}
              className="tap-target shrink-0 rounded-xl bg-[#4ade80] px-4 text-xs font-extrabold text-[#0a2e1a] disabled:opacity-50"
            >
              Porównaj
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
            <div className="flex min-w-0 flex-1 items-center gap-2.5 sm:gap-3.5">
              <span className="hidden shrink-0 text-sm font-bold text-white sm:inline">Porównujesz:</span>
              <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5 sm:gap-2">
                {listings.map((l) => (
                  <span
                    key={l.id}
                    className="flex max-w-[170px] items-center gap-1.5 rounded-full bg-white/12 py-1.5 pl-2.5 pr-1 text-[11px] font-semibold text-white sm:max-w-[200px] sm:py-1 sm:text-xs"
                  >
                    <span className="shrink-0">{l.listing_type?.icon ?? "🏠"}</span>
                    <span className="truncate">
                      {l.title.length > 20 ? `${l.title.slice(0, 20)}…` : l.title}
                    </span>
                    <button
                      type="button"
                      className="ml-1 min-h-7 shrink-0 cursor-pointer px-1 opacity-70 hover:opacity-100"
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
                    className="rounded-full border border-dashed border-white/30 px-3 py-1.5 text-[11px] text-white/70 transition-colors hover:border-white/50 hover:text-white sm:text-xs"
                  >
                    + Dodaj (max 3)
                  </button>
                ) : null}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:flex sm:shrink-0 sm:items-center">
              <button
                type="button"
                onClick={() => clearAll()}
                className="rounded-lg bg-white/12 px-3 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-white/20"
              >
                Wyczyść
              </button>
              <button
                type="button"
                disabled={listings.length < 2}
                onClick={goCompare}
                className="rounded-lg bg-[#4ade80] px-3 py-2.5 text-xs font-extrabold text-[#0a2e1a] transition-all hover:-translate-y-px hover:bg-[#86efac] disabled:cursor-not-allowed disabled:opacity-50"
              >
                Porównaj
              </button>
            </div>
          </div>
        )}
      </div>

      <Dialog.Root open={sheetOpen} onOpenChange={setSheetOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-[var(--z-modal-overlay)] bg-black/65 backdrop-blur-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 dark:bg-black/75" />
          <Dialog.Content
            className={cn(
              "fixed z-[var(--z-modal-content)] flex max-h-[min(85dvh,640px)] w-[min(calc(100vw-1.25rem),22rem)] flex-col overflow-hidden rounded-[22px] border border-white/15 bg-[#0a2e1a] p-0 shadow-[0_24px_80px_rgba(0,0,0,.5)] outline-none",
              "left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2",
              "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
              "data-[state=open]:zoom-in-95 data-[state=closed]:zoom-out-95",
              "md:left-auto md:right-5 md:top-[10vh] md:max-h-[min(78dvh,620px)] md:w-full md:max-w-md md:translate-x-0 md:translate-y-0 md:rounded-[24px]"
            )}
          >
            <Dialog.Title className="sr-only">Zarządzaj porównaniem</Dialog.Title>
            <div className="flex shrink-0 items-center justify-between border-b border-white/10 px-4 py-3.5">
              <p className="text-[15px] font-black tracking-tight text-white">Porównywarka</p>
              <Dialog.Close
                type="button"
                className="tap-target flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10 text-lg text-white/85 transition-colors hover:bg-white/18"
                aria-label="Zamknij"
              >
                ✕
              </Dialog.Close>
            </div>
            {sheetBody}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}
