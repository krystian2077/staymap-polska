import Link from "next/link";

const LEGAL_LINKS = [
  { label: "Polityka prywatności", href: "/polityka-prywatnosci" },
  { label: "Regulamin", href: "/regulamin" },
  { label: "Pomoc", href: "/pomoc" },
  { label: "Kontakt", href: "/kontakt" },
  { label: "Kariera", href: "/kariera" },
];

const PRODUCT_LINKS = [
  { label: "Wyszukaj noclegi", href: "/search" },
  { label: "Discovery", href: "/discovery" },
  { label: "Ulubione", href: "/wishlist" },
  { label: "Porównywarka ofert", href: "/compare" },
  { label: "AI Search", href: "/ai" },
  { label: "Zostań gospodarzem", href: "/host/onboarding" },
];

export function Footer() {
  return (
    <footer
      aria-label="Stopka serwisu"
      data-testid="home-footer"
      className="relative overflow-hidden border-t border-[#e4ebe7] bg-[linear-gradient(180deg,#f6faf7_0%,#f8faf9_36%,#f8faf9_100%)] px-4 py-10 sm:px-6 sm:py-12 md:px-10 md:py-14 xl:px-12"
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(22,163,74,.28),transparent)]" />
      <div className="mx-auto w-full max-w-[1240px] rounded-[20px] border border-[#e4ebe7] bg-white/72 px-4 py-6 shadow-[0_10px_34px_rgba(10,15,13,.06)] backdrop-blur-md sm:rounded-[24px] sm:px-6 sm:py-7 md:px-8 md:py-8">
        <div className="grid gap-8 sm:gap-9 md:grid-cols-2 xl:grid-cols-[1.25fr_.85fr_.85fr]">
          <div>
            <Link
              href="/"
              className="inline-flex items-end leading-none transition-transform duration-300 ease-[cubic-bezier(.16,1,.3,1)] hover:translate-x-[2px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#16a34a] focus-visible:ring-offset-2 focus-visible:ring-offset-white motion-reduce:hover:translate-x-0"
            >
              <span className="text-[26px] font-black tracking-[-.9px] text-[#0a2e1a] sm:text-[30px]">StayMap</span>
              <span className="ml-0.5 text-[30px] leading-none text-[#16a34a] sm:text-[34px]">.</span>
            </Link>
            <p className="mt-4 max-w-[420px] text-[15px] leading-7 text-[#3d4f45] sm:text-[16px] sm:leading-8">
              Premium noclegi w Polsce - od Mazur i Bałtyku po Tatry, z wyszukiwaniem wspieranym
              AI i profesjonalnym wsparciem gospodarzy.
            </p>
            <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-[#bbf7d0] bg-[#f0fdf4] px-3 py-1.5 text-[11px] font-bold uppercase tracking-[.08em] text-[#166534]">
              Forest Premium Experience
            </div>
          </div>

          <div>
            <p className="text-[11px] font-extrabold uppercase tracking-[.14em] text-[#7a8f84]">Platforma</p>
            <nav className="mt-3 flex flex-col gap-2" aria-label="Linki platformy">
              {PRODUCT_LINKS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="group inline-flex w-fit items-center gap-2 rounded-[10px] px-2 py-1 text-[14px] font-semibold text-[#3d4f45] transition-all duration-300 ease-[cubic-bezier(.16,1,.3,1)] hover:-translate-y-0.5 hover:bg-[#f0fdf4] hover:text-[#0a2e1a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#16a34a] focus-visible:ring-offset-2 focus-visible:ring-offset-white motion-reduce:hover:translate-y-0"
                >
                  <span>{item.label}</span>
                  <span className="text-[#16a34a] opacity-0 transition-all duration-300 group-hover:translate-x-0.5 group-hover:opacity-100">
                    →
                  </span>
                </Link>
              ))}
            </nav>
          </div>

          <div>
            <p className="text-[11px] font-extrabold uppercase tracking-[.14em] text-[#7a8f84]">Informacje</p>
            <nav className="mt-3 flex flex-col gap-2" aria-label="Linki informacyjne">
              {LEGAL_LINKS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="group inline-flex w-fit items-center gap-2 rounded-[10px] px-2 py-1 text-[14px] font-semibold text-[#3d4f45] transition-all duration-300 ease-[cubic-bezier(.16,1,.3,1)] hover:-translate-y-0.5 hover:bg-[#f0fdf4] hover:text-[#0a2e1a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#16a34a] focus-visible:ring-offset-2 focus-visible:ring-offset-white motion-reduce:hover:translate-y-0"
                >
                  <span>{item.label}</span>
                  <span className="text-[#16a34a] opacity-0 transition-all duration-300 group-hover:translate-x-0.5 group-hover:opacity-100">
                    →
                  </span>
                </Link>
              ))}
            </nav>
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-3 border-t border-[#e4ebe7] pt-5 text-center text-xs text-[#7a8f84] sm:flex-row sm:items-center sm:justify-between sm:text-left">
          <p>© {new Date().getFullYear()} StayMap Polska. Krystian Potaczek. Wszystkie prawa zastrzeżone.</p>
        </div>
      </div>
    </footer>
  );
}

