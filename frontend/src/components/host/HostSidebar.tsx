"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import Image from "next/image";

import { cn } from "@/lib/utils";
import { useHostStore } from "@/lib/store/hostStore";
import { useMessagingStore } from "@/lib/store/messagingStore";
import { useHostNotificationStore } from "@/lib/store/hostNotificationStore";

import { motion, AnimatePresence } from "framer-motion";

type BadgeKind = "default" | "warn";

function SidebarBadge({
  value,
  kind = "default",
}: {
  value: number | string | null;
  kind?: BadgeKind;
}) {
  if (value == null || value === 0 || value === "") return null;
  return (
    <motion.span
      initial={{ scale: 0.5, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className={cn(
        "ml-auto inline-flex h-5 min-w-[20px] shrink-0 items-center justify-center rounded-full px-1.5 text-[11px] font-bold text-white shadow-sm",
        kind === "warn"
          ? "bg-amber-500 shadow-amber-500/30"
          : "bg-brand shadow-brand/30"
      )}
    >
      {value}
    </motion.span>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-2 mt-7 px-4 text-[10px] font-bold uppercase tracking-[.18em] text-brand-dark/35 first:mt-1 dark:text-brand-light/40">
      {children}
    </p>
  );
}

type IconName =
  | "dashboard"
  | "messages"
  | "reviews"
  | "notifications"
  | "listings"
  | "calendar"
  | "pricing"
  | "new-listing"
  | "bookings-all"
  | "bookings-pending"
  | "bookings-confirmed"
  | "earnings"
  | "profile"
  | "payouts"
  | "settings";

function NavIcon({ name }: { name: IconName }) {
  const stroke = 1.8;
  const common = { fill: "none" as const, viewBox: "0 0 24 24", stroke: "currentColor", strokeWidth: stroke, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, className: "h-[18px] w-[18px]" };
  switch (name) {
    case "dashboard":
      return (
        <svg {...common}>
          <rect x="3" y="3" width="7" height="9" rx="1.5" />
          <rect x="14" y="3" width="7" height="5" rx="1.5" />
          <rect x="14" y="12" width="7" height="9" rx="1.5" />
          <rect x="3" y="16" width="7" height="5" rx="1.5" />
        </svg>
      );
    case "messages":
      return (
        <svg {...common}>
          <path d="M21 12a8 8 0 11-3.07-6.32L21 5l-1 4.07A7.97 7.97 0 0121 12z" />
          <circle cx="9" cy="12" r=".6" fill="currentColor" stroke="none" />
          <circle cx="13" cy="12" r=".6" fill="currentColor" stroke="none" />
          <circle cx="17" cy="12" r=".6" fill="currentColor" stroke="none" />
        </svg>
      );
    case "reviews":
      return (
        <svg {...common}>
          <path d="M12 3l2.6 5.6 6.1.7-4.5 4.2 1.2 6L12 16.8 6.6 19.5l1.2-6L3.3 9.3l6.1-.7L12 3z" />
        </svg>
      );
    case "notifications":
      return (
        <svg {...common}>
          <path d="M6 8a6 6 0 1112 0c0 6 2.5 7 2.5 7H3.5S6 14 6 8z" />
          <path d="M10 19a2 2 0 004 0" />
        </svg>
      );
    case "listings":
      return (
        <svg {...common}>
          <path d="M3 11l9-7 9 7" />
          <path d="M5 10v9a1 1 0 001 1h12a1 1 0 001-1v-9" />
          <path d="M10 20v-6h4v6" />
        </svg>
      );
    case "calendar":
      return (
        <svg {...common}>
          <rect x="3.5" y="5" width="17" height="15" rx="2" />
          <path d="M3.5 10h17M8 3v4M16 3v4" />
        </svg>
      );
    case "pricing":
      return (
        <svg {...common}>
          <path d="M12 3v18M16 7H9.5a2.5 2.5 0 100 5h5a2.5 2.5 0 010 5H7" />
        </svg>
      );
    case "new-listing":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 8v8M8 12h8" />
        </svg>
      );
    case "bookings-all":
      return (
        <svg {...common}>
          <rect x="4" y="4" width="16" height="16" rx="2" />
          <path d="M8 9h8M8 13h8M8 17h5" />
        </svg>
      );
    case "bookings-pending":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 2" />
        </svg>
      );
    case "bookings-confirmed":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
          <path d="M8.5 12.5l2.5 2.5L16 9.5" />
        </svg>
      );
    case "earnings":
      return (
        <svg {...common}>
          <path d="M3 17l5-5 4 4 8-9" />
          <path d="M14 7h6v6" />
        </svg>
      );
    case "profile":
      return (
        <svg {...common}>
          <circle cx="12" cy="8" r="4" />
          <path d="M4 21a8 8 0 0116 0" />
        </svg>
      );
    case "payouts":
      return (
        <svg {...common}>
          <rect x="3" y="6" width="18" height="13" rx="2" />
          <path d="M3 10h18M7 15h3" />
        </svg>
      );
    case "settings":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3H9a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V9a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z" />
        </svg>
      );
  }
}

type ItemProps = {
  id: string;
  href: string;
  icon: IconName;
  label: string;
  badge?: number | string | null;
  badgeKind?: BadgeKind;
  activeItem: string;
};

function Item({ id, href, icon, label, badge, badgeKind, activeItem }: ItemProps) {
  const active = activeItem === id;
  return (
    <Link href={href} className="block group">
      <motion.div
        whileTap={{ scale: 0.98 }}
        className={cn(
          "relative mb-1 flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-[14px] font-medium transition-all duration-200",
          active
            ? "bg-brand/[.08] font-semibold text-brand-dark dark:bg-brand/15 dark:text-brand-light"
            : "text-brand-dark/70 hover:bg-brand-muted/60 hover:text-brand-dark dark:text-[var(--text2)] dark:hover:bg-[var(--bg3)] dark:hover:text-[var(--foreground)]"
        )}
      >
        <AnimatePresence>
          {active && (
            <motion.span
              layoutId="sidebar-active-indicator"
              className="absolute -left-3 top-1/2 h-7 w-1 -translate-y-1/2 rounded-r-full bg-brand"
              transition={{ type: "spring", stiffness: 400, damping: 40 }}
            />
          )}
        </AnimatePresence>
        <span
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors",
            active
              ? "bg-brand text-white shadow-sm shadow-brand/30"
              : "bg-brand-muted/50 text-brand-dark/60 group-hover:bg-white group-hover:text-brand dark:bg-[var(--bg3)] dark:text-[var(--text2)]"
          )}
        >
          <NavIcon name={icon} />
        </span>
        <span className="min-w-0 flex-1 truncate">{label}</span>
        <SidebarBadge value={badge ?? null} kind={badgeKind} />
      </motion.div>
    </Link>
  );
}

export function HostSidebar({ activeItem }: { activeItem: string }) {
  const router = useRouter();
  const profile = useHostStore((s) => s.profile);
  const stats = useHostStore((s) => s.stats);
  const pendingCount = useHostStore((s) => s.pendingCount);
  const unreadTotal = useMessagingStore((s) => s.unreadTotal);
  const notificationUnread = useHostNotificationStore((s) => s.unreadCount);

  const reviewsPending = stats?.reviews_pending_response ?? 0;

  const displayName = profile?.display_name ?? "Gospodarz";
  const initials =
    displayName
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0])
      .join("")
      .toUpperCase() || "?";
  const rating = profile?.average_rating ?? 4.92;

  return (
    <aside className="sticky top-16 flex h-[calc(100vh-4rem)] w-full shrink-0 flex-col overflow-y-auto border-r border-brand-dark/[.04] bg-white custom-scrollbar dark:border-brand-border/45 dark:bg-[var(--bg2)]">
      {/* Profile card */}
      <div className="px-5 pb-5 pt-6">
        <motion.button
          whileHover={{ y: -2 }}
          whileTap={{ scale: 0.98 }}
          type="button"
          onClick={() => router.push("/host/dashboard")}
          className="group relative flex w-full items-center gap-3.5 overflow-hidden rounded-2xl border border-brand-border bg-gradient-to-br from-white to-brand-muted/40 p-4 text-left shadow-sm transition-all hover:border-brand/30 hover:shadow-md dark:border-brand-border/60 dark:from-[var(--bg3)] dark:to-[var(--bg3)]"
        >
          {/* Decorative corner accent */}
          <div className="pointer-events-none absolute -right-6 -top-6 h-16 w-16 rounded-full bg-brand/10 blur-2xl" />

          <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full bg-brand-muted ring-2 ring-brand/20">
            {profile?.avatar_url ? (
              <Image
                src={profile.avatar_url}
                alt=""
                width={48}
                height={48}
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                unoptimized
              />
            ) : (
              <span className="flex h-full w-full items-center justify-center bg-gradient-to-br from-brand/20 to-brand/40 text-sm font-bold text-brand-dark">
                {initials}
              </span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[14px] font-extrabold text-brand-dark dark:text-[var(--foreground)]">{displayName}</p>
            <div className="mt-0.5 flex items-center gap-1.5">
              <span className="inline-flex items-center gap-0.5 rounded-full bg-brand/10 px-1.5 py-px text-[10px] font-bold text-brand">
                <svg className="h-2.5 w-2.5" fill="currentColor" viewBox="0 0 20 20"><path d="M5 13l4-8 1 5h5l-4 8-1-5H5z" /></svg>
                Superhost
              </span>
              <span className="text-[11px] font-medium text-text-muted">{rating.toFixed(2)} ★</span>
            </div>
          </div>
          <svg className="h-4 w-4 shrink-0 text-text-muted transition-transform group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </motion.button>
      </div>

      <nav className="flex flex-1 flex-col px-5 pb-8">
        <SectionLabel>Główne</SectionLabel>
        <Item id="dashboard" href="/host/dashboard" icon="dashboard" label="Dashboard" activeItem={activeItem} />
        <Item id="messages" href="/host/messages" icon="messages" label="Wiadomości" badge={unreadTotal > 0 ? unreadTotal : null} activeItem={activeItem} />
        <Item id="reviews" href="/host/reviews" icon="reviews" label="Recenzje" badge={reviewsPending > 0 ? reviewsPending : null} badgeKind="warn" activeItem={activeItem} />
        <Item id="notifications" href="/host/notifications" icon="notifications" label="Powiadomienia" badge={notificationUnread > 0 ? notificationUnread : null} activeItem={activeItem} />

        <SectionLabel>Moje oferty</SectionLabel>
        <Item id="listings" href="/host/listings" icon="listings" label="Moje oferty" activeItem={activeItem} />
        <Item id="calendar" href="/host/calendar" icon="calendar" label="Kalendarz" activeItem={activeItem} />
        <Item id="pricing" href="/host/pricing" icon="pricing" label="Ceny i reguły" activeItem={activeItem} />
        <Item id="new-listing" href="/host/new-listing" icon="new-listing" label="Dodaj ofertę" activeItem={activeItem} />

        <SectionLabel>Rezerwacje</SectionLabel>
        <Item id="bookings-all" href="/host/bookings" icon="bookings-all" label="Wszystkie" activeItem={activeItem} />
        <Item id="bookings-pending" href="/host/bookings/pending" icon="bookings-pending" label="Oczekujące" badge={pendingCount > 0 ? pendingCount : null} activeItem={activeItem} />
        <Item id="bookings-confirmed" href="/host/bookings/confirmed" icon="bookings-confirmed" label="Potwierdzone" activeItem={activeItem} />
        <Item id="earnings" href="/host/earnings" icon="earnings" label="Zarobki" activeItem={activeItem} />

        <SectionLabel>Konto</SectionLabel>
        <Item id="profile" href="/host/profile" icon="profile" label="Mój profil" activeItem={activeItem} />
        <Item id="payouts" href="/host/payouts" icon="payouts" label="Wypłaty" activeItem={activeItem} />
        <Item id="settings" href="/host/settings" icon="settings" label="Ustawienia" activeItem={activeItem} />
      </nav>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #16a34a33;
          border-radius: 10px;
          border: 1px solid transparent;
          background-clip: padding-box;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #16a34a66;
        }
      `}</style>
    </aside>
  );
}
