"use client";

import Link from "next/link";

import { cn } from "@/lib/utils";

const items: { href: string; id: string; label: string; icon: string }[] = [
  { href: "/host/dashboard", id: "dashboard", label: "Panel", icon: "📊" },
  { href: "/host/messages", id: "messages", label: "Czat", icon: "💬" },
  { href: "/host/bookings/pending", id: "bookings-pending", label: "Prośby", icon: "⏳" },
  { href: "/host/listings", id: "listings", label: "Oferty", icon: "🏠" },
];

export function HostMobileNav({ activeItem }: { activeItem: string }) {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 flex border-t border-[#e5e7eb] bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
      aria-label="Nawigacja panelu gospodarza"
    >
      {items.map((it) => {
        const active = activeItem === it.id;
        return (
          <Link
            key={it.href}
            href={it.href}
            className={cn(
              "flex min-w-0 flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-semibold",
              active ? "text-brand" : "text-text-muted"
            )}
          >
            <span className="text-lg leading-none" aria-hidden>
              {it.icon}
            </span>
            <span className="truncate">{it.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
