"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getAccessToken } from "@/lib/authStorage";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

type SessionSummary = {
  session_id: string;
  prompt: string;
  summary_pl: string;
  result_count: number;
  created_at: string;
};

export default function AiHistoryPage() {
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [unauth, setUnauth] = useState(false);

  useEffect(() => {
    const token = getAccessToken();
    if (!token) {
      setUnauth(true);
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/v1/ai/sessions/history/", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const d = (await res.json()) as { results?: SessionSummary[] };
        if (!cancelled) setSessions(d.results ?? []);
      } catch {
        if (!cancelled) setSessions([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <main className="mx-auto flex min-h-[50vh] max-w-2xl flex-col items-center justify-center px-4 py-16">
        <LoadingSpinner className="h-10 w-10 text-brand" />
        <p className="mt-4 text-sm text-text-muted">Ładowanie historii…</p>
      </main>
    );
  }

  if (unauth) {
    return (
      <main className="mx-auto max-w-lg px-4 py-16 text-center">
        <h1 className="text-2xl font-black text-brand-dark">Historia wyszukiwań AI</h1>
        <p className="mt-3 text-text-secondary">Zaloguj się, aby zobaczyć zapisane sesje.</p>
        <Link
          href="/login?next=/ai/history"
          className="mt-6 inline-flex rounded-2xl bg-brand px-6 py-3 font-bold text-white hover:bg-brand-dark"
        >
          Zaloguj się
        </Link>
      </main>
    );
  }

  return (
    <main className="relative mx-auto max-w-2xl px-4 py-12 sm:px-6">
      <div
        className="pointer-events-none absolute inset-x-0 -top-24 h-64 bg-gradient-to-b from-brand-muted/80 to-transparent blur-2xl"
        aria-hidden
      />
      <div className="relative">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-brand">StayMap AI</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-brand-dark sm:text-4xl">
          Historia wyszukiwań
        </h1>
        <p className="mt-2 max-w-xl text-sm text-text-secondary">
          Wróć do dowolnej sesji — wyniki i podsumowanie zapisujemy po zakończeniu wyszukiwania.
        </p>

        {sessions.length === 0 ? (
          <div className="mt-10 rounded-3xl border border-brand-border bg-brand-surface/80 p-10 text-center backdrop-blur-sm">
            <p className="text-text-secondary">Nie masz jeszcze zakończonych wyszukiwań AI.</p>
            <Link
              href="/ai"
              className="mt-6 inline-flex rounded-2xl bg-brand px-6 py-3 text-sm font-bold text-white shadow-lg shadow-brand/25 transition hover:bg-brand-dark"
            >
              Nowe wyszukiwanie →
            </Link>
          </div>
        ) : (
          <ul className="mt-10 space-y-4">
            {sessions.map((s) => (
              <li key={s.session_id}>
                <Link
                  href="/ai"
                  className="block rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition hover:border-brand/40 hover:shadow-md"
                >
                  <p className="font-bold text-brand-dark line-clamp-2">
                    {s.prompt ? `„${s.prompt}”` : "Sesja AI"}
                  </p>
                  {s.summary_pl ? (
                    <p className="mt-2 text-sm text-text-muted line-clamp-2">{s.summary_pl}</p>
                  ) : null}
                  <div className="mt-4 flex items-center justify-between text-xs font-semibold text-text-muted">
                    <span>
                      {s.result_count}{" "}
                      {s.result_count === 1 ? "oferta" : s.result_count < 5 ? "oferty" : "ofert"}
                    </span>
                    <time dateTime={s.created_at}>
                      {new Date(s.created_at).toLocaleDateString("pl-PL", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </time>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-10 text-center">
          <Link
            href="/ai"
            className="inline-flex rounded-2xl border-2 border-brand/30 bg-white px-6 py-3 text-sm font-bold text-brand-dark transition hover:border-brand hover:bg-brand-surface"
          >
            + Nowe wyszukiwanie AI
          </Link>
        </div>
      </div>
    </main>
  );
}
