import Link from "next/link";

export function CtaSection() {
  return (
    <section
      aria-labelledby="guest-cta-heading"
      data-testid="home-guest-cta-section"
      className="px-6 py-20 max-[380px]:px-4 md:px-12 md:py-24"
    >
      <div className="mx-auto w-full max-w-[980px] text-center">
        <div className="group relative overflow-hidden rounded-[28px] border border-[#e4ebe7] bg-[linear-gradient(180deg,#ffffff_0%,#f8faf9_100%)] px-6 py-12 shadow-[0_16px_48px_rgba(10,15,13,.08)] transition-all duration-500 ease-[cubic-bezier(.16,1,.3,1)] hover:-translate-y-1 hover:shadow-[0_24px_64px_rgba(10,15,13,.12)] max-[380px]:px-4 max-[380px]:py-10 md:px-10 md:py-14 motion-reduce:transform-none motion-reduce:transition-none">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_520px_140px_at_12%_0%,rgba(22,163,74,.1),transparent_70%)] opacity-80 transition-opacity duration-500 group-hover:opacity-100" />
          <div className="inline-flex items-center gap-2 rounded-full border border-[#bbf7d0] bg-[#dcfce7] px-3 py-1.5 text-[11px] font-bold uppercase tracking-[.08em] text-[#166534]">
            Odkryj StayMap
          </div>
          <h2
            id="guest-cta-heading"
            className="mt-4 text-[clamp(26px,5.5vw,54px)] font-black tracking-[-.05em] text-[#0a2e1a]"
          >
            Zaplanuj kolejny wyjazd
          </h2>
          <p className="mx-auto mt-4 max-w-[640px] text-[15px] leading-8 text-[#3d4f45] md:text-[16px]">
            Wybierz idealne miejsce na weekend, workation albo rodzinny odpoczynek. Szybko porównaj
            oferty i rezerwuj bez ukrytych opłat.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-center">
            <Link
              href="/search"
              data-testid="home-guest-cta-primary"
              className="inline-flex w-full items-center justify-center rounded-[14px] bg-[#0a2e1a] px-6 py-3 text-sm font-bold text-white shadow-[0_10px_24px_rgba(10,46,26,.22)] transition-all duration-300 ease-[cubic-bezier(.16,1,.3,1)] hover:-translate-y-1 hover:bg-[#16a34a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#16a34a] focus-visible:ring-offset-2 focus-visible:ring-offset-white sm:w-auto"
            >
              Zacznij wyszukiwanie →
            </Link>
            <Link
              href="/ai"
              data-testid="home-guest-cta-secondary"
              className="inline-flex w-full items-center justify-center rounded-[14px] border border-[#e4ebe7] bg-white px-6 py-3 text-sm font-bold text-[#0a2e1a] transition-all duration-300 ease-[cubic-bezier(.16,1,.3,1)] hover:-translate-y-1 hover:border-[#bbf7d0] hover:bg-[#f0fdf4] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#16a34a] focus-visible:ring-offset-2 focus-visible:ring-offset-white sm:w-auto"
            >
              Wypróbuj AI Search
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

