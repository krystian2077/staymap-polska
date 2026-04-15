"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { useState } from "react";
import { LOCATION_TAG_CHIPS, LOCATION_TAG_KEYS } from "@/lib/locationTags";
import type { SearchParamsState } from "@/lib/store/searchStore";
import { countActiveFilters } from "@/lib/searchQuery";
import {
  MODAL_CONTENT_WRAPPER_CLASS,
  MODAL_OVERLAY_CLASS,
  modalSurfaceClass,
} from "@/lib/modalLayers";
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

  const applyAndClose = () => {
    setOpen(false);
    onSearch();
  };

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button
          type="button"
          className={cn(
            "flex min-h-[var(--tap-min)] items-center gap-3 rounded-[20px] border px-5 text-[15px] font-black shadow-xl transition-all duration-300 sm:gap-3.5 sm:rounded-[24px] sm:px-7",
            activeCount > 0
              ? "border-brand bg-white text-brand-dark"
              : "border-brand/20 bg-white text-brand-dark hover:border-brand/40",
          )}
        >
          <div
            className={cn(
              "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl shadow-sm transition-all duration-300",
              activeCount > 0 ? "bg-brand text-white" : "bg-brand-surface text-brand",
            )}
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}>
              <path d="M3 6h18M7 12h10M11 18h2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <span className="hidden sm:inline">Filtry</span>
          {activeCount > 0 && (
            <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-brand px-1.5 text-[11px] font-black text-white shadow-sm">
              {activeCount}
            </span>
          )}
        </button>
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className={MODAL_OVERLAY_CLASS} />
        <Dialog.Content className={`${MODAL_CONTENT_WRAPPER_CLASS} outline-none`}>
          <div
            className={cn(
              modalSurfaceClass(
                "flex w-full max-w-[min(100vw,520px)] flex-col !overflow-hidden shadow-[0_-12px_48px_rgba(0,0,0,.15)] md:shadow-[0_20px_60px_rgba(0,0,0,.16)]",
              ),
              "max-h-[min(92dvh,calc(100dvh-env(safe-area-inset-bottom)))]",
            )}
          >
            <div className="flex shrink-0 items-center justify-between border-b border-gray-100/60 bg-white px-4 py-4 dark:border-brand-border sm:px-6 sm:py-5">
              <div>
                <Dialog.Title className="text-[17px] font-black tracking-tight text-text">
                  Filtry
                </Dialog.Title>
                <Dialog.Description className="text-[11px] font-medium text-text-muted">
                  Dostosuj wyniki do swoich potrzeb
                </Dialog.Description>
              </div>
              <div className="flex items-center gap-2 sm:gap-3">
                {activeCount > 0 && (
                  <button
                    type="button"
                    onClick={clearAll}
                    className="rounded-lg bg-brand-surface px-2.5 py-1.5 text-[11px] font-bold text-brand-dark transition-all hover:bg-brand hover:text-white sm:px-3 sm:text-[12px]"
                  >
                    Wyczyść ({activeCount})
                  </button>
                )}
                <Dialog.Close className="flex min-h-[40px] min-w-[40px] items-center justify-center rounded-xl text-[18px] leading-none text-text-muted transition-colors hover:bg-gray-100 hover:text-text">
                  <span className="sr-only">Zamknij</span>×
                </Dialog.Close>
              </div>
            </div>

            <div className="min-h-0 flex-1 space-y-6 overflow-y-auto overscroll-contain px-4 py-5 sm:space-y-7 sm:px-6 sm:py-6">
              <section>
                <h4 className="mb-3 text-[11px] font-black uppercase tracking-[0.1em] text-text-muted/80">
                  Typ obiektu
                </h4>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {LISTING_TYPES.map((t) => {
                    const on = (params.listing_types ?? []).includes(t.slug);
                    return (
                      <button
                        key={t.slug}
                        type="button"
                        onClick={() => toggleListingType(t.slug)}
                        className={cn(
                          "flex min-h-[44px] items-center gap-2 rounded-xl border-[1.5px] px-3 py-2.5 text-left text-[12px] font-bold transition-all duration-200",
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

              <section>
                <h4 className="mb-3 text-[11px] font-black uppercase tracking-[0.1em] text-text-muted/80">
                  Przedział cenowy
                </h4>
                <div className="flex flex-col gap-3 rounded-2xl border border-brand-surface/50 bg-brand-surface/30 p-4 sm:flex-row sm:items-center sm:gap-4">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-black uppercase tracking-wider text-text-muted/50">
                      Od
                    </span>
                    <input
                      type="number"
                      min={0}
                      step={50}
                      placeholder="0"
                      value={params.min_price ?? ""}
                      onChange={(e) =>
                        onChange({ min_price: e.target.value ? Number(e.target.value) : undefined })
                      }
                      className="w-full rounded-xl border border-gray-100 bg-white py-3 pl-10 pr-4 text-[14px] font-bold text-text outline-none transition-all focus:border-brand focus:ring-4 focus:ring-brand/5"
                    />
                  </div>
                  <div className="hidden h-[1.5px] w-3 shrink-0 bg-gray-200 sm:block" />
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-black uppercase tracking-wider text-text-muted/50">
                      Do
                    </span>
                    <input
                      type="number"
                      min={0}
                      step={50}
                      placeholder="Wszystkie"
                      value={params.max_price ?? ""}
                      onChange={(e) =>
                        onChange({ max_price: e.target.value ? Number(e.target.value) : undefined })
                      }
                      className="w-full rounded-xl border border-gray-100 bg-white py-3 pl-10 pr-4 text-[14px] font-bold text-text outline-none transition-all focus:border-brand focus:ring-4 focus:ring-brand/5"
                    />
                  </div>
                </div>
              </section>

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
                          "min-h-[40px] rounded-xl border-[1.5px] px-3.5 py-2 text-[12px] font-bold transition-all duration-200",
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
                          "flex min-h-[44px] items-center gap-2 rounded-xl border-[1.5px] px-3.5 py-2 text-[12px] font-bold transition-all duration-200",
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

              <section className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="flex min-h-[48px] cursor-pointer items-center justify-between gap-3 rounded-2xl border-[1.5px] border-gray-100 bg-white px-4 py-3 transition-all hover:border-brand/40 hover:bg-brand-surface/20">
                  <span className="flex items-center gap-2 text-[13px] font-bold text-text">
                    <span className="text-lg">🐾</span>
                    Akceptujemy zwierzęta
                  </span>
                  <input
                    type="checkbox"
                    checked={params.is_pet_friendly === true}
                    onChange={(e) => onChange({ is_pet_friendly: e.target.checked || undefined })}
                    className="h-5 w-5 cursor-pointer rounded-lg border-gray-300 accent-brand"
                  />
                </label>

                <div className="relative">
                  <select
                    value={params.booking_mode ?? ""}
                    onChange={(e) => onChange({ booking_mode: e.target.value || undefined })}
                    className="min-h-[48px] w-full cursor-pointer appearance-none rounded-2xl border-[1.5px] border-gray-100 bg-white px-4 py-3 text-[13px] font-bold text-text outline-none transition-all focus:border-brand/40"
                  >
                    <option value="">Dowolna rezerwacja</option>
                    <option value="instant">Natychmiastowa</option>
                    <option value="request">Na prośbę</option>
                  </select>
                  <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M6 9l6 6 6-6" />
                    </svg>
                  </div>
                </div>
              </section>
            </div>

            <div className="shrink-0 border-t border-gray-100/60 bg-gray-50/30 px-4 py-4 dark:border-brand-border sm:px-6 sm:py-5">
              <button
                type="button"
                onClick={applyAndClose}
                className="btn-primary min-h-[var(--tap-min)] w-full rounded-2xl py-3.5 text-[15px] font-black shadow-[0_8px_20px_rgba(22,163,74,0.25)] hover:shadow-[0_12px_24px_rgba(22,163,74,0.35)] active:scale-[0.98]"
              >
                Pokaż wyniki
              </button>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
