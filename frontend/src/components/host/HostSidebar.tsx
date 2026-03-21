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
        "ml-auto shrink-0 rounded-full px-[7px] py-0.5 text-[10px] font-bold text-white",
        kind === "warn" ? "bg-amber-500" : "bg-brand"
      )}
    >
      {value}
    </span>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-2 mt-5 px-4 text-[10px] font-bold uppercase tracking-wider text-text-muted first:mt-0">
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
        "mb-0.5 flex cursor-pointer items-center gap-2.5 rounded-[9px] px-3 py-[9px] text-[13px] font-medium text-text-secondary transition-all duration-150",
        active
          ? "bg-white font-bold text-brand-dark shadow-[0_1px_3px_rgba(0,0,0,.06)]"
          : "hover:bg-white hover:text-gray-900"
      )}
    >
      <span className="text-base leading-none" aria-hidden>
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
    <aside
      className="sticky top-16 flex h-[calc(100vh-4rem)] w-[220px] shrink-0 flex-col overflow-y-auto border-r border-[#e5e7eb] bg-[#f9fafb]"
      style={{ padding: "20px 0" }}
    >
      <div className="mb-5 px-4">
        <button
          type="button"
          onClick={() => router.push("/host/dashboard")}
          className="flex w-full items-start gap-3 text-left"
        >
          <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-full bg-[#dcfce7]">
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
            {profile?.is_verified ? (
              <span
                className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-white text-[10px] shadow"
                title="Zweryfikowany"
              >
                ⭐
              </span>
            ) : null}
          </div>
          <div className="min-w-0 pt-0.5">
            <p className="truncate text-sm font-bold text-brand-dark">{displayName}</p>
            <p className="text-xs text-text-muted">
              Superhost · {rating.toFixed(2)} ★
            </p>
          </div>
        </button>
      </div>

      <nav className="flex flex-col px-2">
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
          badge={reviewsPending > 0 ? "!" : null}
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
        <Item
          id="bookings-all"
          href="/host/bookings"
          icon="📋"
          label="Wszystkie"
          activeItem={activeItem}
        />
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
