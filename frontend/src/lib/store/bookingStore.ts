import { create } from "zustand";

import type { Listing } from "@/types/listing";
import type { PricingBreakdown } from "@/types/booking";

interface BookingStore {
  checkIn: string | null;
  checkOut: string | null;
  arrivalTime: string;
  departureTime: string;
  adults: number;
  children: number;
  pets: number;
  specialRequests: string;
  costSplitCount: number | null;
  listingForBooking: Listing | null;

  quote: PricingBreakdown | null;
  quoteLoading: boolean;
  quoteError: string | null;
  quoteExpiresAt: number | null;

  currentBooking: unknown | null;
  bookingLoading: boolean;
  bookingError: string | null;

  setDates: (checkIn: string, checkOut: string) => void;
  setGuests: (adults: number, children: number, pets: number) => void;
  setSpecialRequests: (text: string) => void;
  setCostSplitCount: (count: number | null) => void;
  setListingForBooking: (l: Listing | null) => void;
  setQuote: (quote: PricingBreakdown | null) => void;
  setQuoteLoading: (v: boolean) => void;
  setQuoteError: (e: string | null) => void;
  setCurrentBooking: (b: unknown | null) => void;
  setBookingLoading: (v: boolean) => void;
  setBookingError: (e: string | null) => void;
  isQuoteExpired: () => boolean;
  setTimes: (arrivalTime: string, departureTime: string) => void;
  reset: () => void;
  resetAfterSuccess: () => void;
}

const DEFAULT = {
  checkIn: null,
  checkOut: null,
  arrivalTime: "15:00",
  departureTime: "11:00",
  adults: 2,
  children: 0,
  pets: 0,
  specialRequests: "",
  costSplitCount: null,
  listingForBooking: null,
  quote: null,
  quoteLoading: false,
  quoteError: null,
  quoteExpiresAt: null,
  currentBooking: null,
  bookingLoading: false,
  bookingError: null,
};

export const useBookingStore = create<BookingStore>((set, get) => ({
  ...DEFAULT,
  setDates: (checkIn, checkOut) =>
    set({ checkIn, checkOut, quote: null, quoteExpiresAt: null }),
  setGuests: (adults, children, pets) =>
    set({ adults, children, pets, quote: null }),
  setSpecialRequests: (text) => set({ specialRequests: text }),
  setCostSplitCount: (count) => set({ costSplitCount: count }),
  setListingForBooking: (listingForBooking) => set({ listingForBooking }),
  setQuote: (quote) =>
    set({
      quote,
      quoteExpiresAt: quote ? Date.now() + 15 * 60 * 1000 : null,
    }),
  setQuoteLoading: (v) => set({ quoteLoading: v }),
  setQuoteError: (e) => set({ quoteError: e }),
  setCurrentBooking: (b) => set({ currentBooking: b }),
  setBookingLoading: (v) => set({ bookingLoading: v }),
  setBookingError: (e) => set({ bookingError: e }),
  isQuoteExpired: () => {
    const exp = get().quoteExpiresAt;
    return exp ? Date.now() > exp : true;
  },
  setTimes: (arrivalTime, departureTime) => set({ arrivalTime, departureTime }),
  reset: () => set(DEFAULT),
  resetAfterSuccess: () =>
    set((s) => ({
      ...DEFAULT,
      currentBooking: s.currentBooking,
    })),
}));
