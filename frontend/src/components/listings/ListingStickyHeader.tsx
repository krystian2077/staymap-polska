"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import type { Listing } from "@/types/listing";

interface Props {
  listing: Listing;
}

export function ListingStickyHeader({ listing }: Props) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      // Pokaż pasek po przewinięciu 600px (zwykle za galerią)
      setVisible(window.scrollY > 600);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToBooking = () => {
    const el = document.getElementById("booking-widget-anchor");
    if (el) {
      const top = el.getBoundingClientRect().top + window.scrollY - 100;
      window.scrollTo({ top, behavior: "smooth" });
    }
  };

  const rating = listing.average_rating != null 
    ? Number(listing.average_rating).toFixed(1) 
    : "—";

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -100, opacity: 0 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="fixed inset-x-0 top-0 z-[100] border-b border-gray-200 bg-white/90 shadow-sm backdrop-blur-md"
        >
          <div className="mx-auto flex max-w-[1600px] items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
            <div className="flex items-center gap-4 overflow-hidden">
              <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg shadow-sm">
                <Image
                  src={listing.images[0]?.url || "/placeholder-listing.jpg"}
                  alt=""
                  fill
                  className="object-cover"
                />
              </div>
              <div className="min-w-0">
                <h4 className="truncate text-sm font-black text-brand-dark sm:text-base">
                  {listing.title}
                </h4>
                <div className="flex items-center gap-2 text-xs font-semibold text-gray-500">
                  <span className="flex items-center gap-0.5">
                    <span className="text-yellow-500">★</span> {rating}
                  </span>
                  <span>·</span>
                  <span className="truncate">{listing.location?.city}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-6">
              <div className="hidden text-right sm:block">
                <p className="text-sm font-bold text-brand-dark">
                  {listing.base_price} PLN <span className="text-[10px] font-normal text-gray-400">/ noc</span>
                </p>
                <p className="text-[10px] font-medium text-brand">Dostępne terminy</p>
              </div>
              <button
                type="button"
                onClick={scrollToBooking}
                className="rounded-xl bg-brand px-5 py-2.5 text-xs font-black uppercase tracking-wider text-white shadow-lg shadow-brand/20 transition-all hover:bg-brand-dark active:scale-95 sm:px-8 sm:py-3 sm:text-sm"
              >
                Rezerwuj
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
