const ITEMS = [
  "⛰️ Zakopane",
  "🏊 Mazury",
  "🌲 Bieszczady",
  "🌊 Bałtyk",
  "🏞️ Pieniny",
  "🧭 Karkonosze",
  "🏕️ Bory Tucholskie",
  "🗻 Beskid Sądecki",
  "🌅 Roztocze",
  "🏖️ Hel i Półwysep",
  "🚣 Suwalszczyzna",
  "🌳 Puszcza Białowieska",
  "🧖 Sauna & Wellness",
  "🫧 Jacuzzi pod gwiazdami",
  "💑 Romantyczne weekendy",
  "🐕 Przyjazne zwierzętom",
  "💻 Workation",
  "⚡ Last minute",
  "🌿 Slow escape",
  "🍷 Winne weekendy",
  "🍽️ Kulinarne wypady",
  "🧘 Reset & mindfulness",
  "🚴 Trasy rowerowe",
  "🏡 Domki premium",
  "🏔️ Szklarska Poręba",
  "🎿 Narty zimą",
  "🛶 Kajaki",
  "🔥 Kominek",
  "⛺ Glamping",
  "🌌 Noc pod gwiazdami",
  "👨‍👩‍👧‍👦 Rodzinne ferie",
];

export function MarqueeTicker() {
  const stream = [...ITEMS, ...ITEMS];

  return (
    <section className="relative overflow-hidden border-y border-[#d7e7dd] bg-[linear-gradient(180deg,#fcfffd_0%,#f3faf6_48%,#f7fcf9_100%)] py-[22px] sm:py-[26px]">
      <div className="pointer-events-none absolute -left-24 top-1/2 h-44 w-72 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(74,222,128,.25)_0%,rgba(74,222,128,.06)_45%,transparent_75%)] blur-2xl animate-orb1" />
      <div className="pointer-events-none absolute -right-24 top-1/2 h-44 w-72 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(22,163,74,.18)_0%,rgba(22,163,74,.05)_45%,transparent_78%)] blur-2xl animate-orb2" />
      <div className="pointer-events-none absolute inset-0 opacity-[0.14] [background:linear-gradient(120deg,rgba(255,255,255,.65)_0%,rgba(255,255,255,0)_30%,rgba(255,255,255,.45)_60%,rgba(255,255,255,0)_100%)]" />

      <div className="pointer-events-none absolute inset-y-0 left-0 z-20 w-24 bg-gradient-to-r from-[#f7fcf9] via-[#f7fcf9]/90 to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-20 w-24 bg-gradient-to-l from-[#f7fcf9] via-[#f7fcf9]/90 to-transparent" />

      <div className="relative z-10 flex w-max items-center gap-4 whitespace-nowrap animate-marquee [animation-duration:50s] hover:[animation-play-state:paused] sm:gap-5">
        {stream.map((item, idx) => (
          <span
            key={`${item}-${idx}`}
            className="group inline-flex rounded-full bg-[linear-gradient(130deg,rgba(255,255,255,.88)_0%,rgba(187,247,208,.65)_45%,rgba(255,255,255,.92)_100%)] p-[1.5px] shadow-[0_12px_30px_rgba(15,87,48,.14)] transition-all duration-300 hover:-translate-y-[2px] hover:shadow-[0_18px_34px_rgba(15,87,48,.2)]"
            style={{ animationDelay: `${(idx % ITEMS.length) * 90}ms` }}
          >
            <span className="inline-flex min-h-[52px] select-none items-center gap-3 rounded-full border border-white/70 bg-[linear-gradient(122deg,rgba(255,255,255,.9)_0%,rgba(241,252,246,.96)_42%,rgba(255,255,255,.9)_100%)] px-6 text-[16px] font-extrabold tracking-[0.012em] text-[#254736] [background-size:220%_100%] [animation:shimmer_9s_linear_infinite] transition-all duration-300 group-hover:border-[#98ddb3] group-hover:text-[#103922]">
              <span
                className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-[#c9e9d7] bg-[radial-gradient(circle_at_30%_30%,#ffffff_0%,#ebf9f1_48%,#def4e8_100%)] text-[12px] text-[#16934b] shadow-[inset_0_1px_0_rgba(255,255,255,.9),0_4px_10px_rgba(22,163,74,.15)] [animation:float-heart_4.2s_ease-in-out_infinite]"
                style={{ animationDelay: `${(idx % ITEMS.length) * 130}ms` }}
              >
                ✦
              </span>
              {item}
            </span>
          </span>
        ))}
      </div>
    </section>
  );
}
