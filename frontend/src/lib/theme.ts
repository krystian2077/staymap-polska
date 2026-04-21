/** Klucz localStorage — tylko jawny wybór użytkownika (`light` | `dark`). Domyślnie strona jest jasna. */
export const THEME_STORAGE_KEY = "staymap-theme";

export type Theme = "light" | "dark";

export function applyTheme(theme: Theme) {
  const root = document.documentElement;
  if (theme === "dark") {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    /* ignore */
  }
}
