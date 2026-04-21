import { create } from "zustand";

import { apiUrl } from "@/lib/api";
import type { AIFilterInterpretation, AIResult, AISession } from "@/types/ai";

let pollGeneration = 0;

function normalizeSession(raw: AISession | undefined): AISession | undefined {
  if (!raw) return raw;
  const messages = raw.messages ?? raw.conversation ?? [];
  const latestFromMessages = [...messages].reverse().find((m) => m.role === "assistant")?.text ?? "";
  const latestResponse = raw.latest_response ?? raw.assistant_reply ?? latestFromMessages;
  return {
    ...raw,
    messages,
    conversation: messages,
    latest_response: latestResponse,
    assistant_reply: latestResponse,
  };
}

interface AIStore {
  prompt: string;
  setPrompt: (p: string) => void;

  session: AISession | null;
  loading: boolean;
  submitting: boolean;
  polling: boolean;
  error: string | null;
  rateLimitRemaining: number;

  results: AIResult[];
  filters: AIFilterInterpretation | null;

  startSearch: (prompt: string, token: string, sessionId?: string) => Promise<void>;
  /** GET /ai/search/:id/ — restore session from URL (e.g. history). */
  loadSession: (sessionId: string, token: string) => Promise<void>;
  pollStatus: (sessionId: string, token: string, generation: number) => Promise<void>;
  reset: () => void;
  setRateLimit: (n: number) => void;
}

export const useAIStore = create<AIStore>((set, get) => ({
  prompt: "",
  session: null,
  loading: false,
  submitting: false,
  polling: false,
  error: null,
  rateLimitRemaining: 9999,
  results: [],
  filters: null,

  setPrompt: (p) => set({ prompt: p }),

  startSearch: async (prompt, token, sessionId) => {
    pollGeneration += 1;
    const gen = pollGeneration;
    const keepCurrentSession = Boolean(sessionId);
    set({
      loading: true,
      submitting: true,
      error: null,
      polling: false,
      ...(keepCurrentSession
        ? { results: [], filters: null }
        : { session: null, results: [], filters: null }),
    });
    try {
      const res = await fetch(apiUrl("/api/v1/ai/search/"), {
        method: "POST",
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ prompt, ...(sessionId ? { session_id: sessionId } : {}) }),
      });

      if (!res.ok) {
        let msg = "Błąd AI search";
        if (res.status === 429) {
          console.error("[AI] POST failed with 429. Prompt:", prompt);
          msg = "Przekroczono limit zapytań u dostawcy AI (OpenAI). Odczekaj chwilę.";
        } else {
          const err = await res.json().catch(() => ({}));
          if (typeof err?.error?.message === "string") msg = err.error.message;
        }
        set({ error: msg, loading: false, submitting: false });
        return;
      }
      const data = await res.json();
      const session = normalizeSession(data?.data as AISession | undefined);
      const sid = session?.session_id;
      if (!sid) {
        set({ error: "Brak session_id w odpowiedzi.", loading: false, submitting: false });
        return;
      }
      const isDone = session.status === "complete" || session.status === "failed";
      const errorMessage = (session as AISession & { error_message?: string | null }).error_message ?? null;
      set({
        loading: false,
        submitting: false,
        polling: !isDone,
        session,
        results: isDone ? (session.results ?? []) : [],
        filters: isDone ? (session.filters ?? null) : null,
        error:
          session.status === "failed"
            ? errorMessage || "AI nie mogło przetworzyć zapytania."
            : null,
      });
      if (!isDone) {
        void get().pollStatus(sid, token, gen);
      }
    } catch {
      set({ error: "Błąd połączenia", loading: false, submitting: false });
    }
  },

  loadSession: async (sessionId, token) => {
    pollGeneration += 1;
    const gen = pollGeneration;
    set({
      loading: true,
      submitting: false,
      error: null,
      polling: false,
      session: null,
      results: [],
      filters: null,
    });
    try {
      const res = await fetch(apiUrl(`/api/v1/ai/search/${sessionId}/`), {
        cache: "no-store",
        headers: { Authorization: `Bearer ${token}` },
      });
      const raw = await res.json().catch(() => ({}));
      if (!res.ok) {
        set({ error: "Nie udało się wczytać sesji.", loading: false, submitting: false });
        return;
      }
      const session = normalizeSession(raw?.data as AISession | undefined);
      if (!session?.session_id) {
        set({ error: "Brak danych sesji.", loading: false, submitting: false });
        return;
      }
      const isDone = session.status === "complete" || session.status === "failed";
      const errorMessage = (session as AISession & { error_message?: string | null }).error_message ?? null;
      set({
        loading: false,
        submitting: false,
        polling: !isDone,
        session,
        results: session.results ?? [],
        filters: session.filters ?? null,
        error:
          session.status === "failed"
            ? errorMessage || "Sesja zakończona błędem."
            : null,
      });
      if (!isDone) {
        void get().pollStatus(session.session_id, token, gen);
      }
    } catch {
      set({ error: "Błąd połączenia", loading: false, submitting: false });
    }
  },

  pollStatus: async (sessionId, token, generation) => {
    const MAX_POLLS = 80; // ~120 sekund przy 1500ms odstępie
    let attempts = 0;
    const run = async () => {
      if (generation !== pollGeneration) return;
      if (attempts++ >= MAX_POLLS) {
        set({ error: "Przekroczono czas oczekiwania na AI.", submitting: false, polling: false });
        return;
      }
      try {
        const res = await fetch(apiUrl(`/api/v1/ai/search/${sessionId}/`), {
          cache: "no-store",
          headers: { Authorization: `Bearer ${token}` },
        });
        const raw = await res.json().catch(() => ({}));

        if (res.status === 429) {
          set({
            error: "Zbyt wiele zapytań o status. Zwolnij trochę.",
            submitting: false,
            polling: false,
          });
          return;
        }

        if (!res.ok) {
          set({ error: "Błąd serwera. Spróbuj ponownie.", submitting: false, polling: false });
          return;
        }

        const session = normalizeSession(raw?.data as AISession | undefined);
        if (!session) {
          set({ error: "Nieprawidłowa odpowiedź AI.", submitting: false, polling: false });
          return;
        }

        if (generation !== pollGeneration) return;

        if (session.status === "complete") {
          set({
            session,
            results: session.results ?? [],
            filters: session.filters,
            submitting: false,
            polling: false,
          });
          return;
        }
        if (session.status === "failed") {
          const errorMessage = (session as AISession & { error_message?: string | null }).error_message ?? null;
          set({
            error: errorMessage || "AI nie mogło przetworzyć zapytania.",
            polling: false,
            submitting: false,
            session,
            results: session.results ?? [],
            filters: session.filters ?? null,
          });
          return;
        }

        set({ session, submitting: false, results: [], filters: null });
        setTimeout(() => void run(), 1500);
      } catch {
        set({ error: "Błąd polling", submitting: false, polling: false });
      }
    };
    await run();
  },

  reset: () => {
    pollGeneration += 1;
    set({
      prompt: "",
      session: null,
      loading: false,
      submitting: false,
      polling: false,
      error: null,
      results: [],
      filters: null,
    });
  },

  setRateLimit: (n) => set({ rateLimitRemaining: n }),
}));
