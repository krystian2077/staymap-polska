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
  return new Date(iso).toLocaleDateString("pl-PL", { month: "long", year: "numeric" });
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
  const displayName = `${firstName} ${lastName}`.trim() || "Twój profil";

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:py-10">

      {/* Page title */}
      <div className="mb-7">
        <p className="text-xs font-bold uppercase tracking-widest text-brand">Konto</p>
        <h1 className="mt-1 text-2xl font-extrabold text-brand-dark">Mój profil</h1>
      </div>

      <div className="grid gap-6 lg:grid-cols-[300px_1fr]">

        {/* ── LEFT COLUMN: profile card ── */}
        <div className="space-y-4">

          {/* Avatar card */}
          <div className="overflow-hidden rounded-2xl border border-brand-border bg-white shadow-sm dark:bg-brand-surface">
            {/* Top accent */}
            <div className="h-1.5 w-full bg-gradient-to-r from-brand to-brand/60" />

            <div className="flex flex-col items-center px-6 py-8 text-center">
              {/* Avatar with upload overlay */}
              <div
                className="group relative cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="h-28 w-28 overflow-hidden rounded-full border-4 border-white shadow-lg ring-2 ring-brand/15">
                  {avatarSrc ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={avatarSrc} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-brand/20 to-brand/50 text-4xl font-extrabold text-brand">
                      {initials}
                    </div>
                  )}
                </div>
                <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/0 transition-all group-hover:bg-black/35">
                  {avatarUploading
                    ? <LoadingSpinner className="h-6 w-6 text-white opacity-0 transition-opacity group-hover:opacity-100" />
                    : (
                      <svg className="h-6 w-6 text-white opacity-0 transition-opacity group-hover:opacity-100" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    )
                  }
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={(e) => void handleAvatarChange(e)}
                />
              </div>

              <h2 className="mt-4 text-lg font-extrabold text-brand-dark">{displayName}</h2>
              <p className="mt-0.5 text-sm text-text-secondary">{data.email}</p>

              {/* Badges */}
              <div className="mt-3 flex flex-wrap justify-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-brand/10 px-3 py-1 text-xs font-semibold text-brand">
                  <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3z" />
                  </svg>
                  Gospodarz
                </span>
                {memberSince && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-brand-muted px-3 py-1 text-xs text-text-muted">
                    od {memberSince}
                  </span>
                )}
              </div>

              {/* Change photo button */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={avatarUploading}
                className="mt-5 w-full rounded-xl border border-brand-border py-2 text-xs font-semibold text-text-secondary transition hover:border-brand hover:text-brand disabled:opacity-60"
              >
                {avatarUploading ? "Wgrywanie…" : "Zmień zdjęcie profilowe"}
              </button>
              <p className="mt-1.5 text-[10px] text-text-muted">JPG, PNG lub WebP · maks. 5 MB</p>
            </div>
          </div>

          {/* Account info card */}
          <div className="overflow-hidden rounded-2xl border border-brand-border bg-white shadow-sm dark:bg-brand-surface">
            <div className="border-b border-brand-border/60 px-5 py-3.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-text-muted">Informacje o koncie</h3>
            </div>
            <div className="divide-y divide-brand-border/40 px-5">
              <div className="py-3">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">E-mail</p>
                <p className="mt-0.5 text-sm text-brand-dark">{data.email}</p>
              </div>
              {memberSince && (
                <div className="py-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">Gospodarz od</p>
                  <p className="mt-0.5 text-sm capitalize text-brand-dark">{memberSince}</p>
                </div>
              )}
              <div className="py-3">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">Status konta</p>
                <div className="mt-1.5 flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-green-500" />
                  <span className="text-sm font-medium text-brand-dark">Aktywny</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── RIGHT COLUMN: edit form ── */}
        <form onSubmit={(e) => void handleSave(e)} className="space-y-5">

          {/* Dane osobowe */}
          <div className="overflow-hidden rounded-2xl border border-brand-border bg-white shadow-sm dark:bg-brand-surface">
            <div className="border-b border-brand-border/60 px-6 py-4">
              <h2 className="text-sm font-bold text-brand-dark">Dane osobowe</h2>
              <p className="mt-0.5 text-xs text-text-muted">Podstawowe informacje widoczne w Twoim profilu.</p>
            </div>
            <div className="space-y-5 px-6 py-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-text-muted">Imię</label>
                  <input className="host-input" value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Jan" />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-text-muted">Nazwisko</label>
                  <input className="host-input" value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Kowalski" />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-text-muted">Numer telefonu</label>
                <input className="host-input" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+48 000 000 000" type="tel" />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-text-muted">Preferowany język</label>
                  <select className="host-input" value={preferredLanguage} onChange={(e) => setPreferredLanguage(e.target.value)}>
                    <option value="pl">Polski</option>
                    <option value="en">English</option>
                    <option value="de">Deutsch</option>
                    <option value="uk">Українська</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-text-muted">Kraj</label>
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
            <div className="border-b border-brand-border/60 px-6 py-4">
              <h2 className="text-sm font-bold text-brand-dark">O mnie</h2>
              <p className="mt-0.5 text-xs text-text-muted">Widoczny dla gości przeglądających Twoje oferty. Dobry opis zwiększa zaufanie.</p>
            </div>
            <div className="px-6 py-5">
              <textarea
                className="host-input resize-none"
                rows={7}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Opisz siebie — co lubisz, czym się zajmujesz, dlaczego zostałeś gospodarzem..."
              />
              <div className="mt-2 flex justify-end">
                <span className={`text-[11px] tabular-nums ${bio.length > 7500 ? "font-medium text-orange-500" : "text-text-muted"}`}>
                  {bio.length} / 8000
                </span>
              </div>
            </div>
          </div>

          {/* Save */}
          <div className="flex items-center justify-between rounded-2xl border border-brand-border bg-white px-6 py-4 shadow-sm dark:bg-brand-surface">
            <p className="text-xs text-text-muted">Zmiany będą widoczne natychmiast po zapisaniu.</p>
            <button
              type="submit"
              disabled={saving}
              className="btn-primary flex min-w-[148px] items-center justify-center gap-2 px-6 py-2.5 text-sm disabled:opacity-70"
            >
              {saving ? (
                <>
                  <LoadingSpinner className="h-4 w-4 text-white" />
                  Zapisywanie…
                </>
              ) : (
                <>
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  Zapisz profil
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
