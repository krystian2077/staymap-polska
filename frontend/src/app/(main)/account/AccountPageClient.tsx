"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { format, parseISO } from "date-fns";
import { pl } from "date-fns/locale";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import { useAuthStore } from "@/lib/store/authStore";

type Me = {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone_number: string;
  bio?: string;
  preferred_language?: string;
  country?: string;
  avatar_url?: string | null;
  is_host?: boolean;
};

type BookingRow = {
  id: string;
  listing_title: string;
  listing_slug: string;
  check_in: string;
  check_out: string;
  status: string;
  final_amount: string;
  currency: string;
};

const TAB_IDS = ["profile", "bookings", "explore"] as const;
type TabId = (typeof TAB_IDS)[number];

const statusPl: Record<string, string> = {
  pending: "Oczekuje na hosta",
  awaiting_payment: "Oczekuje płatności",
  confirmed: "Potwierdzona",
  cancelled: "Anulowana",
  rejected: "Odrzucona",
  completed: "Zakończona",
  abandoned: "Porzucona",
  payment_failed: "Płatność nieudana",
};

function formatBookingRange(checkIn: string, checkOut: string) {
  try {
    const a = parseISO(checkIn);
    const b = parseISO(checkOut);
    return `${format(a, "d MMM", { locale: pl })} — ${format(b, "d MMM yyyy", { locale: pl })}`;
  } catch {
    return `${checkIn} → ${checkOut}`;
  }
}

function statusBadgeClass(status: string) {
  if (status === "confirmed" || status === "completed") {
    return "bg-emerald-500/12 text-emerald-800 ring-emerald-500/25 dark:text-emerald-200 dark:ring-emerald-500/30";
  }
  if (status === "pending" || status === "awaiting_payment") {
    return "bg-amber-500/12 text-amber-900 ring-amber-500/25 dark:text-amber-100 dark:ring-amber-500/35";
  }
  if (status === "cancelled" || status === "rejected" || status === "abandoned" || status === "payment_failed") {
    return "bg-rose-500/10 text-rose-900 ring-rose-500/20 dark:text-rose-100 dark:ring-rose-500/30";
  }
  return "bg-[var(--bg3)] text-text-secondary ring-black/[0.06] dark:ring-white/10";
}

function initials(first: string, last: string) {
  const a = first?.trim()?.[0] ?? "";
  const b = last?.trim()?.[0] ?? "";
  return (a + b).toUpperCase() || "?";
}

function IconUser({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
    </svg>
  );
}

function IconCalendar({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5a2.25 2.25 0 002.25-2.25m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5a2.25 2.25 0 012.25 2.25v7.5" />
    </svg>
  );
}

function IconCompass({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9 9 0 100-18 9 9 0 000 18z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.91 8.09l-1.75 5.25-5.25 1.75 1.75-5.25 5.25-1.75z" />
    </svg>
  );
}

function IconSparkles({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.847a4.5 4.5 0 003.09 3.09L15.75 12l-2.847.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423L16.5 15l.394 1.183a2.25 2.25 0 001.423 1.423L19.5 18.75l-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
    </svg>
  );
}

function IconHeart({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
    </svg>
  );
}

function IconSearch({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
    </svg>
  );
}

function IconLayout({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
    </svg>
  );
}

function IconChevron({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
    </svg>
  );
}

export function AccountPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawTab = searchParams.get("tab");
  const tab: TabId = TAB_IDS.includes(rawTab as TabId) ? (rawTab as TabId) : "profile";

  const setTab = (next: TabId) => {
    const params = new URLSearchParams(searchParams.toString());
    if (next === "profile") {
      params.delete("tab");
    } else {
      params.set("tab", next);
    }
    const q = params.toString();
    router.replace(q ? `/account?${q}` : "/account", { scroll: false });
  };

  const setUser = useAuthStore((s) => s.setUser);
  const [me, setMe] = useState<Me | null>(null);
  const [bookings, setBookings] = useState<BookingRow[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [bio, setBio] = useState("");
  const [preferredLanguage, setPreferredLanguage] = useState("pl");
  const [country, setCountry] = useState("");

  const load = useCallback(async () => {
    try {
      const [profileRes, bookRes] = await Promise.all([
        api.get<{ data: Me }>("/api/v1/auth/me/"),
        api.get<{ data: BookingRow[] }>("/api/v1/bookings/me/").catch(() => ({ data: [] })),
      ]);
      const u = profileRes.data;
      setMe(u);
      setFirstName(u.first_name);
      setLastName(u.last_name);
      setPhone(u.phone_number || "");
      setBio(u.bio || "");
      setPreferredLanguage(u.preferred_language || "pl");
      setCountry(u.country || "");
      setBookings(bookRes.data ?? []);
      setUser(u);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Błąd");
    }
  }, [setUser]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append("first_name", firstName);
      fd.append("last_name", lastName);
      fd.append("phone_number", phone);
      fd.append("bio", bio);
      fd.append("preferred_language", preferredLanguage);
      fd.append("country", country);
      const avatarInput = (document.getElementById("account-avatar") as HTMLInputElement | null)?.files?.[0];
      if (avatarInput) fd.append("avatar", avatarInput);

      const j = await api.patchForm<{ data: Me }>("/api/v1/auth/me/", fd);
      setMe(j.data);
      setUser(j.data);
      toast.success("Zapisano profil.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Nie udało się zapisać.");
    } finally {
      setSaving(false);
    }
  }

  const bookingPreview = useMemo(() => (bookings ?? []).slice(0, 5), [bookings]);
  const bookingCount = bookings?.length ?? 0;

  if (err) {
    return (
      <div className="relative min-h-[60vh] px-4 py-20">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -left-20 top-10 h-72 w-72 rounded-full bg-brand/10 blur-3xl dark:bg-brand/20" />
          <div className="absolute -right-16 bottom-0 h-64 w-64 rounded-full bg-emerald-300/20 blur-3xl dark:bg-emerald-500/10" />
        </div>
        <div className="relative mx-auto max-w-md rounded-3xl border border-[var(--border)] bg-[var(--background)] p-10 text-center shadow-elevated dark:border-brand-border dark:bg-[var(--bg2)]">
          <p className="text-lg font-semibold text-brand-dark dark:text-[var(--foreground)]">Nie udało się wczytać konta</p>
          <p className="mt-2 text-sm text-text-secondary">{err}</p>
          <Link href="/login" className="btn-primary mt-8 inline-flex min-h-[48px] px-8">
            Zaloguj się
          </Link>
        </div>
      </div>
    );
  }

  if (!me) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 px-4">
        <LoadingSpinner className="h-12 w-12 text-brand" />
        <p className="text-sm font-medium text-text-secondary">Ładowanie profilu…</p>
      </div>
    );
  }

  const displayName = [me.first_name, me.last_name].filter(Boolean).join(" ").trim() || "Twoje konto";

  const tabs: { id: TabId; label: string; icon: React.ReactNode }[] = [
    { id: "profile", label: "Profil", icon: <IconUser className="h-5 w-5" /> },
    { id: "bookings", label: "Rezerwacje", icon: <IconCalendar className="h-5 w-5" /> },
    { id: "explore", label: "Odkrywaj", icon: <IconCompass className="h-5 w-5" /> },
  ];

  return (
    <div className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-brand-surface/90 via-surface-2/80 to-[var(--background)] dark:from-[var(--bg3)] dark:via-[var(--bg2)] dark:to-[var(--background)]" />
      <div className="pointer-events-none absolute -left-[min(40vw,320px)] top-0 h-[min(90vw,520px)] w-[min(90vw,520px)] rounded-full bg-gradient-to-br from-brand/15 via-transparent to-transparent blur-3xl dark:from-brand/25" />
      <div className="pointer-events-none absolute -right-[min(35vw,280px)] top-32 h-[min(70vw,440px)] w-[min(70vw,440px)] rounded-full bg-gradient-to-bl from-emerald-200/30 via-transparent to-transparent blur-3xl dark:from-emerald-500/10" />

      <div className="relative mx-auto max-w-5xl px-3 pb-[calc(5.5rem+var(--mobile-safe-bottom))] pt-4 sm:px-6 sm:pb-24 sm:pt-10 lg:px-8">
        {/* Hero */}
        <header className="animate-fade-up overflow-hidden rounded-[22px] border border-[var(--border)] bg-[var(--background)]/85 shadow-[0_4px_24px_rgba(10,15,13,.06),0_24px_64px_rgba(10,46,26,.08)] backdrop-blur-md dark:border-brand-border/60 dark:bg-[var(--bg2)]/85 dark:shadow-[0_24px_64px_rgba(0,0,0,.35)] sm:rounded-[28px]">
          <div className="relative px-4 py-5 sm:px-8 sm:py-10">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand/35 to-transparent" />
            <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
                <div className="relative shrink-0">
                  {me.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={me.avatar_url}
                      alt=""
                      className="h-20 w-20 rounded-[18px] border-2 border-white object-cover shadow-lg ring-4 ring-brand/15 dark:border-brand-border/40 dark:ring-brand/25 sm:h-28 sm:w-28 sm:rounded-[22px]"
                    />
                  ) : (
                    <div
                      className="flex h-20 w-20 items-center justify-center rounded-[18px] border border-brand-border/60 bg-gradient-to-br from-brand-muted to-brand-surface text-lg font-extrabold tracking-tight text-brand-dark shadow-inner dark:from-brand-muted/40 dark:to-[var(--bg3)] dark:text-[var(--brand-light)] sm:h-28 sm:w-28 sm:rounded-[22px] sm:text-2xl"
                      aria-hidden
                    >
                      {initials(me.first_name, me.last_name)}
                    </div>
                  )}
                </div>
                <div className="min-w-0 space-y-2">
                  <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-text-muted">Moje konto</p>
                  <h1 className="text-[26px] font-extrabold tracking-tight text-brand-dark dark:text-[var(--foreground)] sm:text-3xl">
                    {displayName}
                  </h1>
                  <p className="truncate text-sm text-text-secondary">{me.email}</p>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {me.is_host ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-muted/80 px-3 py-1 text-xs font-bold text-brand-dark ring-1 ring-brand/20 dark:bg-brand-muted/30 dark:text-[var(--brand-light)] dark:ring-brand/30">
                        <IconLayout className="h-3.5 w-3.5" />
                        Gospodarz
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-[var(--bg3)] px-3 py-1 text-xs font-semibold text-text-secondary ring-1 ring-black/[0.05] dark:bg-[var(--bg3)] dark:ring-white/10">
                        Gość
                      </span>
                    )}
                    {bookingCount > 0 ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-text-secondary shadow-sm ring-1 ring-black/[0.04] dark:bg-[var(--bg3)]/90 dark:text-[var(--foreground)] dark:ring-white/10">
                        <IconCalendar className="h-3.5 w-3.5 text-brand" />
                        {bookingCount} {bookingCount === 1 ? "rezerwacja" : bookingCount < 5 ? "rezerwacje" : "rezerwacji"}
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>
              <div className="flex shrink-0 flex-col gap-2.5 sm:flex-row lg:flex-col lg:items-end">
                {me.is_host ? (
                  <Link
                    href="/host/dashboard"
                    className="group inline-flex min-h-[46px] items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-brand-dark to-[#15402a] px-5 text-sm font-bold text-white shadow-[0_8px_24px_rgba(10,46,26,.28)] transition hover:-translate-y-0.5 hover:shadow-[0_12px_28px_rgba(22,163,74,.35)] dark:from-[#14532d] dark:to-brand-800 sm:min-h-[48px] sm:rounded-2xl sm:px-6"
                  >
                    Panel gospodarza
                    <IconChevron className="h-4 w-4 transition group-hover:translate-x-0.5" />
                  </Link>
                ) : null}
                <Link
                  href="/search"
                  className="btn-secondary inline-flex min-h-[46px] items-center justify-center gap-2 rounded-xl px-5 text-sm font-bold sm:min-h-[48px] sm:rounded-2xl sm:px-6"
                >
                  <IconSearch className="h-4 w-4 text-brand" />
                  Szukaj noclegów
                </Link>
              </div>
            </div>

            {/* Tabs */}
            <div className="mt-6 flex gap-1 rounded-xl bg-[var(--bg3)]/90 p-1 ring-1 ring-black/[0.04] dark:bg-[var(--bg3)]/50 dark:ring-white/10 sm:mt-10 sm:rounded-2xl sm:p-1.5">
              {tabs.map((t) => {
                const active = tab === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    aria-label={t.label}
                    aria-current={active ? "true" : undefined}
                    onClick={() => setTab(t.id)}
                    className={cn(
                      "relative flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-[10px] px-2 text-[13px] font-bold transition-all sm:min-h-[48px] sm:rounded-[14px] sm:px-4 sm:text-sm",
                      active
                        ? "bg-[var(--background)] text-brand-dark shadow-[0_2px_12px_rgba(10,15,13,.08)] ring-1 ring-black/[0.06] dark:bg-[var(--bg2)] dark:text-[var(--foreground)] dark:shadow-[0_8px_24px_rgba(0,0,0,.25)] dark:ring-white/10"
                        : "text-text-secondary hover:text-text dark:hover:text-[var(--foreground)]",
                    )}
                  >
                    <span className={cn(active ? "text-brand" : "text-text-muted")}>{t.icon}</span>
                    <span className="max-[380px]:sr-only">{t.label}</span>
                    {active ? (
                      <span className="absolute bottom-1 left-1/2 h-0.5 w-8 -translate-x-1/2 rounded-full bg-gradient-to-r from-brand to-brand-light" />
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>
        </header>

        <div className="mt-6 sm:mt-10">
          {tab === "profile" ? (
            <section className="animate-fade-up rounded-[22px] border border-[var(--border)] bg-[var(--background)]/90 p-4 shadow-[0_4px_24px_rgba(10,15,13,.05)] backdrop-blur-sm dark:border-brand-border/60 dark:bg-[var(--bg2)]/90 sm:rounded-[28px] sm:p-8">
              <div className="border-b border-[var(--border)] pb-6 dark:border-brand-border/50">
                <h2 className="text-lg font-extrabold text-brand-dark dark:text-[var(--foreground)]">Dane profilu</h2>
                <p className="mt-1 text-sm text-text-secondary">
                  Zdjęcie, dane kontaktowe i preferencje — wszystko w jednym miejscu.
                </p>
              </div>

              <form onSubmit={handleSave} className="mt-6 space-y-8 sm:mt-8 sm:space-y-10">
                <div className="grid gap-6 lg:grid-cols-[220px_1fr] lg:items-start lg:gap-8">
                  <div>
                    <p className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-text-muted">Zdjęcie</p>
                    <p className="mt-1 text-sm text-text-secondary">JPG, PNG lub WebP.</p>
                    <label
                      htmlFor="account-avatar"
                      className="mt-4 flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-[var(--border)] bg-brand-surface/40 px-4 py-8 text-center transition hover:border-brand/50 hover:bg-brand-surface/80 dark:border-brand-border dark:bg-[var(--bg3)]/50 dark:hover:bg-[var(--bg3)] sm:rounded-2xl sm:py-10"
                    >
                      <span className="rounded-full bg-white p-3 shadow-sm ring-1 ring-black/[0.04] dark:bg-[var(--bg2)] dark:ring-white/10">
                        <IconUser className="h-6 w-6 text-brand" />
                      </span>
                      <span className="mt-3 text-sm font-semibold text-brand-dark dark:text-[var(--foreground)]">Wybierz plik</span>
                      <span className="mt-1 text-xs text-text-muted">Przeciągnij lub kliknij</span>
                    </label>
                    <input
                      id="account-avatar"
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="sr-only"
                    />
                  </div>

                  <div className="space-y-6">
                    <div className="grid gap-5 sm:grid-cols-2">
                      <div>
                        <label className="text-xs font-bold uppercase tracking-wide text-text-muted" htmlFor="fn">
                          Imię
                        </label>
                        <input id="fn" className="input mt-2" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
                      </div>
                      <div>
                        <label className="text-xs font-bold uppercase tracking-wide text-text-muted" htmlFor="ln">
                          Nazwisko
                        </label>
                        <input id="ln" className="input mt-2" value={lastName} onChange={(e) => setLastName(e.target.value)} />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-bold uppercase tracking-wide text-text-muted" htmlFor="ph">
                        Telefon
                      </label>
                      <input
                        id="ph"
                        className="input mt-2"
                        inputMode="tel"
                        autoComplete="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+48 …"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold uppercase tracking-wide text-text-muted" htmlFor="bio">
                        O mnie
                      </label>
                      <textarea
                        id="bio"
                        className="input mt-2 min-h-[120px] resize-y"
                        rows={4}
                        value={bio}
                        onChange={(e) => setBio(e.target.value)}
                        placeholder="Kilka słów o Tobie — pomoże gospodarzom Cię poznać."
                      />
                    </div>
                    <div className="grid gap-5 sm:grid-cols-2">
                      <div>
                        <label className="text-xs font-bold uppercase tracking-wide text-text-muted" htmlFor="lang">
                          Język interfejsu
                        </label>
                        <select
                          id="lang"
                          className="input mt-2"
                          value={preferredLanguage}
                          onChange={(e) => setPreferredLanguage(e.target.value)}
                        >
                          {!["pl", "en", "de"].includes(preferredLanguage) ? (
                            <option value={preferredLanguage}>{preferredLanguage}</option>
                          ) : null}
                          <option value="pl">Polski</option>
                          <option value="en">English</option>
                          <option value="de">Deutsch</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-xs font-bold uppercase tracking-wide text-text-muted" htmlFor="cc">
                          Kraj (ISO)
                        </label>
                        <input
                          id="cc"
                          className="input mt-2 uppercase"
                          maxLength={2}
                          value={country}
                          onChange={(e) => setCountry(e.target.value.toUpperCase())}
                          placeholder="PL"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col-reverse gap-3 border-t border-[var(--border)] pt-6 dark:border-brand-border/50 sm:flex-row sm:items-center sm:justify-between sm:pt-8">
                  <p className="text-xs text-text-muted">Zmiany zapisujemy bezpiecznie na serwerze.</p>
                  <button type="submit" disabled={saving} className="btn-primary min-h-[46px] rounded-xl px-6 text-[14px] sm:min-h-[48px] sm:rounded-2xl sm:px-8 sm:text-[15px]">
                    {saving ? "Zapisywanie…" : "Zapisz zmiany"}
                  </button>
                </div>
              </form>
            </section>
          ) : null}

          {tab === "bookings" ? (
            <section className="animate-fade-up rounded-[22px] border border-[var(--border)] bg-[var(--background)]/90 p-4 shadow-[0_4px_24px_rgba(10,15,13,.05)] backdrop-blur-sm dark:border-brand-border/60 dark:bg-[var(--bg2)]/90 sm:rounded-[28px] sm:p-8">
              <div className="flex flex-col gap-4 border-b border-[var(--border)] pb-6 dark:border-brand-border/50 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h2 className="text-lg font-extrabold text-brand-dark dark:text-[var(--foreground)]">Rezerwacje</h2>
                  <p className="mt-1 text-sm text-text-secondary">Podgląd ostatnich pobytów i statusów.</p>
                </div>
                <Link
                  href="/bookings"
                  className="inline-flex min-h-[44px] items-center gap-2 self-start rounded-2xl px-4 text-sm font-bold text-brand transition hover:bg-brand-surface dark:hover:bg-brand-muted/20"
                >
                  Wszystkie rezerwacje
                  <IconChevron className="h-4 w-4" />
                </Link>
              </div>

              {bookings === null ? (
                <div className="flex flex-col items-center justify-center gap-3 py-16">
                  <LoadingSpinner className="h-10 w-10 text-brand" />
                  <p className="text-sm text-text-secondary">Ładowanie listy…</p>
                </div>
              ) : bookings.length === 0 ? (
                <div className="flex flex-col items-center px-4 py-16 text-center">
                  <div className="rounded-3xl bg-gradient-to-br from-brand-surface to-white p-6 shadow-inner ring-1 ring-brand/10 dark:from-[var(--bg3)] dark:to-[var(--bg2)] dark:ring-brand-border/40">
                    <IconCalendar className="mx-auto h-12 w-12 text-brand/80" />
                  </div>
                  <p className="mt-6 max-w-sm text-lg font-bold text-brand-dark dark:text-[var(--foreground)]">Jeszcze nic nie zarezerwowałeś</p>
                  <p className="mt-2 max-w-md text-sm text-text-secondary">
                    Odkryj noclegi w całej Polsce — od gór po morze, w kilka kliknięć.
                  </p>
                  <Link href="/search" className="btn-primary mt-8 min-h-[48px] rounded-2xl px-8">
                    Przeglądaj oferty
                  </Link>
                </div>
              ) : (
                <ul className="mt-6 space-y-3.5 sm:mt-8 sm:space-y-4">
                  {bookingPreview.map((b) => (
                    <li
                      key={b.id}
                        className="group relative overflow-hidden rounded-xl border border-[var(--border)] bg-gradient-to-br from-white to-surface-2/80 p-4 transition hover:border-brand/35 hover:shadow-[0_12px_32px_rgba(10,46,26,.1)] dark:border-brand-border/50 dark:from-[var(--bg2)] dark:to-[var(--bg3)] dark:hover:border-brand/40 sm:rounded-2xl sm:p-5"
                    >
                      <div className="absolute right-0 top-0 h-24 w-24 translate-x-8 -translate-y-8 rounded-full bg-brand/5 blur-2xl transition group-hover:bg-brand/10 dark:bg-brand/10" />
                      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0 space-y-2">
                          <Link
                            href={`/listing/${b.listing_slug}`}
                            className="block text-base font-bold text-brand-dark transition hover:text-brand dark:text-[var(--foreground)] dark:hover:text-[var(--brand-light)] sm:text-lg"
                          >
                            {b.listing_title}
                          </Link>
                          <p className="text-sm text-text-secondary">{formatBookingRange(b.check_in, b.check_out)}</p>
                          <span
                            className={cn(
                              "inline-flex w-fit items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide ring-1",
                              statusBadgeClass(b.status),
                            )}
                          >
                            {statusPl[b.status] ?? b.status}
                          </span>
                        </div>
                        <div className="flex shrink-0 flex-col items-start gap-2 sm:items-end">
                          <p className="text-lg font-extrabold tabular-nums text-brand-dark dark:text-[var(--foreground)] sm:text-xl">
                            {b.final_amount} {b.currency}
                          </p>
                          <Link
                            href={`/listing/${b.listing_slug}`}
                            className="text-xs font-bold text-brand opacity-90 transition hover:opacity-100"
                          >
                            Zobacz ofertę →
                          </Link>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ) : null}

          {tab === "explore" ? (
            <section className="animate-fade-up rounded-[22px] border border-[var(--border)] bg-[var(--background)]/90 p-4 shadow-[0_4px_24px_rgba(10,15,13,.05)] backdrop-blur-sm dark:border-brand-border/60 dark:bg-[var(--bg2)]/90 sm:rounded-[28px] sm:p-8">
              <div className="border-b border-[var(--border)] pb-6 dark:border-brand-border/50">
                <h2 className="text-lg font-extrabold text-brand-dark dark:text-[var(--foreground)]">Skróty</h2>
                <p className="mt-1 text-sm text-text-secondary">Szybkie przejścia do najważniejszych miejsc w StayMap.</p>
              </div>
              <ul className="mt-6 grid gap-3.5 sm:mt-8 sm:grid-cols-2 sm:gap-4">
                {[
                  {
                    href: "/bookings",
                    title: "Moje rezerwacje",
                    desc: "Pełna historia i szczegóły pobytów.",
                    icon: <IconCalendar className="h-6 w-6" />,
                  },
                  {
                    href: "/wishlist",
                    title: "Lista życzeń",
                    desc: "Zapisane miejsca na później.",
                    icon: <IconHeart className="h-6 w-6" />,
                  },
                  {
                    href: "/search",
                    title: "Szukaj noclegów",
                    desc: "Mapa, filtry i dostępność w czasie rzeczywistym.",
                    icon: <IconSearch className="h-6 w-6" />,
                  },
                  {
                    href: "/ai/history",
                    title: "Historia wyszukiwań AI",
                    desc: "Twoje rozmowy z asystentem podróży.",
                    icon: <IconSparkles className="h-6 w-6" />,
                  },
                ].map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className="group flex gap-3 rounded-xl border border-[var(--border)] bg-gradient-to-br from-white to-surface-2/50 p-4 transition hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-[0_16px_40px_rgba(10,46,26,.12)] dark:border-brand-border/50 dark:from-[var(--bg2)] dark:to-[var(--bg3)] dark:hover:border-brand/45 sm:gap-4 sm:rounded-2xl sm:p-5"
                    >
                      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-surface text-brand ring-1 ring-brand/15 dark:bg-brand-muted/25 dark:text-[var(--brand-light)] dark:ring-brand/25">
                        {item.icon}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-start justify-between gap-2">
                          <span className="font-bold text-brand-dark dark:text-[var(--foreground)]">{item.title}</span>
                          <IconChevron className="h-5 w-5 shrink-0 text-text-muted transition group-hover:translate-x-0.5 group-hover:text-brand" />
                        </span>
                        <span className="mt-1 block text-sm text-text-secondary">{item.desc}</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
              {me.is_host ? (
                <div className="mt-6 rounded-2xl border border-dashed border-brand/35 bg-brand-surface/50 p-6 text-center dark:border-brand-border dark:bg-brand-muted/15">
                  <p className="text-sm font-semibold text-brand-dark dark:text-[var(--foreground)]">Jesteś gospodarzem</p>
                  <p className="mt-1 text-sm text-text-secondary">Zarządzaj ofertami, kalendarzem i wiadomościami.</p>
                  <Link href="/host/dashboard" className="btn-primary mt-4 inline-flex min-h-[48px] rounded-2xl px-8">
                    Otwórz panel gospodarza
                  </Link>
                </div>
              ) : null}
            </section>
          ) : null}
        </div>
      </div>
    </div>
  );
}
