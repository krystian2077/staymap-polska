"use client";

import { useAuthJsonGet } from "@/lib/hooks/useJsonGet";

type TemplateRow = { id: string; title: string; body: string };

/**
 * Siatka szablonów (równy układ) — klik wstawia treść do pola wiadomości.
 */
export function MessageTemplateDropdown({
  guestName,
  listingTitle,
  onApply,
}: {
  guestName?: string;
  listingTitle?: string;
  onApply: (text: string) => void;
}) {
  const { data, isLoading } = useAuthJsonGet<{ data: TemplateRow[] }>(
    "/api/v1/host/message-templates/"
  );
  const templates = data?.data ?? [];

  function applyTemplate(t: TemplateRow) {
    const text = t.body
      .replaceAll("{{guest_name}}", (guestName ?? "").trim() || "Gościu")
      .replaceAll("{{listing_title}}", (listingTitle ?? "").trim() || "");
    onApply(text);
  }

  return (
    <div className="w-full">
      <div className="mb-2.5 flex items-center justify-between gap-3">
        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-brand-dark/45">
          Szablony odpowiedzi
        </p>
        {isLoading ? (
          <span className="text-[11px] font-medium text-text-muted">Ładowanie…</span>
        ) : null}
      </div>

      {isLoading ? null : templates.length === 0 ? (
        <p className="rounded-xl border border-dashed border-brand-dark/15 bg-white/60 px-3 py-3 text-center text-[12px] leading-snug text-text-muted dark:bg-[var(--bg3)]/50">
          Brak szablonów — dodaj je w{" "}
          <span className="font-semibold text-brand-dark">Ustawienia → Szablony wiadomości</span>
        </p>
      ) : (
        <ul className="grid grid-cols-2 gap-2 md:grid-cols-3 md:gap-2.5">
          {templates.map((t) => (
            <li key={t.id} className="min-w-0">
              <button
                type="button"
                onClick={() => applyTemplate(t)}
                title={t.body.slice(0, 280)}
                className="flex min-h-[44px] w-full items-center justify-center rounded-xl border border-brand-dark/[.1] bg-white px-2 py-2 text-center text-[12px] font-semibold leading-snug text-brand-dark shadow-[0_1px_3px_rgba(15,23,42,0.06)] transition hover:border-brand/35 hover:bg-emerald-50/90 hover:shadow-md active:scale-[0.99] dark:border-brand-border dark:bg-[var(--bg2)] dark:hover:bg-[var(--bg3)]"
              >
                <span className="line-clamp-2">{t.title}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
