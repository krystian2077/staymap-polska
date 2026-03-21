"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
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

export function AccountPageClient() {
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

  if (err) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <p className="text-red-600">{err}</p>
        <Link href="/login" className="btn-primary mt-6 inline-block px-6">
          Zaloguj się
        </Link>
      </div>
    );
  }

  if (!me) {
    return (
      <div className="flex justify-center py-24">
        <LoadingSpinner className="h-10 w-10 text-brand" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="text-3xl font-extrabold tracking-tight text-brand-dark">Moje konto</h1>
      <p className="mt-2 text-text-secondary">{me.email}</p>

      <div className="mt-10 grid gap-10 lg:grid-cols-3">
        <nav className="space-y-2 text-sm lg:col-span-1">
          <p className="font-semibold text-brand-dark">Skróty</p>
          <Link href="/bookings" className="block rounded-lg border border-gray-200 bg-white px-4 py-3 hover:border-brand/40">
            Moje rezerwacje
          </Link>
          <Link href="/wishlist" className="block rounded-lg border border-gray-200 bg-white px-4 py-3 hover:border-brand/40">
            Lista życzeń
          </Link>
          <Link href="/search" className="block rounded-lg border border-gray-200 bg-white px-4 py-3 hover:border-brand/40">
            Szukaj noclegów
          </Link>
          {me.is_host ? (
            <Link
              href="/host/dashboard"
              className="block rounded-lg border border-brand/30 bg-brand-muted/40 px-4 py-3 font-semibold text-brand-dark"
            >
              Panel gospodarza
            </Link>
          ) : null}
        </nav>

        <div className="space-y-10 lg:col-span-2">
          <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-brand-dark">Dane profilu</h2>
            <form onSubmit={handleSave} className="mt-4 space-y-4">
              {me.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={me.avatar_url}
                  alt=""
                  className="h-20 w-20 rounded-full border border-gray-200 object-cover"
                />
              ) : null}
              <div>
                <label className="text-sm font-medium text-text-secondary" htmlFor="account-avatar">
                  Nowe zdjęcie profilowe
                </label>
                <input id="account-avatar" type="file" accept="image/jpeg,image/png,image/webp" className="mt-1 block w-full text-sm" />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-sm font-medium text-text-secondary">Imię</label>
                  <input
                    className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-text-secondary">Nazwisko</label>
                  <input
                    className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-text-secondary">Telefon</label>
                <input
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-text-secondary">O mnie</label>
                <textarea
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2"
                  rows={4}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-sm font-medium text-text-secondary">Język (np. pl)</label>
                  <input
                    className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2"
                    value={preferredLanguage}
                    onChange={(e) => setPreferredLanguage(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-text-secondary">Kraj (ISO, np. PL)</label>
                  <input
                    className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2"
                    maxLength={2}
                    value={country}
                    onChange={(e) => setCountry(e.target.value.toUpperCase())}
                  />
                </div>
              </div>
              <button type="submit" disabled={saving} className="btn-primary px-6 py-2">
                {saving ? "Zapisywanie…" : "Zapisz zmiany"}
              </button>
            </form>
          </section>

          <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-bold text-brand-dark">Ostatnie rezerwacje</h2>
              <Link href="/bookings" className="text-sm font-semibold text-brand hover:underline">
                Wszystkie
              </Link>
            </div>
            {bookings === null ? (
              <div className="flex justify-center py-8">
                <LoadingSpinner className="h-8 w-8 text-brand" />
              </div>
            ) : bookings.length === 0 ? (
              <p className="mt-4 text-text-secondary">Brak rezerwacji — czas coś zarezerwować.</p>
            ) : (
              <ul className="mt-4 space-y-3">
                {bookings.slice(0, 5).map((b) => (
                  <li key={b.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-gray-100 px-4 py-3">
                    <div>
                      <Link href={`/listing/${b.listing_slug}`} className="font-semibold text-brand-dark hover:text-brand">
                        {b.listing_title}
                      </Link>
                      <p className="text-xs text-text-muted">
                        {b.check_in} → {b.check_out} · {statusPl[b.status] ?? b.status}
                      </p>
                    </div>
                    <span className="text-sm font-bold text-brand-dark">
                      {b.final_amount} {b.currency}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
