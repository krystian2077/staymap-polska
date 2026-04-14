"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";

type Props = {
  active?: boolean;
  onLocationFound: (lat: number, lng: number) => void;
  onClearLocation: () => void;
  className?: string;
};

export function MyLocationButton({
  active = false,
  onLocationFound,
  onClearLocation,
  className,
}: Props) {
  const [loading, setLoading] = useState(false);

  const handleGetLocation = () => {
    if (active) {
      onClearLocation();
      return;
    }

    if (typeof window === "undefined" || !navigator.geolocation) {
      toast.error("Twoja przeglądarka nie obsługuje geolokalizacji.");
      return;
    }

    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLoading(false);
        onLocationFound(position.coords.latitude, position.coords.longitude);
      },
      (error) => {
        setLoading(false);
        let msg = "Nie udało się pobrać lokalizacji.";
        if (error.code === error.PERMISSION_DENIED) {
          msg = "Brak uprawnień do pobrania lokalizacji.";
        }
        toast.error(msg);
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
    );
  };

  return (
    <motion.button
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      type="button"
      onClick={handleGetLocation}
      disabled={loading}
      aria-pressed={active}
      className={cn(
        "group flex h-[72px] items-center gap-4 rounded-[32px] border px-6 shadow-[0_16px_48px_rgba(0,0,0,0.3)] transition-all duration-300 active:scale-95 disabled:opacity-70 disabled:pointer-events-none",
        active
          ? "border-brand bg-brand text-white shadow-[0_16px_48px_rgba(22,163,74,0.32)] ring-4 ring-brand/15"
          : "border-brand/20 bg-white hover:border-brand/40",
        className
      )}
    >
      <div className={cn(
        "flex h-11 w-11 shrink-0 items-center justify-center rounded-[18px] transition-all duration-300 shadow-sm",
        loading
          ? "bg-white/15 text-white/70"
          : active
            ? "bg-white text-brand"
            : "bg-brand-surface text-brand group-hover:bg-brand group-hover:text-white"
      )}>
        {loading ? (
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-brand/30 border-t-brand" />
        ) : (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M13 2v3M13 19v3M5 12H2m20 0h-3" />
            <circle cx="12" cy="12" r="8" />
          </svg>
        )}
      </div>

      <div className="flex flex-col items-start">
        <span className={cn(
          "text-[10px] font-black uppercase tracking-wider",
          active ? "text-white/75" : "text-brand-dark/40",
        )}>
          {active ? "Aktywne" : "Znajdź"}
        </span>
        <span className={cn(
          "text-[15px] font-black tracking-tight",
          active ? "text-white" : "text-brand-dark",
        )}>
          {active ? "Wyłącz lokalizację" : "Moja lokalizacja"}
        </span>
      </div>
    </motion.button>
  );
}
