"use client";

import { format, parseISO } from "date-fns";
import { pl } from "date-fns/locale";
import { motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";

import {
  FORECAST_DAYS,
  WEATHER_WINDOW_DAYS,
  type DailyForecastDay,
  type WeatherIconKind,
} from "@/lib/openMeteoForecast";
import { useBookingStore } from "@/lib/store/bookingStore";

function WeatherGlyph({ kind, className }: { kind: WeatherIconKind; className?: string }) {
  const cn = className ?? "h-9 w-9 text-brand";
  switch (kind) {
    case "clear":
      return (
        <svg className={cn} viewBox="0 0 24 24" fill="none" aria-hidden>
          <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.75" />
          <path
            d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      );
    case "partly":
      return (
        <svg className={cn} viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M6.5 18a4 4 0 0 1 3.8-5.35 5 5 0 0 1 9.45-1.55A4.5 4.5 0 0 1 18.5 18h-12Z"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinejoin="round"
          />
          <path
            d="M9 9a4 4 0 1 1 5.5 3.7"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      );
    case "cloudy":
      return (
        <svg className={cn} viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M6 18h12a4 4 0 0 0 .2-8 5 5 0 0 0-9.78-1.5A4 4 0 0 0 6 18Z"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinejoin="round"
          />
        </svg>
      );
    case "fog":
      return (
        <svg className={cn} viewBox="0 0 24 24" fill="none" aria-hidden>
          <path d="M4 14h16M4 18h16M6 10h12" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
          <path
            d="M6 18h12a4 4 0 0 0 .2-8 5 5 0 0 0-9.78-1.5A4 4 0 0 0 6 18Z"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinejoin="round"
            opacity={0.45}
          />
        </svg>
      );
    case "drizzle":
      return (
        <svg className={cn} viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M6 17h12a4 4 0 0 0 .2-8 5 5 0 0 0-9.78-1.5A4 4 0 0 0 6 17Z"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinejoin="round"
          />
          <path d="M9 20v2M12 20v2M15 20v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      );
    case "rain":
      return (
        <svg className={cn} viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M6 16h12a4 4 0 0 0 .2-8 5 5 0 0 0-9.78-1.5A4 4 0 0 0 6 16Z"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinejoin="round"
          />
          <path d="M8 20l-1 2M12 19l-1 2M16 20l-1 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      );
    case "snow":
      return (
        <svg className={cn} viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M6 16h12a4 4 0 0 0 .2-8 5 5 0 0 0-9.78-1.5A4 4 0 0 0 6 16Z"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinejoin="round"
          />
          <path
            d="M12 19v2M10.5 20l1.5-1M13.5 20l-1.5-1"
            stroke="currentColor"
            strokeWidth="1.35"
            strokeLinecap="round"
          />
        </svg>
      );
    case "thunder":
      return (
        <svg className={cn} viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M6 15h12a4 4 0 0 0 .2-8 5 5 0 0 0-9.78-1.5A4 4 0 0 0 6 15Z"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinejoin="round"
          />
          <path d="M13 15l-3 5h4l-2 4" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round" />
        </svg>
      );
    default:
      return (
        <svg className={cn} viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M6 18h12a4 4 0 0 0 .2-8 5 5 0 0 0-9.78-1.5A4 4 0 0 0 6 18Z"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinejoin="round"
          />
        </svg>
      );
  }
}

function isStayNight(dateIso: string, checkIn: string, checkOut: string): boolean {
  return dateIso >= checkIn && dateIso < checkOut;
}

/** Kalendarzowy „dziś” w strefie użytkownika — spójne z ISO z API (YYYY-MM-DD). */
function isLocalCalendarToday(dateIso: string): boolean {
  return dateIso === format(new Date(), "yyyy-MM-dd");
}

function staySummaryLine(
  days: DailyForecastDay[],
  checkIn: string | null,
  checkOut: string | null,
  listingId: string,
  listingForBooking: { id: string } | null
): string | null {
  if (!checkIn || !checkOut || checkOut <= checkIn) return null;
  if (listingForBooking?.id !== listingId) return null;
  const overlap = days.filter((d) => isStayNight(d.date, checkIn, checkOut));
  if (overlap.length === 0) return null;
  const avgMax = overlap.reduce((s, d) => s + d.tempMax, 0) / overlap.length;
  const avgMin = overlap.reduce((s, d) => s + d.tempMin, 0) / overlap.length;
  return `Średnio w wybranym terminie: ${avgMin.toFixed(0)}° / ${avgMax.toFixed(0)}° (min / max)`;
}

const listVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.045, delayChildren: 0.04 },
  },
};

const dayVariants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.28, ease: [0.16, 1, 0.3, 1] } },
};

const dayHoverTransition = { type: "spring" as const, stiffness: 420, damping: 28 };

function dayCardClassName(stay: boolean, today: boolean): string {
  if (stay && today) {
    return [
      "border-brand/50 bg-gradient-to-br from-brand/[0.12] via-amber-50/60 to-brand/[0.1]",
      "ring-2 ring-brand/35 shadow-[0_10px_36px_-12px_rgba(22,163,74,0.35)]",
      "dark:via-brand/15 dark:from-brand/25 dark:to-brand/10 dark:shadow-[0_10px_40px_-12px_rgba(34,197,94,0.25)]",
    ].join(" ");
  }
  if (stay) {
    return "border-brand/40 bg-brand/[0.08] ring-2 ring-brand/25 dark:border-brand/50 dark:bg-brand/15";
  }
  if (today) {
    return [
      "border-brand/50 bg-gradient-to-b from-brand/[0.16] via-white to-gray-50/90",
      "ring-2 ring-brand/40 shadow-[0_8px_28px_-10px_rgba(22,163,74,0.4)]",
      "dark:from-brand/30 dark:via-[var(--background)] dark:to-brand/5 dark:ring-brand/45",
      "dark:shadow-[0_8px_32px_-10px_rgba(52,211,153,0.2)]",
    ].join(" ");
  }
  return "border-slate-100 bg-gray-50/80 dark:border-white/10 dark:bg-white/[0.04]";
}

function DayBadges({ stay, today }: { stay: boolean; today: boolean }) {
  if (!stay && !today) {
    return <span className="mb-2 min-h-[1.25rem]" aria-hidden />;
  }
  return (
    <div className="mb-2 flex min-h-[1.25rem] flex-wrap items-center justify-center gap-1">
      {today ? (
        <span className="rounded-full bg-gradient-to-r from-emerald-500 to-teal-600 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-white shadow-sm ring-1 ring-white/20 dark:ring-white/10">
          Dziś
        </span>
      ) : null}
      {stay ? (
        <span className="rounded-full bg-brand px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-white shadow-sm">
          Pobyt
        </span>
      ) : null}
    </div>
  );
}

type WeatherDayCardProps = {
  day: DailyForecastDay;
  stay: boolean;
  today: boolean;
  layout: "scroll" | "grid";
};

function WeatherDayCard({ day, stay, today, layout }: WeatherDayCardProps) {
  const d = parseISO(day.date);
  const label = format(d, "EEE", { locale: pl });
  const sub = format(d, "d MMM", { locale: pl });
  const surface = dayCardClassName(stay, today);
  const scrollCls = layout === "scroll" ? "min-w-[108px] max-w-[120px] shrink-0 snap-center" : "";
  const padX = layout === "scroll" ? "px-3" : "px-2";

  return (
    <motion.li
      variants={dayVariants}
      layout
      whileHover={{
        y: -5,
        transition: dayHoverTransition,
      }}
      whileTap={{ scale: 0.98 }}
      className={`group relative flex flex-col items-center rounded-2xl border py-4 text-center ${padX} ${scrollCls} ${surface} cursor-default transition-[box-shadow,border-color] duration-300 ease-out hover:z-10 hover:border-brand/45 hover:shadow-xl hover:shadow-brand/15 dark:hover:border-brand/40 dark:hover:shadow-brand/10`}
    >
      <div
        className={`pointer-events-none absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-300 group-hover:opacity-100 ${
          today || stay
            ? "bg-gradient-to-br from-white/40 to-transparent dark:from-white/5"
            : "bg-gradient-to-b from-brand/[0.07] to-transparent dark:from-brand/10"
        }`}
      />
      <div className="relative z-[1] flex w-full flex-col items-center">
        <DayBadges stay={stay} today={today} />
        <span className="text-[11px] font-black uppercase tracking-wider text-gray-400 transition-colors group-hover:text-brand-dark/80 dark:text-gray-500 dark:group-hover:text-white/90">
          {label}
        </span>
        <span className="text-xs font-semibold capitalize text-gray-500 transition-colors group-hover:text-brand-dark/70 dark:text-gray-400 dark:group-hover:text-gray-300">
          {sub}
        </span>
        <div className="my-3 flex h-11 items-center justify-center text-brand transition-transform duration-300 ease-out group-hover:scale-110 dark:text-brand-light">
          <WeatherGlyph kind={day.kind} />
        </div>
        <div className="flex flex-col gap-0.5 tabular-nums">
          <span className="text-lg font-black text-brand-dark transition-colors group-hover:text-brand-dark dark:text-white">
            {Math.round(day.tempMax)}°
          </span>
          <span className="text-sm font-semibold text-gray-400 dark:text-gray-500">{Math.round(day.tempMin)}°</span>
        </div>
        {day.precipProbMax != null && day.precipProbMax > 5 ? (
          <span className="mt-2 text-[10px] font-bold text-gray-400 transition-colors group-hover:text-gray-500 dark:text-gray-500 dark:group-hover:text-gray-400">
            Opady ~{Math.round(day.precipProbMax)}%
          </span>
        ) : (
          <span className="mt-2 h-4" aria-hidden />
        )}
      </div>
    </motion.li>
  );
}

type Props = {
  days: DailyForecastDay[];
  city: string;
  region: string;
  listingId: string;
};

function WeatherPageNav({
  page,
  pageCount,
  onPrev,
  onNext,
}: {
  page: number;
  pageCount: number;
  onPrev: () => void;
  onNext: () => void;
}) {
  const canPrev = page > 0;
  const canNext = page < pageCount - 1;
  return (
    <div className="flex items-center gap-1 sm:gap-2">
      <button
        type="button"
        disabled={!canPrev}
        onClick={onPrev}
        aria-label="Poprzednie dni prognozy"
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white text-brand-dark shadow-sm transition-all hover:border-brand/40 hover:bg-brand/[0.06] disabled:pointer-events-none disabled:opacity-35 dark:border-white/10 dark:bg-white/[0.04] dark:text-white dark:hover:border-brand/40"
      >
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>
      <span className="min-w-[3rem] text-center text-[12px] font-black tabular-nums text-gray-500 dark:text-gray-400">
        {page + 1}/{pageCount}
      </span>
      <button
        type="button"
        disabled={!canNext}
        onClick={onNext}
        aria-label="Kolejne dni prognozy"
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white text-brand-dark shadow-sm transition-all hover:border-brand/40 hover:bg-brand/[0.06] disabled:pointer-events-none disabled:opacity-35 dark:border-white/10 dark:bg-white/[0.04] dark:text-white dark:hover:border-brand/40"
      >
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </div>
  );
}

export function ListingWeatherSection({ days, city, region, listingId }: Props) {
  const [page, setPage] = useState(0);
  const [isHydrated, setIsHydrated] = useState(false);

  const pageCount = Math.max(1, Math.ceil(days.length / WEATHER_WINDOW_DAYS));

  useEffect(() => {
    setPage((p) => Math.min(p, pageCount - 1));
  }, [pageCount]);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  const visibleDays = useMemo(() => {
    const start = page * WEATHER_WINDOW_DAYS;
    return days.slice(start, start + WEATHER_WINDOW_DAYS);
  }, [days, page]);

  const desktopGridCols = (() => {
    const n = visibleDays.length;
    if (n >= 7) return "grid-cols-7";
    if (n === 1) return "grid-cols-1 max-w-[120px] mx-auto";
    if (n === 2) return "grid-cols-2 max-w-lg mx-auto";
    if (n === 3) return "grid-cols-3 max-w-3xl mx-auto";
    if (n === 4) return "grid-cols-4 max-w-5xl mx-auto";
    if (n === 5) return "grid-cols-5 max-w-6xl mx-auto";
    return "grid-cols-6 max-w-7xl mx-auto";
  })();

  const checkIn = useBookingStore((s) => s.checkIn);
  const checkOut = useBookingStore((s) => s.checkOut);
  const listingForBooking = useBookingStore((s) => s.listingForBooking);

  const locationLine =
    city || region
      ? [city, region].filter(Boolean).join(" · ")
      : "Ta lokalizacja";

  const canHighlight =
    Boolean(checkIn && checkOut) && listingForBooking?.id === listingId;

  const summary = staySummaryLine(days, checkIn, checkOut, listingId, listingForBooking);

  const lastForecastDay = days.length > 0 ? days[days.length - 1] : undefined;
  const beyondHorizon =
    Boolean(checkIn && checkOut && canHighlight && lastForecastDay && checkIn > lastForecastDay.date);

  return (
    <div className="rounded-[2.5rem] bg-white p-8 shadow-sm ring-1 ring-black/[0.03] sm:p-10 dark:bg-[var(--background)] dark:ring-white/[0.06]">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <h2 className="text-2xl font-black tracking-tight text-brand-dark dark:text-white" style={{ letterSpacing: "-0.03em" }}>
            Pogoda w terminie
          </h2>
          <p className="mt-1.5 text-[15px] font-semibold text-gray-500 dark:text-gray-400">
            Prognoza dla tej lokalizacji · do {FORECAST_DAYS} dni (maks. darmowego API). Domyślnie {WEATHER_WINDOW_DAYS} dni — strzałkami kolejne.
          </p>
          <p className="mt-2 text-sm font-medium text-gray-400 dark:text-gray-500">{locationLine}</p>
        </div>
        {pageCount > 1 ? (
          <div className="shrink-0 self-center sm:self-start">
            <WeatherPageNav
              page={page}
              pageCount={pageCount}
              onPrev={() => setPage((p) => Math.max(0, p - 1))}
              onNext={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
            />
          </div>
        ) : null}
      </div>

      {summary ? (
        <motion.p
          layout
          className="mb-6 rounded-2xl border border-brand/20 bg-brand/[0.06] px-4 py-3 text-sm font-bold text-brand-dark dark:border-brand/30 dark:bg-brand/10 dark:text-white"
        >
          {summary}
        </motion.p>
      ) : null}

      {beyondHorizon ? (
        <p className="mb-6 text-sm font-medium leading-relaxed text-gray-500 dark:text-gray-400">
          Wybrany pobyt zaczyna się poza horyzontem prognozy — poniżej najbliższe dni; dokładniejsza prognoza pod Twoje daty pojawi się bliżej terminu.
        </p>
      ) : null}

      {/* Mobile: horizontal snap scroll (tylko bieżąca strona dni) */}
      <div className="relative lg:hidden">
        <div className="pointer-events-none absolute inset-y-0 left-0 z-[1] w-8 bg-gradient-to-r from-white to-transparent dark:from-[var(--background)]" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-[1] w-8 bg-gradient-to-l from-white to-transparent dark:from-[var(--background)]" />
        <motion.ul
          key={`m-${page}`}
          variants={listVariants}
          initial="hidden"
          animate="show"
          className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-3 pl-1 pr-2 [-webkit-overflow-scrolling:touch]"
        >
          {visibleDays.map((day) => {
            const stay = Boolean(
              isHydrated && canHighlight && checkIn && checkOut && isStayNight(day.date, checkIn, checkOut)
            );
            const today = Boolean(isHydrated && isLocalCalendarToday(day.date));
            return (
              <WeatherDayCard key={day.date} day={day} stay={stay} today={today} layout="scroll" />
            );
          })}
        </motion.ul>
      </div>

      {/* Desktop grid */}
      <motion.ul
        key={`d-${page}`}
        variants={listVariants}
        initial="hidden"
        animate="show"
        className={`hidden gap-3 lg:grid lg:auto-rows-fr ${desktopGridCols}`}
      >
        {visibleDays.map((day) => {
          const stay = Boolean(
            isHydrated && canHighlight && checkIn && checkOut && isStayNight(day.date, checkIn, checkOut)
          );
          const today = Boolean(isHydrated && isLocalCalendarToday(day.date));
          return <WeatherDayCard key={day.date} day={day} stay={stay} today={today} layout="grid" />;
        })}
      </motion.ul>

      <p className="mt-8 text-center text-[11px] font-medium leading-relaxed text-gray-400 dark:text-gray-500">
        Dane pogodowe:{" "}
        <a
          href="https://open-meteo.com/"
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold text-brand underline decoration-brand/25 underline-offset-2 transition-colors hover:decoration-brand"
        >
          Open-Meteo
        </a>
        {" "}
        (prognoza modelowa, orientacyjnie). Darmowe API podaje maks. {FORECAST_DAYS} dni — pełnych 30 dni w jednym żądaniu tu nie ma.
      </p>
    </div>
  );
}
