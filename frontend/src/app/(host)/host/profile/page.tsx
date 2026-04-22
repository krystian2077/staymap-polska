"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { api } from "@/lib/api";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { useHostStore } from "@/lib/store/hostStore";

type ProfileData = {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone_number?: string;
  bio?: string;
  preferred_language?: string;
  country?: string;
  avatar_url?: string | null;
  is_host?: boolean;
  created_at?: string;
};

function formatMemberSince(iso?: string) {
  if (!iso) return null;
  const d = new Date(iso);
  return d.toLocaleDateString("pl-PL", { month: "long", year: "numeric" });
}

export default function HostProfilePage() {
  const setProfile = useHostStore((s) => s.setProfile);
  const [data, setData] = useState<ProfileData | null>(null);
  const [saving, setSaving] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [bio, setBio] = useState("");
  const [preferredLanguage, setPreferredLanguage] = useState("pl");
  const [country, setCountry] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await api.get<{ data: ProfileData }>("/api/v1/auth/me/");
      const u = res.data;
      setData(u);
      setFirstName(u.first_name);
      setLastName(u.last_name);
      setPhone(u.phone_number ?? "");
      setBio(u.bio ?? "");
      setPreferredLanguage(u.preferred_language ?? "pl");
      setCountry(u.country ?? "");
    } catch {
      toast.error("Nie udało się załadować profilu.");
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarPreview(URL.createObjectURL(file));
    setAvatarUploading(true);
    try {
      const fd = new FormData();
      fd.append("avatar", file);
      const res = await api.patchForm<{ data: ProfileData }>("/api/v1/auth/me/", fd);
      setData(res.data);
      if (res.data.avatar_url) setAvatarPreview(null);
      const name = `${res.data.first_name} ${res.data.last_name}`.trim();
      setProfile({
        id: res.data.id,
        user_id: res.data.id,
        display_name: name || "Gospodarz",
        bio: res.data.bio ?? "",
        avatar_url: res.data.avatar_url ?? null,
        is_verified: false,
        response_rate: 0,
        average_rating: null,
        review_count: 0,
        member_since: res.data.created_at ?? new Date().toISOString(),
        total_earnings: 0,
        payout_pending: 0,
      });
      toast.success("Zdjęcie profilowe zaktualizowane.");
    } catch {
      toast.error("Nie udało się wgrać zdjęcia.");
      setAvatarPreview(null);
    } finally {
      setAvatarUploading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
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
      const res = await api.patchForm<{ data: ProfileData }>("/api/v1/auth/me/", fd);
      setData(res.data);

      const name = `${res.data.first_name} ${res.data.last_name}`.trim();
      setProfile({
        id: res.data.id,
        user_id: res.data.id,
        display_name: name || "Gospodarz",
        bio: res.data.bio ?? "",
        avatar_url: res.data.avatar_url ?? null,
        is_verified: false,
        response_rate: 0,
        average_rating: null,
        review_count: 0,
        member_since: res.data.created_at ?? new Date().toISOString(),
        total_earnings: 0,
        payout_pending: 0,
      });
      toast.success("Profil zapisany.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Nie udało się zapisać profilu.");
    } finally {
      setSaving(false);
    }
  };

  if (!data) {
    return (
      <div className="flex justify-center py-24">
        <LoadingSpinner className="h-10 w-10 text-brand" />
      </div>
    );
  }

  const avatarSrc = avatarPreview ?? data.avatar_url ?? null;
  const initials = (data.first_name[0] ?? "?").toUpperCase();
  const memberSince = formatMemberSince(data.created_at);

  return (
    <div className="min-h-screen">
      {/* Hero banner */}
      <div className="relative h-36 bg-gradient-to-br from-brand via-brand/80 to-brand-dark sm:h-44">
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: "radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)", backgroundSize: "40px 40px" }}
        />
      </div>

      <div className="px-4 sm:px-6 lg:px-8">
        {/* Avatar + name row — overlaps hero */}
        <div className="-mt-14 mb-6 flex flex-col items-center gap-4 sm:-mt-16 sm:flex-row sm:items-end sm:gap-6">
          {/* Avatar with upload overlay */}
          <div className="group relative shrink-0">
            <div className="h-28 w-28 overflow-hidden rounded-full border-4 border-white shadow-xl ring-2 ring-brand/20 sm:h-32 sm:w-32">
              {avatarSrc ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatarSrc} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-brand/20 to-brand/40 text-4xl font-extrabold text-brand-dark">
                  {initials}
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={avatarUploading}
              className="absolute inset-0 flex items-center justify-center rounded-full bg-black/0 transition-all group-hover:bg-black/40 disabled:cursor-wait"
              aria-label="Zmień zdjęcie profilowe"
            >
              {avatarUploading ? (
                <LoadingSpinner className="h-7 w-7 text-white opacity-0 transition-opacity group-hover:opacity-100" />
              ) : (
                <svg className="h-7 w-7 text-white opacity-0 transition-opacity group-hover:opacity-100" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              )}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => void handleAvatarChange(e)}
            />
          </div>

          {/* Name + meta */}
          <div className="pb-1 text-center sm:text-left">
            <h1 className="text-2xl font-extrabold text-brand-dark sm:text-3xl">
              {firstName || lastName ? `${firstName} ${lastName}`.trim() : "Twój profil"}
            </h1>
            <p className="mt-0.5 text-sm text-text-secondary">{data.email}</p>
            {memberSince && (
              <p className="mt-1 flex items-center justify-center gap-1.5 text-xs text-text-muted sm:justify-start">
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Gospodarz od {memberSince}
              </p>
            )}
          </div>

          {/* Change photo button — visible on mobile as separate CTA */}
          <div className="ml-auto hidden sm:block">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={avatarUploading}
              className="btn-secondary flex items-center gap-2 text-xs disabled:opacity-60"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              {avatarUploading ? "Wgrywanie…" : "Zmień zdjęcie"}
            </button>
          </div>
        </div>

        {/* Mobile — change photo button below avatar */}
        <div className="mb-6 flex justify-center sm:hidden">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={avatarUploading}
            className="btn-secondary flex items-center gap-2 text-xs disabled:opacity-60"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            {avatarUploading ? "Wgrywanie…" : "Zmień zdjęcie profilowe"}
          </button>
        </div>

        {/* Form */}
        <form onSubmit={(e) => void handleSave(e)} className="max-w-2xl space-y-5 pb-10">

          {/* Dane osobowe */}
          <div className="overflow-hidden rounded-2xl border border-brand-border bg-white shadow-sm dark:bg-brand-surface">
            <div className="border-b border-brand-border/60 bg-brand-muted/40 px-5 py-3.5 dark:bg-brand-muted/10">
              <div className="flex items-center gap-2.5">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand/10">
                  <svg className="h-4 w-4 text-brand" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <h2 className="text-sm font-bold text-brand-dark">Dane osobowe</h2>
              </div>
            </div>
            <div className="space-y-4 p-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">Imię</label>
                  <input
                    className="host-input"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Jan"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">Nazwisko</label>
                  <input
                    className="host-input"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Kowalski"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">Numer telefonu</label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-text-muted">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                  </span>
                  <input
                    className="host-input pl-9"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+48 000 000 000"
                    type="tel"
                  />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">Preferowany język</label>
                  <select className="host-input" value={preferredLanguage} onChange={(e) => setPreferredLanguage(e.target.value)}>
                    <option value="pl">Polski</option>
                    <option value="en">English</option>
                    <option value="de">Deutsch</option>
                    <option value="uk">Українська</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">Kraj</label>
                  <select className="host-input" value={country} onChange={(e) => setCountry(e.target.value)}>
                    <option value="">Wybierz kraj...</option>
                    <option value="PL">Polska</option>
                    <option value="DE">Niemcy</option>
                    <option value="CZ">Czechy</option>
                    <option value="SK">Słowacja</option>
                    <option value="UA">Ukraina</option>
                    <option value="GB">Wielka Brytania</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* O mnie */}
          <div className="overflow-hidden rounded-2xl border border-brand-border bg-white shadow-sm dark:bg-brand-surface">
            <div className="border-b border-brand-border/60 bg-brand-muted/40 px-5 py-3.5 dark:bg-brand-muted/10">
              <div className="flex items-center gap-2.5">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand/10">
                  <svg className="h-4 w-4 text-brand" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-sm font-bold text-brand-dark">O mnie</h2>
                  <p className="text-[11px] text-text-muted">Widoczne dla gości przeglądających Twoje oferty</p>
                </div>
              </div>
            </div>
            <div className="p-5">
              <textarea
                className="host-input resize-none"
                rows={6}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Opisz siebie — co lubisz, czym się zajmujesz, dlaczego zostałeś gospodarzem..."
              />
              <div className="mt-2 flex items-center justify-between">
                <p className="text-[11px] text-text-muted">Dobry opis zwiększa zaufanie gości i liczbę rezerwacji.</p>
                <span className={`text-[11px] font-medium tabular-nums ${bio.length > 7500 ? "text-orange-500" : "text-text-muted"}`}>
                  {bio.length}/8000
                </span>
              </div>
            </div>
          </div>

          {/* Informacje o koncie (read-only) */}
          <div className="overflow-hidden rounded-2xl border border-brand-border bg-white shadow-sm dark:bg-brand-surface">
            <div className="border-b border-brand-border/60 bg-brand-muted/40 px-5 py-3.5 dark:bg-brand-muted/10">
              <div className="flex items-center gap-2.5">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand/10">
                  <svg className="h-4 w-4 text-brand" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <h2 className="text-sm font-bold text-brand-dark">Informacje o koncie</h2>
              </div>
            </div>
            <div className="divide-y divide-brand-border/40 px-5">
              <div className="flex items-center justify-between py-3.5">
                <span className="text-xs font-medium text-text-secondary">Adres e-mail</span>
                <span className="text-xs text-brand-dark">{data.email}</span>
              </div>
              {memberSince && (
                <div className="flex items-center justify-between py-3.5">
                  <span className="text-xs font-medium text-text-secondary">Gospodarz od</span>
                  <span className="text-xs text-brand-dark">{memberSince}</span>
                </div>
              )}
              <div className="flex items-center justify-between py-3.5">
                <span className="text-xs font-medium text-text-secondary">Typ konta</span>
                <span className="inline-flex items-center gap-1 rounded-full bg-brand/10 px-2.5 py-0.5 text-[11px] font-semibold text-brand">
                  <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3zM3.31 9.397L5 10.12v4.102a8.969 8.969 0 00-1.05-.174 1 1 0 01-.89-.89 11.115 11.115 0 01.25-3.762zM9.3 16.573A9.026 9.026 0 007 14.935v-3.957l1.818.78a3 3 0 002.364 0l5.508-2.361a11.026 11.026 0 01.25 3.762 1 1 0 01-.89.89 8.968 8.968 0 00-5.35 2.524 1 1 0 01-1.4 0zM6 18a1 1 0 001-1v-2.065a8.935 8.935 0 00-2-.712V17a1 1 0 001 1z" />
                  </svg>
                  Gospodarz
                </span>
              </div>
            </div>
          </div>

          {/* Save button */}
          <div className="flex items-center justify-between pt-1">
            <p className="text-[11px] text-text-muted">Zmiany będą widoczne natychmiast po zapisaniu.</p>
            <button
              type="submit"
              disabled={saving}
              className="btn-primary flex min-w-[140px] items-center justify-center gap-2 px-6 py-2.5 disabled:opacity-70"
            >
              {saving ? (
                <>
                  <LoadingSpinner className="h-4 w-4 text-white" />
                  <span>Zapisywanie…</span>
                </>
              ) : (
                <>
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Zapisz profil</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
