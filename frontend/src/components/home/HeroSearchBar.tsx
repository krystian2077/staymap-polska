"use client";

import { format } from "date-fns";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { apiUrl } from "@/lib/api";
import { buildSearchQueryString } from "@/lib/searchQuery";
import { TRAVEL_MODE_ITEMS } from "@/components/search/TravelModeSelector";

type Suggestion = { label: string; lat: number; lng: number };
type OpenDropdown = "location" | "checkin" | "checkout" | "guests" | "mode" | null;

const QUICK_PILLS = ["Zakopane", "Mazury", "Bieszczady", "Szklarska Poręba", "Wisła"];

export function HeroSearchBar() {
  const router = useRouter();

  const [open, setOpen] = useState<OpenDropdown>(null);
  const [location, setLocation] = useState("");
  const [locationLabel, setLocationLabel] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
  const [pets, setPets] = useState(0);
  const [mode, setMode] = useState<string | null>(null);

  useEffect(() => {
    const q = location.trim();
    if (!q || q.length < 2) {
      setSuggestions([]);
      return;
    }
    let cancelled = false;

    const id = setTimeout(async () => {
      try {
        const res = await fetch(apiUrl(`/api/v1/geocode/?q=${encodeURIComponent(q)}`), {
          cache: "no-store",
        });
        const json = (await res.json()) as {
          data?: { lat: number; lng: number; display_name?: string };
          meta?: { found?: boolean };
        };
        if (cancelled) return;
        if (json.data && json.meta?.found !== false) {
          const first = json.data.display_name || q;
          setSuggestions([{ label: first, lat: json.data.lat, lng: json.data.lng }]);
        } else {
          setSuggestions([]);
        }
      } catch {
        if (!cancelled) setSuggestions([]);
      }
    }, 280);

    return () => {
      cancelled = true;
      clearTimeout(id);
    };
  }, [location]);

  const guestsCount = adults + children;
  const modeMeta = useMemo(() => TRAVEL_MODE_ITEMS.find((x) => x.id === mode), [mode]);

  function runSearch() {
    const params = {
      location: locationLabel || location,
      date_from: checkIn || undefined,
      date_to: checkOut || undefined,
      guests: guestsCount || undefined,
      adults,
      children,
      travel_mode: mode || undefined,
      is_pet_friendly: pets > 0 || undefined,
      ordering: "recommended",
      radius_km: 50,
    };
    router.push(`/search?${buildSearchQueryString(params)}`);
  }

  function selectSuggestion(s: Suggestion) {
    const short = s.label.split(",")[0]?.trim() || s.label;
    setLocation(short);
    setLocationLabel(s.label);
    setOpen(null);
  }

  return (
    <div className="relative mx-auto mb-[52px] w-full max-w-[1020px]">
      <div
        className="pointer-events-none absolute inset-[-5px] rounded-[30px] bg-[linear-gradient(135deg,rgba(22,163,74,.4),rgba(74,222,128,.25),rgba(22,163,74,.4))] opacity-0 blur-[2px] transition-opacity duration-300 group-focus-within:opacity-100"
        aria-hidden
      />

      <div className="group relative rounded-[26px] border-2 border-[rgba(22,163,74,.18)] bg-white shadow-[0_2px_4px_rgba(10,15,13,.04),0_8px_24px_rgba(10,15,13,.08),0_24px_56px_rgba(10,15,13,.09),inset_0_1px_0_rgba(255,255,255,.9)] transition-all duration-300 focus-within:border-[rgba(22,163,74,.5)] focus-within:shadow-[0_0_0_5px_rgba(22,163,74,.1),0_8px_32px_rgba(10,15,13,.1),0_32px_72px_rgba(10,15,13,.14)]">
        <div className="grid grid-cols-1 md:grid-cols-[1.2fr_1fr_1fr_1fr_1fr_auto]">
          <button
            type="button"
            onClick={() => setOpen((v) => (v === "location" ? null : "location"))}
            className="sf"
          >
            <span className="sfl">Lokalizacja</span>
            <span className={location ? "sfv" : "sfv ph"}>{location || "Zakopane, Mazury, Bieszczady..."}</span>
          </button>

          <button type="button" onClick={() => setOpen((v) => (v === "checkin" ? null : "checkin"))} className="sf">
            <span className="sfl">Przyjazd</span>
            <span className={checkIn ? "sfv" : "sfv ph"}>{checkIn || "Kiedy przyjeżdżasz?"}</span>
          </button>

          <button type="button" onClick={() => setOpen((v) => (v === "checkout" ? null : "checkout"))} className="sf">
            <span className="sfl">Wyjazd</span>
            <span className={checkOut ? "sfv" : "sfv ph"}>{checkOut || "Kiedy wyjeżdżasz?"}</span>
          </button>

          <button type="button" onClick={() => setOpen((v) => (v === "guests" ? null : "guests"))} className="sf">
            <span className="sfl">Goście</span>
            <span className={guestsCount ? "sfv" : "sfv ph"}>{guestsCount ? `${guestsCount} osób` : "Ile osób?"}</span>
          </button>

          <button
            type="button"
            onClick={() => setOpen((v) => (v === "mode" ? null : "mode"))}
            className="sf border-r-0"
          >
            <span className="sfl">Tryb podróży</span>
            <span className={modeMeta ? "sfv" : "sfv ph"}>{modeMeta ? `${modeMeta.emoji} ${modeMeta.label}` : "Dowolny styl"}</span>
          </button>

          <div className="px-3 py-2 md:pl-1 md:pr-3 md:py-2.5">
            <button type="button" onClick={runSearch} className="sbtn w-full md:w-auto">
              <span>Szukaj</span>
              <svg viewBox="0 0 24 24" fill="none" className="h-[17px] w-[17px]" stroke="currentColor" strokeWidth="2.5">
                <path d="M21 21l-4.35-4.35m1.85-5.15a7 7 0 11-14 0 7 7 0 0114 0z" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {open === "location" ? (
        <div className="dropdown left-0 w-[min(560px,100%)]">
          <div className="border-b border-[#e4ebe7] bg-[linear-gradient(135deg,#f7faf8,#f0fdf4)] p-4">
            <p className="mb-2 text-[10px] font-bold uppercase tracking-[.08em] text-[#7a8f84]">Dokąd chcesz pojechać?</p>
            <input
              value={location}
              onChange={(e) => {
                setLocation(e.target.value);
                setLocationLabel("");
              }}
              placeholder="Wpisz miejscowość lub region..."
              className="w-full rounded-[12px] border-2 border-[rgba(22,163,74,.25)] px-4 py-3 text-sm outline-none"
            />
            <div className="mt-3 flex flex-wrap gap-2">
              {QUICK_PILLS.map((pill) => (
                <button
                  type="button"
                  key={pill}
                  onClick={() => {
                    setLocation(pill);
                    setLocationLabel(pill);
                    setOpen(null);
                  }}
                  className="rounded-pill border border-[#e4ebe7] px-3 py-1 text-xs font-semibold text-[#3d4f45] hover:border-[#16a34a] hover:bg-[#f0fdf4]"
                >
                  {pill}
                </button>
              ))}
            </div>
          </div>
          <div className="max-h-[240px] space-y-1 overflow-y-auto p-2">
            {suggestions.length ? (
              suggestions.map((s) => (
                <button
                  key={s.label}
                  type="button"
                  onClick={() => selectSuggestion(s)}
                  className="flex w-full items-center justify-between rounded-[12px] px-3 py-2 text-left hover:bg-[#f0fdf4]"
                >
                  <span className="text-sm font-semibold text-[#0a0f0d]">{s.label}</span>
                  <span className="text-[#b4c4bc]">›</span>
                </button>
              ))
            ) : (
              <p className="px-3 py-4 text-xs text-[#7a8f84]">Wpisz min. 2 znaki, aby zobaczyć podpowiedzi.</p>
            )}
          </div>
        </div>
      ) : null}

      {open === "checkin" || open === "checkout" ? (
        <div className="dropdown left-0 w-[min(740px,100%)] p-4">
          <div className="grid gap-3 md:grid-cols-2">
            <label className="text-sm font-semibold text-[#0a2e1a]">
              Przyjazd
              <input
                type="date"
                value={checkIn}
                min={format(new Date(), "yyyy-MM-dd")}
                onChange={(e) => setCheckIn(e.target.value)}
                className="mt-2 w-full rounded-[10px] border border-[#e4ebe7] px-3 py-2"
              />
            </label>
            <label className="text-sm font-semibold text-[#0a2e1a]">
              Wyjazd
              <input
                type="date"
                value={checkOut}
                min={checkIn || format(new Date(), "yyyy-MM-dd")}
                onChange={(e) => setCheckOut(e.target.value)}
                className="mt-2 w-full rounded-[10px] border border-[#e4ebe7] px-3 py-2"
              />
            </label>
          </div>
          <div className="mt-4 flex justify-between border-t border-[#e4ebe7] pt-3">
            <button
              type="button"
              onClick={() => {
                setCheckIn("");
                setCheckOut("");
              }}
              className="text-xs font-semibold text-[#7a8f84] hover:text-[#16a34a]"
            >
              Wyczyść daty
            </button>
            <button type="button" onClick={() => setOpen(null)} className="rounded-[8px] bg-[#0a2e1a] px-3 py-1.5 text-xs font-bold text-white">
              Zastosuj
            </button>
          </div>
        </div>
      ) : null}

      {open === "guests" ? (
        <div className="dropdown right-0 w-[min(400px,100%)] p-0">
          <div className="border-b border-[#e4ebe7] bg-[linear-gradient(135deg,#f7faf8,#f0fdf4)] px-5 py-4">
            <h4 className="text-base font-black text-[#0a2e1a]">Kto jedzie?</h4>
            <p className="text-xs text-[#7a8f84]">Liczba gości wpływa na dostępne oferty</p>
          </div>
          {[
            { label: "Dorośli", desc: "Wiek 18+", value: adults, set: setAdults, min: 1, max: 16 },
            { label: "Dzieci", desc: "Wiek 2-17", value: children, set: setChildren, min: 0, max: 10 },
            { label: "Zwierzęta", desc: "Przyjazne pupilom", value: pets, set: setPets, min: 0, max: 5 },
          ].map((row) => (
            <div key={row.label} className="flex items-center justify-between border-b border-[#e4ebe7] px-5 py-4">
              <div>
                <p className="text-sm font-bold text-[#0a2e1a]">{row.label}</p>
                <p className="text-xs text-[#7a8f84]">{row.desc}</p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  disabled={row.value <= row.min}
                  onClick={() => row.set((x) => Math.max(row.min, x - 1))}
                  className="h-9 w-9 rounded-full border-2 border-[#e4ebe7] text-lg disabled:opacity-30"
                >
                  -
                </button>
                <span className="min-w-6 text-center text-lg font-extrabold text-[#0a2e1a]">{row.value}</span>
                <button
                  type="button"
                  disabled={row.value >= row.max}
                  onClick={() => row.set((x) => Math.min(row.max, x + 1))}
                  className="h-9 w-9 rounded-full border-2 border-[#e4ebe7] text-lg disabled:opacity-30"
                >
                  +
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {open === "mode" ? (
        <div className="dropdown right-0 w-[min(500px,100%)] p-4">
          <h4 className="mb-1 text-base font-black text-[#0a2e1a]">Wybierz tryb podróży</h4>
          <p className="mb-4 text-xs text-[#7a8f84]">Dopasujemy oferty do Twojego stylu</p>
          <div className="grid grid-cols-3 gap-2">
            {TRAVEL_MODE_ITEMS.map((item) => {
              const selected = mode === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setMode(selected ? null : item.id);
                    setOpen(null);
                  }}
                  className={selected ? "mdi on" : "mdi"}
                >
                  <span className="text-2xl leading-none">{item.emoji}</span>
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      <div className="mt-[18px] flex flex-wrap items-center justify-center gap-[7px]">
        <span className="text-xs text-[#7a8f84]">Popularne:</span>
        {[
          "🏔️ Zakopane",
          "🏊 Mazury",
          "🌲 Bieszczady",
          "⛷️ Szklarska Poręba",
          "🏔️ Wisła",
        ].map((pill) => (
          <button
            type="button"
            key={pill}
            onClick={() => {
              const value = pill.split(" ").slice(1).join(" ");
              setLocation(value);
              setLocationLabel(value);
            }}
            className="rounded-pill border border-[rgba(22,163,74,.2)] bg-[rgba(240,253,244,.8)] px-3 py-1.5 text-xs font-semibold text-[#0a2e1a] transition-all duration-200 hover:-translate-y-0.5 hover:border-[#16a34a] hover:bg-[#dcfce7]"
          >
            {pill}
          </button>
        ))}
      </div>
    </div>
  );
}
