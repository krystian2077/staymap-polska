"use client";

import * as Popover from "@radix-ui/react-popover";
import { format } from "date-fns";
import { pl } from "date-fns/locale";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import type { DateRange } from "react-day-picker";
import { DayPicker } from "react-day-picker";
import "react-day-picker/style.css";
import { api, apiUrl } from "@/lib/api";
import { buildSearchQueryString, normalizedAiParamsToState } from "@/lib/searchQuery";
import { useSearchStore } from "@/lib/store/searchStore";
import { cn } from "@/lib/utils";
import { TRAVEL_MODE_ITEMS, TravelModeSelector } from "./TravelModeSelector";

export type HeroSearchBarProps = {
  variant: "hero" | "strip";
};

function useDebounced<T>(value: T, ms: number): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

export function HeroSearchBar({ variant }: HeroSearchBarProps) {
  const router = useRouter();
  const params = useSearchStore((s) => s.params);
  const setParams = useSearchStore((s) => s.setParams);

  const [locInput, setLocInput] = useState(params.location || "");
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<
    { label: string; lat: number; lng: number }[]
  >([]);
  const debouncedLoc = useDebounced(locInput, 300);

  const [range, setRange] = useState<DateRange | undefined>(() =>
    params.date_from && params.date_to
      ? { from: new Date(params.date_from), to: new Date(params.date_to) }
      : undefined
  );
  const [guests, setGuests] = useState(params.guests ?? 2);
  const [dateOpen, setDateOpen] = useState(false);
  const [guestOpen, setGuestOpen] = useState(false);
  const [modeOpen, setModeOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiBusy, setAiBusy] = useState(false);

  useEffect(() => {
    if (!debouncedLoc.trim()) {
      setSuggestions([]);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          apiUrl(`/api/v1/geocode/?q=${encodeURIComponent(debouncedLoc.trim())}`),
          { cache: "no-store" }
        );
        const j = (await res.json()) as {
          data?: { lat: number; lng: number; display_name?: string };
          meta?: { found?: boolean };
        };
        if (cancelled) return;
        if (j.data && j.meta?.found !== false) {
          setSuggestions([
            {
              label: j.data.display_name || debouncedLoc,
              lat: j.data.lat,
              lng: j.data.lng,
            },
          ]);
        } else {
          setSuggestions([]);
        }
      } catch {
        if (!cancelled) setSuggestions([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [debouncedLoc]);

  const runSearch = useCallback(() => {
    const df = range?.from ? format(range.from, "yyyy-MM-dd") : undefined;
    const dt = range?.to ? format(range.to, "yyyy-MM-dd") : undefined;
    const merged = {
      ...params,
      location: locInput.trim(),
      date_from: df,
      date_to: dt,
      guests,
      radius_km: params.radius_km ?? 50,
      ordering: params.ordering || "recommended",
    };
    setParams(merged);
    router.push(`/search?${buildSearchQueryString(merged)}`);
  }, [guests, locInput, params, range, router, setParams]);

  const dateLabel =
    range?.from && range?.to
      ? `${format(range.from, "d MMM", { locale: pl })} — ${format(range.to, "d MMM", { locale: pl })}`
      : "Kiedy?";

  const modeMeta = TRAVEL_MODE_ITEMS.find((m) => m.id === params.travel_mode);
  const modeLabel = modeMeta ? `${modeMeta.emoji} ${modeMeta.label}` : "Tryb";

  const summary = [
    params.location || locInput || "Dowolna lokalizacja",
    range?.from && range?.to ? dateLabel : null,
    guests ? `${guests} gości` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const divider = (
    <span className="hidden h-8 w-px shrink-0 bg-gray-200 sm:block" aria-hidden />
  );

  const locationBlock = (
    <div className="relative min-w-0 flex-1">
      <Popover.Root open={suggestOpen} onOpenChange={setSuggestOpen}>
        <Popover.Anchor asChild>
          <div className="flex items-center gap-2.5 px-1 sm:px-2">
            <svg
              className="h-[18px] w-[18px] shrink-0 text-text-muted focus-within:text-brand"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              value={locInput}
              onChange={(e) => {
                setLocInput(e.target.value);
                setSuggestOpen(true);
              }}
              onFocus={() => setSuggestOpen(true)}
              placeholder="Zakopane, Mazury, Bieszczady…"
              className="min-w-0 flex-1 border-0 bg-transparent py-2 text-[15px] text-text outline-none placeholder:text-text-muted"
            />
          </div>
        </Popover.Anchor>
        <Popover.Portal>
          <Popover.Content
            className="card z-50 max-h-64 w-[min(100vw-2rem,var(--radix-popover-trigger-width))] overflow-y-auto p-1 shadow-elevated"
            sideOffset={6}
            align="start"
          >
            {suggestions.map((s) => (
              <button
                key={s.label}
                type="button"
                className="w-full rounded-md px-3.5 py-2.5 text-left text-sm hover:bg-brand-surface"
                onClick={() => {
                  setLocInput(s.label.split(",")[0]?.trim() || s.label);
                  setParams({ location: s.label, lat: s.lat, lng: s.lng });
                  setSuggestOpen(false);
                }}
              >
                {s.label}
              </button>
            ))}
            {!suggestions.length && debouncedLoc.trim() && (
              <p className="px-3 py-2 text-xs text-text-muted">Brak podpowiedzi — wpisz dokładniej lub szukaj.</p>
            )}
            <Popover.Arrow className="fill-white" />
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
    </div>
  );

  const dateBlock = (
    <Popover.Root open={dateOpen} onOpenChange={setDateOpen}>
      <Popover.Trigger asChild>
        <button
          type="button"
          className="shrink-0 whitespace-nowrap px-2 py-2 text-left text-[15px] text-text-secondary transition-colors hover:text-brand-dark sm:px-3"
        >
          {dateLabel}
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          className="card z-50 p-3 shadow-elevated"
          sideOffset={8}
        >
          <DayPicker
            mode="range"
            selected={range}
            onSelect={setRange}
            numberOfMonths={2}
            locale={pl}
            className="rounded-lg"
          />
          <Popover.Arrow className="fill-white" />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );

  const guestBlock = (
    <Popover.Root open={guestOpen} onOpenChange={setGuestOpen}>
      <Popover.Trigger asChild>
        <button
          type="button"
          className="shrink-0 whitespace-nowrap px-2 py-2 text-[15px] text-text-secondary transition-colors hover:text-brand-dark sm:px-3"
        >
          {guests} {guests === 1 ? "gość" : "gości"}
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content className="card z-50 w-56 p-4 shadow-elevated" sideOffset={8}>
          <p className="mb-2 text-xs font-semibold text-text-muted">Dorośli</p>
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              className="rounded-md border border-gray-200 px-3 py-1 text-lg"
              onClick={() => setGuests((g) => Math.max(1, g - 1))}
            >
              −
            </button>
            <span className="font-bold">{guests}</span>
            <button
              type="button"
              className="rounded-md border border-gray-200 px-3 py-1 text-lg"
              onClick={() => setGuests((g) => Math.min(16, g + 1))}
            >
              +
            </button>
          </div>
          <Popover.Arrow className="fill-white" />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );

  const modeBlock = (
    <Popover.Root open={modeOpen} onOpenChange={setModeOpen}>
      <Popover.Trigger asChild>
        <button
          type="button"
          className="shrink-0 whitespace-nowrap px-2 py-2 text-[15px] font-medium text-text-secondary transition-colors hover:text-brand-dark sm:px-3"
        >
          {modeLabel}
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          className="card z-50 w-[min(100vw-2rem,320px)] p-3 shadow-elevated"
          sideOffset={8}
        >
          <div className="grid grid-cols-3 gap-2">
            {TRAVEL_MODE_ITEMS.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => {
                  setParams({ travel_mode: params.travel_mode === m.id ? undefined : m.id });
                  setModeOpen(false);
                }}
                className={cn(
                  "flex flex-col items-center gap-1 rounded-xl border p-2 text-center text-[11px] font-bold transition-colors",
                  params.travel_mode === m.id
                    ? "border-brand bg-brand-muted text-brand-dark"
                    : "border-gray-200 hover:bg-brand-surface"
                )}
              >
                <span className="text-lg">{m.emoji}</span>
                {m.label}
              </button>
            ))}
          </div>
          <Popover.Arrow className="fill-white" />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );

  const runAiSearch = useCallback(async () => {
    const text = aiPrompt.trim();
    if (!text) {
      toast.error("Wpisz opis wyjazdu.");
      return;
    }
    const token = typeof window !== "undefined" ? localStorage.getItem("access") : null;
    if (!token) {
      toast.error("Zaloguj się, aby użyć wyszukiwania AI.");
      return;
    }
    setAiBusy(true);
    try {
      const start = await api.post<{ data: { session_id: string; status: string } }>(
        "/api/v1/ai/search/",
        { prompt: text }
      );
      const sid = start.data.session_id;
      for (let i = 0; i < 40; i++) {
        const detail = await api.get<{
          data: {
            status: string;
            error_message?: string | null;
            interpretation?: { normalized_params?: Record<string, unknown> } | null;
          };
        }>(`/api/v1/ai/search/${sid}/`);
        const st = detail.data.status;
        if (st === "failed") {
          toast.error(detail.data.error_message || "AI nie zinterpretowało zapytania.");
          return;
        }
        if (st === "complete") {
          const raw = detail.data.interpretation?.normalized_params ?? {};
          const merged = normalizedAiParamsToState(raw);
          setParams(merged);
          router.push(`/search?${buildSearchQueryString(merged)}`);
          toast.success("Przekierowuję do wyników…");
          return;
        }
        await new Promise((r) => setTimeout(r, 350));
      }
      toast.error("Przekroczono czas oczekiwania na AI.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Błąd AI");
    } finally {
      setAiBusy(false);
    }
  }, [aiPrompt, router, setParams]);

  const searchBtn = (
    <button
      type="button"
      onClick={runSearch}
      className="flex shrink-0 items-center gap-2 rounded-[14px] bg-brand px-6 py-3 text-sm font-bold text-white shadow-[0_8px_20px_rgba(22,163,74,.35)] transition-all duration-200 hover:-translate-y-px hover:bg-brand-700"
    >
      <svg className="h-[15px] w-[15px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
      Szukaj
    </button>
  );

  if (variant === "hero") {
    return (
      <div className="mx-auto mb-10 w-full max-w-[760px] space-y-3">
        <div
          className={cn(
            "flex flex-col gap-3 rounded-[20px] border-[1.5px] border-gray-200 bg-white p-2.5 shadow-[0_8px_40px_rgba(0,0,0,.1),0_2px_8px_rgba(22,163,74,.06)] transition-[box-shadow,border-color] duration-300 hover:border-brand-border hover:shadow-[0_16px_48px_rgba(0,0,0,.12),0_4px_16px_rgba(22,163,74,.1)] sm:flex-row sm:items-center sm:pl-5"
          )}
        >
          <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center">
            {locationBlock}
            {divider}
            {dateBlock}
            {divider}
            {guestBlock}
            {divider}
            {modeBlock}
          </div>
          <div className="flex justify-end sm:pl-2">{searchBtn}</div>
          <p className="col-span-full px-1 text-center text-[11px] text-text-muted sm:text-left">
            Geokodowanie przez backend (Nominatim).{" "}
            <Link href="/search" className="font-semibold text-brand hover:underline">
              Pełna wyszukiwarka
            </Link>
          </p>
        </div>
        <div className="rounded-[16px] border border-dashed border-brand-border/80 bg-white/80 px-4 py-3">
          <button
            type="button"
            onClick={() => setAiOpen((o) => !o)}
            className="flex w-full items-center justify-between text-left text-sm font-bold text-brand-dark"
          >
            <span>✨ Szukaj z AI (język naturalny)</span>
            <span className="text-brand">{aiOpen ? "▲" : "▼"}</span>
          </button>
          {aiOpen ? (
            <div className="mt-3 space-y-2">
              <textarea
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                placeholder="Np. „Romantyczny domek nad jeziorem dla dwojga, max 400 zł, lipiec”"
                rows={3}
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-text outline-none focus:border-brand"
              />
              <button
                type="button"
                onClick={() => void runAiSearch()}
                disabled={aiBusy}
                className="rounded-xl bg-brand-dark px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60"
              >
                {aiBusy ? "Szukam…" : "Interpretuj i pokaż oferty"}
              </button>
              <p className="text-[11px] text-text-muted">
                Wymaga konta i skonfigurowanego klucza API (OpenAI lub Groq) po stronie backendu.
              </p>
            </div>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-[1400px] flex-wrap items-center gap-2.5 px-6 py-2.5">
      <Popover.Root open={filtersOpen} onOpenChange={setFiltersOpen}>
        <Popover.Trigger asChild>
          <button
            type="button"
            className="min-w-[260px] max-w-md flex-1 rounded-[10px] border-[1.5px] border-gray-200 px-3.5 py-2 text-left text-sm text-text-secondary transition-colors hover:border-brand"
          >
            {summary}
          </button>
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Content
            className="card z-50 w-[min(100vw-2rem,400px)] space-y-3 p-4 shadow-elevated"
            sideOffset={8}
          >
            <div className="space-y-2">{locationBlock}</div>
            <DayPicker
              mode="range"
              selected={range}
              onSelect={setRange}
              numberOfMonths={2}
              locale={pl}
            />
            <div className="flex items-center justify-between text-sm">
              <span>Goście</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="rounded border px-2"
                  onClick={() => setGuests((g) => Math.max(1, g - 1))}
                >
                  −
                </button>
                <span className="font-bold">{guests}</span>
                <button
                  type="button"
                  className="rounded border px-2"
                  onClick={() => setGuests((g) => Math.min(16, g + 1))}
                >
                  +
                </button>
              </div>
            </div>
            <Popover.Arrow className="fill-white" />
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>

      <TravelModeSelector
        variant="search"
        selected={params.travel_mode ?? null}
        onChange={(m) => setParams({ travel_mode: m ?? undefined })}
        className="max-w-[min(100vw-8rem,520px)]"
      />
      {searchBtn}
    </div>
  );
}
