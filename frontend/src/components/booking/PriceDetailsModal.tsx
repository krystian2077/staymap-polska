"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { motion, AnimatePresence } from "framer-motion";
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
                className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-md"
              />
            </Dialog.Overlay>
            <Dialog.Content asChild>
              <div className="fixed inset-0 z-[101] flex items-center justify-center p-4">
                <motion.div
                  initial={{ opacity: 0, scale: 0.92, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.92, y: 20 }}
                  className="relative w-full max-w-[760px] overflow-hidden rounded-[2.9rem] border border-brand-dark/5 bg-white p-10 shadow-[0_40px_140px_rgba(0,0,0,0.34)]"
                >
                  <div className="pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full bg-brand/10 blur-3xl" />
                  <div className="pointer-events-none absolute -bottom-20 left-10 h-52 w-52 rounded-full bg-emerald-100/70 blur-3xl" />

                  <div className="mb-10 flex items-start justify-between gap-6">
                    <div>
                      <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-brand/5 px-3 py-1 text-[11px] font-black uppercase tracking-[0.22em] text-brand">
                        Premium breakdown
                      </div>
                      <h2 className="text-[2rem] font-black tracking-tight text-brand-dark sm:text-[2.15rem]">
                        Szczegóły ceny
                      </h2>
                      <p className="mt-2 max-w-[34rem] text-[15px] font-medium leading-relaxed text-gray-400">
                        Pełne, przejrzyste zestawienie kosztów Twojego pobytu
                      </p>
                    </div>
                    <Dialog.Close className="rounded-full bg-gray-50 p-3 text-gray-400 transition-all hover:bg-red-50 hover:text-red-500 hover:shadow-sm active:scale-95">
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </Dialog.Close>
                  </div>

                  <div className="space-y-7">
                    <div className="rounded-[2rem] bg-gradient-to-b from-white to-gray-50/70 p-7 ring-1 ring-inset ring-gray-100 shadow-[0_24px_48px_-36px_rgba(15,23,42,0.45)]">
                      <PriceBreakdown quote={quote} loading={false} />
                    </div>

                    <div className="flex items-center gap-4 rounded-[2rem] border border-emerald-100 bg-emerald-50/70 p-6 shadow-[0_18px_40px_-30px_rgba(22,163,74,0.45)] ring-1 ring-inset ring-white/60">
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-brand to-[#15803d] text-2xl shadow-[0_14px_30px_rgba(22,163,74,0.28)]">
                        ✨
                      </div>
                      <p className="text-[15px] font-bold leading-relaxed text-brand-dark sm:text-[15.5px]">
                        Gwarantujemy najniższą cenę oraz bezpieczny proces rezerwacji przez naszą platformę.
                      </p>
                    </div>

                    <button
                      onClick={() => onOpenChange(false)}
                      className="group relative w-full overflow-hidden rounded-[1.45rem] border border-white/10 bg-gradient-to-r from-brand-dark via-[#0f5130] to-brand py-5 text-[16px] font-black uppercase tracking-[0.22em] text-white shadow-[0_20px_44px_rgba(22,163,74,0.3)] transition-all hover:-translate-y-1 hover:shadow-[0_28px_54px_rgba(22,163,74,0.42)] active:translate-y-0 active:scale-[0.985]"
                    >
                      <span className="relative z-10 inline-flex items-center gap-2.5">
                        Rozumiem
                        <svg className="h-4.5 w-4.5 transition-transform duration-300 group-hover:translate-y-[1px] group-hover:translate-x-0.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
                          <path fillRule="evenodd" d="M3.28 6.72a.75.75 0 011.06 0L10 12.39l5.66-5.67a.75.75 0 111.06 1.06l-6.2 6.22a.75.75 0 01-1.06 0l-6.2-6.22a.75.75 0 010-1.06z" clipRule="evenodd" />
                        </svg>
                      </span>
                      <span className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/18 to-white/0 opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
                      <span className="absolute inset-x-8 top-0 h-px bg-white/20" />
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
