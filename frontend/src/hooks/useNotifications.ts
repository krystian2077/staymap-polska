"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";

import { api, refreshSession } from "@/lib/api";
import { getAccessToken } from "@/lib/authStorage";
import { mapBookingToHostBooking } from "@/lib/utils/hostMap";
import { useHostStore } from "@/lib/store/hostStore";
import { useMessagingStore } from "@/lib/store/messagingStore";
import { mapApiConversation } from "@/lib/utils/hostMap";
import { useHostNotificationStore } from "@/lib/store/hostNotificationStore";
import { getWsBaseUrl } from "@/lib/ws";

export type NotifItem = { type: string; title: string; body: string; link: string };

function getNotifIcon(type: string) {
  const map: Record<string, string> = {
    "booking.new": "📋",
    "booking.confirmed": "✅",
    "booking.cancelled": "❌",
    "message.new": "💬",
    "review.new": "⭐",
    "listing.approved": "🎉",
    "listing.rejected": "⚠️",
  };
  return map[type] || "🔔";
}

export function useNotifications(token: string | null = null) {
  const setBookings = useHostStore((s) => s.setBookings);
  const setConversations = useMessagingStore((s) => s.setConversations);
  const addNotification = useHostNotificationStore((s) => s.addNotification);
  const [notifications, setNotifications] = useState<NotifItem[]>([]);

  useEffect(() => {
    let disposed = false;
    let ws: WebSocket | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let reconnectAttempt = 0;

    const connect = async () => {
      const nextToken = token || getAccessToken();
      if (!nextToken || disposed) return;

      const base = getWsBaseUrl();
      ws = new WebSocket(`${base}/ws/notifications/?token=${encodeURIComponent(nextToken)}`);

      ws.onopen = () => {
        reconnectAttempt = 0;
      };

      ws.onmessage = (e) => {
        try {
          const event = JSON.parse(e.data as string) as {
            type?: string;
            payload?: Record<string, unknown>;
          };
          if (event.type === "notification.new" && event.payload) {
            const notif = event.payload as NotifItem;
            const payload = event.payload as Record<string, unknown>;
            const now = new Date().toISOString();
            const bookingId = String(payload.booking_id ?? "").trim();
            const messageId = String(payload.message_id ?? "").trim();
            const stableIdBase =
              notif.type === "booking.new" && bookingId
                ? `booking.new:${bookingId}`
                : notif.type === "message.new" && messageId
                  ? `message.new:${messageId}`
                : notif.type === "message.new"
                  ? `message.new:${notif.link}:${now}`
                  : `${notif.type}:${notif.link}:${now}`;
            addNotification({
              id: stableIdBase,
              type: notif.type,
              title: notif.title,
              body: notif.body,
              link: notif.link,
              created_at: now,
            });
            toast(
              `${notif.title}${notif.body ? ` — ${notif.body}` : ""}${notif.link ? ` → ${notif.link}` : ""}`,
              {
                icon: getNotifIcon(notif.type),
                duration: 5000,
              }
            );
            setNotifications((prev) => [notif, ...prev].slice(0, 50));

            if (notif.type === "message.new") {
              void (async () => {
                try {
                  const convRes = await api.get<{ data: Record<string, unknown>[] }>("/api/v1/conversations/");
                  if (Array.isArray(convRes.data)) {
                    setConversations(convRes.data.map((row) => mapApiConversation(row)));
                  }
                } catch {
                  /* ignore */
                }
              })();
            }
          }
          if (event.type === "booking.status_changed") {
            const p = event.payload as { booking_id?: string; new_status?: string } | undefined;
            const status = p?.new_status ?? "updated";
            const statusMap: Record<string, { title: string; body: string }> = {
              cancelled: {
                title: "Rezerwacja anulowana",
                body: "Gość anulował rezerwację.",
              },
              confirmed: {
                title: "Rezerwacja potwierdzona",
                body: "Status rezerwacji został potwierdzony.",
              },
              rejected: {
                title: "Rezerwacja odrzucona",
                body: "Status rezerwacji został zmieniony na odrzucony.",
              },
            };
            const meta = statusMap[status] ?? {
              title: "Status rezerwacji zmieniony",
              body: `Nowy status: ${status}`,
            };
            addNotification({
              id: `booking.status:${p?.booking_id ?? "unknown"}:${status}:${new Date().toISOString()}`,
              type: `booking.${status}`,
              title: meta.title,
              body: meta.body,
              link: "/host/bookings",
              created_at: new Date().toISOString(),
            });

            void (async () => {
              try {
                const res = await api.get<{ data: Record<string, unknown>[] }>("/api/v1/host/bookings/");
                if (Array.isArray(res.data)) {
                  setBookings(res.data.map((b) => mapBookingToHostBooking(b)));
                }
              } catch {
                /* ignore */
              }
            })();
            toast.success(`Rezerwacja ${status}`);
          }
        } catch {
          /* ignore */
        }
      };

      ws.onclose = (event) => {
        if (disposed) return;
        void (async () => {
          const closedByAuth = event.code === 4401 || event.code === 4403;
          if (closedByAuth) {
            await refreshSession();
          }
          reconnectAttempt += 1;
          const delayMs = Math.min(1000 * 2 ** (reconnectAttempt - 1), 15000);
          reconnectTimer = setTimeout(() => {
            void connect();
          }, delayMs);
        })();
      };
    };

    void connect();

    return () => {
      disposed = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      ws?.close();
    };
  }, [token, setBookings, setConversations, addNotification]);

  return { notifications };
}
