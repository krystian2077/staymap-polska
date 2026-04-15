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
                  <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
                    {/* Sidebar with selection info */}
                    <div className="w-full shrink-0 border-b border-gray-100 bg-gray-50/50 p-6 lg:p-8 lg:w-72 lg:border-b-0 lg:border-r">
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
                          <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-1">
                            <div className="space-y-1.5">
                              <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Przyjazd</label>
                              <select 
                                value={arrivalTime}
                                onChange={(e) => onArrivalTimeChange(e.target.value)}
                                className="w-full rounded-xl border-gray-100 bg-white py-2.5 px-3 text-sm font-bold text-brand-dark shadow-sm ring-1 ring-inset ring-gray-100 focus:ring-brand"
                              >
                                {TIME_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                              </select>
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Wyjazd</label>
                              <select 
                                value={departureTime}
                                onChange={(e) => onDepartureTimeChange(e.target.value)}
                                className="w-full rounded-xl border-gray-100 bg-white py-2.5 px-3 text-sm font-bold text-brand-dark shadow-sm ring-1 ring-inset ring-gray-100 focus:ring-brand"
                              >
                                {TIME_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
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

                    {/* Main Calendar Area */}
                    <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6 md:p-10">
                      <div className="flex items-center justify-between mb-8">
                        <h2 className="text-2xl font-black tracking-tight text-brand-dark">Wybierz daty</h2>
                        <Dialog.Close className="rounded-full bg-gray-50 p-2.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500">
                          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                          </svg>
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
                          classNames={{
                            months: "relative flex flex-col gap-10 lg:flex-row lg:gap-20",
                            month: "space-y-6",
                            month_caption: "flex items-center justify-center relative h-10",
                            caption_label: "text-lg font-black text-brand-dark capitalize tracking-tight",
                            nav: "flex items-center gap-1 absolute inset-x-0 top-0 justify-between z-10",
                            button_previous:
                              "inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-gray-100 text-gray-400 hover:border-brand hover:text-brand hover:bg-brand/5 transition-all disabled:opacity-20",
                            button_next:
                              "inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-gray-100 text-gray-400 hover:border-brand hover:text-brand hover:bg-brand/5 transition-all disabled:opacity-20",
                            chevron: "h-5 w-5 fill-current",
                            weekdays: "flex",
                            weekday: "flex-1 text-center text-[12px] font-black text-gray-300 pb-4 uppercase tracking-[0.2em]",
                            weeks: "space-y-2",
                            week: "flex",
                            day: "flex-1 flex items-center justify-center p-0",
                            day_button:
                              "h-12 w-12 flex items-center justify-center rounded-2xl text-[15px] font-bold text-gray-700 hover:bg-brand/5 hover:text-brand transition-all duration-200 relative",
                            selected: "!bg-brand-dark !text-white !rounded-2xl shadow-xl shadow-brand/30 z-10",
                            range_start: "!bg-brand-dark !text-white !rounded-2xl",
                            range_end: "!bg-brand-dark !text-white !rounded-2xl",
                            range_middle: "!bg-brand/10 !text-brand-dark [&>button]:rounded-none",
                            today: "font-black text-brand [&>button]:ring-2 [&>button]:ring-inset [&>button]:ring-brand/50",
                            disabled: "opacity-20 [&>button]:line-through [&>button]:cursor-not-allowed",
                            outside: "opacity-0 pointer-events-none",
                            hidden: "invisible",
                          }}
                        />
                      </div>

                      <div className="mt-10 flex flex-wrap gap-6 border-t border-gray-50 pt-8 text-[12px] font-bold text-gray-400">
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
