"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useHostStore } from "@/lib/store/hostStore";
import { cn } from "@/lib/utils";

type NotifItem = {
  id: string;
  icon: string;
  title: string;
  body: string;
  href: string;
  time: string;
  type: "booking" | "review" | "info" | "message";
};

export default function HostNotificationsPage() {
  const stats = useHostStore((s) => s.stats);
  const bookings = useHostStore((s) => s.bookings);

  const notifications = useMemo<NotifItem[]>(() => {
    const items: NotifItem[] = [];

    bookings
      .filter((b) => b.status === "pending")
      .forEach((b) => {
        items.push({
          id: `booking-${b.id}`,
          icon: "📅",
          title: "Nowa prośba o rezerwację",
          body: `${b.guest.first_name} ${b.guest.last_name} chce zarezerwować ${b.listing.title} (${b.check_in} – ${b.check_out})`,
          href: "/host/bookings/pending",
          time: b.created_at,
          type: "booking",
        });
      });

    if (stats && stats.reviews_pending_response > 0) {
      items.push({
        id: "reviews-pending",
        icon: "⭐",
        title: `${stats.reviews_pending_response} recenzji bez odpowiedzi`,
        body: "Odpowiedź na recenzje zwiększa zaufanie gości i poprawia widoczność.",
        href: "/host/reviews",
        time: new Date().toISOString(),
        type: "review",
      });
    }

    if (stats && stats.new_messages > 0) {
      items.push({
        id: "messages-new",
        icon: "💬",
        title: `${stats.new_messages} nowych wiadomości`,
        body: "Masz nieprzeczytane wiadomości od gości.",
        href: "/host/messages",
        time: new Date().toISOString(),
        type: "message",
      });
    }

    if (items.length === 0) {
      items.push({
        id: "all-good",
        icon: "✅",
        title: "Wszystko w porządku!",
        body: "Nie masz żadnych oczekujących powiadomień. Tak trzymaj!",
        href: "/host/dashboard",
        time: new Date().toISOString(),
        type: "info",
      });
    }

    return items.sort((a, b) => +new Date(b.time) - +new Date(a.time));
  }, [bookings, stats]);

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
      </div>

      <div className="space-y-3">
        {notifications.map((n) => (
          <Link
            key={n.id}
            href={n.href}
            className={cn(
              "block rounded-xl border-l-4 p-4 ring-1 ring-black/[.04] transition-all hover:shadow-md",
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
