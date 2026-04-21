/**
 * Django w kontenerze buduje czasem absolutne URL z hostem `backend` (sieć Dockera).
 * Przeglądarka na hoście musi dostać ten sam path pod localhost / domeną publiczną.
 */
export function publicMediaUrl(url: string | null | undefined): string | null {
  if (url == null || url === "") return null;
  const base = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000").replace(/\/$/, "");
  let out = url
    .replace(/^https?:\/\/backend:8000(?=\/|$)/i, base)
    .replace(/^https?:\/\/backend(?=\/|$)/i, base);
  if (out.startsWith("/media/")) {
    out = `${base}${out}`;
  }
  return out;
}
