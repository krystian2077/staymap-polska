"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { SearchParamsState } from "@/lib/store/searchStore";

type Props = {
  params: SearchParamsState;
  onChange: (update: Partial<SearchParamsState>) => void;
  onSearch: () => void;
  className?: string;
};

export function PriceRangeFilter({ params, onChange, onSearch, className }: Props) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      onSearch();
    }
  };

  return (
    <motion.div 
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        "group flex h-[72px] items-center gap-4 rounded-[32px] border border-brand/20 bg-white px-5 shadow-[0_16px_48px_rgba(0,0,0,0.3)] transition-all duration-300 hover:border-brand/40",
        className
      )}
    >
      {/* Icon section */}
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[18px] bg-brand-surface text-brand transition-all duration-300 group-hover:bg-brand group-hover:text-white shadow-sm">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <rect width="20" height="12" x="2" y="6" rx="2" />
          <circle cx="12" cy="12" r="2" />
          <path d="M6 12h.01M18 12h.01" />
        </svg>
      </div>

      <div className="flex items-center">
        {/* Min Price */}
        <div className="flex flex-col items-start px-2">
          <span className="text-[10px] font-black uppercase tracking-wider text-brand-dark/40">
            Cena od
          </span>
          <div className="flex items-baseline">
            <input
              type="number"
              min={0}
              step={50}
              placeholder="0"
              value={params.min_price ?? ""}
              onKeyDown={handleKeyDown}
              onChange={(e) =>
                onChange({ min_price: e.target.value ? Number(e.target.value) : undefined })
              }
              className="w-16 bg-transparent text-[15px] font-black tracking-tight text-brand-dark placeholder:text-brand-dark/20 outline-none sm:w-20"
            />
            <span className="text-[11px] font-bold text-brand-dark/40 ml-0.5">zł</span>
          </div>
        </div>

        {/* Divider */}
        <div className="h-8 w-px bg-brand/10 mx-2" aria-hidden />

        {/* Max Price */}
        <div className="flex flex-col items-start px-2">
          <span className="text-[10px] font-black uppercase tracking-wider text-brand-dark/40">
            Do
          </span>
          <div className="flex items-baseline">
            <input
              type="number"
              min={0}
              step={50}
              placeholder="Max"
              value={params.max_price ?? ""}
              onKeyDown={handleKeyDown}
              onChange={(e) =>
                onChange({ max_price: e.target.value ? Number(e.target.value) : undefined })
              }
              className="w-16 bg-transparent text-[15px] font-black tracking-tight text-brand-dark placeholder:text-brand-dark/20 outline-none sm:w-20"
            />
            <span className="text-[11px] font-bold text-brand-dark/40 ml-0.5">zł</span>
          </div>
        </div>
      </div>

      {/* Quick Search Button */}
      <button
        onClick={onSearch}
        type="button"
        className="ml-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-surface text-brand transition-all hover:bg-brand hover:text-white hover:shadow-md active:scale-95"
        title="Zastosuj cenę"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 12h14m-7-7 7 7-7 7" />
        </svg>
      </button>
    </motion.div>
  );
}
