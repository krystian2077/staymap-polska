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

const SNAP_PEEK = 96;

type SnapPoints = {
  half: number;
  full: number;
};

function getSnapPoints(viewportHeight: number, viewportWidth: number): SnapPoints {
  const isTablet = viewportWidth >= 768;
  const half = Math.round(viewportHeight * (isTablet ? 0.58 : 0.52));
  const full = Math.round(viewportHeight * (isTablet ? 0.9 : 0.92));
  return { half, full };
}

export function SearchMobileBottomSheet({ isOpen, onOpenChange, title, count, children }: Props) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ startY: number; startHeight: number } | null>(null);
  const [height, setHeight] = useState(SNAP_PEEK);
  const [viewport, setViewport] = useState({ width: 1366, height: 900 });

  useEffect(() => {
    if (typeof window === "undefined") return;
    const updateViewport = () => {
      setViewport({ width: window.innerWidth, height: window.innerHeight });
    };
    updateViewport();
    window.addEventListener("resize", updateViewport);
    return () => window.removeEventListener("resize", updateViewport);
  }, []);

  const { half: snapHalf, full: snapFull } = getSnapPoints(viewport.height, viewport.width);

  // Sync height with isOpen
  useEffect(() => {
    if (!isOpen) setHeight(SNAP_PEEK);
    else setHeight(snapHalf);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, snapHalf]);

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
          className="pointer-events-none fixed inset-0 z-[125] bg-black/20 backdrop-blur-[2px] lg:hidden"
          style={{ bottom: height }}
        />
      )}

      {/* Sheet — above GuestMobileNav (z-120), below modal layer (z-600+) */}
      <div
        ref={sheetRef}
        className={cn(
          "fixed bottom-0 left-0 right-0 z-[130] flex flex-col lg:hidden",
          "max-h-[min(92dvh,var(--sheet-max-h,92dvh))] rounded-t-[22px] border-t border-gray-100 bg-white sm:rounded-t-[24px]",
          "shadow-[0_-8px_40px_rgba(0,0,0,.14)]",
          "transition-[height] duration-[0.28s] ease-[cubic-bezier(.16,1,.3,1)]",
        )}
        style={{ height }}
      >
        {/* Handle */}
        <div
          ref={handleRef}
          className="cursor-row-resize touch-none select-none rounded-t-[22px] pb-2 pt-3 transition-colors sm:rounded-t-[24px]"
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
          <div className="mx-auto h-1.5 w-12 rounded-full bg-gray-200 shadow-inner transition-colors group-hover:bg-gray-300" />
          <div className="mt-2 flex items-center justify-center gap-2 px-4 text-center">
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
          className="flex-1 overflow-y-auto overscroll-contain scrollbar-hide pb-[max(env(safe-area-inset-bottom),12px)]"
          style={{ scrollbarWidth: "none" }}
        >
          {children}
        </div>
      </div>
    </>
  );
}
