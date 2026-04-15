"use client";

import { useEffect } from "react";

import { useBookingStore } from "@/lib/store/bookingStore";
import type { Listing } from "@/types/listing";

/** Ustawia bieżącą ofertę w store (np. pogoda, wycena) także gdy widget rezerwacji nie jest widoczny. */
export function ListingBookingStoreSync({ listing }: { listing: Listing }) {
  const setListingForBooking = useBookingStore((s) => s.setListingForBooking);

  useEffect(() => {
    setListingForBooking(listing);
  }, [listing, setListingForBooking]);

  return null;
}
