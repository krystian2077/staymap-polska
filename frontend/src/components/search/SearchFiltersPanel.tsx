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
                "flex w-full max-w-[min(100vw,520px)] md:max-w-[min(100vw,760px)] lg:max-w-[min(100vw,1040px)] flex-col !overflow-hidden shadow-[0_-12px_48px_rgba(0,0,0,.15)] md:shadow-[0_30px_80px_rgba(0,0,0,.20)]",
              ),
              "max-h-[min(92dvh,calc(100dvh-env(safe-area-inset-bottom)))] lg:max-h-[min(88dvh,860px)]",
            )}
          >
            <div className="flex shrink-0 items-center justify-between border-b border-gray-100/60 bg-gradient-to-b from-white to-gray-50/30 px-4 py-4 dark:border-brand-border dark:from-[var(--bg2)] dark:to-[var(--bg2)] sm:px-6 sm:py-5 md:px-8 md:py-6 lg:px-10 lg:py-7">
              <div className="flex items-center gap-3 lg:gap-4">
                <div className="hidden h-11 w-11 items-center justify-center rounded-2xl bg-brand-surface text-brand shadow-sm md:flex lg:h-12 lg:w-12">
                  <svg className="h-5 w-5 lg:h-6 lg:w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                    <path d="M3 6h18M7 12h10M11 18h2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <div>
                  <Dialog.Title className="text-[17px] font-black tracking-tight text-text md:text-[20px] lg:text-[24px]">
                    Filtry wyszukiwania
                  </Dialog.Title>
                  <Dialog.Description className="text-[11px] font-medium text-text-muted md:text-[13px] lg:text-[14px]">
                    Dostosuj wyniki do swoich potrzeb
                  </Dialog.Description>
                </div>
              </div>
              <div className="flex items-center gap-2 sm:gap-3">
                {activeCount > 0 && (
                  <button
                    type="button"
                    onClick={clearAll}
                    className="rounded-lg bg-brand-surface px-2.5 py-1.5 text-[11px] font-bold text-brand-dark transition-all hover:bg-brand hover:text-white sm:px-3 sm:text-[12px] md:text-[13px] lg:px-4 lg:py-2 lg:text-[13px]"
                  >
                    Wyczyść ({activeCount})
                  </button>
                )}
                <Dialog.Close className="flex min-h-[40px] min-w-[40px] items-center justify-center rounded-xl text-[18px] leading-none text-text-muted transition-colors hover:bg-gray-100 hover:text-text lg:min-h-[44px] lg:min-w-[44px] lg:text-[20px]">
                  <span className="sr-only">Zamknij</span>×
                </Dialog.Close>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-gray-50/40 px-4 py-5 dark:bg-transparent sm:px-6 sm:py-6 md:px-8 md:py-7 lg:px-10 lg:py-8">
              <div className="space-y-6 sm:space-y-7 lg:grid lg:grid-cols-2 lg:gap-7 lg:space-y-0">
                <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm lg:col-span-2 lg:p-6 dark:border-brand-border dark:bg-[var(--bg2)]">
                  <div className="mb-4 flex items-center gap-2.5">
                    <span className="h-5 w-1 rounded-full bg-brand" />
                    <h4 className="text-[13px] font-black uppercase tracking-[0.08em] text-text md:text-[14px] lg:text-[15px]">
                      Typ obiektu
                    </h4>
                  </div>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:gap-3 lg:grid-cols-4">
                    {LISTING_TYPES.map((t) => {
                      const on = (params.listing_types ?? []).includes(t.slug);
                      return (
                        <button
                          key={t.slug}
                          type="button"
                          onClick={() => toggleListingType(t.slug)}
                          className={cn(
                            "flex min-h-[48px] items-center gap-2 rounded-xl border-[1.5px] px-3 py-2.5 text-left text-[12px] font-bold transition-all duration-200 md:text-[14px] lg:min-h-[54px] lg:px-4 lg:py-3 lg:text-[14.5px]",
                            on
                              ? "border-brand bg-brand-surface text-brand-dark shadow-sm"
                              : "border-gray-100 bg-white text-text-secondary hover:-translate-y-0.5 hover:border-brand/40 hover:bg-brand-surface/20 hover:shadow-md",
                          )}
                        >
                          <span className="text-lg leading-none lg:text-xl">{t.icon}</span>
                          {t.name}
                        </button>
                      );
                    })}
                  </div>
                </section>

                <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm lg:p-6 dark:border-brand-border dark:bg-[var(--bg2)]">
                  <div className="mb-4 flex items-center gap-2.5">
                    <span className="h-5 w-1 rounded-full bg-brand" />
                    <h4 className="text-[13px] font-black uppercase tracking-[0.08em] text-text md:text-[14px] lg:text-[15px]">
                      Przedział cenowy
                    </h4>
                  </div>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
                    <div className="relative flex-1">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-black uppercase tracking-wider text-text-muted/60 lg:text-[11px]">
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
                        className="w-full rounded-xl border border-gray-200 bg-white py-3 pl-10 pr-4 text-[14px] font-bold text-text outline-none transition-all focus:border-brand focus:ring-4 focus:ring-brand/10 lg:py-3.5 lg:text-[15px]"
                      />
                    </div>
                    <div className="hidden h-[1.5px] w-3 shrink-0 bg-gray-200 sm:block" />
                    <div className="relative flex-1">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-black uppercase tracking-wider text-text-muted/60 lg:text-[11px]">
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
                        className="w-full rounded-xl border border-gray-200 bg-white py-3 pl-10 pr-4 text-[14px] font-bold text-text outline-none transition-all focus:border-brand focus:ring-4 focus:ring-brand/10 lg:py-3.5 lg:text-[15px]"
                      />
                    </div>
                  </div>
                  <p className="mt-3 text-[11px] text-text-muted lg:text-[12px]">PLN za noc</p>
                </section>

                <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm lg:p-6 dark:border-brand-border dark:bg-[var(--bg2)]">
                  <div className="mb-4 flex items-center gap-2.5">
                    <span className="h-5 w-1 rounded-full bg-brand" />
                    <h4 className="text-[13px] font-black uppercase tracking-[0.08em] text-text md:text-[14px] lg:text-[15px]">
                      Sposób rezerwacji
                    </h4>
                  </div>
                  <div className="relative">
                    <select
                      value={params.booking_mode ?? ""}
                      onChange={(e) => onChange({ booking_mode: e.target.value || undefined })}
                      className="min-h-[48px] w-full cursor-pointer appearance-none rounded-xl border border-gray-200 bg-white px-4 py-3 text-[13px] font-bold text-text outline-none transition-all focus:border-brand focus:ring-4 focus:ring-brand/10 lg:min-h-[54px] lg:text-[14.5px]"
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
                  <label className="mt-4 flex min-h-[48px] cursor-pointer items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 transition-all hover:border-brand/40 hover:bg-brand-surface/20 lg:min-h-[54px]">
                    <span className="flex items-center gap-2 text-[13px] font-bold text-text lg:text-[14.5px]">
                      <span className="text-lg lg:text-xl">🐾</span>
                      Akceptujemy zwierzęta
                    </span>
                    <input
                      type="checkbox"
                      checked={params.is_pet_friendly === true}
                      onChange={(e) => onChange({ is_pet_friendly: e.target.checked || undefined })}
                      className="h-5 w-5 cursor-pointer rounded-lg border-gray-300 accent-brand"
                    />
                  </label>
                </section>

                <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm lg:col-span-2 lg:p-6 dark:border-brand-border dark:bg-[var(--bg2)]">
                  <div className="mb-4 flex items-center gap-2.5">
                    <span className="h-5 w-1 rounded-full bg-brand" />
                    <h4 className="text-[13px] font-black uppercase tracking-[0.08em] text-text md:text-[14px] lg:text-[15px]">
                      Otoczenie i klimat
                    </h4>
                  </div>
                  <div className="flex flex-wrap gap-2 md:gap-2.5 lg:gap-3">
                    {LOCATION_TAG_CHIPS.map((chip) => {
                      const on = (params as Record<string, unknown>)[chip.key] === true;
                      return (
                        <button
                          key={chip.key}
                          type="button"
                          onClick={() => toggleTag(chip.key)}
                          className={cn(
                            "min-h-[40px] rounded-full border-[1.5px] px-4 py-2 text-[12px] font-bold transition-all duration-200 md:text-[14px] lg:min-h-[44px] lg:px-5 lg:text-[14.5px]",
                            on
                              ? "border-brand bg-brand-surface text-brand-dark shadow-sm"
                              : "border-gray-200 bg-white text-text-secondary hover:-translate-y-0.5 hover:border-brand/40 hover:bg-brand-surface/20 hover:shadow",
                          )}
                        >
                          {chip.label}
                        </button>
                      );
                    })}
                  </div>
                </section>

                <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm lg:col-span-2 lg:p-6 dark:border-brand-border dark:bg-[var(--bg2)]">
                  <div className="mb-4 flex items-center gap-2.5">
                    <span className="h-5 w-1 rounded-full bg-brand" />
                    <h4 className="text-[13px] font-black uppercase tracking-[0.08em] text-text md:text-[14px] lg:text-[15px]">
                      Udogodnienia
                    </h4>
                  </div>
                  <div className="flex flex-wrap gap-2 md:gap-2.5 lg:gap-3">
                    {AMENITY_CHIPS.map((a) => {
                      const on = (params.amenities ?? []).includes(a.id);
                      return (
                        <button
                          key={a.id}
                          type="button"
                          onClick={() => toggleAmenity(a.id)}
                          className={cn(
                            "flex min-h-[44px] items-center gap-2 rounded-full border-[1.5px] px-4 py-2 text-[12px] font-bold transition-all duration-200 md:text-[14px] lg:min-h-[48px] lg:px-5 lg:text-[14.5px]",
                            on
                              ? "border-brand bg-brand-surface text-brand-dark shadow-sm"
                              : "border-gray-200 bg-white text-text-secondary hover:-translate-y-0.5 hover:border-brand/40 hover:bg-brand-surface/20 hover:shadow",
                          )}
                        >
                          <span className="text-lg leading-none lg:text-xl">{a.icon}</span>
                          {a.label}
                        </button>
                      );
                    })}
                  </div>
                </section>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-3 border-t border-gray-100/60 bg-white px-4 py-4 dark:border-brand-border dark:bg-[var(--bg2)] sm:px-6 sm:py-5 md:px-8 md:py-6 lg:gap-4 lg:px-10 lg:py-6">
              {activeCount > 0 && (
                <button
                  type="button"
                  onClick={clearAll}
                  className="hidden min-h-[var(--tap-min)] rounded-2xl border-[1.5px] border-gray-200 bg-white px-6 text-[14px] font-bold text-text-secondary transition-all hover:border-gray-300 hover:bg-gray-50 lg:inline-flex lg:items-center"
                >
                  Wyczyść wszystko
                </button>
              )}
              <button
                type="button"
                onClick={applyAndClose}
                className="btn-primary min-h-[var(--tap-min)] flex-1 rounded-2xl py-3.5 text-[15px] font-black shadow-[0_8px_20px_rgba(22,163,74,0.25)] hover:shadow-[0_12px_24px_rgba(22,163,74,0.35)] active:scale-[0.98] lg:py-4 lg:text-[16px]"
              >
                {activeCount > 0 ? `Pokaż wyniki (${activeCount} ${activeCount === 1 ? "filtr" : activeCount < 5 ? "filtry" : "filtrów"})` : "Pokaż wyniki"}
              </button>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
