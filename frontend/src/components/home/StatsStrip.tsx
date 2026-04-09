"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

const STATS = [
  { value: "2 400+", label: "ofert w Polsce" },
  { value: "98%", label: "zadowolonych gości" },
  { value: "16", label: "trybów podróży AI" },
  { value: "24/7", label: "wsparcie klientów" },
];

export function StatsStrip() {
  const ref = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setVisible(true);
          obs.disconnect();
        }
      },
      { threshold: 0.3 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <section className="bg-[#0a2e1a] px-6 py-[72px] md:px-12">
      <div ref={ref} className="mx-auto grid w-full max-w-[1000px] grid-cols-2 gap-y-8 md:grid-cols-4">
        {STATS.map((stat, index) => (
          <div
            key={stat.label}
            className={cn(
              "px-4 text-center md:px-7",
              index !== STATS.length - 1 && "md:border-r md:border-r-white/10",
              visible ? "opacity-100" : "opacity-0"
            )}
            style={{
              animation: visible
                ? `countUp .65s ${index * 0.1}s cubic-bezier(.16,1,.3,1) both`
                : undefined,
            }}
          >
            <p className="mb-2.5 text-[52px] font-black tracking-[-2.5px] text-white">{stat.value}</p>
            <p className="text-[13px] font-medium text-white/50">{stat.label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
