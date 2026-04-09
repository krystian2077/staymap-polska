import { HeroSearchBar } from "@/components/home/HeroSearchBar";

const TRUST_ITEMS = [
  "2 400+ ofert w Polsce",
  "Bezpieczne płatności BLIK",
  "Bez ukrytych opłat",
  "Wsparcie 24/7",
];

export function HeroSection() {
  return (
    <section className="relative flex min-h-[calc(100vh-72px)] items-center justify-center overflow-hidden px-6 pb-[100px] pt-[80px] text-center md:px-12">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 1000px 600px at 50% -60px, rgba(22,163,74,.08), transparent), radial-gradient(ellipse 500px 500px at 5% 80%, rgba(22,163,74,.05), transparent), linear-gradient(180deg, #f7faf8 0%, #fff 60%)",
        }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute left-1/2 top-[-300px] h-[800px] w-[800px] -translate-x-1/2 animate-orb1 rounded-full opacity-60 blur-[100px] will-change-transform"
        style={{ background: "radial-gradient(circle, rgba(22,163,74,.14), transparent 70%)" }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute bottom-[-150px] right-[-100px] h-[600px] w-[600px] animate-orb2 rounded-full opacity-60 blur-[100px] will-change-transform"
        style={{ background: "radial-gradient(circle, rgba(74,222,128,.09), transparent 70%)" }}
        aria-hidden
      />

      <div className="relative z-[1] w-full max-w-[960px]">
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

        <div className="a5 mt-14 flex flex-wrap items-center justify-center gap-6 md:gap-9">
          {TRUST_ITEMS.map((item, index) => (
            <span key={item} className="flex items-center gap-2 text-[12px] font-medium text-[#7a8f84]">
              <span
                className="relative h-[7px] w-[7px] rounded-full bg-[#4ade80]"
                style={{ animationDelay: `${index * 0.4}s` }}
              >
                <span
                  className="absolute inset-0 rounded-full bg-[#4ade80]"
                  style={{ animation: `pulse 2.5s ${index * 0.4}s ease-in-out infinite` }}
                />
              </span>
              {item}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
