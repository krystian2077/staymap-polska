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
                  initial={{ opacity: 0, scale: 0.9, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: 20 }}
                  className="relative w-full max-w-[500px] overflow-hidden rounded-[2.5rem] bg-white p-8 shadow-[0_40px_100px_rgba(0,0,0,0.3)]"
                >
                  <div className="mb-8 flex items-center justify-between">
                    <div>
                      <h2 className="text-2xl font-black tracking-tight text-brand-dark">Szczegóły ceny</h2>
                      <p className="mt-1 text-sm font-medium text-gray-400">Pełne zestawienie kosztów Twojego pobytu</p>
                    </div>
                    <Dialog.Close className="rounded-full bg-gray-50 p-2 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500">
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </Dialog.Close>
                  </div>

                  <div className="space-y-6">
                    <div className="rounded-3xl bg-gray-50/50 p-6 ring-1 ring-inset ring-gray-100">
                      <PriceBreakdown quote={quote} loading={false} />
                    </div>

                    <div className="flex items-center gap-4 rounded-3xl bg-brand/5 p-5 ring-1 ring-inset ring-brand/10">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand text-2xl">
                        ✨
                      </div>
                      <p className="text-[13px] font-bold leading-relaxed text-brand-dark">
                        Gwarantujemy najniższą cenę oraz bezpieczny proces rezerwacji przez naszą platformę.
                      </p>
                    </div>

                    <button
                      onClick={() => onOpenChange(false)}
                      className="w-full rounded-2xl bg-brand-dark py-4 text-sm font-black uppercase tracking-widest text-white shadow-lg shadow-brand/20 transition-all hover:-translate-y-0.5 hover:shadow-xl active:scale-95"
                    >
                      Rozumiem
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
