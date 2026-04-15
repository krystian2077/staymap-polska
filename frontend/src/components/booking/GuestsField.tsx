"use client";

import * as Dialog from "@radix-ui/react-dialog";
import * as Popover from "@radix-ui/react-popover";
import { useState } from "react";

import { formatGuests } from "@/lib/utils/booking";
import { useMatchMedia } from "@/lib/useMatchMedia";

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
  const narrow = useMatchMedia("(max-width: 767px)");

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

  const trigger = (
    <button
      type="button"
      className={`flex w-full items-center justify-between rounded-[1.5rem] bg-white px-5 py-4 text-left transition-all hover:bg-gray-50/80 ${
        open ? "z-10 ring-2 ring-brand/20" : ""
      }`}
    >
      <div>
        <span className="mb-1 block text-[10px] font-black uppercase tracking-widest text-gray-400 transition-colors group-hover:text-brand">
          Goście
        </span>
        <span className="text-[15px] font-bold text-brand-dark">
          {formatGuests(adults, kids)}
          {pets > 0 ? ` · ${pets} zwierz.` : ""}
        </span>
      </div>
      <div className={`transition-transform duration-500 ${open ? "rotate-180 text-brand" : "text-gray-300"}`}>
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </button>
  );

  const pickerBody = (
    <>
      <div className="space-y-1 divide-y divide-gray-50">
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
    </>
  );

  if (narrow) {
    return (
      <Dialog.Root open={open} onOpenChange={setOpen}>
        <Dialog.Trigger asChild>{trigger}</Dialog.Trigger>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-[600] bg-black/45 backdrop-blur-sm" />
          <Dialog.Content className="fixed inset-x-0 bottom-0 z-[601] max-h-[min(88dvh,640px)] rounded-t-[1.5rem] border border-gray-200 bg-white p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] shadow-2xl outline-none dark:border-brand-border dark:bg-[var(--bg2)]">
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-gray-300 dark:bg-zinc-600 md:hidden" aria-hidden />
            <Dialog.Title className="text-lg font-black text-brand-dark">Goście</Dialog.Title>
            <Dialog.Description className="sr-only">Ustaw liczbę dorosłych, dzieci i zwierząt.</Dialog.Description>
            <div className="mt-4 max-h-[min(60dvh,420px)] overflow-y-auto overscroll-contain">{pickerBody}</div>
            <div className="mt-4 flex justify-end">
              <Dialog.Close asChild>
                <button
                  type="button"
                  className="min-h-[var(--tap-min,44px)] rounded-2xl bg-brand px-6 text-sm font-bold text-white"
                >
                  Gotowe
                </button>
              </Dialog.Close>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    );
  }

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>{trigger}</Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          className="z-[600] mt-2 w-[min(100vw-2rem,360px)] rounded-[2rem] border border-gray-100 bg-white p-6 shadow-[0_20px_50px_rgba(0,0,0,0.15)] backdrop-blur-xl dark:border-brand-border dark:bg-[var(--bg2)]"
          sideOffset={8}
          align="end"
        >
          {pickerBody}
          <Popover.Arrow className="fill-white dark:fill-[var(--bg2)]" />
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
    <div className="flex items-center justify-between py-4">
      <div>
        <p className="text-[15px] font-black tracking-tight text-brand-dark">{label}</p>
        <p className="text-xs font-medium text-gray-400">{sub}</p>
      </div>
      <div className="flex items-center gap-4">
        <button
          type="button"
          disabled={value <= min}
          onClick={() => onChange(value - 1)}
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-gray-100 text-xl font-medium transition-all hover:border-brand hover:bg-brand/5 hover:text-brand disabled:cursor-not-allowed disabled:opacity-20"
        >
          −
        </button>
        <span className="min-w-[1.5rem] text-center text-[16px] font-black text-brand-dark">{value}</span>
        <button
          type="button"
          disabled={value >= max}
          onClick={() => onChange(value + 1)}
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-gray-100 text-xl font-medium transition-all hover:border-brand hover:bg-brand/5 hover:text-brand disabled:cursor-not-allowed disabled:opacity-20"
        >
          +
        </button>
      </div>
    </div>
  );
}
