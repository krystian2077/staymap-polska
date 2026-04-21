import {
  addDays,
  differenceInDays,
  format,
  isAfter,
  isBefore,
  isEqual,
} from "date-fns";
import { pl } from "date-fns/locale";

export function formatDate(dateStr: string): string {
  return format(new Date(dateStr), "d MMM yyyy", { locale: pl });
}

export function toISO(d: Date): string {
  return format(d, "yyyy-MM-dd");
}

export function countNights(checkIn: string, checkOut: string): number {
  return differenceInDays(new Date(checkOut), new Date(checkIn));
}

export function isBooked(dateStr: string, bookedDates: string[]): boolean {
  return bookedDates.includes(dateStr);
}

export function cancellationDeadline(checkIn: string, policy: string): string | null {
  const ci = new Date(checkIn);
  if (policy === "flexible") return formatDate(toISO(addDays(ci, -1)));
  if (policy === "moderate") return formatDate(toISO(addDays(ci, -5)));
  if (policy === "strict") return formatDate(toISO(addDays(ci, -14)));
  if (policy === "non_refundable") return null;
  return null;
}

export { isBefore, isAfter, isEqual };
