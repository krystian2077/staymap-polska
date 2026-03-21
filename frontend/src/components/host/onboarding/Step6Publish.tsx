"use client";

import Link from "next/link";

import type { ListingDraft } from "@/types/host";
import { cn } from "@/lib/utils";

type Props = {
  draft: ListingDraft;
  profileBioLen: number;
  hasAvatar: boolean;
  canSubmit: boolean;
};

export function Step6Publish({ draft, profileBioLen, hasAvatar, canSubmit }: Props) {
  const items = [
    {
      ok: profileBioLen > 20 && hasAvatar,
      warn: false,
      title: "Profil hosta",
      desc: "Bio + avatar",
      href: "#",
    },
    {
      ok: draft.title.length > 10 && draft.description.length > 50,
      warn: false,
      title: "Opis oferty",
      desc: "Tytuł i opis",
      href: "#",
    },
    {
      ok: Boolean(draft.location.latitude && draft.location.longitude),
      warn: false,
      title: "Lokalizacja",
      desc: "Współrzędne na mapie",
      href: "#",
    },
    {
      ok: draft.images.length >= 5,
      warn: false,
      title: `Zdjęcia (${draft.images.length}/5)`,
      desc: "Minimum 5 zdjęć",
      href: "#",
    },
    {
      ok: draft.base_price > 0,
      warn: false,
      title: "Ceny",
      desc: "Cena za noc",
      href: "#",
    },
    {
      ok: draft.amenity_ids.length >= 5,
      warn: draft.amenity_ids.length > 0 && draft.amenity_ids.length < 5,
      title: "Udogodnienia (opcjonalnie)",
      desc: "Warto dodać minimum 5 dla lepszej widoczności",
      href: "/host/new-listing",
    },
  ];

  return (
    <div>
      <h2 className="text-[22px] font-extrabold text-brand-dark">🚀 Publikacja</h2>
      <p className="mt-1 text-sm text-text-muted">Sprawdź listę i wyślij ofertę do moderacji.</p>

      <ul className="mt-6 flex flex-col gap-2.5">
        {items.map((it) => {
          const state = it.ok ? "ok" : it.warn ? "warn" : "todo";
          return (
            <li
              key={it.title}
              className={cn(
                "flex items-center gap-3 rounded-xl border px-3.5 py-3 text-sm",
                state === "ok" && "border-brand-border bg-brand-surface",
                state === "warn" && "border-amber-200 bg-amber-50",
                state === "todo" && "border-[#e5e7eb] bg-[#f9fafb]"
              )}
            >
              <span
                className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold",
                  state === "ok" && "bg-brand text-white",
                  state === "warn" && "bg-amber-500 text-white",
                  state === "todo" && "bg-[#e5e7eb] text-text-muted"
                )}
              >
                {state === "ok" ? "✓" : state === "warn" ? "⚠" : "○"}
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-bold text-brand-dark">{it.title}</p>
                <p
                  className={cn(
                    "text-xs",
                    state === "ok" && "text-green-800",
                    state === "warn" && "text-amber-900",
                    state === "todo" && "text-text-muted"
                  )}
                >
                  {it.desc}
                </p>
              </div>
              {!it.ok && state === "todo" ? (
                <Link href={it.href} className="shrink-0 text-xs font-bold text-brand">
                  Uzupełnij →
                </Link>
              ) : null}
            </li>
          );
        })}
      </ul>

      <div className="mt-6 rounded-[14px] bg-brand-dark p-5 text-center">
        <p className="text-xl font-extrabold text-white">Wyślij do moderacji 🚀</p>
        <p className="mt-1.5 text-[13px] text-white/65">
          Sprawdzimy w ciągu 24h i dostaniesz e-mail.
        </p>
        {!canSubmit ? (
          <p className="mt-3 text-xs text-amber-200">Uzupełnij brakujące pola — przycisk jest na dole strony.</p>
        ) : null}
      </div>
    </div>
  );
}
