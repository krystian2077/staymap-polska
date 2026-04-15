"use client";

import { useEffect } from "react";
import { AUTH_STORAGE_KEYS } from "@/lib/authStorage";
import { useAuthStore } from "@/lib/store/authStore";

/**
 * Gdy w innej karcie usunieto token (wylogowanie), czyścimy użytknika w Zustand,
 * żeby UI nie pokazywało „zalogowany” bez ważnego access.
 */
export function AuthCrossTabSync() {
  const setUser = useAuthStore((s) => s.setUser);

  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.storageArea !== localStorage) return;
      if (e.key === AUTH_STORAGE_KEYS.access && e.newValue === null) {
        setUser(null);
      }
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [setUser]);

  return null;
}
