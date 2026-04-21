const ACCESS_KEY = "access";
const REFRESH_KEY = "refresh";

/** Tokeny w localStorage — współdzielone między kartami (sessionStorage jest per-karta). */
function storageAvailable(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

let migrated = false;

/** Jednorazowa migracja ze starego sessionStorage (sesja znikała w nowej karcie). */
function migrateFromSessionStorageOnce(): void {
  if (migrated || typeof window === "undefined") return;
  migrated = true;
  try {
    const ls = window.localStorage;
    const ss = window.sessionStorage;
    if (ls.getItem(ACCESS_KEY)) return;
    const a = ss.getItem(ACCESS_KEY);
    if (!a) return;
    ls.setItem(ACCESS_KEY, a);
    const r = ss.getItem(REFRESH_KEY);
    if (r) ls.setItem(REFRESH_KEY, r);
    ss.removeItem(ACCESS_KEY);
    ss.removeItem(REFRESH_KEY);
  } catch {
    /* ignore */
  }
}

export function getAccessToken(): string | null {
  migrateFromSessionStorageOnce();
  const storage = storageAvailable();
  return storage?.getItem(ACCESS_KEY) ?? null;
}

export function getRefreshToken(): string | null {
  migrateFromSessionStorageOnce();
  const storage = storageAvailable();
  return storage?.getItem(REFRESH_KEY) ?? null;
}

export function setAuthTokens(access: string, refresh?: string): void {
  const storage = storageAvailable();
  if (!storage) return;
  storage.setItem(ACCESS_KEY, access);
  if (refresh) storage.setItem(REFRESH_KEY, refresh);
}

export function clearAuthTokens(): void {
  const storage = storageAvailable();
  if (storage) {
    storage.removeItem(ACCESS_KEY);
    storage.removeItem(REFRESH_KEY);
  }
  try {
    if (typeof window !== "undefined") {
      window.sessionStorage.removeItem(ACCESS_KEY);
      window.sessionStorage.removeItem(REFRESH_KEY);
    }
  } catch {
    /* ignore */
  }
}

/** Klucze pod nasłuch `storage` (wylogowanie w innej karcie). */
export const AUTH_STORAGE_KEYS = { access: ACCESS_KEY, refresh: REFRESH_KEY } as const;
