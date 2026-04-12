"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

type Props = {
  isOpen: boolean;
  onOpenChange: (v: boolean) => void;
  title?: string;
  count?: number;
  children: React.ReactNode;
};

const SNAP_PEEK = 104;     // wysokość "peek" (widoczny pasek)
const SNAP_HALF = 0.46;   // 46 % okna = "pół-widok"
const SNAP_FULL = 0.88;   // 88 % okna = "pełny"

export function SearchMobileBottomSheet({ isOpen, onOpenChange, title, count, children }: Props) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ startY: number; startHeight: number } | null>(null);
  const [height, setHeight] = useState(SNAP_PEEK);

  const vh = typeof window !== "undefined" ? window.innerHeight : 900;
  const snapHalf = Math.round(vh * SNAP_HALF);
  const snapFull = Math.round(vh * SNAP_FULL);

  // Sync height with isOpen
  useEffect(() => {
    if (!isOpen) setHeight(SNAP_PEEK);
    else setHeight(snapHalf);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const snapTo = (h: number) => {
    setHeight(h);
    if (h <= SNAP_PEEK) onOpenChange(false);
    else onOpenChange(true);
  };

  const onDragStart = (clientY: number) => {
    if (!sheetRef.current) return;
    dragRef.current = {
      startY: clientY,
      startHeight: sheetRef.current.offsetHeight,
    };
  };
  const onDragMove = (clientY: number) => {
    if (!dragRef.current || !sheetRef.current) return;
    const delta = dragRef.current.startY - clientY;
    const newH = Math.min(snapFull + 24, Math.max(SNAP_PEEK - 10, dragRef.current.startHeight + delta));
    sheetRef.current.style.height = `${newH}px`;
  };
  const onDragEnd = (clientY: number) => {
    if (!dragRef.current || !sheetRef.current) return;
    const delta = dragRef.current.startY - clientY;
    const cur = dragRef.current.startHeight + delta;
    dragRef.current = null;
    sheetRef.current.style.height = "";
    // Snap logic
    const peekDist = Math.abs(cur - SNAP_PEEK);
    const halfDist = Math.abs(cur - snapHalf);
    const fullDist = Math.abs(cur - snapFull);
    const minDist = Math.min(peekDist, halfDist, fullDist);
    if (minDist === peekDist) snapTo(SNAP_PEEK);
    else if (minDist === halfDist) snapTo(snapHalf);
    else snapTo(snapFull);
  };

  return (
    <>
      {/* Overlay */}
      {isOpen && height > SNAP_PEEK + 10 && (
        <div
          className="pointer-events-none fixed inset-0 z-40 bg-black/20 backdrop-blur-[2px] lg:hidden"
          style={{ bottom: height }}
        />
      )}

      {/* Sheet */}
      <div
        ref={sheetRef}
        className={cn(
          "fixed bottom-0 left-0 right-0 z-50 flex flex-col lg:hidden",
          "rounded-t-[24px] border-t border-gray-100 bg-white",
          "shadow-[0_-8px_40px_rgba(0,0,0,.14)]",
          "transition-[height] duration-[0.28s] ease-[cubic-bezier(.16,1,.3,1)]",
        )}
        style={{ height }}
      >
        {/* Handle */}
        <div
          ref={handleRef}
          className="flex flex-col items-center gap-2 pt-3 pb-2 cursor-row-resize touch-none select-none transition-colors rounded-t-[24px]"
          onTouchStart={(e) => onDragStart(e.touches[0].clientY)}
          onTouchMove={(e) => onDragMove(e.touches[0].clientY)}
          onTouchEnd={(e) => onDragEnd(e.changedTouches[0].clientY)}
          onMouseDown={(e) => {
            onDragStart(e.clientY);
            const onMove = (ev: MouseEvent) => onDragMove(ev.clientY);
            const onUp = (ev: MouseEvent) => {
              onDragEnd(ev.clientY);
              window.removeEventListener("mousemove", onMove);
              window.removeEventListener("mouseup", onUp);
            };
            window.addEventListener("mousemove", onMove);
            window.addEventListener("mouseup", onUp);
          }}
          onClick={() => {
            if (height <= SNAP_PEEK + 10) snapTo(snapHalf);
            else if (height >= snapFull - 10) snapTo(SNAP_PEEK);
          }}
        >
          <div className="h-1.5 w-12 rounded-full bg-gray-200 shadow-inner group-hover:bg-gray-300 transition-colors" />
          <div className="flex items-center gap-2">
            <span className="text-[14px] font-black text-brand-dark tracking-tight">
              {title ?? "Oferty"}
            </span>
            {count != null && (
              <span className="rounded-lg bg-brand px-2 py-0.5 text-[10px] font-black text-white shadow-sm">
                {count.toLocaleString("pl-PL")}
              </span>
            )}
          </div>
        </div>

        {/* Content */}
        <div
          className="flex-1 overflow-y-auto overscroll-contain scrollbar-hide"
          style={{ scrollbarWidth: "none" }}
        >
          {children}
        </div>
      </div>
    </>
  );
}
