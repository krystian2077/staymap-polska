"use client";

import Link from "next/link";

import { cn } from "@/lib/utils";
import { useHostStore } from "@/lib/store/hostStore";
import { useMessagingStore } from "@/lib/store/messagingStore";

const items: { href: string; id: string; label: string; icon: string }[] = [
  { href: "/host/dashboard", id: "dashboard", label: "Panel", icon: "📊" },
  { href: "/host/messages", id: "messages", label: "Czat", icon: "💬" },
  { href: "/host/bookings/pending", id: "bookings-pending", label: "Prośby", icon: "⏳" },
  { href: "/host/listings", id: "listings", label: "Oferty", icon: "🏠" },
  { href: "/host/earnings", id: "earnings", label: "Zarobki", icon: "📈" },
];

export function HostMobileNav({ activeItem }: { activeItem: string }) {
  const pendingCount = useHostStore((s) => s.pendingCount);
  const unreadTotal = useMessagingStore((s) => s.unreadTotal);

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 flex border-t border-brand-dark/[.06] bg-gradient-to-t from-white via-white to-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-lg dark:border-brand-border/45 dark:from-[var(--bg2)] dark:via-[var(--bg2)] dark:to-[var(--bg3)] md:hidden"
      aria-label="Nawigacja panelu gospodarza"
    >
      {items.map((it) => {
        const active = activeItem === it.id;
        const badge =
          it.id === "bookings-pending" ? pendingCount :
          it.id === "messages" ? unreadTotal : 0;
        return (
          <Link
            key={it.href}
            href={it.href}
            className={cn(
              "relative flex min-w-0 flex-1 flex-col items-center gap-0.5 py-2.5 text-[10px] font-semibold transition-colors",
              active ? "text-brand" : "text-text-muted"
            )}
          >
            {active && (
              <span className="absolute left-1/2 top-0 h-[2px] w-6 -translate-x-1/2 rounded-b-full bg-brand" />
            )}
            <span className="text-lg leading-none" aria-hidden>
              {it.icon}
            </span>
            <span className="truncate">{it.label}</span>
            {badge > 0 && (
              <span className="absolute right-1/4 top-1 flex h-3.5 min-w-[14px] items-center justify-center rounded-full bg-brand px-1 text-[8px] font-bold text-white">
                {badge}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
