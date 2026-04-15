"use client";

import { useEffect, useState } from "react";
import { applyTheme, type Theme } from "@/lib/theme";
import { cn } from "@/lib/utils";

type Props = {
  className?: string;
};

export function ThemeToggle({ className }: Props) {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
  }, []);

  const toggle = () => {
    const next: Theme = dark ? "light" : "dark";
    applyTheme(next);
    setDark(next === "dark");
  };

  return (
    <button
      type="button"
      onClick={toggle}
      className={cn(
        "inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#e4ebe7] bg-white text-lg shadow-md transition-all duration-300 hover:border-[#16a34a]/30 hover:shadow-lg active:scale-95",
        "dark:border-brand-border dark:bg-[var(--bg3)] dark:text-[var(--foreground)] dark:hover:border-brand/40",
        className
      )}
      aria-label={dark ? "Przełącz na jasny motyw" : "Przełącz na ciemny motyw"}
      aria-pressed={dark}
    >
      {dark ? "☀️" : "🌙"}
    </button>
  );
}
