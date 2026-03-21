"use client";

import * as Popover from "@radix-ui/react-popover";
import { useState } from "react";

import { formatGuests } from "@/lib/utils/booking";

export function GuestsField({
  adults,
  kids,
  pets,
  maxGuests,
  onChange,
}: {
  adults: number;
  kids: number;
  pets: number;
  maxGuests: number;
  onChange: (a: number, c: number, p: number) => void;
}) {
  const [open, setOpen] = useState(false);

  function setAdults(n: number) {
    const next = Math.max(1, n);
    const cap = maxGuests - kids;
    onChange(Math.min(next, cap), kids, pets);
  }

  function setKids(n: number) {
    const next = Math.max(0, n);
    const cap = maxGuests - adults;
    onChange(adults, Math.min(next, cap), pets);
  }

  function setPets(n: number) {
    onChange(adults, kids, Math.max(0, Math.min(n, maxGuests)));
  }

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          type="button"
          className="flex w-full items-center justify-between rounded-[10px] border-[1.5px] border-gray-200 px-3.5 py-2.5 text-left transition-colors hover:border-brand hover:bg-brand-surface"
        >
          <div>
            <span className="mb-0.5 block text-[10px] font-bold uppercase tracking-wide text-gray-400">
              Goście
            </span>
            <span className="font-medium text-brand-dark">
              {formatGuests(adults, kids)}
              {pets > 0 ? ` · ${pets} zwierz.` : ""}
            </span>
          </div>
          <span className="text-gray-400">{open ? "▲" : "▼"}</span>
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          className="z-50 mt-1 w-[min(100vw-2rem,320px)] rounded-[14px] border-[1.5px] border-gray-200 bg-white p-4 shadow-[0_8px_32px_rgba(0,0,0,.1)]"
          sideOffset={4}
        >
          <div className="space-y-0 divide-y divide-gray-100">
            <CounterRow
              label="Dorośli"
              sub="18+"
              value={adults}
              min={1}
              max={maxGuests - kids}
              onChange={setAdults}
            />
            <CounterRow
              label="Dzieci"
              sub="2–17"
              value={kids}
              min={0}
              max={maxGuests - adults}
              onChange={setKids}
            />
            <CounterRow
              label="Zwierzęta"
              sub={`max ${maxGuests} łącznie z gośćmi`}
              value={pets}
              min={0}
              max={maxGuests}
              onChange={setPets}
            />
          </div>
          <p className="mt-3 text-center text-[11px] text-gray-400">
            Maks. {maxGuests} gości (łącznie dorośli + dzieci).
          </p>
          <Popover.Arrow className="fill-white" />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

function CounterRow({
  label,
  sub,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  sub: string;
  value: number;
  min: number;
  max: number;
  onChange: (n: number) => void;
}) {
  return (
    <div className="flex items-center justify-between py-2.5">
      <div>
        <p className="text-sm font-semibold text-brand-dark">{label}</p>
        <p className="text-xs text-gray-400">{sub}</p>
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          disabled={value <= min}
          onClick={() => onChange(value - 1)}
          className="flex h-[30px] w-[30px] items-center justify-center rounded-full border-[1.5px] border-gray-200 text-lg font-medium transition-colors hover:border-brand hover:text-brand disabled:cursor-not-allowed disabled:opacity-35"
        >
          −
        </button>
        <span className="min-w-[1.5rem] text-center text-sm font-bold">{value}</span>
        <button
          type="button"
          disabled={value >= max}
          onClick={() => onChange(value + 1)}
          className="flex h-[30px] w-[30px] items-center justify-center rounded-full border-[1.5px] border-gray-200 text-lg font-medium transition-colors hover:border-brand hover:text-brand disabled:cursor-not-allowed disabled:opacity-35"
        >
          +
        </button>
      </div>
    </div>
  );
}
