"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";

import { shouldShowGuestMobileNav } from "@/lib/guestMobileNav";
import { useMessagingStore } from "@/lib/store/messagingStore";
import { cn } from "@/lib/utils";

/** Wysokość wiersza tabów (bez safe area). */
const GUEST_NAV_ROW_PX = "52px";

type Tab = { href: string; label: string; match: (p: string) => boolean };

const TABS: Tab[] = [
  { href: "/", label: "Start", match: (p) => p === "/" },
  {
    href: "/search",
    label: "Szukaj",
    match: (p) => p === "/search" || p.startsWith("/search/"),
  },
  {
    href: "/wishlist",
    label: "Ulubione",
    match: (p) => p === "/wishlist" || p.startsWith("/wishlist/"),
  },
  {
    href: "/bookings",
    label: "Rezerwacje",
    match: (p) => p.startsWith("/bookings"),
  },
  {
    href: "/account",
    label: "Konto",
    match: (p) =>
      p.startsWith("/account") || p.startsWith("/messages") || p.startsWith("/compare"),
  },
];

function IconHome({ active }: { active: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={cn("h-6 w-6", active ? "text-brand" : "text-text3")}
      aria-hidden
    >
      <path
        d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5Z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconSearch({ active }: { active: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={cn("h-6 w-6", active ? "text-brand" : "text-text3")}
      aria-hidden
    >
      <circle cx="11" cy="11" r="6.25" stroke="currentColor" strokeWidth="1.75" />
      <path d="m16.5 16.5 4 4" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  );
}

function IconHeart({ active }: { active: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill={active ? "currentColor" : "none"}
      className={cn("h-6 w-6", active ? "text-brand" : "text-text3")}
      aria-hidden
    >
      <path
        d="M12 20s-6.716-4.436-9.5-8.5C.98 8.16 2.27 4.61 6.11 4 8.8 3.55 11 5.2 12 7.5 13 5.2 15.2 3.55 17.89 4c3.84.61 5.13 4.16 3.61 7.5C18.716 15.564 12 20 12 20Z"
        stroke={active ? "none" : "currentColor"}
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconCalendar({ active }: { active: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={cn("h-6 w-6", active ? "text-brand" : "text-text3")}
      aria-hidden
    >
      <rect x="4" y="5" width="16" height="15" rx="2" stroke="currentColor" strokeWidth="1.75" />
      <path d="M4 9.5h16M8 3.5v3M16 3.5v3" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  );
}

function IconUser({ active }: { active: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={cn("h-6 w-6", active ? "text-brand" : "text-text3")}
      aria-hidden
    >
      <circle cx="12" cy="9" r="3.25" stroke="currentColor" strokeWidth="1.75" />
      <path
        d="M6.5 19.25c0-3 2.5-5 5.5-5s5.5 2 5.5 5"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

function TabIcon({ id, active }: { id: string; active: boolean }) {
  switch (id) {
    case "home":
      return <IconHome active={active} />;
    case "search":
      return <IconSearch active={active} />;
    case "wishlist":
      return <IconHeart active={active} />;
    case "bookings":
      return <IconCalendar active={active} />;
    case "account":
      return <IconUser active={active} />;
    default:
      return null;
  }
}

const TAB_IDS = ["home", "search", "wishlist", "bookings", "account"] as const;

export function GuestMobileNav() {
  const pathname = usePathname();
  const unreadTotal = useMessagingStore((s) => s.unreadTotal);

  const visible = shouldShowGuestMobileNav(pathname);

  useEffect(() => {
    const apply = () => {
      const isMobile = window.matchMedia("(max-width: 767px)").matches;
      if (visible && isMobile) {
        document.documentElement.style.setProperty("--guest-mobile-nav-pad", GUEST_NAV_ROW_PX);
        document.documentElement.style.setProperty(
          "--guest-nav-bottom-offset",
          "calc(52px + var(--mobile-safe-bottom))"
        );
      } else {
        document.documentElement.style.setProperty("--guest-mobile-nav-pad", "0px");
        document.documentElement.style.setProperty("--guest-nav-bottom-offset", "0px");
      }
    };
    apply();
    const mq = window.matchMedia("(max-width: 767px)");
    mq.addEventListener("change", apply);
    return () => {
      mq.removeEventListener("change", apply);
      document.documentElement.style.setProperty("--guest-mobile-nav-pad", "0px");
      document.documentElement.style.setProperty("--guest-nav-bottom-offset", "0px");
    };
  }, [visible]);

  if (!visible) return null;

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-[120] border-t border-[var(--border)] bg-[var(--bg)]/95 pb-[var(--mobile-safe-bottom)] pt-1 shadow-[0_-4px_24px_rgba(0,0,0,.08)] backdrop-blur-lg md:hidden dark:border-brand-border dark:bg-[var(--bg2)]/98 dark:shadow-[0_-4px_24px_rgba(0,0,0,.35)]"
      aria-label="Nawigacja główna"
    >
      <ul className="mx-auto flex max-w-lg items-stretch justify-between gap-0.5 px-1">
        {TABS.map((tab, i) => {
          const active = tab.match(pathname);
          const id = TAB_IDS[i];
          return (
            <li key={tab.href} className="min-w-0 flex-1">
              <Link
                href={tab.href}
                className={cn(
                  "relative flex min-h-[48px] flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-1.5 text-[10px] font-bold tracking-tight transition-colors",
                  active ? "text-brand" : "text-text3 hover:text-text2"
                )}
              >
                {active && (
                  <span
                    className="absolute left-1/2 top-0 h-0.5 w-7 -translate-x-1/2 rounded-b-full bg-brand"
                    aria-hidden
                  />
                )}
                <span className="relative">
                  <TabIcon id={id} active={active} />
                  {tab.href === "/account" && unreadTotal > 0 && (
                    <span className="absolute -right-1 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-brand px-1 text-[8px] font-extrabold text-white shadow-sm">
                      {unreadTotal > 99 ? "99+" : unreadTotal}
                    </span>
                  )}
                </span>
                <span className="truncate">{tab.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
