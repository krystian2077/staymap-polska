/**
 * W przeglądarce: `/api/v1/*` → BFF. Na RSC: pełny URL do Next lub bezpośrednio Django.
 */
function nextAppOrigin(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.INTERNAL_NEXT_URL ||
    "http://localhost:3000"
  ).replace(/\/$/, "");
}

export function apiUrl(path: string): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  const viaBff = p.startsWith("/api/v1");

  if (typeof window !== "undefined") {
    if (viaBff) {
      return p;
    }
    return `${(process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000").replace(/\/$/, "")}${p}`;
  }

  if (viaBff) {
    return `${nextAppOrigin()}${p}`;
  }

  const internal = process.env.INTERNAL_API_URL?.replace(/\/$/, "");
  if (internal) return `${internal}${p}`;
  return `${(process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000").replace(/\/$/, "")}${p}`;
}
