"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { useMessagingStore } from "@/lib/store/messagingStore";
import { mapApiMessage } from "@/lib/utils/hostMap";
import { getWsBaseUrl } from "@/lib/ws";

/** Pojedyncze połączenie WS dla konwersacji + obsługa zdarzeń w store. */
export function useConversationSocket(convId: string | null, token: string | null) {
  const addMessage = useMessagingStore((s) => s.addMessage);
  const setTyping = useMessagingStore((s) => s.setTyping);
  const setOnline = useMessagingStore((s) => s.setOnline);
  const markReadStore = useMessagingStore((s) => s.markRead);
  const wsRef = useRef<WebSocket | null>(null);
  const [status, setStatus] = useState<"connecting" | "open" | "closed">("connecting");

  useEffect(() => {
    if (!convId || !token) return;
    const base = getWsBaseUrl();
    const url = `${base}/ws/conversations/${convId}/?token=${encodeURIComponent(token)}`;
    const ws = new WebSocket(url);
    wsRef.current = ws;
    ws.onopen = () => setStatus("open");
    ws.onclose = () => setStatus("closed");
    ws.onmessage = (e) => {
      try {
        const event = JSON.parse(e.data as string) as {
          type?: string;
          payload?: Record<string, unknown>;
        };
        const p = event.payload ?? {};
        switch (event.type) {
          case "message.new": {
            const msg = mapApiMessage(p as Record<string, unknown>, convId);
            addMessage(convId, msg);
            break;
          }
          case "typing.indicator":
            setTyping(convId, String(p.user_id ?? ""), Boolean(p.is_typing));
            break;
          case "presence.update":
            setOnline(String(p.user_id ?? ""), Boolean(p.is_online));
            break;
          case "message.read": {
            const cid = String(
              (p as { conversation_id?: string }).conversation_id ?? convId
            );
            markReadStore(cid);
            break;
          }
          default:
            break;
        }
      } catch {
        /* ignore */
      }
    };
    return () => {
      ws.close();
    };
  }, [convId, token, addMessage, setTyping, setOnline, markReadStore]);

  const send = useCallback((data: object) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data));
    }
  }, []);

  const sendMessage = useCallback(
    (content: string) => send({ type: "message.new", payload: { content } }),
    [send]
  );
  const sendTyping = useCallback(
    (isTyping: boolean) =>
      send({
        type: isTyping ? "typing.start" : "typing.stop",
        payload: { conversation_id: convId },
      }),
    [send, convId]
  );
  const markRead = useCallback(
    (messageId: string) => send({ type: "message.read", payload: { message_id: messageId } }),
    [send]
  );

  return { sendMessage, sendTyping, markRead, status };
}
