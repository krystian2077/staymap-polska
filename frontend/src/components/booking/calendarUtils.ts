import { parseISODateLocal, toISODateString } from "@/lib/dates";

export type BusyRange = { check_in: string; check_out: string };

export function datesFromBlockedAndBusy(
  blocked: string[],
  busy: BusyRange[]
): Date[] {
  const out: Date[] = [];
  const seen = new Set<string>();

  for (const iso of blocked) {
    if (!seen.has(iso)) {
      seen.add(iso);
      out.push(parseISODateLocal(iso));
    }
  }

  for (const r of busy) {
    let d = parseISODateLocal(r.check_in);
    const end = parseISODateLocal(r.check_out);
    while (d < end) {
      const key = toISODateString(d);
      if (!seen.has(key)) {
        seen.add(key);
        out.push(d);
      }
      d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);
    }
  }

  return out;
}
