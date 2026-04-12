"use client";

import { addMonths, startOfDay, startOfToday } from "date-fns";
import { pl } from "date-fns/locale";
import { useEffect, useMemo, useState } from "react";
import { DayPicker, type DateRange } from "react-day-picker";

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
          months: "flex flex-col gap-6 sm:flex-row",
          month: "space-y-3",
          month_caption: "flex items-center justify-center relative h-9",
          caption_label: "text-sm font-bold text-brand-dark capitalize",
          nav: "flex items-center gap-1 absolute inset-x-0 top-0 justify-between",
          button_previous:
            "inline-flex h-7 w-7 items-center justify-center rounded-full border border-gray-200 text-gray-500 hover:bg-brand-surface hover:text-brand-dark transition-colors disabled:opacity-40",
          button_next:
            "inline-flex h-7 w-7 items-center justify-center rounded-full border border-gray-200 text-gray-500 hover:bg-brand-surface hover:text-brand-dark transition-colors disabled:opacity-40",
          chevron: "h-3.5 w-3.5 fill-current",
          weekdays: "flex",
          weekday: "flex-1 text-center text-[11px] font-semibold uppercase text-text-muted pb-1",
          weeks: "space-y-0.5",
          week: "flex",
          day: "flex-1 flex items-center justify-center",
          day_button:
            "h-9 w-9 flex items-center justify-center rounded-full text-sm font-medium text-text hover:bg-brand-muted transition-colors duration-150",
          selected: "!bg-brand !text-white rounded-full",
          range_start: "!bg-brand !text-white rounded-full",
          range_end: "!bg-brand !text-white rounded-full",
          range_middle: "!bg-brand-muted !text-brand-dark [&>button]:rounded-none",
          today: "font-bold",
          disabled: "opacity-40 [&>button]:line-through [&>button]:cursor-not-allowed",
          outside: "opacity-0 pointer-events-none",
          hidden: "invisible",
        }}
      />
    </div>
  );
}
