"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { getWsBaseUrl } from "@/lib/ws";

export function useWebSocket(
  path: string,
  token: string | null,
  options?: { onMessage?: (ev: MessageEvent) => void }
) {
  const wsRef = useRef<WebSocket | null>(null);
  const [status, setStatus] = useState<"connecting" | "open" | "closed">("connecting");
  const onMessageRef = useRef(options?.onMessage);
  onMessageRef.current = options?.onMessage;

  useEffect(() => {
    if (!token) {
      setStatus("closed");
      return;
    }
    let cancelled = false;
    let reconnectTimer: ReturnType<typeof setTimeout> | undefined;
    const base = getWsBaseUrl();
    const url = `${base}${path.startsWith("/") ? path : `/${path}`}`;

    const connect = () => {
      if (cancelled) return;
      try {
        const ws = new WebSocket(`${url}?token=${encodeURIComponent(token)}`);
        wsRef.current = ws;
        ws.onopen = () => setStatus("open");
        ws.onclose = () => {
          setStatus("closed");
          wsRef.current = null;
          reconnectTimer = setTimeout(connect, 3000);
        };
        ws.onerror = () => {};
        ws.onmessage = (e) => onMessageRef.current?.(e);
      } catch {
        setStatus("closed");
      }
    };

    connect();

    return () => {
      cancelled = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, [path, token]);

  const send = useCallback((data: object) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data));
    }
  }, []);

  return { ws: wsRef.current, status, send };
}
