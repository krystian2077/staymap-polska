import { format } from "date-fns";

/** ISO `yyyy-MM-dd` w lokalnej strefie (bez przesunięć UTC). */
export function toISODateString(d: Date): string {
  return format(d, "yyyy-MM-dd");
}

export function parseISODateLocal(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return new Date(NaN);
  return new Date(y, m - 1, d);
}
