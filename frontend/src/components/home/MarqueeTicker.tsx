const ITEMS = [
  "⛰️ Zakopane",
  "🏊 Mazury",
  "🌲 Bieszczady",
  "🌊 Bałtyk",
  "🧖 Sauna & Wellness",
  "💑 Romantyczne weekendy",
  "🐕 Przyjazne zwierzętom",
  "💻 Workation",
  "⚡ Last minute",
  "🌿 Slow escape",
  "🏔️ Szklarska Poręba",
  "🎿 Narty zimą",
  "🛶 Kajaki",
  "🔥 Kominek",
  "⛺ Glamping",
];

export function MarqueeTicker() {
  const stream = [...ITEMS, ...ITEMS];

  return (
    <section className="overflow-hidden border-y border-[#e4ebe7] bg-[#f8faf9] py-[13px]">
      <div className="flex w-max gap-[52px] whitespace-nowrap animate-marquee hover:[animation-play-state:paused]">
        {stream.map((item, idx) => (
          <span key={`${item}-${idx}`} className="inline-flex items-center gap-2 text-[12px] font-semibold text-[#7a8f84]">
            <span className="text-[#16a34a]">✦</span>
            {item}
          </span>
        ))}
      </div>
    </section>
  );
}
