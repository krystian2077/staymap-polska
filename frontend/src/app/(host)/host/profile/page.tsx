"use client";

import { useCallback, useEffect, useState } from "react";
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

export default function HostProfilePage() {
  const setProfile = useHostStore((s) => s.setProfile);
  const [data, setData] = useState<ProfileData | null>(null);
  const [saving, setSaving] = useState(false);

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
      const avatarInput = (document.getElementById("host-avatar") as HTMLInputElement | null)?.files?.[0];
      if (avatarInput) fd.append("avatar", avatarInput);

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

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-6">
        <p className="text-xs font-bold uppercase tracking-widest text-brand">Konto</p>
        <h1 className="mt-1 text-[22px] font-extrabold text-brand-dark">Mój profil</h1>
        <p className="mt-1 text-sm text-text-secondary">{data.email}</p>
      </div>

      <form onSubmit={(e) => void handleSave(e)} className="max-w-2xl space-y-6">
        <section className="rounded-2xl bg-white p-6 shadow-card ring-1 ring-black/[.04]">
          <h2 className="text-base font-extrabold text-brand-dark">Zdjęcie profilowe</h2>
          <div className="mt-4 flex items-center gap-5">
            {data.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={data.avatar_url} alt="" className="h-20 w-20 rounded-full border-2 border-brand-dark/[.06] object-cover shadow-sm" />
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-brand-muted text-2xl font-bold text-brand-dark">
                {(data.first_name[0] ?? "?").toUpperCase()}
              </div>
            )}
            <div>
              <label htmlFor="host-avatar" className="btn-secondary cursor-pointer text-xs">
                Zmień zdjęcie
              </label>
              <input id="host-avatar" type="file" accept="image/jpeg,image/png,image/webp" className="hidden" />
              <p className="mt-1 text-[10px] text-text-muted">JPG, PNG lub WebP. Maks. 5 MB.</p>
            </div>
          </div>
        </section>

        <section className="rounded-2xl bg-white p-6 shadow-card ring-1 ring-black/[.04]">
          <h2 className="text-base font-extrabold text-brand-dark">Dane osobowe</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-xs font-semibold text-text-secondary">Imię</label>
              <input className="mt-1 w-full rounded-xl border-0 bg-[#f7f9f8] px-3 py-2.5 text-sm ring-1 ring-black/[.06] focus:ring-2 focus:ring-brand" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-semibold text-text-secondary">Nazwisko</label>
              <input className="mt-1 w-full rounded-xl border-0 bg-[#f7f9f8] px-3 py-2.5 text-sm ring-1 ring-black/[.06] focus:ring-2 focus:ring-brand" value={lastName} onChange={(e) => setLastName(e.target.value)} />
            </div>
          </div>
          <div className="mt-4">
            <label className="text-xs font-semibold text-text-secondary">Telefon</label>
            <input className="mt-1 w-full rounded-xl border-0 bg-[#f7f9f8] px-3 py-2.5 text-sm ring-1 ring-black/[.06] focus:ring-2 focus:ring-brand" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+48 000 000 000" />
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-xs font-semibold text-text-secondary">Język</label>
              <select className="mt-1 w-full rounded-xl border-0 bg-[#f7f9f8] px-3 py-2.5 text-sm ring-1 ring-black/[.06] focus:ring-2 focus:ring-brand" value={preferredLanguage} onChange={(e) => setPreferredLanguage(e.target.value)}>
                <option value="pl">Polski</option>
                <option value="en">English</option>
                <option value="de">Deutsch</option>
                <option value="uk">Українська</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-text-secondary">Kraj</label>
              <select className="mt-1 w-full rounded-xl border-0 bg-[#f7f9f8] px-3 py-2.5 text-sm ring-1 ring-black/[.06] focus:ring-2 focus:ring-brand" value={country} onChange={(e) => setCountry(e.target.value)}>
                <option value="">Wybierz...</option>
                <option value="PL">Polska</option>
                <option value="DE">Niemcy</option>
                <option value="CZ">Czechy</option>
                <option value="SK">Słowacja</option>
                <option value="UA">Ukraina</option>
                <option value="GB">Wielka Brytania</option>
              </select>
            </div>
          </div>
        </section>

        <section className="rounded-2xl bg-white p-6 shadow-card ring-1 ring-black/[.04]">
          <h2 className="text-base font-extrabold text-brand-dark">O mnie</h2>
          <p className="mt-1 text-xs text-text-muted">Opisz siebie — co lubisz, czym się zajmujesz, dlaczego zostałeś gospodarzem.</p>
          <textarea
            className="mt-3 w-full rounded-xl border-0 bg-[#f7f9f8] px-3 py-2.5 text-sm ring-1 ring-black/[.06] focus:ring-2 focus:ring-brand"
            rows={5}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Napisz kilka słów o sobie i swojej ofercie..."
          />
          <p className="mt-1 text-[10px] text-text-muted">{bio.length}/8000 znaków</p>
        </section>

        <div className="flex gap-3">
          <button type="submit" disabled={saving} className="btn-primary px-6 py-2.5">
            {saving ? "Zapisywanie…" : "Zapisz profil"}
          </button>
        </div>
      </form>
    </div>
  );
}
