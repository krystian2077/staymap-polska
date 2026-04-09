"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import Link from "next/link";
import { useAuthStore } from "@/lib/store/authStore";
import { cn } from "@/lib/utils";

type SettingsSection = "account" | "notifications" | "privacy";

export default function HostSettingsPage() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const [section, setSection] = useState<SettingsSection>("account");
  const [notifBookings, setNotifBookings] = useState(true);
  const [notifMessages, setNotifMessages] = useState(true);
  const [notifReviews, setNotifReviews] = useState(true);
  const [notifMarketing, setNotifMarketing] = useState(false);

  const sections: { id: SettingsSection; label: string; icon: string }[] = [
    { id: "account", label: "Konto", icon: "👤" },
    { id: "notifications", label: "Powiadomienia", icon: "🔔" },
    { id: "privacy", label: "Prywatność", icon: "🔒" },
  ];

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-6">
        <h1 className="text-[22px] font-extrabold text-brand-dark">Ustawienia</h1>
        <p className="text-sm text-text-secondary">Zarządzaj kontem, powiadomieniami i prywatnością.</p>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-brand-dark/[.06] pb-3 mb-6">
        {sections.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setSection(s.id)}
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold transition-colors",
              section === s.id ? "bg-brand-muted text-brand-dark" : "text-text-secondary hover:bg-brand-surface/60"
            )}
          >
            <span>{s.icon}</span>
            {s.label}
          </button>
        ))}
      </div>

      {section === "account" && (
        <div className="max-w-2xl space-y-5">
          <div className="rounded-2xl bg-white p-5 shadow-card ring-1 ring-black/[.04]">
            <h2 className="text-sm font-extrabold text-brand-dark">Informacje o koncie</h2>
            <div className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-text-muted">Email</span>
                <span className="font-medium text-brand-dark">{user?.email ?? "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">Imię i nazwisko</span>
                <span className="font-medium text-brand-dark">{user?.first_name} {user?.last_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">Rola</span>
                <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800">
                  {user?.is_host ? "Gospodarz" : "Gość"}
                </span>
              </div>
            </div>
            <div className="mt-5 flex gap-3">
              <Link href="/host/profile" className="btn-secondary text-xs">
                Edytuj profil
              </Link>
            </div>
          </div>

          <div className="rounded-2xl border border-red-100 bg-red-50/50 p-5">
            <h2 className="text-sm font-extrabold text-red-700">Strefa zagrożenia</h2>
            <p className="mt-1 text-xs text-red-600/80">Wylogowanie spowoduje utratę aktywnej sesji.</p>
            <button
              type="button"
              className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-xs font-bold text-white hover:bg-red-700"
              onClick={() => {
                logout();
                document.cookie = "access_token=; path=/; max-age=0";
                window.location.href = "/";
              }}
            >
              Wyloguj się
            </button>
          </div>
        </div>
      )}

      {section === "notifications" && (
        <div className="max-w-2xl space-y-4">
          <div className="rounded-2xl bg-white p-5 shadow-card ring-1 ring-black/[.04]">
            <h2 className="text-sm font-extrabold text-brand-dark">Preferencje powiadomień</h2>
            <p className="mt-1 text-xs text-text-muted">Wybierz, o czym chcesz być informowany.</p>
            <div className="mt-5 space-y-4">
              {[
                { label: "Nowe rezerwacje", desc: "Powiadomienia o nowych prośbach o rezerwację.", value: notifBookings, set: setNotifBookings },
                { label: "Wiadomości od gości", desc: "Powiadomienia o nowych wiadomościach.", value: notifMessages, set: setNotifMessages },
                { label: "Recenzje", desc: "Powiadomienia o nowych opiniach gości.", value: notifReviews, set: setNotifReviews },
                { label: "Marketing", desc: "Porady i nowości od StayMap.", value: notifMarketing, set: setNotifMarketing },
              ].map((item) => (
                <label key={item.label} className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={item.value}
                    onChange={(e) => item.set(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-gray-300 text-brand accent-brand"
                  />
                  <div>
                    <p className="text-sm font-medium text-brand-dark">{item.label}</p>
                    <p className="text-xs text-text-muted">{item.desc}</p>
                  </div>
                </label>
              ))}
            </div>
            <button
              type="button"
              className="btn-primary mt-5 text-xs"
              onClick={() => toast.success("Preferencje zapisane.")}
            >
              Zapisz preferencje
            </button>
          </div>
        </div>
      )}

      {section === "privacy" && (
        <div className="max-w-2xl space-y-4">
          <div className="rounded-2xl bg-white p-5 shadow-card ring-1 ring-black/[.04]">
            <h2 className="text-sm font-extrabold text-brand-dark">Prywatność i dane</h2>
            <div className="mt-4 space-y-4">
              <div className="rounded-xl bg-[#f7f9f8] px-4 py-3">
                <p className="text-sm font-medium text-brand-dark">Widoczność profilu</p>
                <p className="mt-0.5 text-xs text-text-muted">Twój profil gospodarza jest widoczny publicznie dla gości przeglądających oferty.</p>
              </div>
              <div className="rounded-xl bg-[#f7f9f8] px-4 py-3">
                <p className="text-sm font-medium text-brand-dark">Dane osobowe</p>
                <p className="mt-0.5 text-xs text-text-muted">Twoje dane kontaktowe (email, telefon) są udostępniane tylko gościom z potwierdzoną rezerwacją.</p>
              </div>
              <div className="rounded-xl bg-[#f7f9f8] px-4 py-3">
                <p className="text-sm font-medium text-brand-dark">Eksport danych</p>
                <p className="mt-0.5 text-xs text-text-muted">Zgodnie z RODO możesz zażądać eksportu swoich danych.</p>
                <button type="button" className="btn-secondary mt-2 text-xs" onClick={() => toast.success("Żądanie eksportu zostało zarejestrowane.")}>
                  Zażądaj eksportu
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
