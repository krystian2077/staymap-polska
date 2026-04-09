"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { HostMobileNav } from "@/components/host/HostMobileNav";
import { HostSidebar } from "@/components/host/HostSidebar";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { api, refreshSession } from "@/lib/api";
import { mapApiConversation, mapBookingToHostBooking } from "@/lib/utils/hostMap";
import { useHostStore } from "@/lib/store/hostStore";
import { useMessagingStore } from "@/lib/store/messagingStore";
import type { HostProfile, HostStats } from "@/types/host";

function deriveActiveItem(pathname: string): string {
  if (pathname === "/host" || pathname.startsWith("/host/dashboard")) return "dashboard";
  if (pathname.startsWith("/host/messages")) return "messages";
  if (pathname.startsWith("/host/reviews")) return "reviews";
  if (pathname.startsWith("/host/notifications")) return "notifications";
  if (pathname.startsWith("/host/listings")) return "listings";
  if (pathname.startsWith("/host/calendar")) return "calendar";
  if (pathname.startsWith("/host/pricing")) return "pricing";
  if (pathname.startsWith("/host/new-listing")) return "new-listing";
  if (pathname.startsWith("/host/bookings/pending")) return "bookings-pending";
  if (pathname.startsWith("/host/bookings/confirmed")) return "bookings-confirmed";
  if (pathname.startsWith("/host/bookings")) return "bookings-all";
  if (pathname.startsWith("/host/earnings")) return "earnings";
  if (pathname.startsWith("/host/profile")) return "profile";
  if (pathname.startsWith("/host/payouts")) return "payouts";
  if (pathname.startsWith("/host/settings")) return "settings";
  return "dashboard";
}

function profileFromUser(u: {
  id: string;
  email?: string;
  first_name: string;
  last_name: string;
  bio?: string;
  avatar_url?: string | null;
  created_at?: string;
}): HostProfile {
  const name = `${u.first_name} ${u.last_name}`.trim();
  return {
    id: u.id,
    user_id: u.id,
    display_name: name || u.email?.split("@")[0] || "Gospodarz",
    bio: u.bio ?? "",
    avatar_url: u.avatar_url ?? null,
    is_verified: false,
    response_rate: 0,
    average_rating: null,
    review_count: 0,
    member_since: u.created_at ?? new Date().toISOString(),
    total_earnings: 0,
    payout_pending: 0,
  };
}

export function HostLayoutClient({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const setProfile = useHostStore((s) => s.setProfile);
  const setStats = useHostStore((s) => s.setStats);
  const setBookings = useHostStore((s) => s.setBookings);
  const setConversations = useMessagingStore((s) => s.setConversations);

  const noSidebar = pathname.startsWith("/host/new-listing");
  const activeItem = useMemo(() => deriveActiveItem(pathname), [pathname]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const prof = await api.get<{ data: { is_host?: boolean; id: string; first_name: string; last_name: string; email?: string; bio?: string; avatar_url?: string | null; created_at?: string } }>(
          "/api/v1/profile/"
        );
        if (cancelled) return;
        if (!prof.data?.is_host) {
          router.replace("/host/onboarding");
          return;
        }
        if (typeof window !== "undefined") {
          await refreshSession();
        }
        setProfile(profileFromUser(prof.data));

        try {
          const statsRes = await api.get<{ data: HostStats }>("/api/v1/host/stats/");
          if (!cancelled && statsRes.data) setStats(statsRes.data);
        } catch {
          if (!cancelled) {
            setStats({
              revenue_this_month: 0,
              revenue_last_month: 0,
              occupancy_percent: 0,
              avg_rating: 0,
              bookings_count: 0,
              bookings_pending: 0,
              new_messages: 0,
              reviews_pending_response: 0,
            });
          }
        }

        try {
          const bookRes = await api.get<{ data: Record<string, unknown>[] }>(
            "/api/v1/host/bookings/"
          );
          if (!cancelled && Array.isArray(bookRes.data)) {
            setBookings(bookRes.data.map((b) => mapBookingToHostBooking(b)));
          }
        } catch {
          if (!cancelled) setBookings([]);
        }

        try {
          const convRes = await api.get<{ data: Record<string, unknown>[] }>("/api/v1/conversations/");
          if (!cancelled && Array.isArray(convRes.data)) {
            setConversations(convRes.data.map((c) => mapApiConversation(c)));
          }
        } catch {
          if (!cancelled) setConversations([]);
        }
      } catch {
        if (!cancelled) router.replace("/login");
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router, setProfile, setStats, setBookings, setConversations]);

  if (!ready) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (noSidebar) {
    return <>{children}</>;
  }

  return (
    <div className="relative w-full max-w-[100vw]">
      <div
        className="grid grid-cols-1 md:grid-cols-[260px_1fr]"
        style={{ minHeight: "calc(100vh - 64px)" }}
      >
        <div className="hidden md:block">
          <HostSidebar activeItem={activeItem} />
        </div>
        <main className="min-w-0 bg-[#f7f9f8] pb-[72px] md:pb-0">
          {children}
        </main>
      </div>
      <HostMobileNav activeItem={activeItem} />
    </div>
  );
}
