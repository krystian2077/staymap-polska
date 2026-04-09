"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import Image from "next/image";

import { cn } from "@/lib/utils";
import { useHostStore } from "@/lib/store/hostStore";
import { useMessagingStore } from "@/lib/store/messagingStore";

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
    <span
      className={cn(
        "ml-auto shrink-0 rounded-full px-[7px] py-0.5 text-[10px] font-bold text-white shadow-sm",
        kind === "warn" ? "bg-amber-500 shadow-amber-500/20" : "bg-brand shadow-brand/20"
      )}
    >
      {value}
    </span>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-1.5 mt-6 px-5 text-[10px] font-extrabold uppercase tracking-[.12em] text-brand-dark/40 first:mt-0">
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
    <Link
      href={href}
      className={cn(
        "group relative mb-0.5 flex cursor-pointer items-center gap-3 rounded-xl px-4 py-2.5 text-[13px] font-medium transition-all duration-200",
        active
          ? "bg-white font-bold text-brand-dark shadow-[0_2px_8px_rgba(0,0,0,.06)] ring-1 ring-black/[.04]"
          : "text-brand-dark/60 hover:bg-white/70 hover:text-brand-dark hover:shadow-[0_1px_4px_rgba(0,0,0,.04)]"
      )}
    >
      {active && (
        <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-brand shadow-[0_0_6px_rgba(22,163,74,.4)]" />
      )}
      <span
        className={cn(
          "flex h-7 w-7 items-center justify-center rounded-lg text-sm leading-none transition-transform duration-200 group-hover:scale-110",
          active ? "bg-brand-surface" : "bg-transparent"
        )}
        aria-hidden
      >
        {icon}
      </span>
      <span className="min-w-0 flex-1 truncate">{label}</span>
      <SidebarBadge value={badge ?? null} kind={badgeKind} />
    </Link>
  );
}

export function HostSidebar({ activeItem }: { activeItem: string }) {
  const router = useRouter();
  const profile = useHostStore((s) => s.profile);
  const stats = useHostStore((s) => s.stats);
  const pendingCount = useHostStore((s) => s.pendingCount);
  const unreadTotal = useMessagingStore((s) => s.unreadTotal);

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
    <aside className="sticky top-16 flex h-[calc(100vh-4rem)] w-[260px] shrink-0 flex-col overflow-y-auto border-r border-brand-dark/[.06] bg-gradient-to-b from-[#f4f8f5] via-[#f0f5f1] to-[#eaf1ec]">
      {/* Profile card */}
      <div className="px-5 pb-4 pt-6">
        <button
          type="button"
          onClick={() => router.push("/host/dashboard")}
          className="group flex w-full items-center gap-3 rounded-2xl bg-white/80 p-3 text-left shadow-card ring-1 ring-black/[.03] backdrop-blur transition-all duration-200 hover:bg-white hover:shadow-elevated"
        >
          <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-full bg-brand-muted ring-2 ring-brand/20">
            {profile?.avatar_url ? (
              <Image
                src={profile.avatar_url}
                alt=""
                width={44}
                height={44}
                className="h-full w-full object-cover"
                unoptimized
              />
            ) : (
              <span className="flex h-full w-full items-center justify-center text-sm font-bold text-brand-dark">
                {initials}
              </span>
            )}
            {profile?.is_verified && (
              <span
                className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-white text-[10px] shadow-sm"
                title="Zweryfikowany"
              >
                ⭐
              </span>
            )}
          </div>
          <div className="min-w-0 pt-0.5">
            <p className="truncate text-sm font-bold text-brand-dark">{displayName}</p>
            <p className="text-[11px] text-text-muted">
              Superhost · {rating.toFixed(2)} ★
            </p>
          </div>
        </button>
      </div>

      <nav className="flex flex-1 flex-col px-3 pb-6">
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
    </aside>
  );
}
