"use client";

import { useEffect, useMemo } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { useHostNotificationStore } from "@/lib/store/hostNotificationStore";
import { cn } from "@/lib/utils";

type NotifItem = {
  id: string;
  icon: string;
  title: string;
  body: string;
  href: string;
  time: string;
  isRead?: boolean;
  type: "booking" | "review" | "info" | "message";
};

export default function HostNotificationsPage() {
  const items = useHostNotificationStore((s) => s.items);
  const unreadCount = useHostNotificationStore((s) => s.unreadCount);
  const seedNotifications = useHostNotificationStore((s) => s.seedNotifications);
  const markAllRead = useHostNotificationStore((s) => s.markAllRead);
  const markRead = useHostNotificationStore((s) => s.markRead);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await api.get<{
          data: Array<{
            id: string;
            type: string;
            title: string;
            body: string;
            link: string;
            created_at: string;
            is_read: boolean;
          }>;
        }>("/api/v1/host/notifications/");
        if (!cancelled && Array.isArray(res.data)) {
          seedNotifications(res.data);
          markAllRead();
        }
      } catch {
        if (!cancelled) markAllRead();
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [markAllRead, seedNotifications]);

  const notifications = useMemo<NotifItem[]>(() => {
    const out: NotifItem[] = items
      .map((n) => {
        const t = n.type.startsWith("message")
          ? "message"
          : n.type.startsWith("booking")
            ? "booking"
            : n.type.startsWith("review")
              ? "review"
              : "info";
        const icon = t === "message" ? "💬" : t === "booking" ? "📅" : t === "review" ? "⭐" : "🔔";
        return {
          id: n.id,
          icon,
          title: n.title,
          body: n.body,
          href: n.link || "/host/dashboard",
          time: n.created_at,
          isRead: n.is_read,
          type: t,
        } as NotifItem;
      })
      .sort((a, b) => +new Date(b.time) - +new Date(a.time));

    if (out.length === 0) {
      out.push({
        id: "all-good",
        icon: "✅",
        title: "Wszystko w porządku!",
        body: "Nie masz żadnych oczekujących powiadomień. Tak trzymaj!",
        href: "/host/dashboard",
        time: new Date().toISOString(),
        type: "info",
      });
    }

    return out.sort((a, b) => +new Date(b.time) - +new Date(a.time));
  }, [items]);

  const TYPE_STYLES: Record<string, string> = {
    booking: "border-l-amber-400 bg-amber-50/50",
    review: "border-l-purple-400 bg-purple-50/50",
    message: "border-l-blue-400 bg-blue-50/50",
    info: "border-l-emerald-400 bg-emerald-50/50",
  };

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-6">
        <h1 className="text-[22px] font-extrabold text-brand-dark">Powiadomienia</h1>
        <p className="text-sm text-text-secondary">Centrum powiadomień Twojego panelu gospodarza.</p>
        {unreadCount > 0 ? (
          <p className="mt-1 text-xs font-bold text-brand">Nowe: {unreadCount}</p>
        ) : null}
      </div>

      <div className="space-y-3">
        {notifications.map((n) => (
          <Link
            key={n.id}
            href={n.href}
            onClick={() => markRead(n.id)}
            className={cn(
              "block rounded-xl border-l-4 p-4 ring-1 ring-black/[.04] transition-all hover:shadow-md",
              n.isRead === false && "ring-brand/20 shadow-brand/10",
              TYPE_STYLES[n.type] ?? ""
            )}
          >
            <div className="flex gap-3">
              <span className="text-2xl">{n.icon}</span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-brand-dark">{n.title}</p>
                <p className="mt-0.5 text-xs text-text-muted leading-relaxed">{n.body}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
