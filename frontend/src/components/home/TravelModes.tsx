"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { TRAVEL_MODE_ITEMS } from "@/components/search/TravelModeSelector";
import { cn } from "@/lib/utils";

export function TravelModes() {
  const router = useRouter();
  const [active, setActive] = useState<string | null>(null);

  return (
    <section className="mx-auto w-full max-w-[1240px] px-6 py-20 md:px-12">
      <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-[30px] font-black tracking-[-.8px] text-[#0a2e1a]">Tryby podróży</h2>
          <p className="mt-2 text-[14px] text-[#7a8f84]">Wybierz styl - dopasujemy idealne miejsca</p>
        </div>
        <Link href="/search" className="group inline-flex items-center gap-1 text-[13px] font-bold text-[#16a34a] transition-all duration-200 hover:gap-2.5">
          Wszystkie <span className="transition-transform group-hover:translate-x-0.5">→</span>
        </Link>
      </div>

      <div className="flex gap-2.5 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {TRAVEL_MODE_ITEMS.map((item, i) => {
          const selected = item.id === active;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                const next = selected ? null : item.id;
                setActive(next);
                router.push(next ? `/search?travel_mode=${encodeURIComponent(next)}` : "/search");
              }}
              className={cn("mc", selected && "active")}
              style={{ animationDelay: `${i * 0.07}s` }}
            >
              <span className="text-[30px] leading-none">{item.emoji}</span>
              <span className="label text-[12px] font-bold text-[#3d4f45]">{item.label}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
