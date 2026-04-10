"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "@/lib/api";
import { useAuthStore } from "@/lib/store/authStore";
import { cn } from "@/lib/utils";

type NavItem = { label: string; href: string; ai?: boolean };

const NAV_ITEMS: NavItem[] = [
  { label: "Wyszukaj", href: "/search" },
  { label: "Discovery", href: "/discovery" },
  { label: "Zostań gospodarzem", href: "/host" },
  { label: "✨ AI Search", href: "/ai", ai: true },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const logout = useAuthStore((s) => s.logout);

  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [mounted, setMounted] = useState(false);
  const drawerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setMounted(true);
    const onScroll = () => setScrolled(window.scrollY > 20);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!mounted) return;
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
  }, [mounted, setUser]);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!menuOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };

    const onPointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node | null;
      if (drawerRef.current && target && !drawerRef.current.contains(target)) {
        setMenuOpen(false);
      }
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown, { passive: true });

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
    };
  }, [menuOpen]);

  const displayName = useMemo(() => {
    if (!user) return "";
    const first = user.first_name?.trim() || "Użytkownik";
    const lastInitial = user.last_name?.trim()?.[0] ? `${user.last_name.trim()[0]}.` : "";
    return `${first} ${lastInitial}`.trim();
  }, [user]);

  const authReady = mounted;

  const linkClass = (href: string, ai?: boolean) =>
    cn(
      "rounded-[8px] px-[14px] py-[8px] text-[13px] font-medium transition-all duration-200",
      ai
        ? "border border-[rgba(124,58,237,.2)] bg-[rgba(124,58,237,.06)] text-[#7c3aed] hover:bg-[rgba(124,58,237,.12)]"
        : "text-[#3d4f45] hover:bg-[#f2f7f4] hover:text-[#0a0f0d]",
      isActive(pathname, href) && !ai && "bg-[#f0fdf4] font-bold text-[#0a2e1a]"
    );

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

        <nav className="hidden items-center gap-[2px] md:flex" aria-label="Nawigacja główna">
          {NAV_ITEMS.map((item) => (
            <Link key={item.href} href={item.href} className={linkClass(item.href, item.ai)}>
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          {!authReady ? (
            <div className="h-10 w-[208px] rounded-[10px] border border-transparent" aria-hidden />
          ) : !user ? (
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
                router.replace("/");
                router.refresh();
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
          aria-expanded={menuOpen}
          aria-controls="mobile-main-nav"
          onClick={() => setMenuOpen((v) => !v)}
        >
          {menuOpen ? "✕" : "☰"}
        </button>
      </div>

      <div
        ref={drawerRef}
        id="mobile-main-nav"
        className={cn(
          "absolute left-0 right-0 top-[72px] z-[499] border-b border-[#e4ebe7] bg-white px-4 py-3 shadow-[0_14px_30px_rgba(10,15,13,.09)] transition-all duration-300 md:hidden",
          menuOpen ? "translate-y-0 opacity-100" : "pointer-events-none -translate-y-2 opacity-0"
        )}
        aria-hidden={!menuOpen}
      >
        <div className="mx-auto flex max-w-[1240px] flex-col gap-1">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMenuOpen(false)}
              className={cn(
                "rounded-[10px] px-3 py-2 text-sm font-semibold text-[#3d4f45]",
                isActive(pathname, item.href) && "bg-[#f0fdf4] text-[#0a2e1a]",
                item.ai && "border border-[rgba(124,58,237,.18)] bg-[rgba(124,58,237,.04)] text-[#7c3aed]"
              )}
            >
              {item.label}
            </Link>
          ))}
          {!authReady ? (
            <div className="mt-2 h-20 rounded-[12px] border border-transparent" aria-hidden />
          ) : !user ? (
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
          ) : (
            <button
              type="button"
              onClick={() => {
                logout();
                router.replace("/");
                router.refresh();
                setMenuOpen(false);
              }}
              className="mt-2 rounded-[10px] border border-[#e4ebe7] px-3 py-2 text-center text-sm font-semibold text-[#0a2e1a]"
            >
              {displayName} 👤
            </button>
          )}
        </div>
      </div>
    </header>
  );
}

