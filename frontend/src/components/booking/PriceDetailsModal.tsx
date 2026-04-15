"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { motion, AnimatePresence } from "framer-motion";
import {
  MODAL_CONTENT_WRAPPER_CLASS,
  MODAL_OVERLAY_CLASS,
  modalSurfaceClass,
} from "@/lib/modalLayers";
import type { PricingBreakdown } from "@/types/booking";
import { PriceBreakdown } from "./PriceBreakdown";

interface PriceDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quote: PricingBreakdown | null;
}

export function PriceDetailsModal({ open, onOpenChange, quote }: PriceDetailsModalProps) {
  if (!quote) return null;

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <AnimatePresence>
        {open && (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className={MODAL_OVERLAY_CLASS}
              />
            </Dialog.Overlay>
            <Dialog.Content asChild>
              <div className={MODAL_CONTENT_WRAPPER_CLASS}>
                <motion.div
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 24 }}
                  transition={{ type: "spring", damping: 28, stiffness: 320 }}
                  className={modalSurfaceClass("relative max-w-[760px] px-5 py-6 md:p-10")}
                >
                  <div className="pointer-events-none absolute -right-16 -top-16 hidden h-44 w-44 rounded-full bg-brand/10 blur-3xl md:block" />
                  <div className="pointer-events-none absolute -bottom-20 left-10 hidden h-52 w-52 rounded-full bg-emerald-100/70 blur-3xl md:block" />

                  <div className="mb-6 flex items-start justify-between gap-4 md:mb-10 md:gap-6">
                    <div>
                      <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-brand/5 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-brand md:mb-4 md:text-[11px]">
                        Premium breakdown
                      </div>
                      <h2 className="text-xl font-black tracking-tight text-brand-dark sm:text-2xl md:text-[2.15rem]">
                        Szczegóły ceny
                      </h2>
                      <p className="mt-1.5 max-w-[34rem] text-sm font-medium leading-relaxed text-gray-400 md:mt-2 md:text-[15px]">
                        Pełne, przejrzyste zestawienie kosztów Twojego pobytu
                      </p>
                    </div>
                    <Dialog.Close className="min-h-[var(--tap-min)] min-w-[var(--tap-min)] shrink-0 rounded-full bg-gray-50 p-2.5 text-gray-400 transition-all hover:bg-red-50 hover:text-red-500 hover:shadow-sm active:scale-95 md:p-3">
                      <svg className="mx-auto h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </Dialog.Close>
                  </div>

                  <div className="space-y-5 md:space-y-7">
                    <div className="rounded-2xl bg-gradient-to-b from-white to-gray-50/70 p-5 ring-1 ring-inset ring-gray-100 shadow-[0_24px_48px_-36px_rgba(15,23,42,0.45)] md:rounded-[2rem] md:p-7">
                      <PriceBreakdown quote={quote} loading={false} />
                    </div>

                    <div className="flex items-center gap-3 rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4 shadow-[0_18px_40px_-30px_rgba(22,163,74,0.45)] ring-1 ring-inset ring-white/60 md:gap-4 md:rounded-[2rem] md:p-6">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-brand to-[#15803d] text-xl shadow-[0_14px_30px_rgba(22,163,74,0.28)] md:h-14 md:w-14 md:text-2xl">
                        ✨
                      </div>
                      <p className="text-sm font-bold leading-relaxed text-brand-dark md:text-[15.5px]">
                        Gwarantujemy najniższą cenę oraz bezpieczny proces rezerwacji przez naszą platformę.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => onOpenChange(false)}
                      className="group relative min-h-[var(--tap-min)] w-full overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-r from-brand-dark via-[#0f5130] to-brand py-4 text-[14px] font-black uppercase tracking-[0.18em] text-white shadow-[0_20px_44px_rgba(22,163,74,0.3)] transition-all hover:-translate-y-0.5 hover:shadow-[0_28px_54px_rgba(22,163,74,0.42)] active:translate-y-0 active:scale-[0.985] md:rounded-[1.45rem] md:py-5 md:text-[16px] md:tracking-[0.22em]"
                    >
                      <span className="relative z-10 inline-flex items-center justify-center gap-2.5">
                        Rozumiem
                        <svg
                          className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:translate-y-px md:h-4.5 md:w-4.5"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                          aria-hidden
                        >
                          <path
                            fillRule="evenodd"
                            d="M3.28 6.72a.75.75 0 011.06 0L10 12.39l5.66-5.67a.75.75 0 111.06 1.06l-6.2 6.22a.75.75 0 01-1.06 0l-6.2-6.22a.75.75 0 010-1.06z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </span>
                      <span className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/18 to-white/0 opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
                    </button>
                  </div>
                </motion.div>
              </div>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  );
}
