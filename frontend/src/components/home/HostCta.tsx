import Link from "next/link";

export function HostCta() {
  return (
    <section
      aria-labelledby="host-cta-heading"
      data-testid="home-host-cta-section"
      className="px-4 pb-0 pt-0 sm:px-6 md:px-12"
    >
      <div className="mx-auto max-w-[1240px]">
        <div className="group relative overflow-hidden rounded-[32px] border border-[#14532d] bg-[linear-gradient(135deg,#052e16_0%,#0a2e1a_45%,#14532d_100%)] px-5 py-9 shadow-[0_24px_70px_rgba(10,46,26,.22)] transition-all duration-500 ease-[cubic-bezier(.16,1,.3,1)] hover:-translate-y-1 hover:shadow-[0_32px_90px_rgba(10,46,26,.3)] sm:px-6 sm:py-10 md:px-10 md:py-12 motion-reduce:transform-none motion-reduce:transition-none">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_760px_220px_at_18%_0%,rgba(74,222,128,.24),transparent_70%),radial-gradient(ellipse_480px_240px_at_100%_100%,rgba(22,163,74,.18),transparent_72%),linear-gradient(180deg,rgba(255,255,255,.04),transparent)] transition-opacity duration-500 group-hover:opacity-90" />
          <div className="pointer-events-none absolute -left-20 top-8 h-52 w-52 rounded-full bg-[#22c55e]/10 blur-[90px] transition-transform duration-700 ease-[cubic-bezier(.16,1,.3,1)] group-hover:translate-x-8 group-hover:-translate-y-2" />
          <div className="pointer-events-none absolute -right-16 bottom-0 h-64 w-64 rounded-full bg-[#4ade80]/10 blur-[100px] transition-transform duration-700 ease-[cubic-bezier(.16,1,.3,1)] group-hover:-translate-x-8 group-hover:-translate-y-2" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[1px] bg-white/10" />
          <div className="relative grid gap-8 lg:grid-cols-[1.15fr_.85fr] lg:items-center">
            <div className="max-w-[640px]">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/8 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[.08em] text-[#bbf7d0] backdrop-blur-md transition-all duration-300 group-hover:border-white/15 group-hover:bg-white/10">
                Dla gospodarzy
              </div>
              <h2
                id="host-cta-heading"
                className="mt-4 text-[clamp(26px,5vw,52px)] font-black tracking-[-.05em] text-white transition-transform duration-500 ease-[cubic-bezier(.16,1,.3,1)] group-hover:translate-x-[2px]"
              >
                Zostań gospodarzem i zarabiaj na swoim miejscu
              </h2>
              <p className="mt-4 max-w-[560px] text-[15px] leading-8 text-white/70 transition-colors duration-300 group-hover:text-white/78 md:text-[16px]">
                Dodaj domek, apartament albo glamping do StayMap. Pokaż ofertę gościom, którzy
                szukają wypoczynku w Polsce, i obsługuj rezerwacje z poziomu panelu gospodarza.
              </p>

              <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <Link
                  href="/host/onboarding"
                  data-testid="home-host-cta-primary"
                  className="inline-flex w-full items-center justify-center rounded-[14px] bg-[#16a34a] px-5 py-3 text-sm font-bold text-white shadow-[0_10px_24px_rgba(22,163,74,.28)] transition-all duration-300 ease-[cubic-bezier(.16,1,.3,1)] hover:-translate-y-1 hover:bg-[#22c55e] hover:shadow-[0_14px_30px_rgba(22,163,74,.35)] hover:brightness-105 active:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4ade80] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a2e1a] sm:w-auto"
                >
                  Zostań gospodarzem →
                </Link>
                <Link
                  href="/host"
                  className="inline-flex w-full items-center justify-center rounded-[14px] border border-white/12 bg-white/8 px-5 py-3 text-sm font-bold text-white transition-all duration-300 ease-[cubic-bezier(.16,1,.3,1)] hover:-translate-y-1 hover:border-white/20 hover:bg-white/12 hover:shadow-[0_10px_22px_rgba(0,0,0,.16)] active:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4ade80] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a2e1a] sm:w-auto"
                >
                  Zobacz panel gospodarza
                </Link>
              </div>

              <div className="mt-7 flex flex-wrap gap-x-6 gap-y-3 text-sm text-white/55">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-[#16a34a]" />
                  Bezpieczna aktywacja profilu
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-[#4ade80]" />
                  Panel z rezerwacjami i kalendarzem
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-[#22c55e]" />
                  Publikacja ofert krok po kroku
                </div>
              </div>
            </div>

            <div className="relative rounded-[24px] border border-white/10 bg-white/8 p-5 shadow-[0_16px_42px_rgba(0,0,0,.18)] backdrop-blur-xl transition-all duration-500 ease-[cubic-bezier(.16,1,.3,1)] group-hover:translate-y-[-2px] group-hover:border-white/15 group-hover:bg-white/10 group-hover:shadow-[0_22px_56px_rgba(0,0,0,.22)]">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-extrabold uppercase tracking-[.12em] text-white/55">
                  Szybki start
                </p>
                <span className="rounded-full bg-[#dcfce7] px-3 py-1 text-[11px] font-bold text-[#166534]">
                  3 kroki
                </span>
              </div>
              <div className="mt-5 space-y-3">
                {[
                  ["1", "Aktywuj profil gospodarza", "Przejdź onboarding i potwierdź konto."],
                  ["2", "Dodaj swoją pierwszą ofertę", "Uzupełnij opis, ceny i zdjęcia."],
                  ["3", "Odbieraj rezerwacje", "Zarządzaj kalendarzem i wiadomościami."],
                ].map(([step, title, desc]) => (
                  <div
                    key={step}
                    className="flex gap-4 rounded-[18px] border border-white/10 bg-white/8 p-4 transition-all duration-300 ease-[cubic-bezier(.16,1,.3,1)] hover:-translate-y-0.5 hover:border-white/18 hover:bg-white/12 hover:shadow-[0_10px_24px_rgba(0,0,0,.12)] motion-reduce:hover:translate-y-0"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-[#dcfce7] text-sm font-black text-[#0a2e1a] transition-transform duration-300 ease-[cubic-bezier(.16,1,.3,1)] group-hover:scale-105">
                      {step}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white">{title}</p>
                      <p className="mt-1 text-[13px] leading-6 text-white/60">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

