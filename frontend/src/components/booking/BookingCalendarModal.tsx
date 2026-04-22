"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { motion, AnimatePresence } from "framer-motion";
import { DayPicker, type DateRange } from "react-day-picker";
import { pl } from "date-fns/locale";
import { addMonths, startOfDay, startOfToday } from "date-fns";
import { useEffect, useMemo, useState } from "react";
import { toISODateString } from "@/lib/dates";
import { formatDate } from "@/lib/utils/dates";
import type { BusyRange } from "./calendarUtils";
import { MODAL_CONTENT_WRAPPER_CLASS, MODAL_OVERLAY_CLASS, modalSurfaceClass } from "@/lib/modalLayers";
import { datesFromBlockedAndBusy } from "./calendarUtils";

interface BookingCalendarModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  range: DateRange | undefined;
  onRangeChange: (range: DateRange | undefined) => void;
  arrivalTime: string;
  onArrivalTimeChange: (time: string) => void;
  departureTime: string;
  onDepartureTimeChange: (time: string) => void;
  bookedDates: string[];
  busyRanges?: BusyRange[];
  priceHint?: string | null;
  onVisibleMonthChange?: (month: Date) => void;
}

const TIME_OPTIONS = [
  "08:00", "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00", "20:00", "21:00", "22:00"
];

const CALENDAR_CLASSNAMES = {
  months: "relative flex flex-col gap-10 lg:flex-row lg:gap-20",
  month: "space-y-4",
  month_caption: "flex items-center justify-center relative h-10",
  caption_label: "text-base font-black text-brand-dark capitalize tracking-tight lg:text-lg",
  nav: "flex items-center gap-1 absolute inset-x-0 top-0 justify-between z-10",
  button_previous:
    "inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-gray-100 text-gray-400 hover:border-brand hover:text-brand hover:bg-brand/5 transition-all disabled:opacity-20",
  button_next:
    "inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-gray-100 text-gray-400 hover:border-brand hover:text-brand hover:bg-brand/5 transition-all disabled:opacity-20",
  chevron: "h-5 w-5 fill-current",
  weekdays: "flex",
  weekday: "flex-1 text-center text-[11px] font-black text-gray-300 pb-3 uppercase tracking-[0.15em]",
  weeks: "space-y-1",
  week: "flex",
  day: "flex-1 flex items-center justify-center p-0",
  day_button:
    "h-10 w-10 flex items-center justify-center rounded-xl text-[14px] font-bold text-gray-700 hover:bg-brand/5 hover:text-brand transition-all duration-200 relative lg:h-12 lg:w-12 lg:rounded-2xl lg:text-[15px]",
  selected: "!bg-brand-dark !text-white !rounded-xl lg:!rounded-2xl shadow-lg shadow-brand/30 z-10",
  range_start: "!bg-brand-dark !text-white !rounded-xl lg:!rounded-2xl",
  range_end: "!bg-brand-dark !text-white !rounded-xl lg:!rounded-2xl",
  range_middle: "!bg-brand/10 !text-brand-dark [&>button]:rounded-none",
  today: "font-black text-brand [&>button]:ring-2 [&>button]:ring-inset [&>button]:ring-brand/50",
  disabled: "opacity-20 [&>button]:line-through [&>button]:cursor-not-allowed",
  outside: "opacity-0 pointer-events-none",
  hidden: "invisible",
};

const CloseIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const Legend = () => (
  <div className="flex flex-wrap gap-5 border-t border-gray-50 pt-5 text-[11px] font-bold text-gray-400">
    <div className="flex items-center gap-2">
      <span className="h-3 w-3 rounded-full bg-brand-dark shadow-sm" />
      <span>Dostępne</span>
    </div>
    <div className="flex items-center gap-2">
      <span className="h-3 w-3 rounded-full bg-brand/20" />
      <span>Wybrane</span>
    </div>
    <div className="flex items-center gap-2 opacity-30">
      <span className="h-3 w-3 rounded-full bg-gray-200 line-through" />
      <span>Niedostępne</span>
    </div>
  </div>
);

export function BookingCalendarModal({
  open,
  onOpenChange,
  range,
  onRangeChange,
  arrivalTime,
  onArrivalTimeChange,
  departureTime,
  onDepartureTimeChange,
  bookedDates,
  busyRanges = [],
  priceHint,
  onVisibleMonthChange,
}: BookingCalendarModalProps) {
  const [months, setMonths] = useState(1);

  useEffect(() => {
    const w = () => setMonths(window.innerWidth >= 1024 ? 2 : 1);
    w();
    window.addEventListener("resize", w);
    return () => window.removeEventListener("resize", w);
  }, []);

  const disabledDays = useMemo(
    () => datesFromBlockedAndBusy(bookedDates, busyRanges),
    [bookedDates, busyRanges]
  );

  const today = startOfToday();
  const toLimit = startOfDay(addMonths(today, 18));

  const selectClass =
    "w-full rounded-xl border-gray-100 bg-white py-2.5 px-3 text-sm font-bold text-brand-dark shadow-sm ring-1 ring-inset ring-gray-100 focus:ring-brand";

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <AnimatePresence>
        {open && (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className={MODAL_OVERLAY_CLASS}
              />
            </Dialog.Overlay>
            <Dialog.Content asChild>
              <div className={MODAL_CONTENT_WRAPPER_CLASS}>
                <motion.div
                  initial={{ opacity: 0, y: 28 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 28 }}
                  transition={{ type: "spring", damping: 26, stiffness: 300 }}
                  className={modalSurfaceClass(
                    "relative flex max-w-[1150px] flex-col overflow-hidden lg:flex-row lg:rounded-[2.5rem]"
                  )}
                >
                  {/* ===== MOBILE LAYOUT ===== */}
                  <div className="flex flex-col lg:hidden" style={{ maxHeight: "inherit" }}>
                    {/* Mobile header */}
                    <div className="flex shrink-0 items-center justify-between border-b border-gray-100 px-5 py-4">
                      <h2 className="text-lg font-black tracking-tight text-brand-dark">Wybierz daty</h2>
                      <Dialog.Close className="rounded-full bg-gray-50 p-2.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500">
                        <CloseIcon />
                      </Dialog.Close>
                    </div>

                    {/* Calendar — scrollable */}
                    <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-5">
                      {priceHint && (
                        <div className="mb-5 rounded-2xl bg-brand/5 px-4 py-3 ring-1 ring-inset ring-brand/10">
                          <p className="text-sm font-bold text-brand-dark">{priceHint}</p>
                        </div>
                      )}
                      <div className="flex justify-center">
                        <DayPicker
                          mode="range"
                          locale={pl}
                          numberOfMonths={1}
                          selected={range}
                          onMonthChange={onVisibleMonthChange}
                          onSelect={onRangeChange}
                          disabled={[{ before: today }, { after: toLimit }, ...disabledDays]}
                          classNames={CALENDAR_CLASSNAMES}
                        />
                      </div>
                      <div className="mt-6">
                        <Legend />
                      </div>
                    </div>

                    {/* Sticky bottom bar */}
                    <div className="shrink-0 border-t border-gray-100 bg-white px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 shadow-[0_-8px_24px_rgba(0,0,0,.06)]">
                      {/* Date summary */}
                      <div className="mb-3 grid grid-cols-2 gap-2">
                        <div className="rounded-xl bg-gray-50 px-3 py-2.5">
                          <span className="block text-[9px] font-black uppercase tracking-widest text-brand">Przyjazd</span>
                          <span className="mt-0.5 block text-sm font-bold text-brand-dark leading-tight">
                            {range?.from ? formatDate(toISODateString(range.from)) : "—"}
                          </span>
                        </div>
                        <div className="rounded-xl bg-gray-50 px-3 py-2.5">
                          <span className="block text-[9px] font-black uppercase tracking-widest text-brand">Wyjazd</span>
                          <span className="mt-0.5 block text-sm font-bold text-brand-dark leading-tight">
                            {range?.to ? formatDate(toISODateString(range.to)) : "—"}
                          </span>
                        </div>
                      </div>

                      {/* Time selectors */}
                      <div className="mb-3 grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <label className="block text-[9px] font-black uppercase tracking-widest text-gray-400">
                            Godz. przyjazdu
                          </label>
                          <select
                            value={arrivalTime}
                            onChange={(e) => onArrivalTimeChange(e.target.value)}
                            className={selectClass}
                          >
                            {TIME_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
                          </select>
                        </div>
                        <div className="space-y-1">
                          <label className="block text-[9px] font-black uppercase tracking-widest text-gray-400">
                            Godz. wyjazdu
                          </label>
                          <select
                            value={departureTime}
                            onChange={(e) => onDepartureTimeChange(e.target.value)}
                            className={selectClass}
                          >
                            {TIME_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
                          </select>
                        </div>
                      </div>

                      {/* Confirm button */}
                      <button
                        onClick={() => onOpenChange(false)}
                        className="w-full rounded-2xl bg-brand-dark py-4 text-sm font-black uppercase tracking-widest text-white shadow-lg shadow-brand/20 transition-all hover:-translate-y-0.5 hover:shadow-xl active:scale-95"
                      >
                        Zatwierdź
                      </button>
                    </div>
                  </div>

                  {/* ===== DESKTOP LAYOUT ===== */}
                  <div className="hidden min-h-0 flex-1 lg:flex lg:flex-row">
                    {/* Sidebar */}
                    <div className="w-72 shrink-0 border-r border-gray-100 bg-gray-50/50 p-8">
                      <div className="space-y-8">
                        <div>
                          <h3 className="text-xs font-black uppercase tracking-widest text-gray-400">Wybrany termin</h3>
                          <div className="mt-4 space-y-4">
                            <div className="group rounded-2xl bg-white p-4 ring-1 ring-gray-100 transition-all hover:shadow-md">
                              <span className="block text-[10px] font-black uppercase tracking-widest text-brand">Przyjazd</span>
                              <div className="flex items-baseline justify-between">
                                <span className="mt-1 block text-lg font-bold text-brand-dark">
                                  {range?.from ? formatDate(toISODateString(range.from)) : "—"}
                                </span>
                                {range?.from && (
                                  <span className="text-xs font-black text-brand">{arrivalTime}</span>
                                )}
                              </div>
                            </div>
                            <div className="group rounded-2xl bg-white p-4 ring-1 ring-gray-100 transition-all hover:shadow-md">
                              <span className="block text-[10px] font-black uppercase tracking-widest text-brand">Wyjazd</span>
                              <div className="flex items-baseline justify-between">
                                <span className="mt-1 block text-lg font-bold text-brand-dark">
                                  {range?.to ? formatDate(toISODateString(range.to)) : "—"}
                                </span>
                                {range?.to && (
                                  <span className="text-xs font-black text-brand">{departureTime}</span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>

                        <div>
                          <h3 className="text-xs font-black uppercase tracking-widest text-gray-400">Godziny</h3>
                          <div className="mt-4 grid grid-cols-1 gap-3">
                            <div className="space-y-1.5">
                              <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Przyjazd</label>
                              <select
                                value={arrivalTime}
                                onChange={(e) => onArrivalTimeChange(e.target.value)}
                                className={selectClass}
                              >
                                {TIME_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
                              </select>
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Wyjazd</label>
                              <select
                                value={departureTime}
                                onChange={(e) => onDepartureTimeChange(e.target.value)}
                                className={selectClass}
                              >
                                {TIME_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
                              </select>
                            </div>
                          </div>
                        </div>

                        <div className="pt-4">
                          <button
                            onClick={() => onOpenChange(false)}
                            className="w-full rounded-2xl bg-brand-dark py-4 text-sm font-black uppercase tracking-widest text-white shadow-lg shadow-brand/20 transition-all hover:-translate-y-0.5 hover:shadow-xl active:scale-95"
                          >
                            Zatwierdź
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Calendar */}
                    <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-10">
                      <div className="mb-8 flex items-center justify-between">
                        <h2 className="text-2xl font-black tracking-tight text-brand-dark">Wybierz daty</h2>
                        <Dialog.Close className="rounded-full bg-gray-50 p-2.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500">
                          <CloseIcon />
                        </Dialog.Close>
                      </div>

                      {priceHint && (
                        <div className="mb-8 rounded-2xl bg-brand/5 px-6 py-4 ring-1 ring-inset ring-brand/10">
                          <p className="text-sm font-bold text-brand-dark">{priceHint}</p>
                        </div>
                      )}

                      <div className="flex justify-center">
                        <DayPicker
                          mode="range"
                          locale={pl}
                          numberOfMonths={months}
                          selected={range}
                          onMonthChange={onVisibleMonthChange}
                          onSelect={onRangeChange}
                          disabled={[{ before: today }, { after: toLimit }, ...disabledDays]}
                          classNames={CALENDAR_CLASSNAMES}
                        />
                      </div>

                      <div className="mt-10">
                        <Legend />
                      </div>
                    </div>
                  </div>
                </motion.div>
              </div>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  );
}
