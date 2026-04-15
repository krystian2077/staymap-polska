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
        "ml-auto shrink-0 rounded-full px-[7px] py-0.5 text-[10px] font-bold text-white shadow-sm",
        kind === "warn" ? "bg-amber-500 shadow-amber-500/20" : "bg-brand shadow-brand/20"
      )}
    >
      {value}
    </motion.span>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-2 mt-10 px-8 text-[11px] font-extrabold uppercase tracking-[.2em] text-brand-dark/30 first:mt-0 dark:text-brand-light/45">
      {children}
    </p>
  );
}

type ItemProps = {
  id: string;
  href: string;
  icon: string;
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
        whileHover={{ x: 6, scale: 1.01 }}
        whileTap={{ scale: 0.98 }}
        className={cn(
          "relative mb-2 flex cursor-pointer items-center gap-4 rounded-2xl px-8 py-4 text-[16px] font-semibold transition-all duration-300",
          active
            ? "bg-brand-surface font-bold text-brand-dark shadow-[0_8px_20px_rgba(22,163,74,0.1)] ring-1 ring-brand/10 dark:bg-[var(--bg3)] dark:text-brand-light dark:ring-brand-border/70"
            : "text-brand-dark/60 hover:bg-white hover:text-brand-dark hover:shadow-[0_4px_16px_rgba(0,0,0,0.04)] dark:text-[var(--text2)] dark:hover:bg-[var(--bg3)] dark:hover:text-[var(--foreground)]"
        )}
      >
        <AnimatePresence>
          {active && (
            <motion.span
              layoutId="sidebar-active-indicator"
              className="absolute left-0 top-1/2 h-10 w-[6px] -translate-y-1/2 rounded-r-full bg-brand shadow-[0_0_15px_rgba(22,163,74,0.5)]"
              transition={{ type: "spring", stiffness: 400, damping: 40 }}
            />
          )}
        </AnimatePresence>
        <span
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-xl text-lg leading-none transition-all duration-500",
            active ? "bg-white text-brand shadow-md scale-110 dark:bg-[var(--bg2)]" : "bg-transparent grayscale group-hover:grayscale-0 group-hover:scale-110"
          )}
          aria-hidden
        >
          {icon}
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
    <aside className="sticky top-16 flex h-[calc(100vh-4rem)] w-[340px] shrink-0 flex-col overflow-y-auto border-r border-brand-dark/[.03] bg-white custom-scrollbar dark:border-brand-border/45 dark:bg-[var(--bg2)]">
      {/* Profile card */}
      <div className="px-8 pb-8 pt-10">
        <motion.button
          whileHover={{ y: -4, shadow: "0 24px 48px rgba(0,0,0,0.12)" }}
          whileTap={{ scale: 0.97 }}
          type="button"
          onClick={() => router.push("/host/dashboard")}
          className="group flex w-full items-center gap-4 rounded-[28px] bg-white p-5 text-left shadow-[0_12px_32px_rgba(0,0,0,0.05)] ring-1 ring-black/[.02] transition-all duration-500 hover:ring-brand/20 dark:bg-[var(--bg3)] dark:ring-brand-border/45"
        >
          <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full bg-brand-muted ring-2 ring-brand/10">
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
              <span className="flex h-full w-full items-center justify-center text-sm font-bold text-brand-dark">
                {initials}
              </span>
            )}
            {profile?.is_verified && (
              <span
                className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-white text-[10px] shadow-md dark:bg-[var(--bg2)]"
                title="Zweryfikowany"
              >
                ⭐
              </span>
            )}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-extrabold tracking-tight text-brand-dark dark:text-[var(--foreground)]">{displayName}</p>
            <div className="flex items-center gap-1 mt-0.5">
              <span className="h-1 w-1 rounded-full bg-brand" />
              <p className="text-[11px] font-medium text-text-muted">
                Superhost · {rating.toFixed(2)} ★
              </p>
            </div>
          </div>
        </motion.button>
      </div>

      <nav className="flex flex-1 flex-col px-6 pb-20">
        <SectionLabel>Główne</SectionLabel>
        <Item id="dashboard" href="/host/dashboard" icon="📊" label="Dashboard" activeItem={activeItem} />
        <Item
          id="messages"
          href="/host/messages"
          icon="💬"
          label="Wiadomości"
          badge={unreadTotal > 0 ? unreadTotal : null}
          activeItem={activeItem}
        />
        <Item
          id="reviews"
          href="/host/reviews"
          icon="⭐"
          label="Recenzje"
          badge={reviewsPending > 0 ? reviewsPending : null}
          badgeKind="warn"
          activeItem={activeItem}
        />
        <Item
          id="notifications"
          href="/host/notifications"
          icon="🔔"
          label="Powiadomienia"
          badge={notificationUnread > 0 ? notificationUnread : null}
          activeItem={activeItem}
        />

        <SectionLabel>Moje oferty</SectionLabel>
        <Item id="listings" href="/host/listings" icon="🏠" label="Moje oferty" activeItem={activeItem} />
        <Item id="calendar" href="/host/calendar" icon="📅" label="Kalendarz" activeItem={activeItem} />
        <Item id="pricing" href="/host/pricing" icon="💰" label="Ceny i reguły" activeItem={activeItem} />
        <Item
          id="new-listing"
          href="/host/new-listing"
          icon="➕"
          label="Dodaj ofertę"
          activeItem={activeItem}
        />

        <SectionLabel>Rezerwacje</SectionLabel>
        <Item id="bookings-all" href="/host/bookings" icon="📋" label="Wszystkie" activeItem={activeItem} />
        <Item
          id="bookings-pending"
          href="/host/bookings/pending"
          icon="⏳"
          label="Oczekujące"
          badge={pendingCount > 0 ? pendingCount : null}
          activeItem={activeItem}
        />
        <Item
          id="bookings-confirmed"
          href="/host/bookings/confirmed"
          icon="✅"
          label="Potwierdzone"
          activeItem={activeItem}
        />
        <Item id="earnings" href="/host/earnings" icon="📈" label="Zarobki" activeItem={activeItem} />

        <SectionLabel>Konto</SectionLabel>
        <Item id="profile" href="/host/profile" icon="👤" label="Mój profil" activeItem={activeItem} />
        <Item id="payouts" href="/host/payouts" icon="💳" label="Wypłaty" activeItem={activeItem} />
        <Item id="settings" href="/host/settings" icon="⚙️" label="Ustawienia" activeItem={activeItem} />
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
