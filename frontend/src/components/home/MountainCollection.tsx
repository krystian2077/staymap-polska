import Link from "next/link";
import type { CollectionCardData } from "@/components/home/WaterCollection";

export function MountainCollection({ cards }: { cards: CollectionCardData[] }) {
  return (
    <section className="mx-auto w-full max-w-[1240px] px-6 pb-20 md:px-12">
      <div className="relative overflow-hidden rounded-[24px] bg-[linear-gradient(135deg,#f0fdf4_0%,#dcfce7_50%,#f0fdf4_100%)] px-6 pt-9 md:px-10">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <span className="inline-flex rounded-pill border border-[#bbf7d0] bg-[#dcfce7] px-3 py-1 text-xs font-bold text-[#166534]">
              ⛰️ Gory
            </span>
            <h2 className="mt-3 text-[28px] font-black tracking-[-.7px] text-[#0a2e1a]">Gory na weekend</h2>
            <p className="mt-1 text-[14px] text-[#7a8f84]">Domki, apartamenty i chaty blisko szlakow i punktow widokowych</p>
          </div>
          <Link href="/search?travel_mode=mountains" className="text-sm font-bold text-[#16a34a] hover:underline">
            Wszystkie
          </Link>
        </div>

        <span className="pointer-events-none absolute bottom-0 right-10 text-[80px] opacity-[.06] grayscale">⛰️</span>

        <div className="flex gap-4 overflow-x-auto pb-9 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {cards.map((card) => (
            <Link
              key={card.title}
              href={card.href}
              className="group min-w-[264px] shrink-0 overflow-hidden rounded-[20px] border border-[#e4ebe7] bg-white shadow-[0_1px_3px_rgba(10,15,13,.05)] transition-all duration-300 ease-[cubic-bezier(.16,1,.3,1)] hover:-translate-y-1.5 hover:border-[#bbf7d0] hover:shadow-[0_24px_64px_rgba(10,15,13,.16)]"
            >
              <div className="relative flex h-[188px] items-center justify-center overflow-hidden" style={{ background: card.bg }}>
                <span className="text-[56px] transition-transform duration-500 group-hover:scale-110">{card.emoji}</span>
                <div className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent,rgba(10,46,26,.14))]" />
                <span className="absolute left-3 top-3 rounded-pill bg-[#16a34a] px-2 py-0.5 text-[10px] font-bold text-white">{card.badge}</span>
                <span className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-sm">🤍</span>
                {card.dist ? (
                  <span className="absolute bottom-2.5 right-2.5 rounded-pill bg-black/45 px-2 py-0.5 text-[10px] font-semibold text-white backdrop-blur-sm">
                    {card.dist}
                  </span>
                ) : null}
              </div>

              <div className="px-4 pb-4 pt-3.5">
                <p className="mb-1 line-clamp-2 text-[14px] font-bold leading-[1.3] text-[#0a0f0d]">{card.title}</p>
                <p className="mb-2.5 text-[11px] text-[#7a8f84]">📍 {card.loc}</p>
                <div className="flex items-center justify-between">
                  <p className="text-[16px] font-black text-[#0a0f0d]">{card.price} zl</p>
                  <p className="text-xs font-bold text-[#0a0f0d]">★ {card.rating.toFixed(2)} ({card.reviews})</p>
                </div>
              </div>
            </Link>
          ))}
        </div>

        <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-[linear-gradient(90deg,#16a34a,#4ade80,#16a34a)]" />
      </div>
    </section>
  );
}
