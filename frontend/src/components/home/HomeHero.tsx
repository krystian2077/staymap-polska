"use client";

import Link from "next/link";
import { HeroSearchBar } from "@/components/search/HeroSearchBar";

export function HomeHero() {
  return (
    <section className="relative overflow-hidden bg-[linear-gradient(175deg,#f0fdf4_0%,rgba(240,253,244,.45)_45%,#fff_100%)] px-8 pb-24 pt-[84px] text-center">
      <div
        className="pointer-events-none absolute left-1/2 top-[-200px] h-[700px] w-[700px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(22,163,74,.07)_0%,transparent_70%)]"
        aria-hidden
      />
      <div
        className="animate-fade-up relative mx-auto inline-flex items-center gap-2 rounded-full border border-brand-border bg-brand-muted px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-green-800"
        style={{ animationDelay: "0ms" }}
      >
        <svg className="h-4 w-4 text-green-800" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
          />
        </svg>
        Odkryj Polskę od nowa
      </div>
      <h1
        className="animate-fade-up relative mx-auto mt-6 max-w-4xl text-[clamp(40px,6.5vw,66px)] font-extrabold leading-[1.06] tracking-[-2.5px] text-brand-dark"
        style={{ animationDelay: "120ms" }}
      >
        Znajdź nocleg
        <br />
        w sercu <em className="not-italic text-brand">natury</em>
      </h1>
      <p
        className="animate-fade-up relative mx-auto mt-5 max-w-[490px] text-[17px] font-normal leading-relaxed text-text-secondary"
        style={{ animationDelay: "240ms" }}
      >
        Domki, glamping i apartamenty w najpiękniejszych miejscach Polski. Wyszukaj na mapie, zarezerwuj w
        chwilę.
      </p>
      <div className="animate-fade-up relative mt-10" style={{ animationDelay: "360ms" }}>
        <HeroSearchBar variant="hero" />
      </div>
      <div
        className="animate-fade-up relative mt-10 flex flex-wrap items-center justify-center gap-8 text-sm font-medium text-gray-400"
        style={{ animationDelay: "480ms" }}
      >
        {["200+ ofert", "Bezpieczne płatności BLIK", "Bez ukrytych opłat", "Wsparcie 24/7"].map(
          (t) => (
            <span key={t} className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-300 opacity-60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-green-400" />
              </span>
              {t}
            </span>
          )
        )}
      </div>
      <p className="mt-6 text-xs text-text-muted">
        <Link href="/search" className="font-semibold text-brand hover:underline">
          Pełna wyszukiwarka z mapą
        </Link>
      </p>
    </section>
  );
}
