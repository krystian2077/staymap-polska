/** Etykiety i emoji trybów podróży (UI). */
export const MODE_EMOJI: Record<string, string> = {
  romantic: "💑",
  family: "👨‍👩‍👧",
  pet: "🐕",
  workation: "💻",
  slow: "🌿",
  outdoor: "⛺",
  lake: "🏊",
  mountains: "⛰️",
  wellness: "🧖",
};

export const TRAVEL_MODE_LABELS: Record<string, string> = {
  romantic: "Romantyczny",
  family: "Rodzinny",
  pet: "Z pupilem",
  workation: "Workation",
  slow: "Slow",
  outdoor: "Outdoor",
  lake: "Jeziora",
  mountains: "Góry",
  wellness: "Wellness",
};

export const MODE_LABEL = TRAVEL_MODE_LABELS;

export function travelModeLabel(mode: string | null | undefined): string {
  if (!mode) return "";
  return TRAVEL_MODE_LABELS[mode] ?? mode;
}
