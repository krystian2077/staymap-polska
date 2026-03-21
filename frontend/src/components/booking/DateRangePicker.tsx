"use client";

import { addMonths, startOfDay, startOfToday } from "date-fns";
import { pl } from "date-fns/locale";
import { useEffect, useMemo, useState } from "react";
import { DayPicker, type DateRange } from "react-day-picker";

import "react-day-picker/style.css";

import type { BusyRange } from "./calendarUtils";
import { datesFromBlockedAndBusy } from "./calendarUtils";

export function DateRangePicker({
  range,
  onRangeChange,
  blockedDates,
  busyRanges,
}: {
  range: DateRange | undefined;
  onRangeChange: (r: DateRange | undefined) => void;
  blockedDates: string[];
  busyRanges: BusyRange[];
}) {
  const disabledDays = useMemo(
    () => datesFromBlockedAndBusy(blockedDates, busyRanges),
    [blockedDates, busyRanges]
  );

  const today = startOfToday();
  const toLimit = startOfDay(addMonths(today, 18));
  const [months, setMonths] = useState(1);
  useEffect(() => {
    const w = () => setMonths(window.innerWidth >= 640 ? 2 : 1);
    w();
    window.addEventListener("resize", w);
    return () => window.removeEventListener("resize", w);
  }, []);

  return (
    <div className="booking-calendar rounded-xl border border-gray-200 bg-white p-3 sm:p-4">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-text-muted">
        Termin pobytu
      </p>
      <DayPicker
        mode="range"
        locale={pl}
        numberOfMonths={months}
        selected={range}
        onSelect={onRangeChange}
        disabled={[{ before: today }, { after: toLimit }, ...disabledDays]}
        classNames={{
          months: "flex flex-col gap-4 sm:flex-row sm:gap-8",
          month: "space-y-3",
          caption_label: "text-sm font-bold text-brand-dark capitalize",
          nav: "flex items-center gap-1",
          button_previous:
            "h-8 w-8 rounded-md border border-gray-200 text-sm hover:bg-brand-surface disabled:opacity-40",
          button_next:
            "h-8 w-8 rounded-md border border-gray-200 text-sm hover:bg-brand-surface disabled:opacity-40",
          weekdays: "flex gap-1 text-[11px] font-semibold uppercase text-text-muted",
          weekday: "w-9 text-center",
          week: "mt-1 flex gap-1",
          day: "h-9 w-9 text-center text-sm",
          day_button:
            "mx-auto flex h-9 w-9 items-center justify-center rounded-md font-medium text-text hover:bg-brand-muted",
          selected: "bg-brand text-white hover:bg-brand hover:text-white rounded-md",
          range_start: "bg-brand text-white rounded-l-md rounded-r-none",
          range_end: "bg-brand text-white rounded-r-md rounded-l-none",
          range_middle: "bg-brand-muted text-brand-dark rounded-none",
          today: "ring-1 ring-brand/40",
          disabled: "text-gray-300 line-through",
        }}
      />
    </div>
  );
}
