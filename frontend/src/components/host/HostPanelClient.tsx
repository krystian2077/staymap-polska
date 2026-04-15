"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { api } from "@/lib/api";
import { getAccessToken } from "@/lib/authStorage";
import { useAuthStore } from "@/lib/store/authStore";

type Me = {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  is_host: boolean;
  is_admin: boolean;
  roles: string[];
};

type ListingRow = {
  id: string;
  title: string;
  slug: string;
  status: string;
  base_price: string;
  currency: string;
};

type BookingRow = {
  id: string;
  listing_title: string;
  status: string;
  check_in: string;
  check_out: string;
  final_amount: string;
  currency: string;
};

type ModRow = {
  id: string;
  title: string;
  slug: string;
  status: string;
};

const statusPl: Record<string, string> = {
  draft: "Szkic",
  pending: "Aktywna",
  approved: "Aktywna",
  rejected: "Odrzucona",
  archived: "Zarchiwizowana",
};

export function HostPanelClient() {
  const setUser = useAuthStore((s) => s.setUser);
  const [mounted, setMounted] = useState(false);
  const [me, setMe] = useState<Me | null>(null);
  const [listings, setListings] = useState<ListingRow[] | null>(null);
  const [bookings, setBookings] = useState<BookingRow[] | null>(null);
  const [modQueue, setModQueue] = useState<ModRow[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState<"listings" | "bookings" | "moderation">("listings");

  const refreshMe = useCallback(async () => {
    const res = await api.get<{ data: Me }>("/api/v1/auth/me/");
    setMe(res.data);
    setUser({
      id: res.data.id,
      email: res.data.email,
      first_name: res.data.first_name,
      last_name: res.data.last_name,
      is_host: res.data.is_host,
      is_admin: res.data.is_admin,
      roles: res.data.roles,
    });
  }, [setUser]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !getAccessToken()) {
      setMe(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        await refreshMe();
      } catch {
        if (!cancelled) setMe(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshMe]);

  useEffect(() => {
    if (!me?.is_host) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await api.get<{ data: ListingRow[] }>("/api/v1/host/listings/");
        if (!cancelled) setListings(res.data);
      } catch {
        if (!cancelled) setListings([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [me?.is_host]);

  useEffect(() => {
    if (!me?.is_host) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await api.get<{ data: BookingRow[] }>("/api/v1/host/bookings/");
        if (!cancelled) setBookings(res.data);
      } catch {
        if (!cancelled) setBookings([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [me?.is_host]);

  useEffect(() => {
    if (!me?.is_admin) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await api.get<{ data: ModRow[] }>("/api/v1/admin/moderation/listings/");
        if (!cancelled) setModQueue(res.data);
      } catch {
        if (!cancelled) setModQueue([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [me?.is_admin]);

  const onOnboarding = async () => {
    setBusy(true);
    setErr(null);
    try {
      await api.post("/api/v1/host/onboarding/start/", {});
      await refreshMe();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Błąd");
    } finally {
      setBusy(false);
    }
  };

  if (!mounted) {
    return (
      <div className="flex justify-center py-24">
        <LoadingSpinner className="h-10 w-10 text-brand" />
      </div>
    );
  }

  if (!getAccessToken()) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <h1 className="text-2xl font-extrabold text-brand-dark">Panel gospodarza</h1>
        <p className="mt-3 text-text-secondary">Zaloguj się, aby zarządzać ofertami.</p>
        <Link href="/login" className="btn-primary mt-8 inline-block px-6">
          Zaloguj się
        </Link>
      </div>
    );
  }

  if (me === null) {
    return (
      <div className="flex justify-center py-24">
        <LoadingSpinner className="h-10 w-10 text-brand" />
      </div>
    );
  }

  return (
    <main className="mx-auto max-w-[960px] px-4 py-10 sm:px-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-brand">Host</p>
          <h1 className="text-2xl font-extrabold tracking-tight text-brand-dark">Panel gospodarza</h1>
          <p className="mt-1 text-sm text-text-secondary">
            {me.first_name} {me.last_name} · {me.email}
          </p>
        </div>
        {!me.is_host ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => void onOnboarding()}
            className="btn-primary shrink-0 px-5 py-2.5 text-sm disabled:opacity-60"
          >
            {busy ? "…" : "Aktywuj profil gospodarza"}
          </button>
        ) : (
          <Link href="/host/onboarding" className="btn-secondary shrink-0 px-5 py-2.5 text-sm">
            Informacje dla hosta
          </Link>
        )}
      </div>

      {err ? <p className="mt-4 text-sm text-red-600">{err}</p> : null}

      {!me.is_host ? (
        <p className="mt-8 rounded-xl border border-amber-200 bg-amber-50/80 px-4 py-3 text-sm text-amber-950">
          Po aktywacji profilu zyskasz dostęp do listy ofert i rezerwacji powiązanych z Twoim kontem.
          Endpoint: <code className="text-xs">POST /api/v1/host/onboarding/start/</code>
        </p>
      ) : (
        <>
          <div className="mt-8 flex flex-wrap gap-2 border-b border-gray-200 pb-2 dark:border-brand-border/50">
            <button
              type="button"
              onClick={() => setTab("listings")}
              className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${
                tab === "listings" ? "bg-brand-muted text-brand-dark" : "text-text-secondary"
              }`}
            >
              Moje oferty
            </button>
            <button
              type="button"
              onClick={() => setTab("bookings")}
              className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${
                tab === "bookings" ? "bg-brand-muted text-brand-dark" : "text-text-secondary"
              }`}
            >
              Rezerwacje
            </button>
            {me.is_admin ? (
              <button
                type="button"
                onClick={() => setTab("moderation")}
                className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${
                  tab === "moderation" ? "bg-brand-muted text-brand-dark" : "text-text-secondary"
                }`}
              >
                Moderacja
              </button>
            ) : null}
          </div>

          {tab === "listings" && (
            <section className="mt-6">
              {listings === null ? (
                <LoadingSpinner className="h-8 w-8 text-brand" />
              ) : listings.length === 0 ? (
                <p className="text-text-secondary">Brak ofert — utwórz pierwszą przez API lub seed.</p>
              ) : (
                <ul className="divide-y divide-gray-100 rounded-xl border border-gray-200 bg-white dark:divide-brand-border/40 dark:border-brand-border/50 dark:bg-[var(--bg2)]">
                  {listings.map((row) => (
                    <li key={row.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
                      <div>
                        <Link href={`/listing/${row.slug}`} className="font-semibold text-brand-dark hover:underline">
                          {row.title}
                        </Link>
                        <p className="text-xs text-text-muted">
                          {statusPl[row.status] ?? row.status} · {row.base_price} {row.currency}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}

          {tab === "bookings" && (
            <section className="mt-6">
              {bookings === null ? (
                <LoadingSpinner className="h-8 w-8 text-brand" />
              ) : bookings.length === 0 ? (
                <p className="text-text-secondary">Brak rezerwacji na Twoje oferty.</p>
              ) : (
                <ul className="divide-y divide-gray-100 rounded-xl border border-gray-200 bg-white dark:divide-brand-border/40 dark:border-brand-border/50 dark:bg-[var(--bg2)]">
                  {bookings.map((b) => (
                    <li key={b.id} className="px-4 py-3">
                      <p className="font-semibold text-brand-dark">{b.listing_title}</p>
                      <p className="text-sm text-text-secondary">
                        {b.check_in} → {b.check_out} · {b.status} · {b.final_amount} {b.currency}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}

          {tab === "moderation" && me.is_admin && (
            <section className="mt-6">
              {modQueue === null ? (
                <LoadingSpinner className="h-8 w-8 text-brand" />
              ) : modQueue.length === 0 ? (
                <p className="text-text-secondary">Kolejka moderacji jest pusta.</p>
              ) : (
                <ul className="space-y-3">
                  {modQueue.map((row) => (
                    <li
                      key={row.id}
                      className="flex flex-col gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between dark:border-brand-border/50 dark:bg-[var(--bg2)]"
                    >
                      <div>
                        <span className="font-semibold text-brand-dark">{row.title}</span>
                        <p className="text-xs text-text-muted">{row.slug}</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
                          onClick={async () => {
                            try {
                              await api.post(`/api/v1/admin/moderation/listings/${row.id}/approve/`, {});
                              const res = await api.get<{ data: ModRow[] }>(
                                "/api/v1/admin/moderation/listings/"
                              );
                              setModQueue(res.data);
                            } catch (e) {
                              setErr(e instanceof Error ? e.message : "Błąd");
                            }
                          }}
                        >
                          Zatwierdź
                        </button>
                        <button
                          type="button"
                          className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700"
                          onClick={async () => {
                            const comment = window.prompt("Powód odrzucenia (opcjonalnie):", "") ?? "";
                            try {
                              await api.post(`/api/v1/admin/moderation/listings/${row.id}/reject/`, {
                                comment,
                              });
                              const res = await api.get<{ data: ModRow[] }>(
                                "/api/v1/admin/moderation/listings/"
                              );
                              setModQueue(res.data);
                            } catch (e) {
                              setErr(e instanceof Error ? e.message : "Błąd");
                            }
                          }}
                        >
                          Odrzuć
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}
        </>
      )}

      <div className="mt-12 rounded-xl border border-gray-200 bg-gray-50/80 px-4 py-3 text-xs text-text-muted dark:border-brand-border/50 dark:bg-[var(--bg3)]">
        <strong className="text-brand-dark">Wiadomości (API):</strong>{" "}
        <code>GET/POST /api/v1/conversations/</code>,{" "}
        <code>GET/POST /api/v1/conversations/{"{id}"}/messages/</code>, WebSocket{" "}
        <code>/ws/conversations/{"{id}"}/?token=…</code>
      </div>
    </main>
  );
}
