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
    "inline-flex items-center gap-1.5 rounded-lg border border-[rgba(124,58,237,.4)] bg-gradient-to-br from-[rgba(124,58,237,.08)] to-[rgba(124,58,237,.02)] px-3.5 py-2 text-[14px] font-bold text-[#7c3aed] transition-all duration-300 hover:border-[rgba(124,58,237,.6)] hover:bg-gradient-to-br hover:from-[rgba(124,58,237,.14)] hover:to-[rgba(124,58,237,.06)] hover:shadow-[0_4px_12px_rgba(124,58,237,.25)] active:scale-95";

   return (
     <header
       className="sticky top-0 z-50 animate-fade-in border-b border-gray-200/50 bg-white shadow-md"
     >
      <div className="mx-auto flex h-20 max-w-[1400px] items-center justify-between gap-4 px-6 sm:px-10 lg:px-12">
         <Link
           href="/"
           className="flex shrink-0 items-baseline gap-0 transition-all duration-300 hover:opacity-80 active:scale-95"
         >
           <span className="text-2xl font-extrabold tracking-tight text-brand-dark">StayMap</span>
           <span className="text-3xl font-extrabold text-brand">.</span>
         </Link>

          <nav className="hidden items-center gap-8 md:flex lg:gap-10">
            <Link
              href="/search"
              className="nav-link text-base font-semibold text-text-secondary hover:text-text transition-colors duration-300"
              style={{ animationDelay: "80ms" }}
            >
              Wyszukaj
            </Link>
            <Link
              href="/discovery"
              className="nav-link text-base font-semibold text-text-secondary hover:text-text transition-colors duration-300"
              style={{ animationDelay: "100ms" }}
            >
              🗺️ Discovery
            </Link>
            <div className="hidden h-5 w-px bg-gradient-to-b from-gray-200/0 via-gray-300 to-gray-200/0 lg:block" aria-hidden />
            <Link
              href="/host/onboarding"
              className="nav-link text-base font-semibold text-text-secondary hover:text-text transition-colors duration-300"
              style={{ animationDelay: "160ms" }}
            >
              Zostań gospodarzem
            </Link>
          </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          <Link href="/ai" className={cn(aiClass, "hidden sm:inline-flex")}>
            ✨ AI
          </Link>
           {!user ? (
             <>
               <Link
                  href="/login"
                  className="btn-ghost hidden text-sm font-semibold sm:inline-flex text-text-secondary hover:text-text hover:bg-brand-surface/80 transition-colors duration-300"
                >
                  Zaloguj się
                </Link>
               <Link
                  href="/ai"
                  className={cn(aiClass, "sm:hidden")}
                >
                  ✨ AI
                </Link>
                <Link
                  href="/register"
                  className="btn-primary rounded-lg px-4 py-2.5 text-sm sm:px-6 sm:py-3 sm:text-base sm:font-bold"
                >
                  Rejestracja
                </Link>
             </>
           ) : (
             <>
               <Link href="/ai" className={cn(aiClass, "sm:hidden")}>
                 ✨ AI
               </Link>
               <Link href="/wishlist" className="relative inline-flex p-2.5 text-xl text-rose-500 transition-all duration-300 hover:scale-110 active:scale-95" title="Ulubione">
                 ♥
                 {wishCount > 0 ? (
                   <span className="absolute -right-1 -top-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-bold text-white shadow-md">
                     {wishCount > 99 ? "99+" : wishCount}
                   </span>
                 ) : null}
               </Link>
                <Link
                  href="/compare"
                  className="nav-link hidden text-sm font-semibold xl:inline-flex text-text-secondary hover:text-text transition-colors duration-300"
                >
                  Porównaj
                </Link>
                <Link
                  href="/account"
                  className="nav-link hidden text-sm font-semibold sm:inline-flex text-text-secondary hover:text-text transition-colors duration-300"
                >
                  Moje konto
                </Link>
                <Link
                  href="/bookings"
                  className="btn-ghost hidden text-sm font-semibold sm:inline-flex text-text-secondary hover:text-text hover:bg-brand-surface/80 transition-colors duration-300"
                >
                  Moje rezerwacje
                </Link>
                {user.is_host ? (
                  <Link
                    href="/host/dashboard"
                    className="nav-link hidden text-sm font-bold sm:inline-flex text-brand transition-colors duration-300"
                  >
                    Panel gospodarza
                  </Link>
                ) : null}
                {user.is_host ? <NavbarNotifications /> : null}
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-brand-muted to-brand-border text-xs font-bold text-brand-dark shadow-md cursor-pointer transition-all duration-300 hover:shadow-lg hover:scale-105"
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
                  className="btn-ghost hidden text-xs font-semibold sm:inline-flex text-text-muted hover:text-text hover:bg-brand-surface/80 transition-colors duration-300"
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
