import { HeroSearchBar } from "@/components/home/HeroSearchBar";

export function HeroSection() {
  return (
    <section className="relative flex min-h-[calc(100vh-72px)] items-center justify-center overflow-hidden bg-white px-6 pb-[100px] pt-[80px] text-center md:px-12">

      <div className="relative z-[5] w-full max-w-[960px]">
        <div className="mx-auto inline-flex animate-badge-pop items-center gap-2 rounded-pill border border-[#bbf7d0] bg-[#dcfce7] px-4 py-2 text-[12px] font-bold uppercase tracking-[.04em] text-[#166534]">
          <span className="h-[7px] w-[7px] animate-pulse-dot rounded-full bg-[#16a34a]" />
          Odkryj Polskę od nowa · 2 400+ ofert
        </div>

        <h1 className="a1 mb-[10px] mt-6 text-[clamp(52px,9vw,96px)] font-black leading-[.98] tracking-[-4px] text-[#0a2e1a]">
          <span className="hero-gradient-text">Znajdź nocleg</span>
          <span className="mt-2 block text-[clamp(24px,4vw,42px)] font-light tracking-[-1px] text-[#3d4f45]">
            w sercu polskiej natury
          </span>
        </h1>

        <p className="a2 mx-auto mb-14 mt-[22px] max-w-[520px] text-[18px] font-normal leading-[1.75] text-[#3d4f45]">
          Domki, glamping i apartamenty w najpiękniejszych miejscach.
          <br />
          Wyszukaj na mapie, zarezerwuj w chwilę.
        </p>

        <div className="a3">
          <HeroSearchBar />
        </div>

      </div>
    </section>
  );
}
