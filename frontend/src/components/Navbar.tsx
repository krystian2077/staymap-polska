"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api, apiUrl } from "@/lib/api";
import { useAuthStore } from "@/lib/store/authStore";
import { NavbarNotifications } from "@/components/NavbarNotifications";
import { cn } from "@/lib/utils";

function initials(first: string, last: string) {
  const a = first?.[0] || "";
  const b = last?.[0] || "";
  return (a + b).toUpperCase() || "?";
}

async function fetchWishlistCount(): Promise<number> {
  const token = localStorage.getItem("access");
  if (!token) return 0;
  const res = await fetch(apiUrl("/api/v1/wishlist/"), {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!res.ok) return 0;
  const j = (await res.json()) as { data?: unknown[] };
  return Array.isArray(j.data) ? j.data.length : 0;
}

export function Navbar() {
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const logout = useAuthStore((s) => s.logout);
  const [mounted, setMounted] = useState(false);
  const [wishCount, setWishCount] = useState(0);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || !user) {
      setWishCount(0);
      return;
    }
    let cancelled = false;
    const tick = async () => {
      const n = await fetchWishlistCount();
      if (!cancelled) setWishCount(n);
    };
    void tick();
    const id = setInterval(tick, 60_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [mounted, user]);

  useEffect(() => {
    if (!mounted || typeof window === "undefined") return;
    const token = localStorage.getItem("access");
    if (!token) {
      setUser(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const body = await api.get<{
          data: {
            id: string;
            email: string;
            first_name: string;
            last_name: string;
            is_host?: boolean;
            is_admin?: boolean;
            roles?: string[];
          };
        }>("/api/v1/auth/me/");
        if (!cancelled && body.data) setUser(body.data);
      } catch {
        if (!cancelled) setUser(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [mounted, setUser]);

  const aiClass =
    "inline-flex items-center gap-1 rounded-lg border border-[rgba(124,58,237,.3)] bg-[rgba(124,58,237,.06)] px-3 py-1.5 text-[13px] font-semibold text-[#7c3aed] transition-colors hover:border-[rgba(124,58,237,.5)] hover:bg-[rgba(124,58,237,.12)]";

  return (
    <header
      className={cn(
        "sticky top-0 z-50 animate-fade-in border-b border-gray-200/70 bg-white/94 backdrop-blur-xl"
      )}
    >
      <div className="mx-auto flex h-16 max-w-[1200px] items-center justify-between gap-3 px-6 sm:px-8">
        <Link
          href="/"
          className="flex shrink-0 items-baseline gap-0 transition-opacity duration-200 hover:opacity-85"
        >
          <span className="text-[21px] font-extrabold tracking-tight text-brand-dark">StayMap</span>
          <span className="text-2xl font-extrabold text-brand">.</span>
        </Link>

        <nav className="hidden items-center gap-5 md:flex lg:gap-6">
          <Link href="/search" className="nav-link" style={{ animationDelay: "80ms" }}>
            Wyszukaj
          </Link>
          <Link href="/discovery" className="nav-link" style={{ animationDelay: "100ms" }}>
            🗺️ Discovery
          </Link>
          <div className="hidden h-4 w-px bg-gray-200 lg:block" aria-hidden />
          <Link href="/host/onboarding" className="nav-link" style={{ animationDelay: "160ms" }}>
            Zostań gospodarzem
          </Link>
        </nav>

        <div className="flex items-center gap-1.5 sm:gap-2">
          <Link href="/ai" className={cn(aiClass, "hidden sm:inline-flex")}>
            ✨ AI
          </Link>
          {!user ? (
            <>
              <Link href="/login" className="btn-ghost hidden text-sm sm:inline-flex">
                Zaloguj się
              </Link>
              <Link href="/ai" className={cn(aiClass, "sm:hidden")}>
                ✨ AI
              </Link>
              <Link
                href="/register"
                className="btn-primary rounded-md px-3 py-2 text-sm sm:px-[18px]"
              >
                Rejestracja
              </Link>
            </>
          ) : (
            <>
              <Link href="/ai" className={cn(aiClass, "sm:hidden")}>
                ✨ AI
              </Link>
              <Link href="/wishlist" className="relative inline-flex p-2 text-lg text-rose-500" title="Ulubione">
                ♥
                {wishCount > 0 ? (
                  <span className="absolute -right-0.5 -top-0 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-rose-600 px-0.5 text-[9px] font-bold text-white">
                    {wishCount > 99 ? "99+" : wishCount}
                  </span>
                ) : null}
              </Link>
              <Link href="/compare" className="nav-link hidden text-sm xl:inline-flex">
                Porównaj
              </Link>
              <Link href="/account" className="nav-link hidden text-sm sm:inline-flex">
                Moje konto
              </Link>
              <Link href="/bookings" className="btn-ghost hidden text-sm sm:inline-flex">
                Moje rezerwacje
              </Link>
              {user.is_host ? (
                <Link
                  href="/host/dashboard"
                  className="nav-link hidden text-sm font-semibold text-brand sm:inline-flex"
                >
                  Panel gospodarza
                </Link>
              ) : null}
              {user.is_host ? <NavbarNotifications /> : null}
              <div
                className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-muted text-xs font-bold text-brand-dark"
                title={user.email}
              >
                {initials(user.first_name, user.last_name)}
              </div>
              <button
                type="button"
                onClick={() => {
                  logout();
                  document.cookie = "access_token=; path=/; max-age=0";
                  window.location.href = "/";
                }}
                className="btn-ghost hidden text-xs text-text-muted sm:inline-flex"
              >
                Wyloguj
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
