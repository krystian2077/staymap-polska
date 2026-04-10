import Link from "next/link";

const AI_RESULTS = [
  {
    emoji: "🏔️",
    title: "Domek z sauną i jacuzzi na polanie",
    reasons: "Sauna ✓ · Widok ✓ · Prywatność ✓",
    match: "98% dopasowania",
    price: "320 zł / noc",
  },
  {
    emoji: "🏡",
    title: "Chata bieszczadzka z sauną fińską",
    reasons: "Cisza ✓ · Kominek ✓ · Szybki dojazd",
    match: "94% dopasowania",
    price: "360 zł / noc",
  },
  {
    emoji: "🧖",
    title: "Willa SPA z hot tubem i tarasem",
    reasons: "Wellness ✓ · Rodzina ✓ · Las",
    match: "91% dopasowania",
    price: "520 zł / noc",
  },
];

export function AiSection() {
  return (
    <section
      aria-labelledby="ai-section-heading"
      data-testid="home-ai-section"
      className="relative overflow-hidden px-6 py-20 max-[380px]:px-4 md:px-12 md:py-24"
    >
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(140deg,#0a2e1a_0%,#0f3320_55%,#0a2e1a_100%)]" />
      <div className="pointer-events-none absolute -left-28 top-10 h-72 w-72 rounded-full bg-[#16a34a]/20 blur-[110px]" />
      <div className="pointer-events-none absolute -right-24 bottom-0 h-72 w-72 rounded-full bg-[#7c3aed]/20 blur-[110px]" />

      <div className="relative mx-auto grid w-full max-w-[1100px] gap-10 lg:grid-cols-[1.05fr_.95fr] lg:items-center">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[.08em] text-[#bbf7d0]">
            AI Search
          </div>
          <h2
            id="ai-section-heading"
            className="mt-4 text-[clamp(26px,5vw,54px)] font-black tracking-[-.05em] text-white"
          >
            Opowiedz czego szukasz,
            <span className="bg-[linear-gradient(90deg,#a78bfa_0%,#34d399_100%)] bg-clip-text text-transparent">
              {" "}
              a AI znajdzie najlepsze miejsca
            </span>
          </h2>
          <p className="mt-5 max-w-[580px] text-[15px] leading-8 text-white/70 md:text-[16px]">
            Nie musisz ustawiać filtra po filtrze. Napisz naturalnie, czego potrzebujesz, a system
            dopasuje oferty i wyjaśni, dlaczego pasują do Twojego stylu podróży.
          </p>

          <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Link
              href="/ai"
              data-testid="home-ai-cta-primary"
              className="inline-flex w-full items-center justify-center rounded-[14px] bg-[#7c3aed] px-5 py-3 text-sm font-bold text-white shadow-[0_10px_24px_rgba(124,58,237,.35)] transition-all duration-300 ease-[cubic-bezier(.16,1,.3,1)] hover:-translate-y-1 hover:bg-[#6d28d9] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#a78bfa] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a2e1a] sm:w-auto"
            >
              Wypróbuj AI Search →
            </Link>
            <Link
              href="/search"
              data-testid="home-ai-cta-secondary"
              className="inline-flex w-full items-center justify-center rounded-[14px] border border-white/14 bg-white/10 px-5 py-3 text-sm font-bold text-white transition-all duration-300 ease-[cubic-bezier(.16,1,.3,1)] hover:-translate-y-1 hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4ade80] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a2e1a] sm:w-auto"
            >
              Zobacz klasyczne wyszukiwanie
            </Link>
          </div>
        </div>

        <div className="rounded-[24px] border border-white/10 bg-white/8 p-5 shadow-[0_22px_58px_rgba(0,0,0,.24)] backdrop-blur-xl">
          <div className="mb-4 rounded-[14px] border border-white/12 bg-white/10 px-4 py-3 text-[14px] font-medium text-white/80">
            &bdquo;Szukam spokojnego domku z sauną dla dwojga, blisko lasu, najlepiej w górach&rdquo;
          </div>
          <div className="mb-4 flex items-center gap-2 text-[12px] text-white/50">
            <span className="h-2 w-2 animate-pulse rounded-full bg-[#a78bfa] motion-reduce:animate-none" />
            Analizuję 2 400+ ofert...
          </div>

          <div className="space-y-3">
            {AI_RESULTS.map((result) => (
              <div
                key={result.title}
                className="flex items-start gap-3 rounded-[14px] border border-white/10 bg-white/10 p-3 transition-all duration-300 ease-[cubic-bezier(.16,1,.3,1)] hover:translate-x-1.5 hover:bg-white/15 sm:items-center motion-reduce:hover:translate-x-0"
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[10px] bg-white/12 text-xl">
                  {result.emoji}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-bold text-white">{result.title}</p>
                  <p className="mt-0.5 truncate text-[11px] text-white/55">{result.reasons}</p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="rounded-full bg-[#7c3aed]/30 px-2 py-0.5 text-[10px] font-bold text-[#c4b5fd]">
                    {result.match}
                  </p>
                  <p className="mt-1 text-[12px] font-bold text-[#4ade80]">{result.price}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}


