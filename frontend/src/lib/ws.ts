/** Bazowy URL WebSocket (np. ws://localhost:8000) z NEXT_PUBLIC_API_URL lub domyślnie localhost:8000. */
export function getWsBaseUrl(): string {
  if (typeof window === "undefined") return "ws://localhost:8000";
  const raw =
    process.env.NEXT_PUBLIC_WS_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    "http://localhost:8000";
  try {
    const u = new URL(raw.startsWith("http") ? raw : `http://${raw}`);
    const wsProto = u.protocol === "https:" ? "wss:" : "ws:";
    return `${wsProto}//${u.host}`;
  } catch {
    return "ws://localhost:8000";
  }
}
