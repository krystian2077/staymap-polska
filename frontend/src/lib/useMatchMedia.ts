"use client";

import { useSyncExternalStore } from "react";

/**
 * Subscribes to `window.matchMedia(query)`. SSR snapshot is `false` to avoid layout shift
 * on first paint for mobile-first sheets (desktop hydrates until JS runs).
 */
export function useMatchMedia(query: string): boolean {
  return useSyncExternalStore(
    (onStoreChange) => {
      if (typeof window === "undefined") return () => {};
      const mq = window.matchMedia(query);
      mq.addEventListener("change", onStoreChange);
      return () => mq.removeEventListener("change", onStoreChange);
    },
    () => (typeof window !== "undefined" ? window.matchMedia(query).matches : false),
    () => false
  );
}
