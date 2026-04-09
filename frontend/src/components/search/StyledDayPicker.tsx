"use client";

import { pl } from "date-fns/locale";
import type { DateRange } from "react-day-picker";
import { DayPicker } from "react-day-picker";
import { cn } from "@/lib/utils";

type Props = {
  selected?: DateRange | undefined;
  onSelect?: (range: DateRange | undefined) => void;
  numberOfMonths?: number;
  className?: string;
};

const cls = {
  root: "p-1",
  months: "flex gap-6",
  month: "space-y-3",
  month_caption: "flex items-center justify-center px-8 relative h-8",
  caption_label: "text-sm font-semibold text-gray-800 capitalize",
  nav: "flex items-center gap-1 absolute inset-x-0 top-0 justify-between",
  button_previous:
    "inline-flex h-7 w-7 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500 hover:bg-gray-50 hover:text-gray-800 transition-colors disabled:opacity-30",
  button_next:
    "inline-flex h-7 w-7 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500 hover:bg-gray-50 hover:text-gray-800 transition-colors disabled:opacity-30",
  chevron: "h-3.5 w-3.5 fill-current",
  weekdays: "flex mt-1",
  weekday: "flex-1 text-center text-[11px] font-semibold text-gray-400 pb-1.5 uppercase",
  weeks: "space-y-0.5",
  week: "flex",
  day: "flex-1 flex items-center justify-center p-0",
  day_button: cn(
    "h-8 w-8 text-[13px] font-medium text-gray-700 rounded-full",
    "transition-colors duration-150 hover:bg-brand/10 hover:text-brand-dark",
    "disabled:opacity-30 disabled:cursor-not-allowed",
  ),
  today: "font-bold text-brand",
  outside: "opacity-30",
  disabled: "opacity-30 cursor-not-allowed",
  hidden: "invisible",
  selected: "!bg-brand !text-white hover:!bg-brand-700 rounded-full",
  range_start: "!bg-brand !text-white hover:!bg-brand-700 rounded-full",
  range_middle: "!bg-brand/10 !text-brand-dark rounded-none [&>button]:rounded-none",
  range_end: "!bg-brand !text-white hover:!bg-brand-700 rounded-full",
  focused: "ring-2 ring-brand/40 outline-none",
};

export function StyledDayPicker({ selected, onSelect, numberOfMonths = 2, className }: Props) {
  return (
    <DayPicker
      mode="range"
      selected={selected}
      onSelect={onSelect}
      numberOfMonths={numberOfMonths}
      locale={pl}
      classNames={cls}
      className={className}
    />
  );
}
