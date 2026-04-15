"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { addMonths, eachMonthOfInterval, endOfMonth, format, isSameMonth, startOfMonth, startOfToday } from "date-fns";
import { pl } from "date-fns/locale";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import { DayPicker, type DateRange } from "react-day-picker";
import { api } from "@/lib/api/client";
import { getAccessToken } from "@/lib/authStorage";
import { buildSearchQueryString, normalizedAiParamsToState } from "@/lib/searchQuery";
import { LOCATION_TAG_KEYS } from "@/lib/locationTags";
import { useSearchStore, type SearchParamsState } from "@/lib/store/searchStore";
import type { AISession } from "@/types/ai";
import { cn } from "@/lib/utils";
import { TRAVEL_MODE_ITEMS } from "./TravelModeSelector";

export type HeroSearchBarProps = {
  variant: "hero" | "strip";
};

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
  const [openTab, setOpenTab] = useState<"location" | "dates" | "guests" | "mode" | null>(null);
  const [direction, setDirection] = useState(0);
  const [suggestedDests, setSuggestedDests] = useState<SuggestedDest[]>([]);
  const [autocompleteResults, setAutocompleteResults] = useState<SuggestedDest[]>([]);
  const [isLoadingSuggested, setIsLoadingSuggested] = useState(false);

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

  const setOpenTabWithDirection = (newTab: "location" | "dates" | "guests" | "mode" | null) => {
    const order: ("location" | "dates" | "guests" | "mode" | null)[] = ["location", "dates", "guests", "mode"];
    const currentIndex = order.indexOf(openTab);
    const nextIndex = order.indexOf(newTab);
    setDirection(nextIndex > currentIndex ? 1 : -1);
    setOpenTab(newTab);
  };
  const debouncedLoc = useDebounced(locInput, 300);

  const [range, setRange] = useState<DateRange | undefined>(() =>
    params.date_from && params.date_to
      ? { from: new Date(params.date_from), to: new Date(params.date_to) }
      : undefined
  );
  const [guests, setGuests] = useState(params.guests ?? 2);
  const [adults, setAdults] = useState(params.adults ?? params.guests ?? 2);
  const [children, setChildren] = useState(params.children ?? 0);
  const [infants, setInfants] = useState(params.infants ?? 0);
  const [pets, setPets] = useState(params.pets ?? 0);

  // AI search state
  const [aiOpen, setAiOpen] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiBusy, setAiBusy] = useState(false);

  const [dateTab, setDateTab] = useState<"dates" | "flexible">("dates");
  const [flexibleDuration, setFlexibleDuration] = useState<"weekend" | "week" | "month">("week");
  const [selectedMonths, setSelectedMonths] = useState<Date[]>([]);

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

  function handleNearby() {
    if (typeof window === "undefined" || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        const update: Partial<SearchParamsState> = {
          lat: latitude,
          lng: longitude,
          radius_km: 300, // Zwiększamy promień do 300km dla lepszej skuteczności
          location: "W pobliżu",
          bbox_south: undefined,
          bbox_west: undefined,
          bbox_north: undefined,
          bbox_east: undefined,
          listing_types: undefined,
          amenities: undefined,
          is_pet_friendly: undefined,
          travel_mode: undefined,
          min_price: undefined,
          max_price: undefined,
        };
        const tagClear = update as Partial<SearchParamsState> & Record<string, undefined>;
        for (const tag of LOCATION_TAG_KEYS) {
          tagClear[tag] = undefined;
        }
        setParams(update);
        setLocInput("W pobliżu");
        setOpenTab(null);

        // Pełny stan wyszukiwania: aktualne filtry + geolokalizacja, z utrzymaniem dat i gości z params.
        const nextParams: SearchParamsState = {
          ...params,
          ...update,
          date_from: params.date_from,
          date_to: params.date_to,
          guests: params.guests,
          adults: params.adults,
          children: params.children,
          infants: params.infants,
          pets: params.pets,
        };

        // Jeśli jesteśmy na podstronie search, od razu nawigujemy
        if (window.location.pathname.includes("/search")) {
          router.replace(`/search?${buildSearchQueryString(nextParams)}`);
        }
      },
      () => {
        toast.error("Nie udało się pobrać lokalizacji.");
      }
    );
  }

  // Keep local state in sync when store/URL changes externally
  useEffect(() => { setLocInput(params.location || ""); }, [params.location]);
  useEffect(() => {
    setGuests(params.guests ?? 2);
    setAdults(params.adults ?? params.guests ?? 2);
    setChildren(params.children ?? 0);
    setInfants(params.infants ?? 0);
    setPets(params.pets ?? 0);
  }, [params.guests, params.adults, params.children, params.infants, params.pets]);
  useEffect(() => {
    if (params.date_from && params.date_to && params.date_from !== params.date_to) {
      setRange({ from: new Date(params.date_from), to: new Date(params.date_to) });
    } else if (!params.date_from) {
      setRange(undefined);
    }
  }, [params.date_from, params.date_to]);

  // Geocode suggestions
  useEffect(() => {
    const q = debouncedLoc.trim();
    if (!q || q.length < 2) {
      setAutocompleteResults([]);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await api.get<{ data: SuggestedDest[] }>(`/api/v1/search/autocomplete/?q=${encodeURIComponent(q)}`);
        if (cancelled) return;
        setAutocompleteResults(res.data || []);
      } catch {
        if (!cancelled) setAutocompleteResults([]);
      }
    })();
    return () => { cancelled = true; };
  }, [debouncedLoc]);

  // Navigate with a patch applied on top of current URL params
  const navigate = useCallback(
    (patch: Partial<Record<string, string | undefined>>) => {
      const q = new URLSearchParams(sp.toString());
      // Pagination/map limits are request-shape params and must be reset on new filter state.
      q.delete("cursor");
      q.delete("page_size");
      q.delete("limit");
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
     
     const merged: SearchParamsState = {
       ...params,
       location: locInput.trim(),
       date_from: df,
       date_to: dt,
       guests: adults + children,
       adults,
       children,
       infants,
       pets,
       radius_km: (params.lat && params.lng) ? (params.radius_km ?? 50) : undefined,
       ordering: params.ordering || "recommended",
       is_pet_friendly: pets > 0 ? true : undefined,
     };

     // Obsługa filtrów specjalnych z autocomplete (np. near_mountains)
     const activeResult = autocompleteResults.find(r => r.name === locInput);
     if (activeResult?.filter_key) {
       // eslint-disable-next-line @typescript-eslint/no-explicit-any
       (merged as any)[activeResult.filter_key] = true;
     }
     if (activeResult?.listing_type) {
       merged["listing_types"] = [activeResult.listing_type];
     }
     if (activeResult?.type === "keyword") {
       delete merged.lat;
       delete merged.lng;
       merged.radius_km = undefined;
     }

     setParams(merged);
     router.push(`/search?${buildSearchQueryString(merged)}`);
   }, [adults, children, infants, pets, locInput, params, range, router, setParams, autocompleteResults]);

  // --- Individual live handlers for strip variant ---

  const handleSelectSuggestion = useCallback(
    (s: SuggestedDest) => {
      setLocInput(s.name);
      setOpenTab(null);
      
      const patch: Record<string, string | undefined> = {
        location: s.name,
        latitude: s.type === "keyword" ? undefined : String(s.lat),
        longitude: s.type === "keyword" ? undefined : String(s.lng),
        lat: s.type === "keyword" ? undefined : String(s.lat),
        lng: s.type === "keyword" ? undefined : String(s.lng),
        radius_km: s.type === "keyword" ? undefined : (params.radius_km ? String(params.radius_km) : "50"),
        listing_types: undefined, // clear type when picking place
        // Reset viewport filter when source location changes.
        bbox_south: undefined,
        bbox_west: undefined,
        bbox_north: undefined,
        bbox_east: undefined,
      };

      // Clear all location tags
      for (const t of LOCATION_TAG_KEYS) {
        patch[t] = undefined;
      }

      if (s.filter_key) {
        patch[s.filter_key] = "true";
      }
      if (s.listing_type) {
        patch["listing_types"] = s.listing_type;
      }

      navigate(patch);
    },
    [navigate, params.radius_km],
  );

  const handleSelectCategory = useCallback(
    (cat: { label: string; field?: string; type?: string }) => {
      setLocInput(cat.label);
      setOpenTab("dates");
      
      const patch: Record<string, string | undefined> = {
        location: cat.label,
        latitude: undefined,
        longitude: undefined,
        lat: undefined,
        lng: undefined,
        radius_km: undefined,
        listing_types: undefined,
        bbox_south: undefined,
        bbox_west: undefined,
        bbox_north: undefined,
        bbox_east: undefined,
      };

      // Clear all location tags
      for (const t of LOCATION_TAG_KEYS) {
        patch[t] = undefined;
      }

      if (cat.field) patch[cat.field] = "true";
      if (cat.type) patch["listing_types"] = cat.type;

      navigate(patch);
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
        // Don't close immediately to let them see selection
        navigate({ date_from: df, date_to: dt });
      }
    },
    [navigate],
  );

  const handleClearDates = useCallback(() => {
    setRange(undefined);
    setSelectedMonths([]);
    navigate({ date_from: undefined, date_to: undefined });
  }, [navigate]);


  const handleAdultsChange = useCallback(
    (newAdults: number) => {
      setAdults(newAdults);
      const total = newAdults + children;
      setGuests(total);
      navigate({ adults: String(newAdults), guests: String(total) });
    },
    [navigate, children],
  );

  const handleChildrenChange = useCallback(
    (newChildren: number) => {
      setChildren(newChildren);
      const total = adults + newChildren;
      setGuests(total);
      navigate({ children: String(newChildren), guests: String(total) });
    },
    [navigate, adults],
  );

  const handleInfantsChange = useCallback(
    (newInfants: number) => {
      setInfants(newInfants);
      navigate({ infants: String(newInfants) });
    },
    [navigate],
  );

  const handlePetsChange = useCallback(
    (newPets: number) => {
      setPets(newPets);
      navigate({ pets: String(newPets), is_pet_friendly: newPets > 0 ? "true" : undefined });
    },
    [navigate],
  );

  const handleModeChange = useCallback(
    (modeId: string | null) => {
      const current = sp.get("travel_mode");
      const newMode = current === modeId ? undefined : (modeId || undefined);
      setOpenTab(null);
      navigate({ travel_mode: newMode });
    },
    [navigate, sp],
  );

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
    if (aiBusy) return;
    const text = aiPrompt.trim();
    if (!text) { toast.error("Wpisz opis wyjazdu."); return; }
    const token = typeof window !== "undefined" ? getAccessToken() : null;
    if (!token) { toast.error("Zaloguj się, aby użyć wyszukiwania AI."); return; }
    setAiBusy(true);
    try {
      const start = await api.post<{ data: AISession & { interpretation?: { normalized_params?: Record<string, unknown> } | null } }>(
        "/api/v1/ai/search/", { prompt: text }
      );
      const sid = start.data.session_id;
      const toSearchState = (session: (AISession & { interpretation?: { normalized_params?: Record<string, unknown> } | null }) | null | undefined) => {
        const fromSession = session?.search_params;
        const fromLegacy = session?.interpretation?.normalized_params;
        const fromFilters = session?.filters
          ? {
              location: session.filters.location,
              travel_mode: session.filters.travel_mode,
              max_price: session.filters.max_price,
              guests: session.filters.max_guests ?? session.filters.min_guests,
            }
          : {};
        const raw = (fromSession && Object.keys(fromSession).length ? fromSession : fromLegacy) ?? fromFilters;
        return normalizedAiParamsToState((raw ?? {}) as Record<string, unknown>);
      };
      for (let i = 0; i < 40; i++) {
        const detail = await api.get<{
          data: AISession & { interpretation?: { normalized_params?: Record<string, unknown> } | null };
        }>(`/api/v1/ai/search/${sid}/`);
        const st = detail.data.status;
        if (st === "failed") { toast.error(detail.data.error_message || "AI nie zinterpretowało zapytania."); return; }
        if (st === "complete") {
          const merged = toSearchState(detail.data);
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
  }, [aiPrompt, aiBusy, router, setParams]);

  // ── RENDER ──────────────────────────────────────────────────────────────
  const modalContent = (
    <Dialog.Portal>
      <Dialog.Overlay className="DialogOverlay" />
      <Dialog.Content className="DialogContent">
        <Dialog.Title className="sr-only">Wyszukiwarka ofert</Dialog.Title>
        <Dialog.Description className="sr-only">
          Filtruj wyniki wyszukiwania według lokalizacji, daty, liczby gości i preferowanego stylu podróży.
        </Dialog.Description>
        <div className="flex flex-col h-full overflow-hidden">
          {/* Modal Header/Mini SearchBar */}
          <div className="border-b border-gray-100 bg-gray-50/50 p-4 flex-shrink-0">
            <div className="mx-auto flex w-full max-w-[1080px] items-center gap-3">
              {openTab && openTab !== "location" && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => {
                    const order: ("location" | "dates" | "guests" | "mode" | null)[] = ["location", "dates", "guests", "mode"];
                    const idx = order.indexOf(openTab);
                    if (idx > 0) setOpenTabWithDirection(order[idx - 1]);
                  }}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-gray-200 bg-white text-text shadow-sm hover:border-brand hover:text-brand transition-all"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M15 18l-6-6 6-6" />
                  </svg>
                </motion.button>
              )}
              <div className="flex flex-1 items-center gap-1 rounded-full border border-gray-200 bg-white p-1.5 shadow-sm">
                <button
                  onClick={() => setOpenTabWithDirection("location")}
                  className={cn(
                    "flex-1 rounded-full px-4 py-2 text-left transition-all",
                    openTab === "location" ? "bg-brand-surface shadow-inner" : "hover:bg-gray-50"
                  )}
                >
                  <span className="block text-[9px] font-black uppercase tracking-wider text-text-muted">Gdzie</span>
                  <span className="block truncate text-[13px] font-bold text-text">{locInput || "Wybierz cel"}</span>
                </button>
                <div className="h-6 w-px bg-gray-200" />
                <button
                  onClick={() => setOpenTabWithDirection("dates")}
                  className={cn(
                    "flex-1 rounded-full px-4 py-2 text-left transition-all",
                    openTab === "dates" ? "bg-brand-surface shadow-inner" : "hover:bg-gray-50"
                  )}
                >
                  <span className="block text-[9px] font-black uppercase tracking-wider text-text-muted">Kiedy</span>
                  <span className="block truncate text-[13px] font-bold text-text">{dateLabel}</span>
                </button>
                <div className="h-6 w-px bg-gray-200" />
                <button
                  onClick={() => setOpenTabWithDirection("guests")}
                  className={cn(
                    "flex-1 rounded-full px-4 py-2 text-left transition-all",
                    openTab === "guests" ? "bg-brand-surface shadow-inner" : "hover:bg-gray-50"
                  )}
                >
                  <span className="block text-[9px] font-black uppercase tracking-wider text-text-muted">Goście</span>
                  <span className="block truncate text-[13px] font-bold text-text">{guests === 0 ? "Ilu gości?" : `${guests} ${guests === 1 ? "gość" : "gości"}`}</span>
                </button>
                <div className="h-6 w-px bg-gray-200" />
                <button
                  onClick={() => setOpenTabWithDirection("mode")}
                  className={cn(
                    "flex-1 rounded-full px-4 py-2 text-left transition-all",
                    openTab === "mode" ? "bg-brand-surface shadow-inner" : "hover:bg-gray-50"
                  )}
                >
                  <span className="block text-[9px] font-black uppercase tracking-wider text-text-muted">Tryb</span>
                  <span className="block truncate text-[13px] font-bold text-text">{modeLabel}</span>
                </button>
                <button
                  onClick={() => { runSearch(); setOpenTab(null); }}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-brand text-white shadow-md hover:bg-brand-dark transition-colors"
                >
                  <svg viewBox="0 0 24 24" fill="none" className="h-4.5 w-4.5" stroke="currentColor" strokeWidth="3">
                    <path d="M21 21l-4.35-4.35m1.85-5.15a7 7 0 11-14 0 7 7 0 0114 0z" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-8 scrollbar-hide relative min-h-0">
            <AnimatePresence mode="wait" custom={direction}>
            {openTab === "location" && (
              <motion.div
                key="location"
                custom={direction}
                initial={{ opacity: 0, x: direction * 40, scale: 0.98 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: direction * -40, scale: 0.98 }}
                transition={{ type: "spring", damping: 30, stiffness: 260, mass: 1 }}
              >
              <div className="mb-8 text-center px-4">
                <h3 className="mb-2 text-3xl font-black text-text">Dokąd chcesz pojechać?</h3>
                <p className="text-base text-text-muted">Wybierz z sugerowanych lub wpisz własny cel</p>
              </div>
              <div className="relative mx-auto max-w-[1080px] px-4">
                <input
                  autoFocus
                  value={locInput}
                  onChange={(e) => { setLocInput(e.target.value); }}
                  placeholder="Wpisz miejscowość lub region..."
                  className="w-full rounded-[28px] border-2 border-gray-100 bg-white px-8 py-6 text-2xl font-medium outline-none transition-all focus:border-brand focus:ring-4 focus:ring-brand/5 shadow-sm"
                />
              </div>
              
              <div className="mx-auto max-w-[1080px] px-4">
                {/* Sekcja kategorii premium */}
                <div className="mb-10 mt-8">
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
                        onClick={() => handleSelectCategory(cat)}
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
                        onClick={() => handleSelectCategory(cat)}
                        className="flex items-center gap-2.5 rounded-full border-2 border-[#e4ebe7] bg-white px-5 py-2.5 transition-all shadow-sm hover:shadow-md"
                      >
                        <span className="text-xl">{cat.emoji}</span>
                        <span className="text-sm font-black text-[#0a2e1a]">{cat.label}</span>
                      </motion.button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="mx-auto max-w-[1080px] mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 px-4">
                {locInput.length < 2 ? (
                  <>
                    <motion.button
                      type="button"
                      whileHover={{ scale: 1.01, backgroundColor: "#f0fdf4" }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleNearby}
                      className="flex items-center gap-5 rounded-[28px] border border-gray-50 bg-white p-6 text-left transition-all hover:border-brand/30 hover:shadow-md group"
                    >
                      <SuggestionIcon type="nearby" />
                      <div>
                        <span className="block text-lg font-bold text-text group-hover:text-brand leading-tight mb-0.5">W pobliżu</span>
                        <span className="text-sm text-text-muted">Wyszukaj w Twojej okolicy</span>
                      </div>
                    </motion.button>
                    
                    {isLoadingSuggested ? (
                      Array.from({ length: 8 }).map((_, i) => (
                        <div key={i} className="flex animate-pulse items-center gap-5 rounded-[28px] border border-gray-50 bg-gray-50/50 p-6">
                          <div className="h-12 w-12 rounded-[16px] bg-gray-200" />
                          <div className="flex-1 space-y-2">
                            <div className="h-4 w-2/3 rounded bg-gray-200" />
                            <div className="h-3 w-1/2 rounded bg-gray-200" />
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
                          onClick={() => handleSelectSuggestion(dest)}
                          className="flex items-center gap-5 rounded-[28px] border border-gray-50 bg-white p-6 text-left transition-all hover:border-brand/30 hover:shadow-md group"
                        >
                          <SuggestionIcon type={dest.icon} />
                          <div>
                            <span className="block text-lg font-bold text-text group-hover:text-brand leading-tight mb-0.5">
                              {dest.name}, {dest.region}
                            </span>
                            <span className="text-sm text-text-muted">{dest.description}</span>
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
                      onClick={() => handleSelectSuggestion(s)}
                      className="flex items-center gap-5 rounded-[28px] border border-gray-50 bg-white p-6 text-left transition-all hover:border-brand/30 hover:shadow-md group"
                    >
                      <SuggestionIcon type={s.icon} />
                      <div>
                        <span className="block text-lg font-bold text-text group-hover:text-brand leading-tight mb-0.5">{s.name}</span>
                        <span className="text-sm text-text-muted">{s.description || s.region}</span>
                      </div>
                    </motion.button>
                  ))
                ) : (
                  <div className="col-span-full py-12">
                    <div className="mb-6 text-center">
                      <p className="text-xl font-bold text-text-muted">Brak wyników dla &quot;{locInput}&quot;</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      <motion.button
                        type="button"
                        whileHover={{ scale: 1.01, backgroundColor: "#f0fdf4" }}
                        whileTap={{ scale: 0.98 }}
                        onClick={handleNearby}
                        className="flex items-center gap-5 rounded-[28px] border border-gray-50 bg-white p-6 text-left transition-all hover:border-brand/30 hover:shadow-md group"
                      >
                        <SuggestionIcon type="nearby" />
                        <div>
                          <span className="block text-lg font-bold text-text group-hover:text-brand leading-tight mb-0.5">W pobliżu</span>
                          <span className="text-sm text-text-muted">Wyszukaj w Twojej okolicy</span>
                        </div>
                      </motion.button>
                    </div>
                  </div>
                )}
              </div>
              </motion.div>
            )}

            {openTab === "dates" && (
              <motion.div
                key="dates"
                custom={direction}
                initial={{ opacity: 0, x: direction * 40, scale: 0.98 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: direction * -40, scale: 0.98 }}
                transition={{ type: "spring", damping: 30, stiffness: 260, mass: 1 }}
              >
              <div className="mb-8 flex justify-center">
                <div className="inline-flex rounded-full bg-gray-50 p-1.5 shadow-sm border border-gray-100">
                  <button
                    onClick={() => setDateTab("dates")}
                    className={cn(
                      "px-8 py-2.5 text-sm font-bold rounded-full transition-all",
                      dateTab === "dates" ? "bg-white text-brand-dark shadow-md" : "text-text-muted hover:text-brand-dark"
                    )}
                  >
                    Daty
                  </button>
                  <button
                    onClick={() => setDateTab("flexible")}
                    className={cn(
                      "px-8 py-2.5 text-sm font-bold rounded-full transition-all",
                      dateTab === "flexible" ? "bg-white text-brand-dark shadow-md" : "text-text-muted hover:text-brand-dark"
                    )}
                  >
                    Elastyczne
                  </button>
                </div>
              </div>

              {dateTab === "dates" ? (
                <div className="flex justify-center">
                  <div className="bg-white rounded-[24px] p-2 border border-gray-50">
                    <DayPicker
                      mode="range"
                      locale={pl}
                      numberOfMonths={2}
                      selected={range}
                      onSelect={handleDateSelect}
                      disabled={[{ before: startOfToday() }]}
                      classNames={{
                        months: "flex flex-col md:flex-row gap-20",
                        month: "space-y-8",
                        month_caption: "flex items-center justify-center relative h-12 mb-4",
                        caption_label: "text-[19px] font-black text-brand-dark capitalize",
                        nav: "flex items-center gap-1 absolute inset-x-0 top-0 justify-between z-10",
                        button_previous: "h-12 w-12 flex items-center justify-center rounded-full border-2 border-gray-100 text-brand-dark hover:bg-brand-surface hover:border-brand transition-all",
                        button_next: "h-12 w-12 flex items-center justify-center rounded-full border-2 border-gray-100 text-brand-dark hover:bg-brand-surface hover:border-brand transition-all",
                        chevron: "h-6 w-6 fill-current",
                        weekdays: "flex border-b border-gray-50 pb-3",
                        weekday: "flex-1 text-center text-[14px] font-black text-text-muted uppercase tracking-wider",
                        weeks: "space-y-1 mt-6",
                        week: "flex",
                        day: "flex-1 flex items-center justify-center p-0.5 relative",
                        day_button: "h-14 w-14 flex items-center justify-center rounded-full text-[17px] font-bold text-brand-dark hover:bg-brand-surface transition-all duration-200 relative",
                        selected: "bg-brand !text-white rounded-full z-20 shadow-lg",
                        range_start: "bg-brand !text-white rounded-full z-20 shadow-lg",
                        range_end: "bg-brand !text-white rounded-full z-20 shadow-lg",
                        range_middle: "bg-brand-surface !text-brand !rounded-none after:content-[''] after:absolute after:inset-0 after:bg-brand-surface after:-z-10",
                        today: "text-brand font-black underline underline-offset-8 decoration-2",
                        disabled: "opacity-20 cursor-not-allowed",
                        outside: "opacity-0 pointer-events-none",
                      }}
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="text-center">
                    <h4 className="mb-6 text-lg font-black text-brand-dark">Jak długi ma być Twój pobyt?</h4>
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
                              ? "border-brand bg-brand-surface text-brand shadow-sm"
                              : "border-gray-100 text-brand-dark hover:border-brand hover:bg-brand-surface/50"
                          )}
                        >
                          {opt.label}
                        </motion.button>
                      ))}
                    </div>
                  </div>

                  <div className="text-center">
                    <h4 className="mb-6 text-lg font-black text-brand-dark">Kiedy chcesz wyruszyć?</h4>
                    <div className="relative group">
                      {/* Navigation Buttons */}
                      <button
                        type="button"
                        onClick={() => scrollMonths("left")}
                        className="absolute left-0 top-1/2 -translate-y-1/2 z-20 flex h-12 w-12 items-center justify-center rounded-full bg-white/90 border-2 border-gray-100 text-brand-dark shadow-lg opacity-0 group-hover:opacity-100 transition-all hover:bg-white hover:border-brand -ml-6"
                      >
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                          <path d="M15 18l-6-6 6-6" />
                        </svg>
                      </button>
                      
                      <button
                        type="button"
                        onClick={() => scrollMonths("right")}
                        className="absolute right-0 top-1/2 -translate-y-1/2 z-20 flex h-12 w-12 items-center justify-center rounded-full bg-white/90 border-2 border-gray-100 text-brand-dark shadow-lg opacity-0 group-hover:opacity-100 transition-all hover:bg-white hover:border-brand -mr-6"
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
                                  ? "border-brand bg-brand-surface shadow-md scale-105"
                                  : "border-gray-100 hover:border-brand/30 hover:bg-gray-50/50"
                              )}
                            >
                              <div className={cn(
                                "flex h-16 w-16 items-center justify-center rounded-full border-2 border-gray-100 bg-white text-text-muted",
                                isSelected && "border-brand text-brand"
                              )}>
                                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                  <path d="M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" />
                                </svg>
                              </div>
                              <div className="text-center">
                                <p className="text-[17px] font-black text-brand-dark capitalize">{format(m, "MMMM", { locale: pl })}</p>
                                <p className="text-sm font-bold text-text-muted">{format(m, "yyyy")}</p>
                              </div>
                            </motion.button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="mx-auto max-w-[1080px] mt-12 flex flex-col md:flex-row items-center justify-between border-t border-gray-100 pt-8 gap-6">
                {dateTab === "dates" && (
                  <div className="flex gap-4 w-full md:w-auto">
                    <div className="flex-1 rounded-[24px] border border-gray-100 bg-white px-6 py-4 min-w-[180px] shadow-sm">
                      <p className="text-[10px] font-black uppercase tracking-wider text-text-muted">Zameldowanie</p>
                      <p className="text-[16px] font-bold text-brand-dark">{range?.from ? format(range.from, "d MMM yyyy", { locale: pl }) : "Dodaj datę"}</p>
                    </div>
                    <div className="flex-1 rounded-[24px] border border-gray-100 bg-white px-6 py-4 min-w-[180px] shadow-sm">
                      <p className="text-[10px] font-black uppercase tracking-wider text-text-muted">Wymeldowanie</p>
                      <p className="text-[16px] font-bold text-brand-dark">{range?.to ? format(range.to, "d MMM yyyy", { locale: pl }) : "Dodaj datę"}</p>
                    </div>
                  </div>
                )}
                
                <div className="flex items-center gap-8 w-full md:w-auto justify-between md:justify-end">
                  <button
                    type="button"
                    onClick={handleClearDates}
                    className="text-base font-bold text-text-muted hover:text-brand-dark underline underline-offset-4 decoration-gray-100 hover:decoration-brand transition-all"
                  >
                    Wyczyść
                  </button>
                  <motion.button
                    whileHover={{ scale: 1.03, backgroundColor: "#000", y: -2 }}
                    whileTap={{ scale: 0.97, y: 0 }}
                    type="button"
                    onClick={() => setOpenTabWithDirection("guests")}
                    className="flex items-center gap-3 rounded-full bg-brand-dark px-10 py-4 text-[16px] font-black text-white shadow-xl transition-all"
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

            {openTab === "guests" && (
              <motion.div
                key="guests"
                custom={direction}
                initial={{ opacity: 0, x: direction * 40, scale: 0.98 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: direction * -40, scale: 0.98 }}
                transition={{ type: "spring", damping: 30, stiffness: 260, mass: 1 }}
                className="max-w-[720px] mx-auto px-4"
              >
              <div className="mb-10 text-center">
                <h3 className="mb-2 text-3xl font-black text-text">Liczba gości</h3>
                <p className="text-base text-text-muted">Dopasujemy wielkość obiektu do Twoich potrzeb</p>
              </div>
              <div className="space-y-4">
                {[
                  { label: "Dorośli", desc: "Wiek 18+", value: adults, onChange: handleAdultsChange, min: 1, max: 16 },
                  { label: "Dzieci", desc: "Wiek 2-17", value: children, onChange: handleChildrenChange, min: 0, max: 10 },
                  { label: "Niemowlęta", desc: "Do 2 lat", value: infants, onChange: handleInfantsChange, min: 0, max: 5 },
                  { label: "Zwierzęta", desc: "Przyjazne pupilom", value: pets, onChange: handlePetsChange, min: 0, max: 5 },
                ].map((row) => (
                  <div key={row.label} className="flex items-center justify-between rounded-[32px] border-2 border-gray-100 bg-white p-8 hover:bg-brand-surface/30 hover:border-brand/20 transition-all group shadow-sm">
                    <div>
                      <p className="text-xl font-black text-text group-hover:text-brand transition-colors">{row.label}</p>
                      <p className="text-base text-text-muted">{row.desc}</p>
                    </div>
                    <div className="flex items-center gap-6">
                      <motion.button
                        whileTap={{ scale: 0.9 }}
                        type="button"
                        disabled={row.value <= row.min}
                        onClick={() => row.onChange(row.value - 1)}
                        className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-gray-100 text-2xl font-bold transition-all hover:border-brand hover:text-brand disabled:opacity-20"
                      >
                        -
                      </motion.button>
                      <span className="min-w-10 text-center text-3xl font-black text-text">{row.value}</span>
                      <motion.button
                        whileTap={{ scale: 0.9 }}
                        type="button"
                        disabled={row.value >= row.max}
                        onClick={() => row.onChange(row.value + 1)}
                        className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-gray-100 text-2xl font-bold transition-all hover:border-brand hover:text-brand disabled:opacity-20"
                      >
                        +
                      </motion.button>
                    </div>
                  </div>
                ))}
              </div>
                <div className="mt-14 flex items-center justify-between border-t border-gray-100 pt-8">
                  <button
                    type="button"
                    onClick={() => {
                      setAdults(1);
                      setChildren(0);
                      setInfants(0);
                      setPets(0);
                    }}
                    className="text-base font-bold text-text-muted hover:text-brand-dark underline underline-offset-4 decoration-gray-100 hover:decoration-brand transition-all"
                  >
                    Wyczyść
                  </button>
                  <motion.button
                    whileHover={{ scale: 1.03, backgroundColor: "#000", y: -2 }}
                    whileTap={{ scale: 0.97, y: 0 }}
                    type="button"
                    onClick={() => setOpenTabWithDirection("mode")}
                    className="flex items-center gap-3 rounded-full bg-brand-dark px-10 py-4 text-[16px] font-black text-white shadow-xl transition-all"
                  >
                    Dalej
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5">
                      <path d="M5 12h14M12 5l7 7-7 7" />
                    </svg>
                  </motion.button>
                </div>
              </motion.div>
            )}

            {openTab === "mode" && (
              <motion.div
                key="mode"
                custom={direction}
                initial={{ opacity: 0, x: direction * 40, scale: 0.98 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: direction * -40, scale: 0.98 }}
                transition={{ type: "spring", damping: 30, stiffness: 260, mass: 1 }}
                className="mx-auto max-w-[1080px] px-4"
              >
                <div className="mb-10 text-center">
                  <h3 className="mb-2 text-3xl font-black text-text">Wybierz styl podróży</h3>
                  <p className="text-base text-text-muted">Filtrujemy oferty najlepiej dopasowane do Twoich preferencji</p>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                  {TRAVEL_MODE_ITEMS.map((item) => {
                    const selected = currentMode === item.id;
                    return (
                      <motion.button
                        key={item.id}
                        type="button"
                        whileHover={{ scale: 1.05, y: -4, backgroundColor: "#f0fdf4" }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleModeChange(item.id)}
                        className={cn(
                          "flex flex-col items-center gap-6 rounded-[40px] border-2 p-10 transition-all duration-300 shadow-sm",
                          selected 
                            ? "border-brand bg-brand-surface shadow-xl scale-105" 
                            : "border-gray-100 bg-white hover:border-brand/30 hover:shadow-md"
                        )}
                      >
                        <span className="text-7xl leading-none mb-2">{item.emoji}</span>
                        <span className="text-xl font-black text-text">{item.label}</span>
                      </motion.button>
                    );
                  })}
                </div>
                <div className="mt-14 flex items-center justify-between border-t border-gray-100 pt-8">
                  <button
                    type="button"
                    onClick={() => handleModeChange(null)}
                    className="text-base font-bold text-text-muted hover:text-brand-dark underline underline-offset-4 decoration-gray-100 hover:decoration-brand transition-all"
                  >
                    Wyczyść
                  </button>
                  <motion.button
                    whileHover={{ scale: 1.03, backgroundColor: "#000", y: -2 }}
                    whileTap={{ scale: 0.97, y: 0 }}
                    type="button"
                    onClick={() => { setOpenTab(null); }}
                    className="flex items-center gap-3 rounded-full bg-brand-dark px-10 py-4 text-[16px] font-black text-white shadow-xl transition-all"
                  >
                    Pokaż oferty
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
  );

  // ── HERO VARIANT ─────────────────────────────────────────────────────────
  if (variant === "hero") {
    const divider = <div className="hidden h-8 w-px shrink-0 bg-gradient-to-b from-transparent via-gray-200 to-transparent sm:block" aria-hidden />;

    return (
      <Dialog.Root open={openTab !== null} onOpenChange={(v) => !v && setOpenTab(null)}>
        <div className="mx-auto mb-10 w-full max-w-[800px] space-y-4">
          {/* Main SearchBar */}
          <div className="group relative rounded-[28px] border-0 bg-white shadow-[0_4px_20px_rgba(0,0,0,0.08),0_8px_40px_rgba(220,38,38,0.08)] transition-all duration-300 overflow-hidden hover:shadow-[0_8px_48px_rgba(0,0,0,0.12),0_12px_60px_rgba(220,38,38,0.12)]">
            {/* Gradient top border accent */}
            <div className="h-0.5 bg-gradient-to-r from-rose-400 via-pink-400 to-rose-500"></div>

            <div className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:gap-0">
              <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:items-center sm:gap-0">
                {/* Location */}
                <button
                  type="button"
                  onClick={() => setOpenTab("location")}
                  className="relative min-w-0 flex-1 px-3 py-2 text-left sm:px-4 flex flex-col hover:bg-rose-50/30 rounded-lg transition-colors"
                >
                  <label className="text-xs font-bold uppercase tracking-widest text-rose-600 mb-1">Gdzie</label>
                  <div className="flex items-center gap-2">
                    <svg className="h-5 w-5 shrink-0 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <span className={cn("truncate text-base font-semibold", locInput ? "text-gray-900" : "text-gray-400")}>
                      {locInput || "Wyszukaj kierunki"}
                    </span>
                  </div>
                </button>
                {divider}
                {/* Dates */}
                <button 
                  type="button" 
                  onClick={() => setOpenTab("dates")}
                  className="px-3 py-2 text-left sm:px-4 flex flex-col hover:bg-rose-50/30 rounded-lg transition-colors"
                >
                  <span className="text-xs font-bold uppercase tracking-widest text-rose-600 mb-1">Kiedy</span>
                  <span className="text-base font-semibold text-gray-900">{dateLabel}</span>
                </button>
                {divider}
                {/* Guests */}
                <button 
                  type="button" 
                  onClick={() => setOpenTab("guests")}
                  className="px-3 py-2 text-left sm:px-4 flex flex-col hover:bg-rose-50/30 rounded-lg transition-colors"
                >
                  <span className="text-xs font-bold uppercase tracking-widest text-rose-600 mb-1">Goście</span>
                  <span className="text-base font-semibold text-gray-900">{guests === 0 ? "Ile osób?" : `${guests} ${guests === 1 ? "gość" : "gości"}`}</span>
                </button>
                {divider}
                {/* Travel mode */}
                <button 
                  type="button" 
                  onClick={() => setOpenTab("mode")}
                  className="px-3 py-2 text-left sm:px-4 flex flex-col hover:bg-rose-50/30 rounded-lg transition-colors"
                >
                  <span className="text-xs font-bold uppercase tracking-widest text-rose-600 mb-1">Tryb</span>
                  <span className="text-base font-semibold text-gray-900">{`${modeMeta?.emoji ?? ""} ${modeMeta?.label ?? "Dowolny"}`}</span>
                </button>
              </div>
              <button type="button" onClick={() => setOpenTab(null)}
                className="flex shrink-0 items-center justify-center gap-2.5 rounded-full bg-gradient-to-r from-rose-600 to-rose-700 px-7 py-3 text-sm font-bold text-white shadow-lg transition-all duration-200 hover:from-rose-700 hover:to-rose-800 active:scale-95 h-12 sm:ml-2">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <span className="hidden sm:inline">Szukaj</span>
              </button>
            </div>
          </div>

          {/* Popular destinations */}
          <div className="text-center">
            <p className="mb-3 text-sm font-semibold text-gray-700">Popularne kierunki:</p>
            <div className="flex flex-wrap items-center justify-center gap-2">
              {[
                "🏔️ Zakopane",
                "🏙️ Warszawa",
                "🏔️ Kościelisko",
                "⛷️ Szklarska Poręba",
                "🏔️ Wisła",
              ].map((pill) => (
                <button
                  type="button"
                  key={pill}
                  onClick={() => {
                    const value = pill.split(" ").slice(1).join(" ");
                    setLocInput(value);
                    navigate({ location: value });
                  }}
                  className="rounded-full border-2 border-rose-200 bg-white px-4 py-2 text-sm font-bold text-gray-800 transition-all duration-200 hover:-translate-y-1 hover:border-rose-400 hover:bg-rose-50 hover:shadow-md active:scale-95"
                >
                  {pill}
                </button>
              ))}
            </div>
          </div>
          {/* AI search */}
          <div className="rounded-[16px] border border-dashed border-rose-300/60 bg-rose-50/40 px-4 py-3">
            <button type="button" onClick={() => setAiOpen((o) => !o)}
              className="flex w-full items-center justify-between text-left text-sm font-bold text-rose-700">
              <span>✨ Szukaj z AI (język naturalny)</span>
              <span className="text-rose-600">{aiOpen ? "▲" : "▼"}</span>
            </button>
            {aiOpen && (
              <div className="mt-3 space-y-2">
                <textarea
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  placeholder={`Np. \u201eRomantyczny domek nad jeziorem dla dwojga, max 400 zł, lipiec\u201d`}
                  rows={3}
                  className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-rose-400"
                />
                <button type="button" onClick={() => void runAiSearch()} disabled={aiBusy}
                  className="rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60 hover:bg-rose-700 transition-colors">
                  {aiBusy ? "Szukam…" : "Interpretuj i pokaż oferty"}
                </button>
              </div>
            )}
          </div>
        </div>
        {modalContent}
      </Dialog.Root>
    );
  }

  // ── STRIP VARIANT — premium centered pill bar ─────────────────────────────
  return (
    <Dialog.Root open={openTab !== null} onOpenChange={(v) => !v && setOpenTab(null)}>
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="flex h-[72px] items-center rounded-[32px] border border-brand/20 bg-white px-3 py-2.5 shadow-[0_16px_48px_rgba(0,0,0,0.3)] transition-all hover:border-brand/40 group"
      >
        {/* Location */}
        <button
          type="button"
          onClick={() => setOpenTab("location")}
          className={cn(
            "flex min-w-[200px] max-w-[340px] items-center gap-3.5 rounded-[22px] px-6 py-3 transition-all",
            "hover:bg-gray-50 active:scale-[0.98]",
            openTab === "location" ? "bg-brand-surface shadow-inner text-brand-dark" : "text-brand-dark/90"
          )}
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-surface text-brand group-hover:bg-brand group-hover:text-white transition-all duration-300 shadow-sm">
            <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <div className="flex flex-col items-start overflow-hidden text-left">
            <span className="text-[10px] font-black uppercase tracking-wider text-brand-dark/40">Gdzie</span>
            <span className={cn("truncate text-[15px] font-black tracking-tight", locInput ? "text-brand-dark" : "text-brand-dark/20")}>
              {locInput || "Wybierz cel"}
            </span>
          </div>
        </button>

        <span className="h-8 w-px shrink-0 bg-brand/10 mx-1.5" aria-hidden />

        {/* Dates */}
        <button
          type="button"
          onClick={() => setOpenTab("dates")}
          className={cn(
            "flex min-w-[130px] shrink-0 whitespace-nowrap px-6 py-3 text-left rounded-[22px] transition-all active:scale-[0.98]",
            hasDateRange ? "text-brand-dark bg-brand-surface" : "text-brand-dark/90 hover:bg-gray-50",
            openTab === "dates" && "bg-brand-surface shadow-inner text-brand-dark"
          )}
        >
          <div className="flex flex-col items-start">
            <span className="text-[10px] font-black uppercase tracking-wider text-brand-dark/40">Kiedy</span>
            <span className="text-[15px] font-black tracking-tight">{dateLabel}</span>
          </div>
        </button>

        <span className="h-8 w-px shrink-0 bg-brand/10 mx-1.5" aria-hidden />

        {/* Guests */}
        <button
          type="button"
          onClick={() => setOpenTab("guests")}
          className={cn(
            "flex min-w-[110px] shrink-0 whitespace-nowrap px-6 py-3 text-left rounded-[22px] transition-all active:scale-[0.98]",
            guests > 0 ? "text-brand-dark/90 hover:bg-gray-50" : "text-brand-dark/60 hover:bg-gray-50",
            openTab === "guests" && "bg-brand-surface shadow-inner text-brand-dark"
          )}
        >
          <div className="flex flex-col items-start">
            <span className="text-[10px] font-black uppercase tracking-wider text-brand-dark/40">Goście</span>
            <span className="text-[15px] font-black tracking-tight">
              {guests === 0 ? "Ilu gości?" : `${guests} ${guests === 1 ? "osoba" : "osób"}`}
            </span>
          </div>
        </button>

        <span className="h-8 w-px shrink-0 bg-brand/10 mx-1.5" aria-hidden />

        {/* Travel mode */}
        <button
          type="button"
          onClick={() => setOpenTab("mode")}
          className={cn(
            "flex min-w-[110px] shrink-0 whitespace-nowrap px-6 py-3 text-left rounded-[22px] transition-all active:scale-[0.98]",
            currentMode ? "text-brand-dark bg-brand-surface shadow-sm" : "text-brand-dark/60 hover:bg-gray-50",
            openTab === "mode" && "bg-brand-surface shadow-inner text-brand-dark"
          )}
        >
          <div className="flex flex-col items-start">
            <span className="text-[10px] font-black uppercase tracking-wider text-brand-dark/40">Tryb</span>
            <span className="text-[15px] font-black tracking-tight">{modeLabel}</span>
          </div>
        </button>
      </motion.div>
      {modalContent}
    </Dialog.Root>
  );
}
