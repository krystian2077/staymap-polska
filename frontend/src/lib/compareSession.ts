import { api } from "@/lib/api";

const STORAGE_KEY = "staymap_compare_session";

export function getCompareSessionKey(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(STORAGE_KEY);
}

export function setCompareSessionKey(key: string) {
  localStorage.setItem(STORAGE_KEY, key);
}

/** Nagłówki dla anonimowego porównania (zalogowany — backend używa JWT). */
export async function compareRequestHeaders(): Promise<Record<string, string>> {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("access") : null;
  if (token) return {};
  let key = getCompareSessionKey();
  if (!key) {
    const res = await api.post<{
      data: { session_key: string };
    }>("/api/v1/compare/bootstrap/");
    key = res.data.session_key;
    setCompareSessionKey(key);
  }
  return { "X-Compare-Session": key };
}
