"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";

import { api } from "@/lib/api";
import { mapBookingToHostBooking } from "@/lib/utils/hostMap";
import { useHostStore } from "@/lib/store/hostStore";
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

export function useNotifications(token: string | null) {
  const setBookings = useHostStore((s) => s.setBookings);
  const [notifications, setNotifications] = useState<NotifItem[]>([]);

  useEffect(() => {
    if (!token) return;
    const base = getWsBaseUrl();
    const ws = new WebSocket(`${base}/ws/notifications/?token=${encodeURIComponent(token)}`);

    ws.onmessage = (e) => {
      try {
        const event = JSON.parse(e.data as string) as {
          type?: string;
          payload?: Record<string, unknown>;
        };
        if (event.type === "notification.new" && event.payload) {
          const notif = event.payload as NotifItem;
          toast(
            `${notif.title}${notif.body ? ` — ${notif.body}` : ""}${notif.link ? ` → ${notif.link}` : ""}`,
            {
              icon: getNotifIcon(notif.type),
              duration: 5000,
            }
          );
          setNotifications((prev) => [notif, ...prev].slice(0, 50));
        }
        if (event.type === "booking.status_changed") {
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
          const p = event.payload as { new_status?: string } | undefined;
          toast.success(`Rezerwacja ${p?.new_status ?? "zaktualizowana"}`);
        }
      } catch {
        /* ignore */
      }
    };

    return () => ws.close();
  }, [token, setBookings]);

  return { notifications };
}
