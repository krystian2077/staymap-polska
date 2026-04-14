"use client";

import { cn } from "@/lib/utils";

export const TRAVEL_MODE_ITEMS = [
  { id: "romantic", emoji: "💑", label: "Romantyczny", desc: "Jacuzzi, sauna, prywatność" },
  { id: "family", emoji: "👨‍👩‍👧", label: "Rodzinny", desc: "Ogród, łóżeczko, min. 4 os." },
  { id: "pet", emoji: "🐕", label: "Z psem", desc: "Przyjazne zwierzętom" },
  { id: "workation", emoji: "💻", label: "Workation", desc: "Fast WiFi, biurko, cisza" },
  { id: "slow", emoji: "🌿", label: "Slow escape", desc: "Daleko od centrum, las" },
  { id: "outdoor", emoji: "🏕️", label: "Outdoor", desc: "Góry, szlaki, rowery" },
  { id: "lake", emoji: "🏊", label: "Jezioro", desc: "Dostęp do wody, kajaki" },
  { id: "mountains", emoji: "⛰️", label: "Góry", desc: "Szczyty, narty, kominek" },
  { id: "wellness", emoji: "🧖", label: "Wellness", desc: "Sauna, jacuzzi, relaks" },
] as const;

type Props = {
  selected: string | null;
  onChange: (mode: string | null) => void;
  variant: "home" | "search";
  id?: string;
  className?: string;
};

export function TravelModeSelector({ selected, onChange, variant, id, className }: Props) {
  if (variant === "home") {
    return (
      <div
        id={id}
        className={cn(
          "flex gap-2.5 overflow-x-auto pb-1.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
          className
        )}
      >
        {TRAVEL_MODE_ITEMS.map((m) => {
          const on = selected === m.id;
          return (
            <button
              key={m.id}
              type="button"
              title={m.desc}
              onClick={() => onChange(on ? null : m.id)}
              className={cn(
                "flex min-w-[96px] flex-col items-center gap-1.5 rounded-2xl border-[1.5px] px-5 py-3.5 transition-all duration-200",
                on
                  ? "border-brand bg-brand-muted text-brand-dark shadow-[0_4px_14px_rgba(22,163,74,.18)]"
                  : "border-gray-200 bg-white text-text-secondary hover:-translate-y-0.5 hover:border-brand hover:bg-brand-surface hover:text-brand-dark hover:shadow-[0_6px_16px_rgba(22,163,74,.13)]"
              )}
            >
              <span className="text-[26px] leading-none">{m.emoji}</span>
              <span className="text-center text-xs font-bold">{m.label}</span>
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex flex-1 gap-1.5 overflow-x-auto py-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        className
      )}
    >
      {TRAVEL_MODE_ITEMS.map((m) => {
        const on = selected === m.id;
        return (
          <button
            key={m.id}
            type="button"
            onClick={() => onChange(on ? null : m.id)}
            className={cn(
              "flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border-[1.5px] px-3 py-1.5 text-xs font-bold transition-all duration-200",
              on
                ? "border-brand bg-brand-muted text-brand-dark"
                : "border-gray-200 bg-white text-text-secondary hover:border-brand hover:bg-brand-surface hover:text-brand-dark"
            )}
          >
            <span className="text-[13px]">{m.emoji}</span>
            {m.label}
          </button>
        );
      })}
    </div>
  );
}
