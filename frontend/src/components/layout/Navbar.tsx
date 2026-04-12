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
  { label: "Ulubione", href: "/wishlist" },
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
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
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
      if (userDropdownOpen && target && !(target as HTMLElement).closest(".user-dropdown-container")) {
        setUserDropdownOpen(false);
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
      "group relative flex items-center h-full px-4 text-[14px] font-medium tracking-[-0.2px] transition-all duration-300 ease-[cubic-bezier(0.23,1,0.32,1)]",
      ai
        ? "mx-1.5 rounded-full border border-[rgba(124,58,237,.18)] bg-[linear-gradient(135deg,rgba(124,58,237,.06)_0%,rgba(168,85,247,.08)_100%)] px-5 text-[#7c3aed] shadow-[0_2px_12px_-4px_rgba(124,58,237,0.2)] hover:border-[rgba(124,58,237,.3)] hover:bg-[linear-gradient(135deg,rgba(124,58,237,.1)_0%,rgba(168,85,247,.12)_100%)] hover:shadow-[0_4px_20px_-4px_rgba(124,58,237,0.35)] hover:-translate-y-[1px]"
        : "text-[#3d4f45] hover:text-[#0a0f0d]",
      isActive(pathname, href) && !ai && "text-[#16a34a] font-semibold after:absolute after:bottom-[12px] after:left-4 after:right-4 after:h-[2px] after:rounded-full after:bg-[#16a34a] after:content-['']"
    );

  return (
    <header
      className={cn(
        "sticky top-0 z-[500] h-[80px] bg-white shadow-[0_1px_0_rgba(0,0,0,0.06)] transition-all duration-500",
        scrolled && "h-[72px]"
      )}
    >
      <div className="mx-auto flex h-full w-full max-w-[1240px] items-center justify-between px-4 md:px-8">
        <Link href="/" className="group flex items-end leading-none transition-transform duration-300 hover:scale-[1.02]">
          <span className="text-[24px] font-[900] tracking-[-1px] text-[#0a2e1a] sm:text-[26px]">StayMap</span>
          <span className="ml-0.5 text-[28px] leading-none text-[#16a34a] transition-all duration-500 group-hover:ml-1 group-hover:scale-125 sm:text-[32px]">.</span>
        </Link>

        <nav className="hidden h-full items-center gap-[4px] md:flex" aria-label="Nawigacja główna">
          {NAV_ITEMS.map((item) => (
            <Link key={item.href} href={item.href} className={linkClass(item.href, item.ai)}>
              {item.label}
              {!item.ai && (
                <span className="absolute bottom-[12px] left-4 right-4 h-[2px] origin-left scale-x-0 rounded-full bg-[#16a34a]/30 transition-transform duration-300 group-hover:scale-x-100" />
              )}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-4 md:flex">
          {!authReady ? (
            <div className="h-11 w-[220px] animate-pulse rounded-full bg-[#f2f7f4]" aria-hidden />
          ) : !user ? (
            <>
              <Link
                href="/login"
                className="px-4 py-2.5 text-[14px] font-bold text-[#3d4f45] transition-all duration-300 hover:text-[#16a34a]"
              >
                Zaloguj się
              </Link>
              <Link
                href="/register"
                className="relative overflow-hidden rounded-full bg-[#16a34a] px-6 py-2.5 text-[14px] font-[800] text-white shadow-[0_10px_20px_-8px_rgba(22,163,74,0.4)] transition-all duration-300 hover:scale-[1.04] hover:bg-[#15803d] hover:shadow-[0_12px_24px_-6px_rgba(22,163,74,0.5)] active:scale-[0.98]"
              >
                Dołącz teraz
              </Link>
            </>
          ) : (
            <div className="relative user-dropdown-container">
              <button
                type="button"
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                className={cn(
                  "flex items-center gap-2.5 rounded-full border border-[#e4ebe7] bg-white py-1.5 pl-4 pr-2 text-[14px] font-bold text-[#0a2e1a] shadow-sm transition-all duration-300 hover:border-[#16a34a]/30 hover:shadow-md",
                  userDropdownOpen && "border-[#16a34a] ring-4 ring-[#16a34a]/5"
                )}
              >
                {displayName}
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#f0fdf4] text-[15px] shadow-inner">
                  👤
                </div>
              </button>

              {userDropdownOpen && (
                <div className="absolute right-0 mt-3 w-64 origin-top-right overflow-hidden rounded-[20px] border border-[#e4ebe7]/80 bg-white p-2 shadow-[0_20px_48px_-12px_rgba(10,15,13,.15)] ring-1 ring-black/5 animate-in fade-in zoom-in-95 duration-200">
                  <div className="px-4 py-3 pb-1 text-[11px] font-[800] uppercase tracking-[0.08em] text-[#3d4f45]/40">
                    Twoja platforma
                  </div>
                  <Link
                    href="/account"
                    onClick={() => setUserDropdownOpen(false)}
                    className="flex items-center gap-3 rounded-[14px] px-4 py-3 text-[14px] font-semibold text-[#3d4f45] transition-colors hover:bg-[#f2f7f4] hover:text-[#0a0f0d]"
                  >
                    <span>⚙️</span> Moje konto
                  </Link>
                  <Link
                    href="/bookings"
                    onClick={() => setUserDropdownOpen(false)}
                    className="flex items-center gap-3 rounded-[14px] px-4 py-3 text-[14px] font-semibold text-[#3d4f45] transition-colors hover:bg-[#f2f7f4] hover:text-[#0a0f0d]"
                  >
                    <span>📅</span> Moje rezerwacje
                  </Link>
                  <Link
                    href="/wishlist"
                    onClick={() => setUserDropdownOpen(false)}
                    className="flex items-center gap-3 rounded-[14px] px-4 py-3 text-[14px] font-semibold text-[#3d4f45] transition-colors hover:bg-[#f2f7f4] hover:text-[#0a0f0d]"
                  >
                    <span>❤️</span> Ulubione
                  </Link>
                  <div className="my-2 h-px bg-[#e4ebe7]/60" />
                  <button
                    type="button"
                    onClick={() => {
                      setUserDropdownOpen(false);
                      logout();
                      router.replace("/");
                      router.refresh();
                    }}
                    className="flex w-full items-center gap-3 rounded-[14px] px-4 py-3 text-[14px] font-bold text-[#dc2626] transition-colors hover:bg-[#fef2f2]"
                  >
                    <span>🚪</span> Wyloguj się
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        <button
          type="button"
          className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[#e4ebe7] bg-white text-[#0a2e1a] shadow-sm transition-all duration-300 active:scale-95 md:hidden"
          aria-label="Otwórz menu"
          aria-expanded={menuOpen}
          aria-controls="mobile-main-nav"
          onClick={() => setMenuOpen((v) => !v)}
        >
          {menuOpen ? (
            <span className="text-lg">✕</span>
          ) : (
            <div className="flex flex-col gap-[3px]">
              <span className="h-[2px] w-5 rounded-full bg-current" />
              <span className="h-[2px] w-5 rounded-full bg-current" />
              <span className="h-[2px] w-5 rounded-full bg-current" />
            </div>
          )}
        </button>
      </div>

      <div
        ref={drawerRef}
        id="mobile-main-nav"
        className={cn(
          "absolute left-4 right-4 top-[80px] z-[499] overflow-hidden rounded-[24px] border border-[#e4ebe7] bg-white/95 p-3 shadow-[0_24px_50px_-12px_rgba(10,15,13,.15)] backdrop-blur-xl transition-all duration-500 md:hidden",
          scrolled && "top-[72px]",
          menuOpen ? "translate-y-0 opacity-100" : "pointer-events-none -translate-y-4 opacity-0"
        )}
        aria-hidden={!menuOpen}
      >
        <div className="flex flex-col gap-1.5">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMenuOpen(false)}
              className={cn(
                "flex items-center rounded-[14px] px-4 py-3.5 text-[15px] font-bold transition-all duration-200",
                item.ai
                  ? "mt-1 border border-[rgba(124,58,237,.1)] bg-[rgba(124,58,237,.04)] text-[#7c3aed]"
                  : "text-[#3d4f45] hover:bg-[#f2f7f4] hover:text-[#0a0f0d]",
                isActive(pathname, item.href) && !item.ai && "bg-[#f0fdf4] text-[#16a34a]"
              )}
            >
              {item.label}
            </Link>
          ))}

          {!authReady ? (
            <div className="h-20 animate-pulse rounded-[14px] bg-[#f2f7f4]" />
          ) : !user ? (
            <div className="mt-2 grid grid-cols-2 gap-2">
              <Link
                href="/login"
                onClick={() => setMenuOpen(false)}
                className="flex h-12 items-center justify-center rounded-[14px] border border-[#e4ebe7] text-[14px] font-bold text-[#3d4f45]"
              >
                Zaloguj się
              </Link>
              <Link
                href="/register"
                onClick={() => setMenuOpen(false)}
                className="flex h-12 items-center justify-center rounded-[14px] bg-[#16a34a] text-[14px] font-bold text-white"
              >
                Rejestracja
              </Link>
            </div>
          ) : (
            <div className="mt-2 flex flex-col gap-1 rounded-[18px] bg-[#f8faf9] p-2">
              <div className="px-3 py-2 text-[11px] font-[800] uppercase tracking-wider text-[#3d4f45]/40">
                Twoje konto
              </div>
              <Link
                href="/account"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-3 rounded-[12px] px-3 py-3 text-[14px] font-bold text-[#3d4f45]"
              >
                ⚙️ Moje konto
              </Link>
              <Link
                href="/bookings"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-3 rounded-[12px] px-3 py-3 text-[14px] font-bold text-[#3d4f45]"
              >
                📅 Moje rezerwacje
              </Link>
              <button
                type="button"
                onClick={() => {
                  logout();
                  router.replace("/");
                  router.refresh();
                  setMenuOpen(false);
                }}
                className="mt-1 flex items-center gap-3 rounded-[12px] border border-[#e4ebe7] bg-white px-3 py-3 text-[14px] font-bold text-[#dc2626]"
              >
                🚪 Wyloguj się
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

