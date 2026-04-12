"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import { type DateRange } from "react-day-picker";

import { toISODateString } from "@/lib/dates";
import { formatDate } from "@/lib/utils/dates";

import type { BusyRange } from "./calendarUtils";
import { BookingCalendarModal } from "./BookingCalendarModal";

export function DatePickerField({
  range,
  onRangeChange,
  arrivalTime,
  onArrivalTimeChange,
  departureTime,
  onDepartureTimeChange,
  bookedDates,
  busyRanges = [],
  priceHint,
  onCalendarOpen,
  onVisibleMonthChange,
}: {
  range: DateRange | undefined;
  onRangeChange: (r: DateRange | undefined) => void;
  arrivalTime: string;
  onArrivalTimeChange: (t: string) => void;
  departureTime: string;
  onDepartureTimeChange: (t: string) => void;
  bookedDates: string[];
  busyRanges?: BusyRange[];
  priceHint?: string | null;
  onCalendarOpen?: () => void;
  onVisibleMonthChange?: (month: Date) => void;
}) {
  const [open, setOpen] = useState(false);
  const [activeCell, setActiveCell] = useState<"in" | "out">("in");

  const inLabel = range?.from ? formatDate(toISODateString(range.from)) : null;
  const outLabel = range?.to ? formatDate(toISODateString(range.to)) : null;

  return (
    <>
      <div className="grid grid-cols-2 overflow-hidden rounded-[1.5rem] bg-white transition-all shadow-sm ring-1 ring-gray-100">
        <button
          type="button"
          onClick={() => {
            setActiveCell("in");
            setOpen(true);
            onCalendarOpen?.();
          }}
          className={`group relative flex flex-col border-r border-gray-100 px-5 py-4 text-left transition-all hover:bg-gray-50/80 ${
            activeCell === "in" && open ? "bg-white ring-2 ring-inset ring-brand/20 z-10" : ""
          }`}
        >
          <span className="mb-1 block text-[10px] font-black uppercase tracking-widest text-gray-400 group-hover:text-brand transition-colors">
            Przyjazd
          </span>
          <div className="flex items-center gap-2">
            <span className={`text-[15px] ${inLabel ? "font-bold text-brand-dark" : "font-medium text-gray-400"}`}>
              {inLabel ?? "Dodaj datę"}
            </span>
            {inLabel && (
              <span className="text-[11px] font-black text-brand/60">{arrivalTime}</span>
            )}
          </div>
          {activeCell === "in" && open && (
            <motion.div layoutId="active-indicator" className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand" />
          )}
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveCell("out");
            setOpen(true);
            onCalendarOpen?.();
          }}
          className={`group relative flex flex-col px-5 py-4 text-left transition-all hover:bg-gray-50/80 ${
            activeCell === "out" && open ? "bg-white ring-2 ring-inset ring-brand/20 z-10" : ""
          }`}
        >
          <span className="mb-1 block text-[10px] font-black uppercase tracking-widest text-gray-400 group-hover:text-brand transition-colors">
            Wyjazd
          </span>
          <div className="flex items-center gap-2">
            <span className={`text-[15px] ${outLabel ? "font-bold text-brand-dark" : "font-medium text-gray-400"}`}>
              {outLabel ?? "Dodaj datę"}
            </span>
            {outLabel && (
              <span className="text-[11px] font-black text-brand/60">{departureTime}</span>
            )}
          </div>
          {activeCell === "out" && open && (
            <motion.div layoutId="active-indicator" className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand" />
          )}
        </button>
      </div>

      <BookingCalendarModal
        open={open}
        onOpenChange={setOpen}
        range={range}
        onRangeChange={onRangeChange}
        arrivalTime={arrivalTime}
        onArrivalTimeChange={onArrivalTimeChange}
        departureTime={departureTime}
        onDepartureTimeChange={onDepartureTimeChange}
        bookedDates={bookedDates}
        busyRanges={busyRanges}
        priceHint={priceHint}
        onVisibleMonthChange={onVisibleMonthChange}
      />
    </>
  );
}
