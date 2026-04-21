import { apiUrl } from "./url";

import { clearAuthTokens, getAccessToken, getRefreshToken, setAuthTokens } from "@/lib/authStorage";

type ApiError = { code: string; message: string; field?: string | null };

function persistAccessTokens(data: { access: string; refresh?: string }) {
  setAuthTokens(data.access, data.refresh);
}

/** Odświeża access (i opcjonalnie refresh) — aktualizuje storage bieżącej karty. */
export async function refreshSession(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  const refresh = getRefreshToken();
  if (!refresh) return false;
  try {
    const res = await fetch(apiUrl("/api/v1/auth/refresh/"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh }),
      cache: "no-store",
    });
    const data = (await res.json()) as { access?: string; refresh?: string };
    if (!res.ok || !data.access) return false;
    persistAccessTokens({ access: data.access, refresh: data.refresh });
    return true;
  } catch {
    return false;
  }
}

async function tryRefresh(): Promise<boolean> {
  return refreshSession();
}

/**
 * Django + DRF oczekują końcowego ukośnika; żądanie `.../pricing-rules` (bez `/`) daje 404 HTML zamiast JSON.
 */
function normalizeApiV1TrailingSlash(path: string): string {
  if (!path.startsWith("/api/v1")) return path;
  const q = path.indexOf("?");
  const base = q === -1 ? path : path.slice(0, q);
  const qs = q === -1 ? "" : path.slice(q);
  if (base.endsWith("/")) return path;
  return `${base}/${qs}`;
}

export class APIClient {
  async requestJson<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const res = await this.raw(endpoint, options);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = (data as { error?: ApiError })?.error;
      const e = new Error(err?.message || res.statusText) as Error & {
        code?: string;
        field?: string | null;
        status?: number;
        payload?: unknown;
      };
      e.code = err?.code;
      e.field = err?.field;
      e.status = res.status;
      e.payload = data;
      throw e;
    }
    return data as T;
  }

  async get<T>(endpoint: string, params?: Record<string, string | undefined>) {
    const q = params
      ? new URLSearchParams(
          Object.entries(params).filter(([, v]) => v != null && v !== "") as [
            string,
            string,
          ][]
        ).toString()
      : "";
    const url = q ? `${endpoint}?${q}` : endpoint;
    return this.requestJson<T>(url, { method: "GET" });
  }

  async post<T>(endpoint: string, body?: unknown) {
    return this.requestJson<T>(endpoint, {
      method: "POST",
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  }

  async patch<T>(endpoint: string, body?: unknown) {
    return this.requestJson<T>(endpoint, {
      method: "PATCH",
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  }

  async postForm<T>(endpoint: string, formData: FormData) {
    return this.requestJson<T>(endpoint, {
      method: "POST",
      body: formData,
    });
  }

  async patchForm<T>(endpoint: string, formData: FormData) {
    return this.requestJson<T>(endpoint, {
      method: "PATCH",
      body: formData,
    });
  }

  async delete<T>(endpoint: string) {
    return this.requestJson<T>(endpoint, { method: "DELETE" });
  }

  /** Żądanie z dodatkowymi nagłówkami (np. X-Compare-Session). */
  async requestJsonWithHeaders<T>(
    endpoint: string,
    options: RequestInit & { extraHeaders?: Record<string, string> }
  ): Promise<T> {
    const { extraHeaders, ...rest } = options;
    const headers = new Headers(rest.headers);
    const token = typeof window !== "undefined" ? getAccessToken() : null;
    if (token) headers.set("Authorization", `Bearer ${token}`);
    if (extraHeaders) {
      for (const [k, v] of Object.entries(extraHeaders)) {
        if (v) headers.set(k, v);
      }
    }
    let path = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
    path = normalizeApiV1TrailingSlash(path);
    const res = await fetch(apiUrl(path), { ...rest, headers, cache: "no-store" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = (data as { error?: ApiError })?.error;
      const e = new Error(err?.message || res.statusText) as Error & {
        code?: string;
        status?: number;
      };
      e.code = err?.code;
      e.status = res.status;
      throw e;
    }
    return data as T;
  }

  private async raw(
    endpoint: string,
    options: RequestInit = {},
    retried = false
  ): Promise<Response> {
    const headers = new Headers(options.headers);
    const isFormData =
      typeof FormData !== "undefined" && options.body instanceof FormData;
    if (
      options.body &&
      typeof options.body === "string" &&
      !headers.has("Content-Type")
    ) {
      headers.set("Content-Type", "application/json");
    }
    if (isFormData) {
      headers.delete("Content-Type");
    }
    const token = typeof window !== "undefined" ? getAccessToken() : null;
    if (token) headers.set("Authorization", `Bearer ${token}`);

    let path = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
    path = normalizeApiV1TrailingSlash(path);
    const res = await fetch(apiUrl(path), { ...options, headers, cache: "no-store" });

    if (res.status === 401 && !retried && typeof window !== "undefined") {
      const ok = await tryRefresh();
      if (ok) return this.raw(endpoint, options, true);
      clearAuthTokens();
      window.location.href = "/login";
    }
    return res;
  }
}

export const api = new APIClient();
