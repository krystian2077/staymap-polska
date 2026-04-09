import Link from "next/link";

type RegionCountMap = Partial<Record<"zakopane" | "mazury" | "bieszczady" | "baltyk" | "szklarska", number>>;

type RegionTile = {
  key: keyof RegionCountMap;
  title: string;
  emoji: string;
  bg: string;
  href: string;
  large?: boolean;
  tag?: string;
  fallbackCount: number;
  priceLabel?: string;
};

const TILES: RegionTile[] = [
  {
    key: "zakopane",
    title: "Zakopane & Tatry",
    emoji: "🏔️",
    bg: "linear-gradient(145deg,#c5d8d2,#adc4bc)",
    href: "/search?location=Zakopane",
    large: true,
    tag: "NAJPOPULARNIEJSZY",
    fallbackCount: 847,
    priceLabel: "od 180 zl/noc",
  },
  {
    key: "mazury",
    title: "Mazury",
    emoji: "🏊",
    bg: "linear-gradient(145deg,#b8cfd8,#a0bec8)",
    href: "/search?location=Mazury",
    fallbackCount: 523,
  },
  {
    key: "bieszczady",
    title: "Bieszczady",
    emoji: "🌲",
    bg: "linear-gradient(145deg,#c2d0bc,#b0c2a8)",
    href: "/search?location=Bieszczady",
    fallbackCount: 312,
  },
  {
    key: "baltyk",
    title: "Baltyk",
    emoji: "🌊",
    bg: "linear-gradient(145deg,#bacad2,#a2b8c2)",
    href: "/search?location=Baltyk",
    fallbackCount: 428,
  },
  {
    key: "szklarska",
    title: "Szklarska Poreba",
    emoji: "⛷️",
    bg: "linear-gradient(145deg,#ccc4bc,#bab2a8)",
    href: "/search?location=Szklarska%20Poreba",
    fallbackCount: 218,
  },
];

export function RegionsGrid({ counts }: { counts: RegionCountMap }) {
  return (
    <section className="mx-auto w-full max-w-[1240px] px-6 py-20 md:px-12">
      <div className="mb-6">
        <h2 className="text-[30px] font-black tracking-[-.8px] text-[#0a2e1a]">Odkryj regiony</h2>
        <p className="mt-2 text-[14px] text-[#7a8f84]">Najpiekniejsze zakatki Polski</p>
      </div>

      <div className="grid gap-3 overflow-hidden rounded-[22px] md:grid-cols-[2fr_1fr_1fr] md:grid-rows-[255px_255px]">
        {TILES.map((tile) => {
          const count = counts[tile.key] ?? tile.fallbackCount;
          return (
            <Link
              key={tile.key}
              href={tile.href}
              className={tile.large ? "group relative min-h-[280px] overflow-hidden md:row-span-2" : "group relative min-h-[190px] overflow-hidden"}
            >
              <div
                className="absolute inset-0 flex items-center justify-center text-[70px] transition-transform duration-500 ease-[cubic-bezier(.16,1,.3,1)] group-hover:scale-[1.07] md:text-[100px]"
                style={{ background: tile.bg }}
                aria-hidden
              >
                {tile.emoji}
              </div>
              <div className="absolute inset-0 bg-[linear-gradient(to_top,rgba(10,46,26,.88)_0%,rgba(10,46,26,.3)_45%,transparent_100%)]" />

              <div className={tile.large ? "absolute inset-x-0 bottom-0 z-[1] p-8" : "absolute inset-x-0 bottom-0 z-[1] p-6"}>
                {tile.tag ? (
                  <span className="mb-3 inline-flex rounded-pill border border-[rgba(74,222,128,.3)] bg-[rgba(74,222,128,.22)] px-3 py-1 text-[10px] font-bold tracking-[.05em] text-[#bbf7d0]">
                    {tile.tag}
                  </span>
                ) : null}
                <p className={tile.large ? "mb-1 text-[30px] font-black tracking-[-.8px] text-white" : "mb-1 text-[20px] font-black tracking-[-.4px] text-white"}>
                  {tile.title}
                </p>
                <p className="text-[13px] font-medium text-white/65">
                  {count} ofert{tile.priceLabel ? ` · ${tile.priceLabel}` : ""}
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
