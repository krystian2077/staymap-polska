"use client";

import * as Popover from "@radix-ui/react-popover";
import { addMonths, startOfDay, startOfToday } from "date-fns";
import { pl } from "date-fns/locale";
import { useEffect, useMemo, useState } from "react";
import { DayPicker, type DateRange } from "react-day-picker";

import { toISODateString } from "@/lib/dates";
import { formatDate } from "@/lib/utils/dates";

import type { BusyRange } from "./calendarUtils";
import { datesFromBlockedAndBusy } from "./calendarUtils";

export function DatePickerField({
  range,
  onRangeChange,
  bookedDates,
  busyRanges = [],
  priceHint,
  onCalendarOpen,
  onVisibleMonthChange,
}: {
  range: DateRange | undefined;
  onRangeChange: (r: DateRange | undefined) => void;
  bookedDates: string[];
  busyRanges?: BusyRange[];
  /** Tekst z GET price-calendar (np. „od X do Y zł / noc”). */
  priceHint?: string | null;
  onCalendarOpen?: () => void;
  onVisibleMonthChange?: (month: Date) => void;
}) {
  const [open, setOpen] = useState(false);
  const [months, setMonths] = useState(1);
  const [activeCell, setActiveCell] = useState<"in" | "out">("in");

  useEffect(() => {
    const w = () => setMonths(window.innerWidth >= 768 ? 2 : 1);
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

  const inLabel = range?.from ? formatDate(toISODateString(range.from)) : null;
  const outLabel = range?.to ? formatDate(toISODateString(range.to)) : null;

  return (
    <Popover.Root
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (v) onCalendarOpen?.();
      }}
    >
      <div className="grid grid-cols-2 overflow-hidden rounded-[10px] border-[1.5px] border-gray-200">
        <Popover.Trigger asChild>
          <button
            type="button"
            onClick={() => {
              setActiveCell("in");
              setOpen(true);
            }}
            className={`border-r border-gray-200 px-3.5 py-2.5 text-left transition-colors hover:bg-brand-surface ${
              activeCell === "in" && open ? "border-brand bg-[#dcfce7]" : ""
            }`}
          >
            <span className="mb-0.5 block text-[10px] font-bold uppercase tracking-wide text-gray-400">
              Przyjazd
            </span>
            <span className={inLabel ? "font-semibold text-brand-dark" : "text-gray-400"}>
              {inLabel ?? "Dodaj daty"}
            </span>
          </button>
        </Popover.Trigger>
        <Popover.Trigger asChild>
          <button
            type="button"
            onClick={() => {
              setActiveCell("out");
              setOpen(true);
            }}
            className={`px-3.5 py-2.5 text-left transition-colors hover:bg-brand-surface ${
              activeCell === "out" && open ? "bg-[#dcfce7]" : ""
            }`}
          >
            <span className="mb-0.5 block text-[10px] font-bold uppercase tracking-wide text-gray-400">
              Wyjazd
            </span>
            <span className={outLabel ? "font-semibold text-brand-dark" : "text-gray-400"}>
              {outLabel ?? "Dodaj daty"}
            </span>
          </button>
        </Popover.Trigger>
      </div>
      <Popover.Portal>
        <Popover.Content
          className="z-50 rounded-[14px] border-[1.5px] border-gray-200 bg-white p-4 shadow-[0_8px_32px_rgba(0,0,0,.12)]"
          sideOffset={8}
          align="start"
        >
          {priceHint ? (
            <p className="mb-3 rounded-lg bg-brand-surface px-2.5 py-2 text-center text-[11px] font-semibold leading-snug text-brand-dark">
              {priceHint}
            </p>
          ) : null}
          <DayPicker
            mode="range"
            locale={pl}
            numberOfMonths={months}
            selected={range}
            onMonthChange={(m) => onVisibleMonthChange?.(m)}
            onSelect={(r) => {
              onRangeChange(r);
              if (r?.from && r?.to) setOpen(false);
            }}
            disabled={[{ before: today }, { after: toLimit }, ...disabledDays]}
            classNames={{
              months: "flex flex-col gap-6 md:flex-row",
              month: "space-y-3",
              month_caption: "flex items-center justify-center relative h-9",
              caption_label: "text-sm font-bold text-brand-dark capitalize",
              nav: "flex items-center gap-1 absolute inset-x-0 top-0 justify-between",
              button_previous:
                "inline-flex h-7 w-7 items-center justify-center rounded-full border border-gray-200 text-gray-500 hover:border-brand hover:text-brand transition-colors disabled:opacity-40",
              button_next:
                "inline-flex h-7 w-7 items-center justify-center rounded-full border border-gray-200 text-gray-500 hover:border-brand hover:text-brand transition-colors disabled:opacity-40",
              chevron: "h-3 w-3 fill-current",
              weekdays: "flex",
              weekday: "flex-1 text-center text-[11px] font-semibold text-gray-400 pb-1",
              weeks: "space-y-0.5",
              week: "flex",
              day: "flex-1 flex items-center justify-center",
              day_button:
                "h-9 w-9 flex items-center justify-center rounded-full text-sm font-medium text-gray-800 hover:bg-brand-surface transition-colors duration-150",
              selected: "!bg-brand-dark !text-white rounded-full",
              range_start: "!bg-brand-dark !text-white rounded-full",
              range_end: "!bg-brand-dark !text-white rounded-full",
              range_middle: "!bg-[#dcfce7] !text-brand-dark [&>button]:rounded-none",
              today: "font-bold [&>button]:ring-[1.5px] [&>button]:ring-brand",
              disabled: "opacity-50 [&>button]:line-through [&>button]:cursor-not-allowed",
              outside: "opacity-0 pointer-events-none",
              hidden: "invisible",
            }}
          />
          <div className="mt-3 flex flex-wrap gap-3 text-[11px] text-gray-400">
            <span>
              <span className="mr-1 inline-block h-2 w-2 rounded-full bg-brand-dark" /> Wybrane
            </span>
            <span>
              <span className="mr-1 inline-block h-2 w-2 rounded-full bg-[#dcfce7]" /> Zakres
            </span>
            <span>
              <span className="mr-1 inline-block h-2 w-2 rounded-full bg-red-50" /> Niedostępne
            </span>
          </div>
          <Popover.Arrow className="fill-white" />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
