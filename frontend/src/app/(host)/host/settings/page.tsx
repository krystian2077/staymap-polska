"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import toast from "react-hot-toast";
import Link from "next/link";
import { clearAuthTokens } from "@/lib/authStorage";
import { api } from "@/lib/api";
import { useAuthStore } from "@/lib/store/authStore";
import { cn } from "@/lib/utils";

type SettingsSection = "account" | "notifications" | "privacy" | "templates";

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
    { id: "templates", label: "Szablony wiadomości", icon: "⚡" },
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
          <div className="host-card p-5">
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

          <div className="rounded-2xl border border-red-100 bg-red-50/50 p-5 dark:border-red-500/30 dark:bg-red-950/25">
            <h2 className="text-sm font-extrabold text-red-700">Strefa zagrożenia</h2>
            <p className="mt-1 text-xs text-red-600/80">Wylogowanie spowoduje utratę aktywnej sesji.</p>
            <button
              type="button"
              className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-xs font-bold text-white hover:bg-red-700"
              onClick={() => {
                logout();
                clearAuthTokens();
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
          <div className="host-card p-5">
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

      {section === "templates" && <MessageTemplatesSettings />}

      {section === "privacy" && (
        <div className="max-w-2xl space-y-4">
          <div className="host-card p-5">
            <h2 className="text-sm font-extrabold text-brand-dark">Prywatność i dane</h2>
            <div className="mt-4 space-y-4">
              <div className="host-card-muted px-4 py-3">
                <p className="text-sm font-medium text-brand-dark">Widoczność profilu</p>
                <p className="mt-0.5 text-xs text-text-muted">Twój profil gospodarza jest widoczny publicznie dla gości przeglądających oferty.</p>
              </div>
              <div className="host-card-muted px-4 py-3">
                <p className="text-sm font-medium text-brand-dark">Dane osobowe</p>
                <p className="mt-0.5 text-xs text-text-muted">Twoje dane kontaktowe (email, telefon) są udostępniane tylko gościom z potwierdzoną rezerwacją.</p>
              </div>
              <div className="host-card-muted px-4 py-3">
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

type TemplateRow = {
  id: string;
  title: string;
  body: string;
  sort_order: number;
  created_at?: string;
};

function MessageTemplatesSettings() {
  const [items, setItems] = useState<TemplateRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editBody, setEditBody] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.get<{ data: TemplateRow[] }>("/api/v1/host/message-templates/");
      setItems(Array.isArray(res.data) ? res.data : []);
    } catch {
      toast.error("Nie udało się wczytać szablonów.");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function addTemplate(e: FormEvent) {
    e.preventDefault();
    if (!title.trim() || !body.trim()) {
      toast.error("Uzupełnij tytuł i treść.");
      return;
    }
    try {
      await api.post("/api/v1/host/message-templates/", {
        title: title.trim(),
        body: body.trim(),
        sort_order: items.length,
      });
      setTitle("");
      setBody("");
      toast.success("Szablon zapisany.");
      void load();
    } catch {
      toast.error("Nie udało się dodać szablonu.");
    }
  }

  async function remove(id: string) {
    try {
      await api.delete(`/api/v1/host/message-templates/${id}/`);
      toast.success("Usunięto szablon.");
      if (editingId === id) {
        setEditingId(null);
      }
      void load();
    } catch {
      toast.error("Nie udało się usunąć.");
    }
  }

  function startEdit(t: TemplateRow) {
    setEditingId(t.id);
    setEditTitle(t.title);
    setEditBody(t.body);
  }

  function cancelEdit() {
    setEditingId(null);
  }

  async function saveEdit(e: FormEvent) {
    e.preventDefault();
    if (!editingId) return;
    if (!editTitle.trim() || !editBody.trim()) {
      toast.error("Uzupełnij tytuł i treść.");
      return;
    }
    setSavingEdit(true);
    try {
      await api.patch(`/api/v1/host/message-templates/${editingId}/`, {
        title: editTitle.trim(),
        body: editBody.trim(),
      });
      toast.success("Szablon zaktualizowany.");
      setEditingId(null);
      void load();
    } catch {
      toast.error("Nie udało się zapisać zmian.");
    } finally {
      setSavingEdit(false);
    }
  }

  return (
    <div className="max-w-2xl space-y-5">
      <div className="host-card p-5">
        <h2 className="text-sm font-extrabold text-brand-dark">Szablony szybkich odpowiedzi</h2>
        <p className="mt-1 text-xs text-text-muted">
          W czacie z gościem wybierasz „Szablony” — treść wstawia się do pola wiadomości. Dostajesz zestaw
          startowy (powitanie, szczegóły pobytu, dojazd, zasady, podziękowanie, brak terminu); możesz edytować
          poniżej, dodać własne lub usunąć niepotrzebne. Zmienne{" "}
          <code className="rounded bg-brand-surface px-1">{"{{guest_name}}"}</code> i{" "}
          <code className="rounded bg-brand-surface px-1">{"{{listing_title}}"}</code> podstawiają się przy
          wstawianiu.
        </p>

        <form onSubmit={addTemplate} className="mt-5 space-y-3">
          <div>
            <label className="text-xs font-semibold text-brand-dark">Tytuł</label>
            <input
              className="input mt-1 w-full rounded-xl text-sm"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="np. Powitanie"
              maxLength={100}
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-brand-dark">Treść</label>
            <textarea
              className="input mt-1 min-h-[100px] w-full resize-y rounded-xl text-sm"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder={
                "Dzień dobry {{guest_name}}, dziękuję za kontakt w sprawie „{{listing_title}}\"…"
              }
            />
          </div>
          <button type="submit" className="btn-primary text-xs">
            Dodaj szablon
          </button>
        </form>
      </div>

      <div className="rounded-2xl border border-brand-dark/[.06] bg-white p-5 dark:border-brand-border/50 dark:bg-[var(--bg2)]">
        <h3 className="text-xs font-extrabold uppercase tracking-wide text-text-muted">Twoje szablony</h3>
        {loading ? (
          <p className="mt-4 text-sm text-text-muted">Ładowanie…</p>
        ) : items.length === 0 ? (
          <p className="mt-4 text-sm text-text-muted">
            Brak szablonów — dodaj pierwszy powyżej. Jeśli właśnie utworzyłeś konto gospodarza, odśwież stronę;
            zestaw startowy powinien pojawić się automatycznie.
          </p>
        ) : (
          <ul className="mt-4 space-y-3">
            {items.map((t) => (
              <li
                key={t.id}
                className="rounded-xl border border-gray-100 bg-[#f8faf9] px-4 py-3 dark:border-brand-border/50 dark:bg-[var(--bg3)]"
              >
                {editingId === t.id ? (
                  <form onSubmit={saveEdit} className="space-y-3">
                    <div>
                      <label className="text-xs font-semibold text-brand-dark">Tytuł</label>
                      <input
                        className="input mt-1 w-full rounded-xl text-sm"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        maxLength={100}
                        disabled={savingEdit}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-brand-dark">Treść</label>
                      <textarea
                        className="input mt-1 min-h-[120px] w-full resize-y rounded-xl text-sm"
                        value={editBody}
                        onChange={(e) => setEditBody(e.target.value)}
                        disabled={savingEdit}
                      />
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="submit"
                        className="btn-primary text-xs"
                        disabled={savingEdit}
                      >
                        {savingEdit ? "Zapisywanie…" : "Zapisz zmiany"}
                      </button>
                      <button
                        type="button"
                        className="btn-secondary text-xs"
                        onClick={cancelEdit}
                        disabled={savingEdit}
                      >
                        Anuluj
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-brand-dark">{t.title}</p>
                      <p className="mt-1 whitespace-pre-wrap text-xs text-text-secondary">{t.body}</p>
                    </div>
                    <div className="flex shrink-0 flex-wrap gap-2 sm:pt-0.5">
                      <button
                        type="button"
                        onClick={() => startEdit(t)}
                        className="rounded-lg border border-brand-dark/15 bg-white px-2 py-1 text-[11px] font-bold text-brand-dark hover:bg-brand-surface dark:border-brand-border dark:bg-[var(--bg2)] dark:hover:bg-[var(--bg3)]"
                      >
                        Edytuj
                      </button>
                      <button
                        type="button"
                        onClick={() => void remove(t.id)}
                        className="rounded-lg border border-red-200 px-2 py-1 text-[11px] font-bold text-red-700 hover:bg-red-50 dark:border-red-500/30 dark:text-red-300 dark:hover:bg-red-900/30"
                      >
                        Usuń
                      </button>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
