"use client";

import * as Popover from "@radix-ui/react-popover";
import { format } from "date-fns";
import { pl } from "date-fns/locale";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import type { DateRange } from "react-day-picker";
import { api, apiUrl } from "@/lib/api";
import { StyledDayPicker } from "./StyledDayPicker";
import { buildSearchQueryString, normalizedAiParamsToState } from "@/lib/searchQuery";
import { useSearchStore } from "@/lib/store/searchStore";
import { cn } from "@/lib/utils";
import { TRAVEL_MODE_ITEMS } from "./TravelModeSelector";

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
  const sp = useSearchParams();
  const params = useSearchStore((s) => s.params);
  const setParams = useSearchStore((s) => s.setParams);

  // Local UI state — synced from store on external changes
  const [locInput, setLocInput] = useState(params.location || "");
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<
    { label: string; lat: number; lng: number }[]
  >([]);
  const debouncedLoc = useDebounced(locInput, 300);
  const locInputRef = useRef<HTMLInputElement>(null);

  const [range, setRange] = useState<DateRange | undefined>(() =>
    params.date_from && params.date_to
      ? { from: new Date(params.date_from), to: new Date(params.date_to) }
      : undefined
  );
  const [guests, setGuests] = useState(params.guests ?? 2);

  // Popover open state
  const [dateOpen, setDateOpen] = useState(false);
  const [guestOpen, setGuestOpen] = useState(false);
  const [modeOpen, setModeOpen] = useState(false);

  // AI search state
  const [aiOpen, setAiOpen] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiBusy, setAiBusy] = useState(false);

  // Keep local state in sync when store/URL changes externally
  useEffect(() => { setLocInput(params.location || ""); }, [params.location]);
  useEffect(() => { setGuests(params.guests ?? 2); }, [params.guests]);
  useEffect(() => {
    if (params.date_from && params.date_to && params.date_from !== params.date_to) {
      setRange({ from: new Date(params.date_from), to: new Date(params.date_to) });
    } else if (!params.date_from) {
      setRange(undefined);
    }
  }, [params.date_from, params.date_to]);

  // Geocode suggestions
  useEffect(() => {
    if (!debouncedLoc.trim()) { setSuggestions([]); return; }
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
          setSuggestions([{ label: j.data.display_name || debouncedLoc, lat: j.data.lat, lng: j.data.lng }]);
        } else {
          setSuggestions([]);
        }
      } catch {
        if (!cancelled) setSuggestions([]);
      }
    })();
    return () => { cancelled = true; };
  }, [debouncedLoc]);

  // Navigate with a patch applied on top of current URL params
  const navigate = useCallback(
    (patch: Partial<Record<string, string | undefined>>) => {
      const q = new URLSearchParams(sp.toString());
      for (const [key, val] of Object.entries(patch)) {
        if (val === undefined || val === "") {
          q.delete(key);
        } else {
          q.set(key, val);
        }
      }
      // Never send incomplete date pairs
      if ((q.has("date_from") && !q.has("date_to")) ||
          (!q.has("date_from") && q.has("date_to")) ||
          q.get("date_from") === q.get("date_to")) {
        q.delete("date_from");
        q.delete("date_to");
      }
      router.replace(`/search?${q.toString()}`);
    },
    [router, sp],
  );

  // Hero variant: collect all fields and push at once
  const runSearch = useCallback(() => {
    const df = range?.from ? format(range.from, "yyyy-MM-dd") : undefined;
    const dt = (range?.to && range.from && range.to.getTime() !== range.from.getTime())
      ? format(range.to, "yyyy-MM-dd")
      : undefined;
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

  // --- Individual live handlers for strip variant ---

  const handleSelectSuggestion = useCallback(
    (s: { label: string; lat: number; lng: number }) => {
      const shortLabel = s.label.split(",")[0]?.trim() || s.label;
      setLocInput(shortLabel);
      setSuggestOpen(false);
      navigate({
        location: s.label,
        latitude: String(s.lat),
        longitude: String(s.lng),
      });
    },
    [navigate],
  );

  const handleDateSelect = useCallback(
    (newRange: DateRange | undefined) => {
      setRange(newRange);
      if (
        newRange?.from &&
        newRange?.to &&
        newRange.from.getTime() !== newRange.to.getTime()
      ) {
        const df = format(newRange.from, "yyyy-MM-dd");
        const dt = format(newRange.to, "yyyy-MM-dd");
        setDateOpen(false);
        navigate({ date_from: df, date_to: dt });
      }
    },
    [navigate],
  );

  const handleClearDates = useCallback(() => {
    setRange(undefined);
    setDateOpen(false);
    navigate({ date_from: undefined, date_to: undefined });
  }, [navigate]);

  const handleGuestsApply = useCallback(
    (newGuests: number) => {
      setGuests(newGuests);
      navigate({ guests: String(newGuests) });
    },
    [navigate],
  );

  const handleModeChange = useCallback(
    (modeId: string) => {
      const current = sp.get("travel_mode");
      const newMode = current === modeId ? undefined : modeId;
      setModeOpen(false);
      navigate({ travel_mode: newMode });
    },
    [navigate, sp],
  );

  const handleClearLocation = useCallback(() => {
    setLocInput("");
    navigate({ location: undefined, latitude: undefined, longitude: undefined });
  }, [navigate]);

  // --- Labels ---
  const dateLabel =
    range?.from && range?.to && range.from.getTime() !== range.to.getTime()
      ? `${format(range.from, "d MMM", { locale: pl })} — ${format(range.to, "d MMM", { locale: pl })}`
      : "Kiedy?";

  const currentMode = sp.get("travel_mode");
  const modeMeta = TRAVEL_MODE_ITEMS.find((m) => m.id === currentMode);
  const modeLabel = modeMeta ? `${modeMeta.emoji} ${modeMeta.label}` : "Tryb";

  const hasDateRange = !!(range?.from && range?.to && range.from.getTime() !== range.to.getTime());

  // ── AI search ────────────────────────────────────────────────────────────
  const runAiSearch = useCallback(async () => {
    const text = aiPrompt.trim();
    if (!text) { toast.error("Wpisz opis wyjazdu."); return; }
    const token = typeof window !== "undefined" ? localStorage.getItem("access") : null;
    if (!token) { toast.error("Zaloguj się, aby użyć wyszukiwania AI."); return; }
    setAiBusy(true);
    try {
      const start = await api.post<{ data: { session_id: string; status: string } }>(
        "/api/v1/ai/search/", { prompt: text }
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
        if (st === "failed") { toast.error(detail.data.error_message || "AI nie zinterpretowało zapytania."); return; }
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

  // ── HERO VARIANT ─────────────────────────────────────────────────────────
  if (variant === "hero") {
    const divider = <span className="hidden h-8 w-px shrink-0 bg-gray-200 sm:block" aria-hidden />;

    return (
      <div className="mx-auto mb-10 w-full max-w-[760px] space-y-3">
        <div className="flex flex-col gap-3 rounded-[20px] border-[1.5px] border-gray-200 bg-white p-2.5 shadow-[0_8px_40px_rgba(0,0,0,.1),0_2px_8px_rgba(22,163,74,.06)] transition-[box-shadow,border-color] duration-300 hover:border-brand-border hover:shadow-[0_16px_48px_rgba(0,0,0,.12),0_4px_16px_rgba(22,163,74,.1)] sm:flex-row sm:items-center sm:pl-5">
          <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center">
            {/* Location */}
            <div className="relative min-w-0 flex-1">
              <Popover.Root open={suggestOpen} onOpenChange={setSuggestOpen}>
                <Popover.Anchor asChild>
                  <div className="flex items-center gap-2.5 px-1 sm:px-2">
                    <svg className="h-[18px] w-[18px] shrink-0 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input
                      value={locInput}
                      onChange={(e) => { setLocInput(e.target.value); setSuggestOpen(true); }}
                      onFocus={() => setSuggestOpen(true)}
                      placeholder="Zakopane, Mazury, Bieszczady…"
                      className="min-w-0 flex-1 border-0 bg-transparent py-2 text-[15px] text-text outline-none placeholder:text-text-muted"
                    />
                  </div>
                </Popover.Anchor>
                <Popover.Portal>
                  <Popover.Content
                    className="z-50 max-h-64 w-[min(100vw-2rem,var(--radix-popover-trigger-width))] overflow-y-auto rounded-xl border border-gray-200 bg-white p-1 shadow-[0_8px_32px_rgba(0,0,0,.12)]"
                    sideOffset={6} align="start" onOpenAutoFocus={(e) => e.preventDefault()}
                  >
                    {suggestions.map((s) => (
                      <button key={s.label} type="button"
                        className="w-full rounded-md px-3.5 py-2.5 text-left text-sm hover:bg-brand-surface"
                        onClick={() => handleSelectSuggestion(s)}>
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
            {divider}
            {/* Dates */}
            <Popover.Root open={dateOpen} onOpenChange={setDateOpen}>
              <Popover.Trigger asChild>
                <button type="button" className="shrink-0 whitespace-nowrap px-2 py-2 text-left text-[15px] text-text-secondary transition-colors hover:text-brand-dark sm:px-3">
                  {dateLabel}
                </button>
              </Popover.Trigger>
              <Popover.Portal>
                <Popover.Content className="z-50 rounded-xl border border-gray-200 bg-white p-3 shadow-[0_8px_40px_rgba(0,0,0,.14)]" sideOffset={8}>
                  <StyledDayPicker selected={range} onSelect={handleDateSelect} numberOfMonths={2} />
                  {range?.from && (
                    <div className="mt-2 flex justify-end">
                      <button type="button" onClick={handleClearDates} className="text-[12px] font-medium text-gray-400 hover:text-green-600">Wyczyść daty</button>
                    </div>
                  )}
                  <Popover.Arrow className="fill-white" />
                </Popover.Content>
              </Popover.Portal>
            </Popover.Root>
            {divider}
            {/* Guests */}
            <Popover.Root open={guestOpen} onOpenChange={setGuestOpen}>
              <Popover.Trigger asChild>
                <button type="button" className="shrink-0 whitespace-nowrap px-2 py-2 text-[15px] text-text-secondary transition-colors hover:text-brand-dark sm:px-3">
                  {guests} {guests === 1 ? "gość" : "gości"}
                </button>
              </Popover.Trigger>
              <Popover.Portal>
                <Popover.Content className="z-50 w-56 rounded-xl border border-gray-200 bg-white p-4 shadow-[0_8px_40px_rgba(0,0,0,.14)]" sideOffset={8}>
                  <p className="mb-2 text-xs font-semibold text-gray-400">Dorośli</p>
                  <div className="flex items-center justify-between gap-2">
                    <button type="button" className="rounded-full border border-gray-200 px-3 py-1 text-lg text-gray-700 hover:border-green-500 hover:text-green-600" onClick={() => setGuests((g) => Math.max(1, g - 1))}>−</button>
                    <span className="font-bold text-gray-800">{guests}</span>
                    <button type="button" className="rounded-full border border-gray-200 px-3 py-1 text-lg text-gray-700 hover:border-green-500 hover:text-green-600" onClick={() => setGuests((g) => Math.min(16, g + 1))}>+</button>
                  </div>
                  <Popover.Arrow className="fill-white" />
                </Popover.Content>
              </Popover.Portal>
            </Popover.Root>
            {divider}
            {/* Travel mode */}
            <Popover.Root open={modeOpen} onOpenChange={setModeOpen}>
              <Popover.Trigger asChild>
                <button type="button" className="shrink-0 whitespace-nowrap px-2 py-2 text-[15px] font-medium text-text-secondary transition-colors hover:text-brand-dark sm:px-3">
                  {modeLabel}
                </button>
              </Popover.Trigger>
              <Popover.Portal>
                <Popover.Content className="z-50 w-[min(100vw-2rem,320px)] rounded-xl border border-gray-200 bg-white p-3 shadow-[0_8px_40px_rgba(0,0,0,.14)]" sideOffset={8}>
                  <div className="grid grid-cols-3 gap-2">
                    {TRAVEL_MODE_ITEMS.map((m) => (
                      <button key={m.id} type="button"
                        onClick={() => handleModeChange(m.id)}
                        className={cn(
                          "flex flex-col items-center gap-1 rounded-xl border p-2 text-center text-[11px] font-bold text-gray-700 transition-colors",
                          currentMode === m.id ? "border-green-500 bg-green-50 text-green-800" : "border-gray-200 hover:bg-green-50 hover:border-green-300"
                        )}>
                        <span className="text-lg">{m.emoji}</span>
                        {m.label}
                      </button>
                    ))}
                  </div>
                  <Popover.Arrow className="fill-white" />
                </Popover.Content>
              </Popover.Portal>
            </Popover.Root>
          </div>
          <div className="flex justify-end sm:pl-2">
            <button type="button" onClick={runSearch}
              className="flex shrink-0 items-center gap-2 rounded-[14px] bg-brand px-6 py-3 text-sm font-bold text-white shadow-[0_8px_20px_rgba(22,163,74,.35)] transition-all duration-200 hover:-translate-y-px hover:bg-brand-700">
              <svg className="h-[15px] w-[15px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              Szukaj
            </button>
          </div>
          <p className="col-span-full px-1 text-center text-[11px] text-text-muted sm:text-left">
            Geokodowanie przez backend (Nominatim).{" "}
            <Link href="/search" className="font-semibold text-brand hover:underline">Pełna wyszukiwarka</Link>
          </p>
        </div>
        <div className="rounded-[16px] border border-dashed border-brand-border/80 bg-white/80 px-4 py-3">
          <button type="button" onClick={() => setAiOpen((o) => !o)}
            className="flex w-full items-center justify-between text-left text-sm font-bold text-brand-dark">
            <span>✨ Szukaj z AI (język naturalny)</span>
            <span className="text-brand">{aiOpen ? "▲" : "▼"}</span>
          </button>
          {aiOpen && (
            <div className="mt-3 space-y-2">
              <textarea
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                placeholder={`Np. \u201eRomantyczny domek nad jeziorem dla dwojga, max 400 z\u0142, lipiec\u201d`}
                rows={3}
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-text outline-none focus:border-brand"
              />
              <button type="button" onClick={() => void runAiSearch()} disabled={aiBusy}
                className="rounded-xl bg-brand-dark px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60">
                {aiBusy ? "Szukam…" : "Interpretuj i pokaż oferty"}
              </button>
              <p className="text-[11px] text-text-muted">
                Wymaga konta i skonfigurowanego klucza API (OpenAI lub Groq) po stronie backendu.
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── STRIP VARIANT — premium centered pill bar ─────────────────────────────
  return (
    <div className="flex items-center rounded-full border border-gray-200 bg-white shadow-[0_1px_10px_rgba(0,0,0,.07),0_0_0_1px_rgba(0,0,0,.04)]">

      {/* Location */}
      <div className={cn(
        "flex min-w-[130px] max-w-[210px] items-center gap-1.5 rounded-full px-3.5 py-2 transition-colors",
        "hover:bg-gray-50 focus-within:bg-brand-surface/30",
      )}>
        <svg className="h-3.5 w-3.5 shrink-0 text-brand" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <Popover.Root open={suggestOpen} onOpenChange={setSuggestOpen}>
          <Popover.Anchor asChild>
            <input
              ref={locInputRef}
              value={locInput}
              onChange={(e) => { setLocInput(e.target.value); setSuggestOpen(true); }}
              onFocus={() => { if (!suggestOpen) setSuggestOpen(true); }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  if (suggestions.length > 0) handleSelectSuggestion(suggestions[0]);
                  else runSearch();
                }
              }}
              placeholder="Lokalizacja…"
              className="min-w-0 flex-1 border-0 bg-transparent text-[13px] font-medium text-text outline-none placeholder:text-text-muted/60"
            />
          </Popover.Anchor>
          {suggestions.length > 0 && (
            <Popover.Portal>
              <Popover.Content
                className="z-50 w-[min(100vw-2rem,320px)] overflow-hidden rounded-xl border border-gray-100 bg-white p-1 shadow-[0_8px_32px_rgba(0,0,0,.12)]"
                sideOffset={8} align="start" onOpenAutoFocus={(e) => e.preventDefault()}
              >
                {suggestions.map((s) => (
                  <button key={s.label} type="button"
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-[13px] text-gray-700 transition-colors hover:bg-green-50"
                    onClick={() => handleSelectSuggestion(s)}>
                    <span className="text-[11px]">📍</span>
                    <span className="min-w-0 flex-1 truncate">{s.label}</span>
                  </button>
                ))}
                <Popover.Arrow className="fill-white" />
              </Popover.Content>
            </Popover.Portal>
          )}
        </Popover.Root>
        {locInput && (
          <button type="button" onClick={handleClearLocation}
            className="shrink-0 rounded-full p-0.5 text-[10px] text-text-muted transition-colors hover:bg-gray-200/60 hover:text-text"
            aria-label="Wyczyść lokalizację">
            ✕
          </button>
        )}
      </div>

      <span className="h-5 w-px shrink-0 bg-gray-200" aria-hidden />

      {/* Dates */}
      <Popover.Root open={dateOpen} onOpenChange={setDateOpen}>
        <Popover.Trigger asChild>
          <button
            type="button"
            className={cn(
              "shrink-0 whitespace-nowrap px-3.5 py-2 text-[13px] font-semibold transition-colors",
              hasDateRange ? "text-brand-dark" : "text-text-secondary hover:text-text",
            )}
          >
            {dateLabel}
          </button>
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Content className="z-[400] rounded-xl border border-gray-200 bg-white p-3 shadow-[0_8px_40px_rgba(0,0,0,.14)]" sideOffset={8}>
            <StyledDayPicker selected={range} onSelect={handleDateSelect} numberOfMonths={2} />
            {range?.from && (
              <div className="mt-2 flex justify-end border-t border-gray-100 pt-2">
                <button type="button" onClick={handleClearDates}
                  className="text-[12px] font-medium text-gray-400 hover:text-green-600">
                  Wyczyść daty
                </button>
              </div>
            )}
            <Popover.Arrow className="fill-white" />
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>

      <span className="h-5 w-px shrink-0 bg-gray-200" aria-hidden />

      {/* Guests */}
      <Popover.Root open={guestOpen} onOpenChange={setGuestOpen}>
        <Popover.Trigger asChild>
          <button
            type="button"
            className="shrink-0 whitespace-nowrap px-3.5 py-2 text-[13px] font-semibold text-text-secondary transition-colors hover:text-text"
          >
            {guests} {guests === 1 ? "gość" : "gości"}
          </button>
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Content
            className="z-[400] w-56 rounded-xl border border-gray-200 bg-white p-4 shadow-[0_8px_40px_rgba(0,0,0,.14)]"
            sideOffset={8}
          >
            <p className="mb-3 text-xs font-bold uppercase tracking-wide text-gray-400">Dorośli</p>
            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 text-lg font-light text-gray-700 transition-colors hover:border-green-600 hover:text-green-600 disabled:opacity-40"
                onClick={() => {
                  const next = Math.max(1, guests - 1);
                  setGuests(next);
                  handleGuestsApply(next);
                }}
                disabled={guests <= 1}
              >
                −
              </button>
              <span className="min-w-[2rem] text-center text-lg font-bold tabular-nums text-gray-800">{guests}</span>
              <button
                type="button"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 text-lg font-light text-gray-700 transition-colors hover:border-green-600 hover:text-green-600 disabled:opacity-40"
                onClick={() => {
                  const next = Math.min(16, guests + 1);
                  setGuests(next);
                  handleGuestsApply(next);
                }}
                disabled={guests >= 16}
              >
                +
              </button>
            </div>
            <Popover.Arrow className="fill-white" />
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>

      <span className="h-5 w-px shrink-0 bg-gray-200" aria-hidden />

      {/* Travel mode */}
      <Popover.Root open={modeOpen} onOpenChange={setModeOpen}>
        <Popover.Trigger asChild>
          <button
            type="button"
            className={cn(
              "shrink-0 whitespace-nowrap px-3.5 py-2 text-[13px] font-semibold transition-colors",
              currentMode ? "text-brand-dark" : "text-text-secondary hover:text-text",
            )}
          >
            {modeLabel}
          </button>
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Content
            className="z-[400] w-[min(100vw-2rem,320px)] rounded-xl border border-gray-200 bg-white p-3 shadow-[0_8px_40px_rgba(0,0,0,.14)]"
            sideOffset={8}
          >
            <div className="grid grid-cols-3 gap-2">
              {TRAVEL_MODE_ITEMS.map((m) => (
                <button key={m.id} type="button"
                  onClick={() => handleModeChange(m.id)}
                  className={cn(
                    "flex flex-col items-center gap-1 rounded-xl border p-2.5 text-center text-[11px] font-bold text-gray-700 transition-colors",
                    currentMode === m.id
                      ? "border-green-500 bg-green-50 text-green-800"
                      : "border-gray-200 hover:bg-green-50 hover:border-green-300"
                  )}>
                  <span className="text-xl">{m.emoji}</span>
                  {m.label}
                </button>
              ))}
            </div>
            <Popover.Arrow className="fill-white" />
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
    </div>
  );
}
