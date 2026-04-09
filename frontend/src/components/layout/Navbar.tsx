"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { useAuthStore } from "@/lib/store/authStore";
import { cn } from "@/lib/utils";

type NavItem = { label: string; href: string; ai?: boolean };

const NAV_ITEMS: NavItem[] = [
  { label: "Wyszukaj", href: "/search" },
  { label: "Discovery", href: "/discovery" },
  { label: "Zostań gospodarzem", href: "/host/onboarding" },
  { label: "✨ AI Search", href: "/ai", ai: true },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Navbar() {
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const logout = useAuthStore((s) => s.logout);

  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const token = typeof window !== "undefined" ? localStorage.getItem("access") : null;
    if (!token) {
      setUser(null);
      return;
    }

    (async () => {
      try {
        const res = await api.get<{
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
        if (!cancelled) setUser(res.data);
      } catch {
        if (!cancelled) setUser(null);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [setUser]);

  const displayName = useMemo(() => {
    if (!user) return "";
    const initial = user.last_name?.[0] ? `${user.last_name[0]}.` : "";
    return `${user.first_name || "Użytkownik"} ${initial}`.trim();
  }, [user]);

  return (
    <header
      className={cn(
        "sticky top-0 z-[500] h-[72px] border-b border-[rgba(228,235,231,.5)] bg-[rgba(255,255,255,.9)] backdrop-blur-[28px] backdrop-saturate-[200%] transition-shadow duration-300",
        scrolled && "shadow-[0_4px_16px_rgba(10,15,13,.08)]"
      )}
    >
      <div className="mx-auto flex h-full w-full max-w-[1240px] items-center justify-between px-4 md:px-8">
        <Link href="/" className="flex items-end leading-none">
          <span className="text-[22px] font-black tracking-[-.7px] text-[#0a2e1a]">StayMap</span>
          <span className="ml-0.5 text-[25px] leading-none text-[#16a34a]">.</span>
        </Link>

        <nav className="hidden items-center gap-[2px] md:flex">
          {NAV_ITEMS.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "rounded-[8px] px-[14px] py-[8px] text-[13px] font-medium transition-all duration-200",
                  item.ai
                    ? "border border-[rgba(124,58,237,.2)] bg-[rgba(124,58,237,.06)] text-[#7c3aed] hover:bg-[rgba(124,58,237,.12)]"
                    : "text-[#3d4f45] hover:bg-[#f2f7f4] hover:text-[#0a0f0d]",
                  active && !item.ai && "bg-[#f0fdf4] font-bold text-[#0a2e1a]"
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          {!user ? (
            <>
              <Link
                href="/login"
                className="rounded-[10px] border-[1.5px] border-[#e4ebe7] px-4 py-2 text-sm font-semibold text-[#3d4f45] transition-all duration-200 hover:border-[#16a34a] hover:bg-[#f0fdf4] hover:text-[#16a34a]"
              >
                Zaloguj się
              </Link>
              <Link
                href="/register"
                className="rounded-[10px] bg-[#16a34a] px-4 py-2 text-sm font-bold text-white shadow-[0_2px_8px_rgba(22,163,74,.25)] transition-all duration-200 hover:-translate-y-px hover:bg-[#15803d] hover:shadow-[0_8px_18px_rgba(22,163,74,.32)]"
              >
                Rejestracja
              </Link>
            </>
          ) : (
            <button
              type="button"
              onClick={() => {
                logout();
                window.location.href = "/";
              }}
              className="rounded-[10px] border border-[#e4ebe7] px-4 py-2 text-sm font-semibold text-[#0a2e1a] transition-colors duration-200 hover:bg-[#f0fdf4]"
            >
              {displayName} 👤
            </button>
          )}
        </div>

        <button
          type="button"
          className="inline-flex h-10 w-10 items-center justify-center rounded-[10px] border border-[#e4ebe7] text-[#0a2e1a] md:hidden"
          aria-label="Otwórz menu"
          onClick={() => setMenuOpen((v) => !v)}
        >
          {menuOpen ? "✕" : "☰"}
        </button>
      </div>

      <div
        className={cn(
          "absolute left-0 right-0 top-[72px] border-b border-[#e4ebe7] bg-white px-4 py-3 shadow-[0_14px_30px_rgba(10,15,13,.09)] transition-all duration-300 md:hidden",
          menuOpen ? "translate-y-0 opacity-100" : "pointer-events-none -translate-y-2 opacity-0"
        )}
      >
        <div className="mx-auto flex max-w-[1240px] flex-col gap-1">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMenuOpen(false)}
              className={cn(
                "rounded-[10px] px-3 py-2 text-sm font-semibold text-[#3d4f45]",
                isActive(pathname, item.href) && "bg-[#f0fdf4] text-[#0a2e1a]"
              )}
            >
              {item.label}
            </Link>
          ))}
          {!user ? (
            <div className="mt-2 grid grid-cols-2 gap-2">
              <Link
                href="/login"
                onClick={() => setMenuOpen(false)}
                className="rounded-[10px] border border-[#e4ebe7] px-3 py-2 text-center text-sm font-semibold text-[#3d4f45]"
              >
                Zaloguj się
              </Link>
              <Link
                href="/register"
                onClick={() => setMenuOpen(false)}
                className="rounded-[10px] bg-[#16a34a] px-3 py-2 text-center text-sm font-bold text-white"
              >
                Rejestracja
              </Link>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}

