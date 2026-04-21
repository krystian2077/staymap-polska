/**
 * Warstwy modali: Navbar z-[500], CompareBar z-[200], GuestMobileNav z-[120].
 * Dialogi: overlay 600, treść 601 (powyżej dolnej nawigacji).
 *
 * Wzorce mobile:
 * - Arkusz (filtry, kalendarz, goście): MODAL_CONTENT_WRAPPER_CLASS + modalSurfaceClass + bottom-sheet-handle.
 * - Modal wyśrodkowany (krótkie treści, potwierdzenia): użyj klas z CENTERED_DIALOG_* lub wzorca z CompareBar (fixed center + zoom).
 */
export const MODAL_OVERLAY_CLASS =
  "fixed inset-0 z-[600] bg-black/45 backdrop-blur-md dark:bg-black/55";

/** Pojemnik: na mobile arkusz od dołu, na md+ centrowanie */
export const MODAL_CONTENT_WRAPPER_CLASS =
  "fixed inset-0 z-[601] flex items-end justify-center p-0 pointer-events-none md:items-center md:p-4";

/** Mały dialog wyśrodkowany także na mobile (max szerokość, safe area). */
export const CENTERED_DIALOG_CONTENT_CLASS =
  "fixed left-1/2 top-1/2 z-[601] flex max-h-[min(85dvh,var(--sheet-max-h,92dvh))] w-[min(calc(100vw-1.25rem),26rem)] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-[24px] border border-gray-200/90 bg-white p-0 shadow-[0_24px_80px_rgba(10,46,26,0.18)] outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=closed]:zoom-out-95 dark:border-white/15 dark:bg-[var(--bg2)] dark:shadow-[0_24px_80px_rgba(0,0,0,0.45)] sm:max-w-lg";

/** Powierzchnia przewijana — safe area na iPhone */
export const modalSurfaceClass = (extra = "") =>
  [
    "pointer-events-auto w-full max-h-[min(92dvh,calc(100dvh-env(safe-area-inset-bottom)))] overflow-y-auto overscroll-contain",
    "rounded-t-[1.35rem] border border-gray-200/80 bg-white shadow-[0_-8px_40px_rgba(0,0,0,.12)]",
    "md:max-h-[min(90dvh,920px)] md:rounded-[1.75rem] md:shadow-[0_40px_100px_rgba(0,0,0,.22)]",
    "dark:border-brand-border dark:bg-[var(--bg2)]",
    "pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-1 md:pb-0 md:pt-0",
    extra,
  ]
    .filter(Boolean)
    .join(" ");
