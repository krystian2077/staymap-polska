"use client";

import Link from "next/link";

import { cn } from "@/lib/utils";
import { useHostStore } from "@/lib/store/hostStore";
import { useMessagingStore } from "@/lib/store/messagingStore";

type NavIcon = "dashboard" | "messages" | "pending" | "listings" | "earnings";

function HostNavGlyph({ name, className }: { name: NavIcon; className?: string }) {
  const cls = cn("h-[22px] w-[22px]", className);
  switch (name) {
    case "dashboard":
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25A2.25 2.25 0 0113.5 8.25V6zM3.75 15.75a2.25 2.25 0 012.25-2.25h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25v-2.25z" />
        </svg>
      );
    case "messages":
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 0112 18.75a5.972 5.972 0 01-1.635-.337 9.764 9.764 0 01-2.555.337c-4.97 0-9-3.694-9-8.25s4.03-8.25 9-8.25 9 3.694 9 8.25z" />
        </svg>
      );
    case "pending":
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    case "listings":
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
        </svg>
      );
    case "earnings":
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v7.125c0 .621-.504 1.125-1.125 1.125h-2.25A1.125 1.125 0 013 20.25v-7.125zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
        </svg>
      );
    default:
      return null;
  }
}

const items: { href: string; id: string; label: string; icon: NavIcon }[] = [
  { href: "/host/dashboard", id: "dashboard", label: "Panel", icon: "dashboard" },
  { href: "/host/messages", id: "messages", label: "Czat", icon: "messages" },
  { href: "/host/bookings/pending", id: "bookings-pending", label: "Prośby", icon: "pending" },
  { href: "/host/listings", id: "listings", label: "Oferty", icon: "listings" },
  { href: "/host/earnings", id: "earnings", label: "Zarobki", icon: "earnings" },
];

export function HostMobileNav({ activeItem }: { activeItem: string }) {
  const pendingCount = useHostStore((s) => s.pendingCount);
  const unreadTotal = useMessagingStore((s) => s.unreadTotal);

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-[115] flex border-t border-brand-dark/[.06] bg-gradient-to-t from-white via-white to-white/95 px-1 pb-[calc(8px+var(--mobile-safe-bottom))] pt-1.5 backdrop-blur-lg dark:border-brand-border/45 dark:from-[var(--bg2)] dark:via-[var(--bg2)] dark:to-[var(--bg3)] md:hidden"
      aria-label="Nawigacja panelu gospodarza"
    >
      {items.map((it) => {
        const active = activeItem === it.id;
        const badge =
          it.id === "bookings-pending" ? pendingCount : it.id === "messages" ? unreadTotal : 0;
        return (
          <Link
            key={it.href}
            href={it.href}
            className={cn(
              "relative flex min-h-[52px] min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-xl py-1.5 text-[10px] font-semibold transition-colors",
              active ? "text-brand" : "text-text-muted"
            )}
          >
            {active && (
              <span className="absolute left-1/2 top-0 h-[2px] w-6 -translate-x-1/2 rounded-b-full bg-brand" />
            )}
            <span className={cn("flex items-center justify-center", active ? "text-brand" : "text-text-muted")} aria-hidden>
              <HostNavGlyph name={it.icon} />
            </span>
            <span className="truncate">{it.label}</span>
            {badge > 0 && (
              <span className="absolute right-[18%] top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-brand px-1 text-[8px] font-bold text-white shadow-[0_4px_12px_rgba(22,163,74,.35)]">
                {badge}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
