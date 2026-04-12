"use client";

import { motion, AnimatePresence } from "framer-motion";
import * as Popover from "@radix-ui/react-popover";
import { useState } from "react";
import { LOCATION_TAG_CHIPS, LOCATION_TAG_KEYS } from "@/lib/locationTags";
import type { SearchParamsState } from "@/lib/store/searchStore";
import { countActiveFilters } from "@/lib/searchQuery";
import { cn } from "@/lib/utils";
import { AMENITY_CHIPS, LISTING_TYPES } from "./SearchFiltersBar";

type Props = {
  params: SearchParamsState;
  onChange: (update: Partial<SearchParamsState>) => void;
  onSearch: () => void;
};

export function SearchFiltersPanel({ params, onChange, onSearch }: Props) {
  const [open, setOpen] = useState(false);
  const activeCount = countActiveFilters(params);

  const toggleListingType = (slug: string) => {
    const current = params.listing_types ?? [];
    if (current.includes(slug)) {
      onChange({ listing_types: current.filter((x) => x !== slug) || undefined });
    } else {
      onChange({ listing_types: [...current, slug] });
    }
  };

  const toggleAmenity = (id: string) => {
    const current = params.amenities ?? [];
    if (current.includes(id)) {
      onChange({ amenities: current.filter((x) => x !== id) || undefined });
    } else {
      onChange({ amenities: [...current, id] });
    }
  };

  const toggleTag = (tag: string) => {
    const cur = (params as Record<string, unknown>)[tag];
    onChange({ [tag]: cur === true ? undefined : true } as Partial<SearchParamsState>);
  };

  const clearAll = () => {
    const cleared: Partial<SearchParamsState> = {
      listing_types: undefined,
      amenities: undefined,
      is_pet_friendly: undefined,
      travel_mode: undefined,
      min_price: undefined,
      max_price: undefined,
      booking_mode: undefined,
    };
    for (const tag of LOCATION_TAG_KEYS) {
      (cleared as Record<string, unknown>)[tag] = undefined;
    }
    onChange(cleared);
    setOpen(false);
    setTimeout(onSearch, 0);
  };

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          type="button"
          className={cn(
            "flex h-[60px] items-center gap-3.5 rounded-[24px] border px-7 text-[15px] font-black transition-all duration-300 shadow-xl",
            activeCount > 0
              ? "border-brand bg-white text-brand-dark"
              : "border-brand/20 bg-white text-brand-dark hover:border-brand/40",
          )}
        >
          <div className={cn(
            "flex h-9 w-9 items-center justify-center rounded-xl transition-all duration-300 shadow-sm",
            activeCount > 0 ? "bg-brand text-white" : "bg-brand-surface text-brand"
          )}>
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}>
              <path d="M3 6h18M7 12h10M11 18h2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <span className="hidden sm:inline">Filtry</span>
          {activeCount > 0 && (
            <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-brand px-1.5 text-[11px] font-black text-white shadow-sm">
              {activeCount}
            </span>
          )}
        </button>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          sideOffset={10}
          align="start"
          className="z-[500] w-[min(100vw-2rem,480px)] overflow-hidden rounded-[24px] border border-gray-100 bg-white shadow-[0_20px_60px_rgba(0,0,0,.16)] outline-none"
          style={{ animation: "scaleIn 0.2s cubic-bezier(.16,1,.3,1) both" }}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-100/60 bg-white px-6 py-5">
            <div>
              <h3 className="text-[17px] font-black text-text tracking-tight">Filtry</h3>
              <p className="text-[11px] font-medium text-text-muted">Dostosuj wyniki do swoich potrzeb</p>
            </div>
            <div className="flex items-center gap-3">
              {activeCount > 0 && (
                <button
                  type="button"
                  onClick={clearAll}
                  className="text-[12px] font-bold text-brand-dark bg-brand-surface px-3 py-1.5 rounded-lg transition-all hover:bg-brand hover:text-white"
                >
                  Wyczyść ({activeCount})
                </button>
              )}
              <Popover.Close className="flex h-8 w-8 items-center justify-center rounded-xl text-[14px] text-text-muted hover:bg-gray-100 hover:text-text transition-colors">
                ✕
              </Popover.Close>
            </div>
          </div>

          <div className="max-h-[65vh] overflow-y-auto px-6 py-6 space-y-7">

            {/* Typ obiektu */}
            <section>
              <h4 className="mb-3 text-[11px] font-black uppercase tracking-[0.1em] text-text-muted/80">
                Typ obiektu
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {LISTING_TYPES.map((t) => {
                  const on = (params.listing_types ?? []).includes(t.slug);
                  return (
                    <button
                      key={t.slug}
                      type="button"
                      onClick={() => toggleListingType(t.slug)}
                      className={cn(
                        "flex items-center gap-2 rounded-xl border-[1.5px] px-3 py-2.5 text-[12px] font-bold transition-all duration-200",
                        on
                          ? "border-brand bg-brand-surface text-brand-dark shadow-sm"
                          : "border-gray-100 bg-white text-text-secondary hover:border-brand/40 hover:bg-brand-surface/20",
                      )}
                    >
                      <span className="text-lg leading-none">{t.icon}</span>
                      {t.name}
                    </button>
                  );
                })}
              </div>
            </section>

            {/* Cena */}
            <section>
              <h4 className="mb-3 text-[11px] font-black uppercase tracking-[0.1em] text-text-muted/80">
                Przedział cenowy
              </h4>
              <div className="flex items-center gap-4 bg-brand-surface/30 p-4 rounded-2xl border border-brand-surface/50">
                <div className="flex-1 relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-text-muted/50 uppercase tracking-wider">Od</span>
                  <input
                    type="number"
                    min={0}
                    step={50}
                    placeholder="0"
                    value={params.min_price ?? ""}
                    onChange={(e) =>
                      onChange({ min_price: e.target.value ? Number(e.target.value) : undefined })
                    }
                    className="w-full bg-white border border-gray-100 rounded-xl pl-10 pr-4 py-3 text-[14px] font-bold text-text outline-none focus:border-brand focus:ring-4 focus:ring-brand/5 transition-all"
                  />
                </div>
                <div className="h-[1.5px] w-3 bg-gray-200" />
                <div className="flex-1 relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-text-muted/50 uppercase tracking-wider">Do</span>
                  <input
                    type="number"
                    min={0}
                    step={50}
                    placeholder="Wszystkie"
                    value={params.max_price ?? ""}
                    onChange={(e) =>
                      onChange({ max_price: e.target.value ? Number(e.target.value) : undefined })
                    }
                    className="w-full bg-white border border-gray-100 rounded-xl pl-10 pr-4 py-3 text-[14px] font-bold text-text outline-none focus:border-brand focus:ring-4 focus:ring-brand/5 transition-all"
                  />
                </div>
              </div>
            </section>

            {/* Otoczenie */}
            <section>
              <h4 className="mb-3 text-[11px] font-black uppercase tracking-[0.1em] text-text-muted/80">
                Otoczenie i klimat
              </h4>
              <div className="flex flex-wrap gap-2">
                {LOCATION_TAG_CHIPS.map((chip) => {
                  const on = (params as Record<string, unknown>)[chip.key] === true;
                  return (
                    <button
                      key={chip.key}
                      type="button"
                      onClick={() => toggleTag(chip.key)}
                      className={cn(
                        "flex items-center gap-1.5 rounded-xl border-[1.5px] px-3.5 py-2 text-[12px] font-bold transition-all duration-200",
                        on
                          ? "border-brand bg-brand-surface text-brand-dark"
                          : "border-gray-100 bg-white text-text-secondary hover:border-brand/40 hover:bg-brand-surface/20",
                      )}
                    >
                      {chip.label}
                    </button>
                  );
                })}
              </div>
            </section>

            {/* Udogodnienia */}
            <section>
              <h4 className="mb-3 text-[11px] font-black uppercase tracking-[0.1em] text-text-muted/80">
                Udogodnienia
              </h4>
              <div className="flex flex-wrap gap-2">
                {AMENITY_CHIPS.map((a) => {
                  const on = (params.amenities ?? []).includes(a.id);
                  return (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => toggleAmenity(a.id)}
                      className={cn(
                        "flex items-center gap-2 rounded-xl border-[1.5px] px-3.5 py-2 text-[12px] font-bold transition-all duration-200",
                        on
                          ? "border-brand bg-brand-surface text-brand-dark shadow-sm"
                          : "border-gray-100 bg-white text-text-secondary hover:border-brand/40 hover:bg-brand-surface/20",
                      )}
                    >
                      <span className="text-lg leading-none">{a.icon}</span>
                      {a.label}
                    </button>
                  );
                })}
              </div>
            </section>

            {/* Pupil + tryb */}
            <section className="grid grid-cols-2 gap-4">
              <label className="flex cursor-pointer items-center justify-between gap-3 rounded-2xl border-[1.5px] border-gray-100 bg-white px-4 py-3.5 transition-all hover:border-brand/40 hover:bg-brand-surface/20 group">
                <span className="text-[13px] font-bold text-text flex items-center gap-2">
                   <span className="text-lg">🐾</span> 
                   Akceptujemy zwierzęta
                </span>
                <input
                  type="checkbox"
                  checked={params.is_pet_friendly === true}
                  onChange={(e) => onChange({ is_pet_friendly: e.target.checked || undefined })}
                  className="accent-brand h-5 w-5 rounded-lg border-gray-300 transition-all cursor-pointer"
                />
              </label>

              <div className="relative group">
                <select
                  value={params.booking_mode ?? ""}
                  onChange={(e) =>
                    onChange({ booking_mode: e.target.value || undefined })
                  }
                  className="appearance-none w-full bg-white border-[1.5px] border-gray-100 rounded-2xl px-4 py-3.5 text-[13px] font-bold text-text outline-none focus:border-brand/40 transition-all cursor-pointer"
                >
                  <option value="">Dowolna rezerwacja</option>
                  <option value="instant">⚡ Natychmiastowa</option>
                  <option value="request">📩 Na prośbę</option>
                </select>
                <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 group-hover:text-brand transition-colors">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </div>
              </div>
            </section>
          </div>

          {/* Footer */}
          <div className="border-t border-gray-100/60 bg-gray-50/30 px-6 py-5">
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onSearch();
              }}
              className="btn-primary w-full rounded-2xl py-4 font-black text-[15px] shadow-[0_8px_20px_rgba(22,163,74,0.25)] hover:shadow-[0_12px_24px_rgba(22,163,74,0.35)] active:scale-[0.98]"
            >
              Pokaż wyniki
            </button>
          </div>

          <Popover.Arrow className="fill-white" />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
