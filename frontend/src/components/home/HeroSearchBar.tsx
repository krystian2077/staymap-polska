"use client";

import { addMonths, eachMonthOfInterval, endOfMonth, format, isSameMonth, startOfMonth, startOfToday } from "date-fns";
import { pl } from "date-fns/locale";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { motion, AnimatePresence } from "framer-motion";
import { DayPicker, type DateRange } from "react-day-picker";
import { cn } from "@/lib/utils";
import { buildSearchQueryString } from "@/lib/searchQuery";
import { LOCATION_TAG_KEYS } from "@/lib/locationTags";
import { api } from "@/lib/api/client";
import { TRAVEL_MODE_ITEMS } from "../search/TravelModeSelector";
import type { SearchParamsState } from "@/lib/store/searchStore";

type OpenDropdown = "location" | "dates" | "guests" | "mode" | null;

interface SuggestedDest {
  name: string;
  region: string;
  lat: number;
  lng: number;
  icon: string;
  description: string;
  type?: "keyword" | "city";
  filter_key?: string;
  listing_type?: string;
}

const FALLBACK_SUGGESTED_DESTS: SuggestedDest[] = [
  {
    name: "Mazury",
    region: "Warmińsko-mazurskie",
    lat: 53.8,
    lng: 21.6,
    icon: "lake",
    description: "Jeziora i cisza blisko natury",
    type: "keyword",
  },
  {
    name: "Zakopane",
    region: "Małopolskie",
    lat: 49.2992,
    lng: 19.9496,
    icon: "mountain",
    description: "Górskie domki i widoki",
    type: "city",
  },
  {
    name: "Bieszczady",
    region: "Podkarpackie",
    lat: 49.2,
    lng: 22.3,
    icon: "forest",
    description: "Spokojne miejsca z dala od tłumów",
    type: "keyword",
  },
];

const SuggestionIcon = ({ type }: { type: string }) => {
  if (type === "nearby") {
    return (
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[16px] bg-white border border-[#f0f3f1] shadow-sm">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="3 11 22 2 13 21 11 13 3 11" />
        </svg>
      </div>
    );
  }
  if (type === "beach") {
    return (
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[16px] bg-white border border-[#f0f3f1] shadow-sm">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ea580c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2a10 10 0 0 1 10 10c0 5.52-4.48 10-10 10S2 17.52 2 12 6.48 2 12 2z" />
          <path d="M12 22V12" />
          <path d="M12 12L2.1 14.9" />
          <path d="M12 12l9.9 2.9" />
        </svg>
      </div>
    );
  }
  // Default: city/building
  return (
    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[16px] bg-white border border-[#f0f3f1] shadow-sm">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#b45309" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 21h18" />
        <path d="M5 21V7l8-4v18" />
        <path d="M13 21v-8h3v8" />
        <path d="M19 21v-5" />
        <path d="M9 9h0" />
        <path d="M9 13h0" />
        <path d="M9 17h0" />
      </svg>
    </div>
  );
};

export function HeroSearchBar() {
  const router = useRouter();

  const [open, setOpen] = useState<OpenDropdown>(null);
  const [isAiMode, setIsAiMode] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [location, setLocation] = useState("");
  const [locationLabel, setLocationLabel] = useState("");
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [suggestedDests, setSuggestedDests] = useState<SuggestedDest[]>([]);
  const [autocompleteResults, setAutocompleteResults] = useState<SuggestedDest[]>([]);
  const [isLoadingSuggested, setIsLoadingSuggested] = useState(false);
  const [direction, setDirection] = useState(0);

  const setOpenWithDirection = (newOpen: OpenDropdown) => {
    const order: OpenDropdown[] = ["location", "dates", "guests", "mode"];
    const currentIndex = order.indexOf(open);
    const nextIndex = order.indexOf(newOpen);
    setDirection(nextIndex > currentIndex ? 1 : -1);
    setOpen(newOpen);
  };
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [dateTab, setDateTab] = useState<"dates" | "flexible">("dates");
  const [flexibleDuration, setFlexibleDuration] = useState<"weekend" | "week" | "month">("week");
  const [selectedMonths, setSelectedMonths] = useState<Date[]>([]);
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
  const [pets, setPets] = useState(0);
  const [mode, setMode] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [activeType, setActiveType] = useState<string | null>(null);

  const monthsScrollRef = useRef<HTMLDivElement>(null);
  const scrollMonths = (dir: "left" | "right") => {
    if (monthsScrollRef.current) {
      const amount = 400;
      monthsScrollRef.current.scrollBy({ left: dir === "left" ? -amount : amount, behavior: "smooth" });
    }
  };

  const upcomingMonths = useMemo(() => {
    const start = startOfMonth(new Date());
    const end = endOfMonth(addMonths(start, 24));
    return eachMonthOfInterval({ start, end });
  }, []);

  const range = useMemo<DateRange | undefined>(() => {
    if (!checkIn) return undefined;
    const from = new Date(checkIn);
    const to = checkOut ? new Date(checkOut) : undefined;
    return { from, to };
  }, [checkIn, checkOut]);

  const handleRangeSelect = (newRange: DateRange | undefined) => {
    if (newRange?.from) {
      setCheckIn(format(newRange.from, "yyyy-MM-dd"));
    } else {
      setCheckIn("");
    }
    if (newRange?.to) {
      setCheckOut(format(newRange.to, "yyyy-MM-dd"));
    } else {
      setCheckOut("");
    }
  };

  useEffect(() => {
    const fetchSuggested = async () => {
      setIsLoadingSuggested(true);
      try {
        const res = await api.get<{ data: SuggestedDest[] }>("/api/v1/search/suggested-destinations/");
        setSuggestedDests(res.data);
      } catch {
        // Fallback keeps the UX stable when suggestions endpoint is temporarily unavailable.
        setSuggestedDests(FALLBACK_SUGGESTED_DESTS);
      } finally {
        setIsLoadingSuggested(false);
      }
    };
    fetchSuggested();
  }, []);

  useEffect(() => {
    const q = location.trim();
    if (!q || q.length < 2) {
      setAutocompleteResults([]);
      return;
    }
    let cancelled = false;

    const id = setTimeout(async () => {
      try {
        const res = await api.get<{ data: SuggestedDest[] }>(`/api/v1/search/autocomplete/?q=${encodeURIComponent(q)}`);
        if (cancelled) return;
        setAutocompleteResults(res.data || []);
      } catch {
        if (!cancelled) setAutocompleteResults([]);
      }
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(id);
    };
  }, [location]);

  const datesLabel = useMemo(() => {
    if (checkIn && checkOut) {
      try {
        const start = format(new Date(checkIn), "d MMM");
        const end = format(new Date(checkOut), "d MMM");
        return `${start} – ${end}`;
      } catch {
        return "Dodaj daty";
      }
    }
    return "Dodaj daty";
  }, [checkIn, checkOut]);

  const guestsCount = useMemo(() => adults + children, [adults, children]);

  const modeMeta = useMemo(() => {
    if (!mode) return null;
    return TRAVEL_MODE_ITEMS.find((m) => m.id === mode) || null;
  }, [mode]);

  function runSearch() {
    if (isAiMode) {
      if (!aiPrompt.trim()) return;
      router.push(`/ai?prompt=${encodeURIComponent(aiPrompt.trim().slice(0, 300))}`);
      return;
    }
    const params: SearchParamsState = {
      location: locationLabel || location,
      lat: lat || undefined,
      lng: lng || undefined,
      date_from: checkIn || undefined,
      date_to: checkOut || undefined,
      guests: guestsCount || undefined,
      adults,
      children,
      infants: 0,
      pets,
      travel_mode: mode || undefined,
      is_pet_friendly: pets > 0 || undefined,
      ordering: "recommended",
      radius_km: (lat && lng) ? 50 : undefined,
    };

    // Clear all location tags first to avoid collisions
    for (const tag of LOCATION_TAG_KEYS) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (params as any)[tag] = undefined;
    }

    if (activeFilter) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (params as any)[activeFilter] = true;
    }
    if (activeType) {
      params["listing_types"] = [activeType];
    }

    // Obsługa filtrów specjalnych z autocomplete (np. near_mountains)
    const activeResult = autocompleteResults.find(r => r.name === location || r.name === locationLabel);
    if (activeResult?.filter_key) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (params as any)[activeResult.filter_key] = true;
    }
    if (activeResult?.listing_type) {
      params["listing_types"] = [activeResult.listing_type];
    }
    if (activeResult?.type === "keyword") {
      params.lat = undefined;
      params.lng = undefined;
      params.radius_km = undefined;
    }

    router.push(`/search?${buildSearchQueryString(params)}`);
    setOpen(null);
  }

  function selectSuggestion(s: SuggestedDest) {
    setLocation(s.name);
    setLocationLabel(s.name);
    
    if (s.type === "keyword") {
      // Inicjujemy wyszukiwanie natychmiast dla słów kluczowych (kategorii)
      const params: SearchParamsState = {
        location: s.name,
        lat: undefined,
        lng: undefined,
        date_from: checkIn || undefined,
        date_to: checkOut || undefined,
        guests: guestsCount || undefined,
        adults,
        children,
        infants: 0,
        pets,
        travel_mode: mode || undefined,
        is_pet_friendly: pets > 0 || undefined,
        ordering: "recommended",
        radius_km: undefined,
      };

      // Czyścimy tagi przed ustawieniem nowego
      for (const tag of LOCATION_TAG_KEYS) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (params as any)[tag] = undefined;
      }

      if (s.filter_key) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (params as any)[s.filter_key] = true;
      }
      if (s.listing_type) {
        params["listing_types"] = [s.listing_type];
      }

      router.push(`/search?${buildSearchQueryString(params)}`);
      setOpen(null);
    } else {
      setLat(s.lat);
      setLng(s.lng);
      setActiveFilter(s.filter_key || null);
      setActiveType(s.listing_type || null);
      setOpenWithDirection("dates");
    }
  }

  function selectCategory(cat: { label: string; field?: string; type?: string }) {
    setLocation(cat.label);
    setLocationLabel(cat.label);
    setLat(null);
    setLng(null);
    setActiveFilter(cat.field || null);
    setActiveType(cat.type || null);
    
    // Inicjujemy wyszukiwanie natychmiast dla kategorii ogólnych
    const params: SearchParamsState = {
      location: cat.label,
      lat: undefined,
      lng: undefined,
      date_from: checkIn || undefined,
      date_to: checkOut || undefined,
      guests: guestsCount || undefined,
      adults,
      children,
      infants: 0,
      pets,
      travel_mode: mode || undefined,
      is_pet_friendly: pets > 0 || undefined,
      ordering: "recommended",
      radius_km: undefined,
    };

    // Czyścimy tagi przed ustawieniem nowego
    for (const tag of LOCATION_TAG_KEYS) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (params as any)[tag] = undefined;
    }

    if (cat.field) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (params as any)[cat.field] = true;
    }
    if (cat.type) {
      params["listing_types"] = [cat.type];
    }

    router.push(`/search?${buildSearchQueryString(params)}`);
    setOpen(null);
  }

  function handleNearby() {
    if (typeof window === "undefined" || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setLat(latitude);
        setLng(longitude);
        setLocation("W pobliżu");
        setLocationLabel("W pobliżu");
        setOpen(null);
      },
      () => {
        // ignored
      }
    );
  }

  return (
    <div className="relative mx-auto mb-10 w-full max-w-[1020px] sm:mb-[52px]">
      <div className="mb-6 flex items-center justify-center gap-6">
        <button
          onClick={() => setIsAiMode(false)}
          className={cn(
            "relative px-4 py-2 text-[15px] font-bold transition-all",
            !isAiMode ? "text-[#0a2e1a]" : "text-[#7a8f84] hover:text-[#0a2e1a]"
          )}
        >
          Klasyczne
          {!isAiMode && (
            <motion.div
              layoutId="activeTab"
              className="absolute bottom-0 left-0 h-1 w-full rounded-full bg-[#16a34a]"
            />
          )}
        </button>
        <button
          onClick={() => setIsAiMode(true)}
          className={cn(
            "relative flex items-center gap-2 px-4 py-2 text-[15px] font-bold transition-all",
            isAiMode ? "text-[#0a2e1a]" : "text-[#7a8f84] hover:text-[#0a2e1a]"
          )}
        >
         <span>StayMap AI</span>
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-tr from-[#7c3aed] to-[#a78bfa] text-[10px] text-white">
            ✨
          </span>
          {isAiMode && (
            <motion.div
              layoutId="activeTab"
              className="absolute bottom-0 left-0 h-1 w-full rounded-full bg-[#7c3aed]"
            />
          )}
        </button>
      </div>

      <Dialog.Root open={open !== null} onOpenChange={(v) => !v && setOpen(null)}>
        <div
          className={cn(
            "pointer-events-none absolute inset-[-5px] rounded-[30px] opacity-0 blur-[2px] transition-opacity duration-300 group-focus-within:opacity-100",
            isAiMode
              ? "bg-[linear-gradient(135deg,rgba(124,58,237,.4),rgba(167,139,250,.25),rgba(124,58,237,.4))]"
              : "bg-[linear-gradient(135deg,rgba(22,163,74,.4),rgba(74,222,128,.25),rgba(22,163,74,.4))]"
          )}
          aria-hidden
        />

        <div
          className={cn(
            "group relative overflow-hidden rounded-[24px] border border-[rgba(228,235,231,0.6)] bg-white transition-all duration-300 focus-within:shadow-[0_12px_48px_rgba(10,15,13,0.15)] sm:rounded-[32px]",
            isAiMode
              ? "shadow-[0_3px_12px_rgba(124,58,237,0.03),0_8px_32px_rgba(124,58,237,0.08)]"
              : "shadow-[0_3px_12px_rgba(10,15,13,0.03),0_8px_32px_rgba(10,15,13,0.08)]"
          )}
        >
          {isAiMode ? (
            <div className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:px-8 sm:py-3">
              <div className="flex-1">
                <input
                  type="text"
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && runSearch()}
                  placeholder="Opisz swój wymarzony wyjazd, np. 'Domek z sauną blisko lasu dla 4 osób...'"
                  className="w-full bg-transparent py-1 text-[16px] font-bold text-[#0a2e1a] placeholder:text-[#7a8f84] focus:outline-none sm:py-4 sm:text-[17px]"
                />
              </div>
              <button
                type="button"
                onClick={runSearch}
                className="flex min-h-[48px] w-full shrink-0 items-center justify-center gap-3 rounded-2xl bg-[#7c3aed] px-6 text-[15px] font-black text-white shadow-lg transition-all hover:bg-[#6d28d9] sm:h-[52px] sm:w-auto sm:rounded-full sm:px-8"
              >
                <span>Szukaj z AI</span>
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  className="h-[20px] w-[20px]"
                  stroke="currentColor"
                  strokeWidth="3"
                >
                  <path
                    d="M21 21l-4.35-4.35m1.85-5.15a7 7 0 11-14 0 7 7 0 0114 0z"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-[1.4fr_1.2fr_1fr_1fr_auto]">
                <button
                  type="button"
                  onClick={() => setOpen("location")}
                  className={cn(
                    "sf max-md:rounded-none max-md:border-b max-md:border-[rgba(228,235,231,.8)] max-md:border-r-0 max-md:py-3.5 first:rounded-t-[24px] md:first:rounded-l-[26px]",
                    open === "location" ? "sf--active" : "hover:after:bg-white"
                  )}
                >
                  <span className="sfl">Gdzie</span>
                  <span className={location ? "sfv" : "sfv ph"}>{location || "Wyszukaj kierunki"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setOpen("dates")}
                  className={cn(
                    "sf max-md:rounded-none max-md:border-b max-md:border-[rgba(228,235,231,.8)] max-md:border-r-0 max-md:py-3.5",
                    open === "dates" ? "sf--active" : "hover:after:bg-white"
                  )}
                >
                  <span className="sfl">Kiedy</span>
                  <span className={checkIn && checkOut ? "sfv" : "sfv ph"}>{datesLabel}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setOpen("guests")}
                  className={cn(
                    "sf max-md:rounded-none max-md:border-b max-md:border-[rgba(228,235,231,.8)] max-md:border-r-0 max-md:py-3.5",
                    open === "guests" ? "sf--active" : "hover:after:bg-white"
                  )}
                >
                  <span className="sfl">Goście</span>
                  <span className={guestsCount ? "sfv" : "sfv ph"}>{guestsCount ? `${guestsCount} osób` : "Ile osób?"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setOpen("mode")}
                  className={cn(
                    "sf border-r-0 max-md:rounded-none max-md:border-b-0 max-md:border-r-0 max-md:py-3.5",
                    open === "mode" ? "sf--active" : "hover:after:bg-white"
                  )}
                >
                  <span className="sfl">Tryb podróży</span>
                  <span className={modeMeta ? "sfv" : "sfv ph"}>{modeMeta ? `${modeMeta.emoji} ${modeMeta.label}` : "Dowolny styl"}</span>
                </button>

                <div className="hidden items-center px-3 py-2 md:flex md:pl-0.5 md:pr-2.5 md:py-2">
                  <button
                    type="button"
                    onClick={runSearch}
                    className="sbtn flex h-[48px] w-[48px] items-center justify-center rounded-full bg-[#16a34a] text-white shadow-lg transition-all hover:bg-[#15803d] lg:w-auto lg:px-6 lg:gap-2"
                  >
                    <svg viewBox="0 0 24 24" fill="none" className="h-[20px] w-[20px]" stroke="currentColor" strokeWidth="3">
                      <path d="M21 21l-4.35-4.35m1.85-5.15a7 7 0 11-14 0 7 7 0 0114 0z" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <span className="hidden lg:inline">Szukaj</span>
                  </button>
                </div>
              </div>
              <div className="border-t border-[rgba(228,235,231,0.85)] p-3 md:hidden dark:border-[var(--brand-border)]">
                <button
                  type="button"
                  onClick={runSearch}
                  className="sbtn flex min-h-[48px] w-full items-center justify-center gap-2 rounded-2xl bg-[#16a34a] px-4 text-[15px] font-extrabold text-white shadow-lg transition-all hover:bg-[#15803d]"
                >
                  <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5 shrink-0" stroke="currentColor" strokeWidth="3">
                    <path d="M21 21l-4.35-4.35m1.85-5.15a7 7 0 11-14 0 7 7 0 0114 0z" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  Szukaj
                </button>
              </div>
            </>
          )}
        </div>

        <Dialog.Portal>
          <Dialog.Overlay className="DialogOverlay" />
          <Dialog.Content className="DialogContent">
            <Dialog.Title className="sr-only">Panel wyszukiwania</Dialog.Title>
            <Dialog.Description className="sr-only">
              Wybierz cel podróży, daty oraz liczbę gości, aby znaleźć idealne miejsce na pobyt.
            </Dialog.Description>
            <div className="flex flex-col h-full overflow-hidden">
              {/* Modal Header/Mini SearchBar */}
              <div className="border-b border-[#e4ebe7] bg-[#f8faf9] flex-shrink-0 p-3 pt-[max(0.75rem,env(safe-area-inset-top,0px))] dark:border-[var(--brand-border)] dark:bg-[var(--bg3)] sm:p-4 sm:pt-4 lg:pt-4">
                {/* Mobile: step label + horizontal scroll chips + full-width Szukaj */}
                <div className="mx-auto w-full max-w-[1080px] lg:hidden">
                  {open && (
                    <>
                      <div className="mb-3 flex items-start gap-2">
                        {open !== "location" && (
                          <motion.button
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            whileTap={{ scale: 0.95 }}
                            type="button"
                            onClick={() => {
                              const order: OpenDropdown[] = ["location", "dates", "guests", "mode"];
                              const idx = order.indexOf(open);
                              if (idx > 0) setOpenWithDirection(order[idx - 1]);
                            }}
                            className="mt-0.5 flex h-11 min-h-[44px] w-11 min-w-[44px] shrink-0 items-center justify-center rounded-full border border-[#e4ebe7] bg-white text-[#0a2e1a] shadow-sm transition-all hover:border-[#16a34a] hover:text-[#16a34a] dark:border-[var(--brand-border)] dark:bg-[var(--bg2)] dark:text-zinc-100"
                          >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                              <path d="M15 18l-6-6 6-6" />
                            </svg>
                          </motion.button>
                        )}
                        <div className="min-w-0 flex-1 pt-0.5">
                          <p className="text-[10px] font-black uppercase tracking-wider text-[#5c7368] dark:text-zinc-400">
                            Krok {(["location", "dates", "guests", "mode"] as const).indexOf(open) + 1} z 4
                          </p>
                          <p className="truncate text-base font-bold text-[#0a2e1a] dark:text-zinc-100">
                            {open === "location" && "Cel podróży"}
                            {open === "dates" && "Terminy"}
                            {open === "guests" && "Liczba gości"}
                            {open === "mode" && "Styl wyszukiwania"}
                          </p>
                        </div>
                      </div>
                      <div className="-mx-1 flex gap-2 overflow-x-auto pb-1 pl-1 pr-2 [-webkit-overflow-scrolling:touch] snap-x snap-mandatory scrollbar-hide">
                        {(
                          [
                            { key: "location" as const, label: "Gdzie", value: location || "Wybierz cel" },
                            { key: "dates" as const, label: "Kiedy", value: datesLabel },
                            { key: "guests" as const, label: "Goście", value: guestsCount ? `${guestsCount} osób` : "Ilu gości?" },
                            { key: "mode" as const, label: "Tryb", value: modeMeta ? `${modeMeta.emoji} ${modeMeta.label}` : "Styl" },
                          ] as const
                        ).map((step) => (
                          <button
                            key={step.key}
                            type="button"
                            onClick={() => setOpenWithDirection(step.key)}
                            className={cn(
                              "min-h-[72px] min-w-[min(42vw,160px)] shrink-0 snap-start rounded-2xl border px-3 py-2.5 text-left transition-all",
                              open === step.key
                                ? "border-[#16a34a] bg-[#dcfce7] shadow-inner dark:border-[#22c55e] dark:bg-emerald-950/50"
                                : "border-[#e4ebe7] bg-white hover:border-[#16a34a]/40 dark:border-[var(--brand-border)] dark:bg-[var(--bg2)]"
                            )}
                          >
                            <span className="block text-[9px] font-black uppercase tracking-wider text-[#5c7368] dark:text-zinc-400">{step.label}</span>
                            <span className="line-clamp-2 text-[13px] font-bold leading-tight text-[#0a2e1a] dark:text-zinc-100">{step.value}</span>
                          </button>
                        ))}
                      </div>
                      <button
                        type="button"
                        onClick={runSearch}
                        className="mt-3 flex min-h-[48px] w-full items-center justify-center gap-2 rounded-full bg-[#16a34a] px-4 text-[15px] font-bold text-white shadow-md transition-colors hover:bg-[#15803d] active:scale-[0.99]"
                      >
                        <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5 shrink-0" stroke="currentColor" strokeWidth="3">
                          <path d="M21 21l-4.35-4.35m1.85-5.15a7 7 0 11-14 0 7 7 0 0114 0z" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        Szukaj
                      </button>
                    </>
                  )}
                </div>

                {/* Desktop: single horizontal pill */}
                <div className="mx-auto hidden w-full max-w-[1080px] items-center gap-3 lg:flex">
                  {open && open !== "location" && (
                    <motion.button
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => {
                        const order: OpenDropdown[] = ["location", "dates", "guests", "mode"];
                        const idx = order.indexOf(open);
                        if (idx > 0) setOpenWithDirection(order[idx - 1]);
                      }}
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#e4ebe7] bg-white text-[#0a2e1a] shadow-sm hover:border-[#16a34a] hover:text-[#16a34a] transition-all dark:border-[var(--brand-border)] dark:bg-[var(--bg2)] dark:text-zinc-100"
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M15 18l-6-6 6-6" />
                      </svg>
                    </motion.button>
                  )}
                  <div className="flex flex-1 items-center gap-2 rounded-full border border-[#e4ebe7] bg-white p-1.5 shadow-sm dark:border-[var(--brand-border)] dark:bg-[var(--bg2)]">
                    <button
                      onClick={() => setOpenWithDirection("location")}
                      className={cn(
                        "flex-1 rounded-full px-5 py-2.5 text-left transition-all",
                        open === "location" ? "bg-[#dcfce7] shadow-inner dark:bg-emerald-950/50" : "hover:bg-[#f0fdf4] dark:hover:bg-white/5"
                      )}
                    >
                      <span className="block text-[9px] font-black uppercase tracking-wider text-[#7a8f84] dark:text-zinc-400">Gdzie</span>
                      <span className="block truncate text-[13px] font-bold text-[#0a2e1a] dark:text-zinc-100">{location || "Wybierz cel"}</span>
                    </button>
                    <div className="h-8 w-px bg-[#e4ebe7] dark:bg-[var(--brand-border)]" />
                    <button
                      onClick={() => setOpenWithDirection("dates")}
                      className={cn(
                        "flex-1 rounded-full px-5 py-2.5 text-left transition-all",
                        open === "dates" ? "bg-[#dcfce7] shadow-inner dark:bg-emerald-950/50" : "hover:bg-[#f0fdf4] dark:hover:bg-white/5"
                      )}
                    >
                      <span className="block text-[9px] font-black uppercase tracking-wider text-[#7a8f84] dark:text-zinc-400">Kiedy</span>
                      <span className="block truncate text-[13px] font-bold text-[#0a2e1a] dark:text-zinc-100">{datesLabel}</span>
                    </button>
                    <div className="h-8 w-px bg-[#e4ebe7] dark:bg-[var(--brand-border)]" />
                    <button
                      onClick={() => setOpenWithDirection("guests")}
                      className={cn(
                        "flex-1 rounded-full px-5 py-2.5 text-left transition-all",
                        open === "guests" ? "bg-[#dcfce7] shadow-inner dark:bg-emerald-950/50" : "hover:bg-[#f0fdf4] dark:hover:bg-white/5"
                      )}
                    >
                      <span className="block text-[9px] font-black uppercase tracking-wider text-[#7a8f84] dark:text-zinc-400">Goście</span>
                      <span className="block truncate text-[13px] font-bold text-[#0a2e1a] dark:text-zinc-100">{guestsCount ? `${guestsCount} osób` : "Ilu gości?"}</span>
                    </button>
                    <div className="h-8 w-px bg-[#e4ebe7] dark:bg-[var(--brand-border)]" />
                    <button
                      onClick={() => setOpenWithDirection("mode")}
                      className={cn(
                        "flex-1 rounded-full px-5 py-2.5 text-left transition-all",
                        open === "mode" ? "bg-[#dcfce7] shadow-inner dark:bg-emerald-950/50" : "hover:bg-[#f0fdf4] dark:hover:bg-white/5"
                      )}
                    >
                      <span className="block text-[9px] font-black uppercase tracking-wider text-[#7a8f84] dark:text-zinc-400">Tryb</span>
                      <span className="block truncate text-[13px] font-bold text-[#0a2e1a] dark:text-zinc-100">{modeMeta ? `${modeMeta.emoji} ${modeMeta.label}` : "Styl"}</span>
                    </button>
                    <button
                      onClick={runSearch}
                      className="flex h-11 w-11 min-h-[44px] min-w-[44px] items-center justify-center rounded-full bg-[#16a34a] text-white shadow-md hover:bg-[#15803d]"
                    >
                      <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="3">
                        <path d="M21 21l-4.35-4.35m1.85-5.15a7 7 0 11-14 0 7 7 0 0114 0z" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto px-4 py-5 scrollbar-hide relative min-h-0 md:px-6 md:py-6 lg:p-8">
                <AnimatePresence mode="wait" custom={direction}>
                {open === "location" && (
                  <motion.div
                    key="location"
                    custom={direction}
                    initial={{ opacity: 0, x: direction * 40, scale: 0.98 }}
                    animate={{ opacity: 1, x: 0, scale: 1 }}
                    exit={{ opacity: 0, x: direction * -40, scale: 0.98 }}
                    transition={{ type: "spring", damping: 30, stiffness: 260, mass: 1 }}
                  >
                  <div className="mx-auto max-w-[1080px]">
                  <div className="mb-6 px-4">
                    <h3 className="mb-1 text-2xl font-black text-[#0a2e1a]">Dokąd chcesz pojechać?</h3>
                    <p className="text-sm text-[#7a8f84]">Wybierz z listy lub wpisz nazwę miejscowości</p>
                  </div>
                  <div className="px-4">
                    <input
                      autoFocus
                      value={location}
                      onChange={(e) => {
                        setLocation(e.target.value);
                        setLocationLabel("");
                        setLat(null);
                        setLng(null);
                      }}
                      placeholder="Wpisz miejscowość lub region..."
                      className="mb-8 w-full rounded-[24px] border-2 border-[#e4ebe7] bg-white px-8 py-5 text-xl font-medium outline-none transition-all focus:border-[#16a34a] focus:ring-4 focus:ring-[#16a34a]/5 shadow-sm"
                    />
                  </div>
                  </div>
                  <div className="mx-auto max-w-[1080px] px-4">
                    {/* Sekcja kategorii premium */}
                    <div className="mb-10">
                      <p className="mb-4 text-[11px] font-black uppercase tracking-[0.15em] text-[#7a8f84]">Odkryj według kategorii:</p>
                      <div className="flex flex-wrap gap-3">
                        {[
                          { id: "mountains", label: "Góry", emoji: "⛰️", field: "near_mountains" },
                          { id: "lake", label: "Jeziora", emoji: "🛶", field: "near_lake" },
                          { id: "sea", label: "Morze", emoji: "🏖️", field: "near_sea" },
                          { id: "forest", label: "Las", emoji: "🌲", field: "near_forest" },
                        ].map((cat) => (
                          <motion.button
                            key={cat.id}
                            whileHover={{ scale: 1.03, backgroundColor: "#f0fdf4", borderColor: "#16a34a" }}
                            whileTap={{ scale: 0.97 }}
                            onClick={() => selectCategory(cat)}
                            className="flex items-center gap-2.5 rounded-full border-2 border-[#e4ebe7] bg-white px-5 py-2.5 transition-all shadow-sm hover:shadow-md"
                          >
                            <span className="text-xl">{cat.emoji}</span>
                            <span className="text-sm font-black text-[#0a2e1a]">{cat.label}</span>
                          </motion.button>
                        ))}

                        <div className="mx-2 h-10 w-px bg-[#e4ebe7] self-center" />

                        {[
                          { id: "domek", label: "Domki", emoji: "🏠", type: "domek" },
                          { id: "apartament", label: "Apartamenty", emoji: "🏢", type: "apartament" },
                          { id: "chata", label: "Chaty", emoji: "🛖", type: "chata" },
                        ].map((cat) => (
                          <motion.button
                            key={cat.id}
                            whileHover={{ scale: 1.03, backgroundColor: "#f0fdf4", borderColor: "#16a34a" }}
                            whileTap={{ scale: 0.97 }}
                            onClick={() => selectCategory(cat)}
                            className="flex items-center gap-2.5 rounded-full border-2 border-[#e4ebe7] bg-white px-5 py-2.5 transition-all shadow-sm hover:shadow-md"
                          >
                            <span className="text-xl">{cat.emoji}</span>
                            <span className="text-sm font-black text-[#0a2e1a]">{cat.label}</span>
                          </motion.button>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {location.length < 2 ? (
                      <>
                        <motion.button
                          type="button"
                          whileHover={{ scale: 1.01, backgroundColor: "#f0fdf4" }}
                          whileTap={{ scale: 0.98 }}
                          onClick={handleNearby}
                          className="flex items-center gap-5 rounded-[24px] border border-[#f0f3f1] bg-white p-5 text-left transition-all hover:border-[#16a34a]/30 hover:shadow-md group"
                        >
                          <SuggestionIcon type="nearby" />
                          <div>
                            <span className="block text-lg font-bold text-[#0a0f0d] group-hover:text-[#16a34a] leading-tight mb-0.5">W pobliżu</span>
                            <span className="text-sm text-[#7a8f84]">Wyszukaj w Twojej okolicy</span>
                          </div>
                        </motion.button>
                        
                        {isLoadingSuggested ? (
                          Array.from({ length: 8 }).map((_, i) => (
                            <div key={i} className="flex animate-pulse items-center gap-5 rounded-[24px] border border-[#f0f3f1] bg-[#f8faf9] p-5">
                              <div className="h-12 w-12 rounded-[16px] bg-[#e4ebe7]" />
                              <div className="flex-1 space-y-2">
                                <div className="h-4 w-2/3 rounded bg-[#e4ebe7]" />
                                <div className="h-3 w-1/2 rounded bg-[#e4ebe7]" />
                              </div>
                            </div>
                          ))
                        ) : (
                          suggestedDests.map((dest, i) => (
                            <motion.button
                              key={`${dest.name}-${i}`}
                              type="button"
                              whileHover={{ scale: 1.01, backgroundColor: "#f0fdf4" }}
                              whileTap={{ scale: 0.98 }}
                              onClick={() => selectSuggestion(dest)}
                              className="flex items-center gap-5 rounded-[24px] border border-[#f0f3f1] bg-white p-5 text-left transition-all hover:border-[#16a34a]/30 hover:shadow-md group"
                            >
                              <SuggestionIcon type={dest.icon} />
                              <div>
                                <span className="block text-lg font-bold text-[#0a0f0d] group-hover:text-[#16a34a] leading-tight mb-0.5">
                                  {dest.name}, {dest.region}
                                </span>
                                <span className="text-sm text-[#7a8f84]">{dest.description}</span>
                              </div>
                            </motion.button>
                          ))
                        )}
                      </>
                    ) : autocompleteResults.length ? (
                      autocompleteResults.map((s, i) => (
                        <motion.button
                          key={`${s.name}-${i}`}
                          type="button"
                          whileHover={{ scale: 1.01, backgroundColor: "#f0fdf4" }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => selectSuggestion(s)}
                          className="flex items-center gap-5 rounded-[24px] border border-[#f0f3f1] bg-white p-5 text-left transition-all hover:border-[#16a34a]/30 hover:shadow-md group"
                        >
                          <SuggestionIcon type={s.icon} />
                          <div>
                            <span className="block text-lg font-bold text-[#0a0f0d] group-hover:text-[#16a34a] leading-tight mb-0.5">{s.name}</span>
                            <span className="text-sm text-[#7a8f84]">{s.description || s.region}</span>
                          </div>
                        </motion.button>
                      ))
                    ) : (
                      <div className="col-span-full py-6">
                        <div className="mb-6 text-center">
                          <p className="text-base font-bold text-[#7a8f84]">Brak wyników dla &quot;{location}&quot;</p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          <motion.button
                            type="button"
                            whileHover={{ scale: 1.01, backgroundColor: "#f0fdf4" }}
                            whileTap={{ scale: 0.98 }}
                            onClick={handleNearby}
                            className="flex items-center gap-5 rounded-[24px] border border-[#f0f3f1] bg-white p-5 text-left transition-all hover:border-[#16a34a]/30 hover:shadow-md group"
                          >
                            <SuggestionIcon type="nearby" />
                            <div>
                              <span className="block text-lg font-bold text-[#0a0f0d] group-hover:text-[#16a34a] leading-tight mb-0.5">W pobliżu</span>
                              <span className="text-sm text-[#7a8f84]">Wyszukaj w Twojej okolicy</span>
                            </div>
                          </motion.button>
                        </div>
                      </div>
                    )}
                  </div>
                  </div>
                </motion.div>
              )}

              {open === "dates" && (
                <motion.div
                  key="dates"
                  custom={direction}
                  initial={{ opacity: 0, x: direction * 40, scale: 0.98 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, x: direction * -40, scale: 0.98 }}
                  transition={{ type: "spring", damping: 30, stiffness: 260, mass: 1 }}
                >
                  <div className="mb-8 flex justify-center">
                    <div className="inline-flex rounded-full bg-[#f0f3f1] p-1.5 shadow-sm border border-[#e4ebe7]">
                      <button
                        onClick={() => setDateTab("dates")}
                        className={cn(
                          "px-8 py-2.5 text-sm font-bold rounded-full transition-all",
                          dateTab === "dates" ? "bg-white text-[#0a2e1a] shadow-md" : "text-[#7a8f84] hover:text-[#0a2e1a]"
                        )}
                      >
                        Daty
                      </button>
                      <button
                        onClick={() => setDateTab("flexible")}
                        className={cn(
                          "px-8 py-2.5 text-sm font-bold rounded-full transition-all",
                          dateTab === "flexible" ? "bg-white text-[#0a2e1a] shadow-md" : "text-[#7a8f84] hover:text-[#0a2e1a]"
                        )}
                      >
                        Elastyczne
                      </button>
                    </div>
                  </div>

                  {dateTab === "dates" ? (
                    <div className="flex justify-center">
                      <div className="bg-white rounded-[24px] p-2 border border-[#f0f3f1]">
                        <DayPicker
                          mode="range"
                          locale={pl}
                          numberOfMonths={2}
                          selected={range}
                          onSelect={handleRangeSelect}
                          disabled={[{ before: startOfToday() }]}
                          classNames={{
                            months: "flex flex-col md:flex-row gap-20",
                            month: "space-y-8",
                            month_caption: "flex items-center justify-center relative h-12 mb-4",
                            caption_label: "text-[19px] font-black text-[#0a2e1a] capitalize",
                            nav: "flex items-center gap-1 absolute inset-x-0 top-0 justify-between z-10",
                            button_previous: "h-12 w-12 flex items-center justify-center rounded-full border-2 border-[#e4ebe7] text-[#0a2e1a] hover:bg-[#f0fdf4] hover:border-[#16a34a] transition-all",
                            button_next: "h-12 w-12 flex items-center justify-center rounded-full border-2 border-[#e4ebe7] text-[#0a2e1a] hover:bg-[#f0fdf4] hover:border-[#16a34a] transition-all",
                            chevron: "h-6 w-6 fill-current",
                            weekdays: "flex border-b border-[#f0f3f1] pb-3",
                            weekday: "flex-1 text-center text-[14px] font-black text-[#7a8f84] uppercase tracking-wider",
                            weeks: "space-y-1 mt-6",
                            week: "flex",
                            day: "flex-1 flex items-center justify-center p-0.5 relative",
                            day_button: "h-14 w-14 flex items-center justify-center rounded-full text-[17px] font-bold text-[#0a2e1a] hover:bg-[#f0fdf4] transition-all duration-200 relative",
                            selected: "bg-[#16a34a] !text-white rounded-full z-20 shadow-lg",
                            range_start: "bg-[#16a34a] !text-white rounded-full z-20 shadow-lg",
                            range_end: "bg-[#16a34a] !text-white rounded-full z-20 shadow-lg",
                            range_middle: "bg-[#f0fdf4] !text-[#16a34a] !rounded-none after:content-[''] after:absolute after:inset-0 after:bg-[#f0fdf4] after:-z-10",
                            today: "text-[#16a34a] font-black underline underline-offset-8 decoration-2",
                            disabled: "opacity-20 cursor-not-allowed",
                            outside: "opacity-0 pointer-events-none",
                          }}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
                      <div className="text-center">
                        <h4 className="mb-6 text-lg font-black text-[#0a2e1a]">Jak długi ma być Twój pobyt?</h4>
                        <div className="flex flex-wrap justify-center gap-3">
                          {[
                            { id: "weekend", label: "Weekend" },
                            { id: "week", label: "Tydzień" },
                            { id: "month", label: "Miesiąc" },
                          ].map((opt) => (
                            <motion.button
                              key={opt.id}
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => setFlexibleDuration(opt.id as "weekend" | "week" | "month")}
                              className={cn(
                                "rounded-full border-2 px-10 py-3.5 text-sm font-black transition-all",
                                flexibleDuration === opt.id
                                  ? "border-[#16a34a] bg-[#f0fdf4] text-[#16a34a] shadow-sm"
                                  : "border-[#e4ebe7] text-[#0a2e1a] hover:border-[#16a34a] hover:bg-[#f0fdf4]/50"
                              )}
                            >
                              {opt.label}
                            </motion.button>
                          ))}
                        </div>
                      </div>

                      <div className="text-center">
                        <h4 className="mb-6 text-lg font-black text-[#0a2e1a]">Kiedy chcesz wyruszyć?</h4>
                        <div className="relative group">
                          {/* Navigation Buttons */}
                          <button
                            type="button"
                            onClick={() => scrollMonths("left")}
                            className="absolute left-0 top-1/2 -translate-y-1/2 z-20 flex h-12 w-12 items-center justify-center rounded-full bg-white/90 border-2 border-[#e4ebe7] text-[#0a2e1a] shadow-lg opacity-0 group-hover:opacity-100 transition-all hover:bg-white hover:border-[#16a34a] -ml-6"
                          >
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                              <path d="M15 18l-6-6 6-6" />
                            </svg>
                          </button>
                          
                          <button
                            type="button"
                            onClick={() => scrollMonths("right")}
                            className="absolute right-0 top-1/2 -translate-y-1/2 z-20 flex h-12 w-12 items-center justify-center rounded-full bg-white/90 border-2 border-[#e4ebe7] text-[#0a2e1a] shadow-lg opacity-0 group-hover:opacity-100 transition-all hover:bg-white hover:border-[#16a34a] -mr-6"
                          >
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                              <path d="M9 18l6-6-6-6" />
                            </svg>
                          </button>

                          <div 
                            ref={monthsScrollRef}
                            className="scrollbar-hide flex gap-4 overflow-x-auto pb-4 px-2 scroll-smooth"
                          >
                            {upcomingMonths.map((m, idx) => {
                              const isSelected = selectedMonths.some((sm) => isSameMonth(sm, m));
                              return (
                                <motion.button
                                  key={m.getTime()}
                                  whileHover={{ scale: 1.02, backgroundColor: "white" }}
                                  whileTap={{ scale: 0.98 }}
                                  initial={{ opacity: 0, y: 10 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  transition={{ delay: idx * 0.05 }}
                                  onClick={() => {
                                    if (isSelected) {
                                      setSelectedMonths(selectedMonths.filter((sm) => !isSameMonth(sm, m)));
                                    } else {
                                      setSelectedMonths([...selectedMonths, m]);
                                    }
                                  }}
                                  className={cn(
                                    "flex min-w-[180px] flex-col items-center gap-4 rounded-[32px] border-2 p-8 transition-all shrink-0",
                                    isSelected
                                      ? "border-[#16a34a] bg-[#f0fdf4] shadow-md scale-105"
                                      : "border-[#e4ebe7] hover:border-[#16a34a]/30 hover:bg-[#f8faf9]"
                                  )}
                                >
                                  <div className={cn(
                                    "flex h-16 w-16 items-center justify-center rounded-full border-2 border-[#e4ebe7] bg-white text-[#7a8f84]",
                                    isSelected && "border-[#16a34a] text-[#16a34a]"
                                  )}>
                                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                      <path d="M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" />
                                    </svg>
                                  </div>
                                  <div className="text-center">
                                    <p className="text-[17px] font-black text-[#0a2e1a] capitalize">{format(m, "MMMM", { locale: pl })}</p>
                                    <p className="text-sm font-bold text-[#7a8f84]">{format(m, "yyyy")}</p>
                                  </div>
                                </motion.button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="mx-auto max-w-[1080px] border-t border-[#e4ebe7] mt-12 pt-8 flex flex-col md:flex-row items-center justify-between gap-6">
                    {dateTab === "dates" && (
                      <div className="flex gap-4 w-full md:w-auto">
                        <div className="flex-1 rounded-[24px] border border-[#e4ebe7] bg-white px-6 py-4 min-w-[180px] shadow-sm">
                          <p className="text-[10px] font-black uppercase tracking-wider text-[#7a8f84]">Zameldowanie</p>
                          <p className="text-[16px] font-bold text-[#0a2e1a]">{checkIn ? format(new Date(checkIn), "d MMM yyyy", { locale: pl }) : "Dodaj datę"}</p>
                        </div>
                        <div className="flex-1 rounded-[24px] border border-[#e4ebe7] bg-white px-6 py-4 min-w-[180px] shadow-sm">
                          <p className="text-[10px] font-black uppercase tracking-wider text-[#7a8f84]">Wymeldowanie</p>
                          <p className="text-[16px] font-bold text-[#0a2e1a]">{checkOut ? format(new Date(checkOut), "d MMM yyyy", { locale: pl }) : "Dodaj datę"}</p>
                        </div>
                      </div>
                    )}
                    
                    <div className="flex items-center gap-8 w-full md:w-auto justify-between md:justify-end">
                      <button
                        type="button"
                        onClick={() => {
                          setCheckIn("");
                          setCheckOut("");
                          setSelectedMonths([]);
                        }}
                        className="text-base font-bold text-[#7a8f84] hover:text-[#0a2e1a] underline underline-offset-4 decoration-[#e4ebe7] hover:decoration-[#16a34a] transition-all"
                      >
                        Wyczyść
                      </button>
                      <motion.button
                        whileHover={{ scale: 1.03, backgroundColor: "#000", y: -2 }}
                        whileTap={{ scale: 0.97, y: 0 }}
                        type="button"
                        onClick={() => setOpenWithDirection("guests")}
                        className="flex items-center gap-3 rounded-full bg-[#0a2e1a] px-10 py-4 text-[16px] font-black text-white shadow-xl transition-all"
                      >
                        Dalej
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5">
                          <path d="M5 12h14M12 5l7 7-7 7" />
                        </svg>
                      </motion.button>
                    </div>
                  </div>
                </motion.div>
              )}

              {open === "guests" && (
                <motion.div
                  key="guests"
                  custom={direction}
                  initial={{ opacity: 0, x: direction * 40, scale: 0.98 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, x: direction * -40, scale: 0.98 }}
                  transition={{ type: "spring", damping: 30, stiffness: 260, mass: 1 }}
                  className="max-w-[720px] mx-auto px-4"
                >
                  <div className="mb-10">
                    <h3 className="mb-1 text-3xl font-black text-[#0a2e1a]">Liczba gości</h3>
                    <p className="text-base text-[#7a8f84]">Dopasujemy wielkość obiektu do Twoich potrzeb</p>
                  </div>
                  <div className="space-y-4">
                    {[
                      { label: "Dorośli", desc: "Wiek 18+", value: adults, set: setAdults, min: 1, max: 16 },
                      { label: "Dzieci", desc: "Wiek 2-17", value: children, set: setChildren, min: 0, max: 10 },
                      { label: "Zwierzęta", desc: "Przyjazne pupilom", value: pets, set: setPets, min: 0, max: 5 },
                    ].map((row) => (
                      <div key={row.label} className="flex items-center justify-between rounded-[32px] border-2 border-[#f0f3f1] bg-white p-8 hover:bg-[#f0fdf4]/30 hover:border-[#16a34a]/20 transition-all group shadow-sm">
                        <div>
                          <p className="text-xl font-black text-[#0a2e1a] group-hover:text-[#16a34a] transition-colors">{row.label}</p>
                          <p className="text-base text-[#7a8f84]">{row.desc}</p>
                        </div>
                        <div className="flex items-center gap-6">
                          <motion.button
                            whileTap={{ scale: 0.9 }}
                            type="button"
                            disabled={row.value <= row.min}
                            onClick={() => row.set((x) => Math.max(row.min, x - 1))}
                            className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-[#e4ebe7] text-2xl font-bold transition-all hover:border-[#16a34a] hover:text-[#16a34a] disabled:opacity-20"
                          >
                            -
                          </motion.button>
                          <span className="min-w-10 text-center text-3xl font-black text-[#0a2e1a]">{row.value}</span>
                          <motion.button
                            whileTap={{ scale: 0.9 }}
                            type="button"
                            disabled={row.value >= row.max}
                            onClick={() => row.set((x) => Math.min(row.max, x + 1))}
                            className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-[#e4ebe7] text-2xl font-bold transition-all hover:border-[#16a34a] hover:text-[#16a34a] disabled:opacity-20"
                          >
                            +
                          </motion.button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-14 flex items-center justify-between border-t border-[#e4ebe7] pt-8">
                    <button
                      type="button"
                      onClick={() => {
                        setAdults(1);
                        setChildren(0);
                        setPets(0);
                      }}
                      className="text-base font-bold text-[#7a8f84] hover:text-[#0a2e1a] underline underline-offset-4 decoration-[#e4ebe7] hover:decoration-[#16a34a] transition-all"
                    >
                      Wyczyść
                    </button>
                    <motion.button
                      whileHover={{ scale: 1.03, backgroundColor: "#000", y: -2 }}
                      whileTap={{ scale: 0.97, y: 0 }}
                      type="button"
                      onClick={() => setOpenWithDirection("mode")}
                      className="flex items-center gap-3 rounded-full bg-[#0a2e1a] px-10 py-4 text-[16px] font-black text-white shadow-xl transition-all"
                    >
                      Dalej
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5">
                        <path d="M5 12h14M12 5l7 7-7 7" />
                      </svg>
                    </motion.button>
                  </div>
                </motion.div>
              )}

              {open === "mode" && (
                <motion.div
                  key="mode"
                  custom={direction}
                  initial={{ opacity: 0, x: direction * 40, scale: 0.98 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, x: direction * -40, scale: 0.98 }}
                  transition={{ type: "spring", damping: 30, stiffness: 260, mass: 1 }}
                  className="mx-auto max-w-[1080px] px-4 text-center"
                >
                  <div className="mb-10">
                    <h3 className="mb-1 text-3xl font-black text-[#0a2e1a]">Wybierz styl podróży</h3>
                    <p className="text-base text-[#7a8f84]">Filtrujemy oferty najlepiej dopasowane do Ciebie</p>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                    {TRAVEL_MODE_ITEMS.map((item) => {
                      const selected = mode === item.id;
                      return (
                        <motion.button
                          key={item.id}
                          type="button"
                          whileHover={{ scale: 1.05, y: -4, backgroundColor: "#f0fdf4" }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => {
                            setMode(selected ? null : item.id);
                          }}
                          className={cn(
                            "flex flex-col items-center gap-6 rounded-[40px] border-2 p-10 transition-all duration-300",
                            selected 
                              ? "border-[#16a34a] bg-[#dcfce7] shadow-xl scale-105" 
                              : "border-[#f0f3f1] bg-white hover:border-[#16a34a]/30 shadow-sm"
                          )}
                        >
                          <span className="text-7xl leading-none mb-2">{item.emoji}</span>
                          <span className="text-xl font-black text-[#0a2e1a]">{item.label}</span>
                        </motion.button>
                      );
                    })}
                  </div>
                  <div className="mt-14 flex items-center justify-between border-t border-[#e4ebe7] pt-8">
                    <button
                      type="button"
                      onClick={() => setMode(null)}
                      className="text-base font-bold text-[#7a8f84] hover:text-[#0a2e1a] underline underline-offset-4 decoration-[#e4ebe7] hover:decoration-[#16a34a] transition-all"
                    >
                      Wyczyść
                    </button>
                    <motion.button
                      whileHover={{ scale: 1.03, backgroundColor: "#000", y: -2 }}
                      whileTap={{ scale: 0.97, y: 0 }}
                      type="button"
                      onClick={runSearch}
                      className="flex items-center gap-3 rounded-full bg-[#0a2e1a] px-10 py-4 text-[16px] font-black text-white shadow-xl transition-all"
                    >
                      Szukaj ofert
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5">
                        <path d="M21 21l-4.35-4.35m1.85-5.15a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </motion.button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: "easeOut" }}
        className="mt-[30px] px-4 py-4"
      >
        <div className="flex flex-wrap items-center justify-center gap-2.5">
          <span className="px-2 text-[13px] font-semibold tracking-[0.02em] text-[#6a8276]">Popularne:</span>
          {[
            "🏔️ Zakopane",
            "🏙️ Warszawa",
            "🏔️ Kościelisko",
            "⛷️ Szklarska Poręba",
            "🏔️ Wisła",
          ].map((pill, idx) => (
            <motion.button
              type="button"
              key={pill}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: idx * 0.06, ease: "easeOut" }}
              whileHover={{ y: -2, scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                const value = pill.split(" ").slice(1).join(" ");
                setLocation(value);
                setLocationLabel(value);
              }}
              className="rounded-pill px-4 py-2.5 text-[14px] font-semibold text-[#0a2e1a] shadow-[0_3px_10px_rgba(10,46,26,0.08)] transition-all duration-300 hover:bg-[linear-gradient(135deg,rgba(240,253,244,0.92),rgba(236,253,245,0.78))] hover:text-[#06351b] hover:shadow-[0_10px_24px_rgba(22,163,74,0.18)] hover:ring-1 hover:ring-[#16a34a]/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#16a34a]/40"
            >
              {pill}
            </motion.button>
          ))}
        </div>

      </motion.div>

    </div>
  );
}
