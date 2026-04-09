"use client";

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
            "flex items-center gap-1.5 rounded-xl border-[1.5px] px-3.5 py-2 text-[13px] font-semibold transition-all duration-150",
            activeCount > 0
              ? "border-brand bg-brand-muted text-brand-dark shadow-[0_0_0_3px_rgba(22,163,74,.12)]"
              : "border-gray-200 bg-white text-text-secondary hover:border-brand hover:bg-brand-surface hover:text-brand-dark",
          )}
        >
          <svg className="h-[14px] w-[14px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M3 6h18M7 12h10M11 18h2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Filtry
          {activeCount > 0 && (
            <span className="flex h-4.5 min-w-[18px] items-center justify-center rounded-full bg-brand px-1 text-[10px] font-extrabold text-white">
              {activeCount}
            </span>
          )}
        </button>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          sideOffset={10}
          align="start"
          className="z-[500] w-[min(100vw-2rem,460px)] overflow-hidden rounded-[20px] border border-gray-100 bg-white shadow-[0_12px_48px_rgba(0,0,0,.14)] outline-none"
          style={{ animation: "scaleIn 0.16s cubic-bezier(.16,1,.3,1) both" }}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
            <h3 className="text-[15px] font-bold text-text">Filtry wyszukiwania</h3>
            <div className="flex items-center gap-2">
              {activeCount > 0 && (
                <button
                  type="button"
                  onClick={clearAll}
                  className="text-[12px] font-semibold text-text-secondary underline-offset-2 hover:text-brand hover:underline"
                >
                  Wyczyść ({activeCount})
                </button>
              )}
              <Popover.Close className="flex h-7 w-7 items-center justify-center rounded-lg text-[13px] text-text-muted hover:bg-gray-100 hover:text-text">
                ✕
              </Popover.Close>
            </div>
          </div>

          <div className="max-h-[60vh] overflow-y-auto px-5 py-4 space-y-5">

            {/* Typ obiektu */}
            <section>
              <h4 className="mb-2 text-[12px] font-bold uppercase tracking-wide text-text-muted">
                Typ obiektu
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {LISTING_TYPES.map((t) => {
                  const on = (params.listing_types ?? []).includes(t.slug);
                  return (
                    <button
                      key={t.slug}
                      type="button"
                      onClick={() => toggleListingType(t.slug)}
                      className={cn(
                        "flex items-center gap-1.5 rounded-full border-[1.5px] px-3 py-1.5 text-[12px] font-semibold transition-all duration-150",
                        on
                          ? "border-brand bg-brand-muted text-brand-dark"
                          : "border-gray-200 bg-white text-text-secondary hover:border-brand hover:bg-brand-surface hover:text-brand-dark",
                      )}
                    >
                      <span>{t.icon}</span>
                      {t.name}
                    </button>
                  );
                })}
              </div>
            </section>

            {/* Cena */}
            <section>
              <h4 className="mb-2 text-[12px] font-bold uppercase tracking-wide text-text-muted">
                Cena za noc (PLN)
              </h4>
              <div className="flex items-center gap-3">
                <label className="flex-1">
                  <span className="mb-1 block text-[11px] font-semibold text-text-secondary">Min</span>
                  <input
                    type="number"
                    min={0}
                    step={50}
                    placeholder="np. 100"
                    value={params.min_price ?? ""}
                    onChange={(e) =>
                      onChange({ min_price: e.target.value ? Number(e.target.value) : undefined })
                    }
                    className="input text-[13px]"
                  />
                </label>
                <span className="mt-5 text-text-muted">—</span>
                <label className="flex-1">
                  <span className="mb-1 block text-[11px] font-semibold text-text-secondary">Max</span>
                  <input
                    type="number"
                    min={0}
                    step={50}
                    placeholder="np. 800"
                    value={params.max_price ?? ""}
                    onChange={(e) =>
                      onChange({ max_price: e.target.value ? Number(e.target.value) : undefined })
                    }
                    className="input text-[13px]"
                  />
                </label>
              </div>
            </section>

            {/* Otoczenie */}
            <section>
              <h4 className="mb-2 text-[12px] font-bold uppercase tracking-wide text-text-muted">
                Otoczenie
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {LOCATION_TAG_CHIPS.map((chip) => {
                  const on = (params as Record<string, unknown>)[chip.key] === true;
                  return (
                    <button
                      key={chip.key}
                      type="button"
                      onClick={() => toggleTag(chip.key)}
                      className={cn(
                        "flex items-center gap-1.5 rounded-full border-[1.5px] px-3 py-1.5 text-[12px] font-semibold transition-all duration-150",
                        on
                          ? "border-brand bg-brand-muted text-brand-dark"
                          : "border-gray-200 bg-white text-text-secondary hover:border-brand hover:bg-brand-surface hover:text-brand-dark",
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
              <h4 className="mb-2 text-[12px] font-bold uppercase tracking-wide text-text-muted">
                Udogodnienia
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {AMENITY_CHIPS.map((a) => {
                  const on = (params.amenities ?? []).includes(a.id);
                  return (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => toggleAmenity(a.id)}
                      className={cn(
                        "flex items-center gap-1.5 rounded-full border-[1.5px] px-3 py-1.5 text-[12px] font-semibold transition-all duration-150",
                        on
                          ? "border-brand bg-brand-muted text-brand-dark"
                          : "border-gray-200 bg-white text-text-secondary hover:border-brand hover:bg-brand-surface hover:text-brand-dark",
                      )}
                    >
                      <span>{a.icon}</span>
                      {a.label}
                    </button>
                  );
                })}
              </div>
            </section>

            {/* Pupil + tryb */}
            <section className="grid grid-cols-2 gap-3">
              <label className="flex cursor-pointer items-center gap-2.5 rounded-xl border-[1.5px] border-gray-200 bg-white px-3 py-2.5 transition-all hover:border-brand hover:bg-brand-surface">
                <input
                  type="checkbox"
                  checked={params.is_pet_friendly === true}
                  onChange={(e) => onChange({ is_pet_friendly: e.target.checked || undefined })}
                  className="accent-brand h-4 w-4 rounded"
                />
                <span className="text-[12px] font-semibold text-text">🐾 Pupil</span>
              </label>

              <select
                value={params.booking_mode ?? ""}
                onChange={(e) =>
                  onChange({ booking_mode: e.target.value || undefined })
                }
                className="input text-[12px]"
              >
                <option value="">Dowolny tryb</option>
                <option value="instant">⚡ Natychmiastowa</option>
                <option value="request">📩 Na prośbę</option>
              </select>
            </section>
          </div>

          {/* Footer */}
          <div className="border-t border-gray-100 px-5 py-3">
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onSearch();
              }}
              className="btn-primary w-full rounded-xl py-3"
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
