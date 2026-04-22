"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { api, apiUrl } from "@/lib/api";
import { clearAuthTokens, getAccessToken } from "@/lib/authStorage";
import { useAuthStore } from "@/lib/store/authStore";
import { useMessagingStore } from "@/lib/store/messagingStore";
import { shouldShowGuestMobileNav } from "@/lib/guestMobileNav";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/layout/ThemeToggle";

type NavIcon = "search" | "compass" | "heart" | "route" | "host" | "sparkles";

type NavItem = { label: string; href: string; ai?: boolean; icon: NavIcon };

const NAV_ITEMS: NavItem[] = [
  { label: "Wyszukaj", href: "/search", icon: "search" },
  { label: "Discovery", href: "/discovery", icon: "compass" },
  { label: "Ulubione", href: "/wishlist", icon: "heart" },
  { label: "Tryby Podróży", href: "/travel", icon: "route" },
  { label: "Zostań gospodarzem", href: "/host", icon: "host" },
  { label: "StayMap AI", href: "/ai", ai: true, icon: "sparkles" },
];

function NavMenuIcon({ name, className }: { name: NavIcon; className?: string }) {
  const cls = cn("h-5 w-5 shrink-0", className);
  switch (name) {
    case "search":
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
        </svg>
      );
    case "compass":
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9 9 0 100-18 9 9 0 000 18z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v3m0 12v3M3 12h3m12 0h3m-2.05-6.95l-2.12 2.12M8.17 8.17L6.05 6.05m0 11.9l2.12-2.12m7.66-7.66l2.12-2.12" />
        </svg>
      );
    case "heart":
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
        </svg>
      );
    case "route":
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 20.25l6.75-6.75M10.5 3.75L3 7.5v9l7.5 3.75L18 16.5V7.5l-7.5-3.75z" />
        </svg>
      );
    case "host":
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
        </svg>
      );
    case "sparkles":
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
        </svg>
      );
    default:
      return null;
  }
}

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

async function fetchWishlistCount(): Promise<number> {
  const token = getAccessToken();
  if (!token) return 0;
  try {
    const res = await fetch(apiUrl("/api/v1/wishlist/"), {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!res.ok) return 0;
    const j = (await res.json()) as { data?: unknown[] };
    return Array.isArray(j.data) ? j.data.length : 0;
  } catch {
    return 0;
  }
}

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const logout = useAuthStore((s) => s.logout);
  const unreadTotal = useMessagingStore((s) => s.unreadTotal);
  const setUnreadTotal = useMessagingStore((s) => s.setUnreadTotal);
  const [wishCount, setWishCount] = useState(0);

  const [menuOpen, setMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [mounted, setMounted] = useState(false);
  /** Mobile + dolny pasek gościa: niższy header (jak Airbnb), bez dublowania z tabami */
  const [guestMobileShell, setGuestMobileShell] = useState(false);
  const drawerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setMounted(true);
    const onScroll = () => setScrolled(window.scrollY > 20);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const sync = () => {
      setGuestMobileShell(mq.matches && shouldShowGuestMobileNav(pathname));
    };
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, [pathname]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(max-width: 767px)");
    const applyNavH = () => {
      if (!mq.matches) {
        document.documentElement.style.removeProperty("--nav-h");
        return;
      }
      if (guestMobileShell) {
        document.documentElement.style.setProperty("--nav-h", scrolled ? "62px" : "68px");
      } else {
        document.documentElement.style.setProperty("--nav-h", scrolled ? "82px" : "88px");
      }
    };
    applyNavH();
    mq.addEventListener("change", applyNavH);
    return () => {
      mq.removeEventListener("change", applyNavH);
      document.documentElement.style.removeProperty("--nav-h");
    };
  }, [guestMobileShell, scrolled]);

  useEffect(() => {
    if (!mounted) return;
    let cancelled = false;
    const token = typeof window !== "undefined" ? getAccessToken() : null;
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
        if (!cancelled) {
          setUser(null);
          if (typeof window !== "undefined") {
            clearAuthTokens();
          }
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [mounted, setUser]);

  useEffect(() => {
    if (!mounted || !user) {
      setUnreadTotal(0);
      return;
    }

    let cancelled = false;
    const tick = async () => {
      try {
        const res = await api.get<{ data: { unread_total: number } }>("/api/v1/conversations/summary/");
        if (cancelled) return;
        const unread = Number(res.data?.unread_total ?? 0);
        setUnreadTotal(unread);
      } catch {
        if (!cancelled) setUnreadTotal(0);
      }
    };

    void tick();
    const id = setInterval(tick, 30_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [mounted, user, setUnreadTotal]);

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
  }, [menuOpen, userDropdownOpen]);

  const displayName = useMemo(() => {
    if (!user) return "";
    const first = user.first_name?.trim() || "Użytkownik";
    const lastInitial = user.last_name?.trim()?.[0] ? `${user.last_name.trim()[0]}.` : "";
    return `${first} ${lastInitial}`.trim();
  }, [user]);

  const authReady = mounted;

  const navItems = useMemo(() => {
    return NAV_ITEMS.map((item) => {
      if (item.href === "/host" && user?.is_host) {
        return { ...item, label: "Panel Gospodarza", href: "/host/dashboard" };
      }
      return item;
    });
  }, [user]);

  const linkClass = (href: string, ai?: boolean) =>
     cn(
       "group relative flex items-center h-full whitespace-nowrap px-2 lg:px-2.5 xl:px-3 text-[17px] font-bold tracking-[-0.3px] transition-all duration-300 ease-[cubic-bezier(0.23,1,0.32,1)]",
       ai
         ? "mx-1 px-3 py-1 text-[#7c3aed] hover:text-[#6d28d9] hover:scale-105 dark:text-violet-300 dark:hover:text-violet-200"
          : "text-[#1f2937] hover:text-[#0a0f0d] dark:text-zinc-200 dark:hover:text-white",
       isActive(pathname, href) && !ai && "text-[#16a34a] font-extrabold after:absolute after:bottom-[14px] after:left-3 after:right-3 after:h-[3px] after:rounded-full after:bg-gradient-to-r after:from-[#16a34a] after:to-[#22c55e] after:content-[''] dark:text-brand"
     );

   return (
     <header
       className={cn(
         "sticky top-0 z-[500] border-b border-gray-200 bg-white shadow-[0_6px_24px_-12px_rgba(0,0,0,0.18)] transition-all duration-500",
         "dark:border-brand-border dark:bg-[var(--bg2)] dark:shadow-[0_6px_24px_-12px_rgba(0,0,0,0.45)]",
         guestMobileShell
           ? "h-[68px] sm:h-[68px] xl:h-[96px]"
           : "h-[88px] sm:h-[88px] xl:h-[96px]",
         scrolled &&
           (guestMobileShell
             ? "h-[62px] shadow-[0_10px_28px_-14px_rgba(0,0,0,0.24)] sm:h-[62px] xl:h-[86px]"
             : "h-[82px] shadow-[0_10px_28px_-14px_rgba(0,0,0,0.24)] sm:h-[82px] xl:h-[86px]")
       )}
     >
        <div className="mx-auto flex h-full w-full max-w-[1680px] items-center justify-between px-4 sm:px-6 lg:px-8 xl:px-10">
          <Link href="/" className="group flex items-end leading-none transition-all duration-300 hover:scale-[1.03] active:scale-95">
            <span className="text-[27px] font-[900] tracking-[-1px] text-[#0a2e1a] sm:text-[28px] xl:text-[30px] dark:text-[var(--brand-dark)]">StayMap</span>
            <span className="ml-0.5 text-[31px] leading-none text-[#16a34a] transition-all duration-500 group-hover:ml-1.5 group-hover:scale-150 sm:text-[32px] xl:text-[36px] dark:text-brand">.</span>
         </Link>

          <nav className="hidden h-full flex-nowrap items-center gap-0 xl:flex xl:gap-[2px]" aria-label="Nawigacja główna">
           {navItems.map((item) => (
             <Link key={item.href} href={item.href} className={cn(linkClass(item.href, item.ai), item.href === "/wishlist" && "text-[#dc2626] hover:text-[#b91c1c] dark:text-red-400 dark:hover:text-red-300")}>
               {item.href === "/wishlist" ? (
                 <span className="flex items-center gap-1.5">
                   {item.label}
                   {wishCount > 0 && (
                     <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[#dc2626] px-1 text-[10px] font-bold text-white shadow-sm">
                       {wishCount > 99 ? "99+" : wishCount}
                     </span>
                   )}
                 </span>
               ) : item.label}
               {!item.ai && (
                 <span className="absolute bottom-[14px] left-3 right-3 h-[3px] origin-left scale-x-0 rounded-full bg-gradient-to-r from-[#16a34a]/50 to-[#22c55e]/50 transition-transform duration-300 group-hover:scale-x-100" />
               )}
             </Link>
           ))}
         </nav>

         <div className="hidden items-center gap-4 xl:flex">
           <ThemeToggle />
           {!authReady ? (
             <div className="h-12 w-[240px] animate-pulse rounded-full bg-[#f2f7f4]" aria-hidden />
           ) : !user ? (
             <>
               <Link
                 href="/login"
                  className="px-5 py-3 text-[15px] font-bold text-[#1f2937] transition-all duration-300 hover:text-[#16a34a]"
               >
                 Zaloguj się
               </Link>
               <Link
                 href="/register"
                 className="relative overflow-hidden rounded-full bg-gradient-to-r from-[#16a34a] to-[#15803d] px-7 py-3 text-[15px] font-[900] text-white shadow-[0_12px_24px_-8px_rgba(22,163,74,0.4)] transition-all duration-300 hover:scale-[1.05] hover:shadow-[0_16px_32px_-4px_rgba(22,163,74,0.5)] active:scale-[0.97]"
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
                   "flex items-center gap-3 rounded-full border border-[#e4ebe7]/80 bg-white py-2 pl-5 pr-2.5 text-[15px] font-bold text-[#0a2e1a] shadow-md transition-all duration-300 hover:border-[#16a34a]/40 hover:shadow-lg hover:-translate-y-0.5",
                   userDropdownOpen && "border-[#16a34a]/50 ring-4 ring-[#16a34a]/10 shadow-lg"
                 )}
               >
                 {displayName}
                 <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-[#f0fdf4] to-[#e7f5f0] text-[16px] shadow-sm">
                   👤
                 </div>
               </button>

               {userDropdownOpen && (
                 <div className="absolute right-0 mt-4 w-72 origin-top-right overflow-hidden rounded-[24px] border border-[#e4ebe7]/80 bg-white p-3 shadow-[0_24px_56px_-12px_rgba(10,15,13,.2)] ring-1 ring-black/5 animate-in fade-in zoom-in-95 duration-200">
                   <div className="px-5 py-3 pb-1 text-[12px] font-[900] uppercase tracking-[0.1em] text-[#3d4f45]/50">
                     Twoja platforma
                   </div>
                   <Link
                     href="/account"
                     onClick={() => setUserDropdownOpen(false)}
                     className="flex items-center gap-3.5 rounded-[16px] px-5 py-3.5 text-[15px] font-bold text-[#3d4f45] transition-all duration-200 hover:bg-[#f2f7f4] hover:text-[#0a0f0d] hover:-translate-x-1"
                   >
                     <span className="text-lg">⚙️</span> Moje konto
                   </Link>
                   <Link
                     href="/bookings"
                     onClick={() => setUserDropdownOpen(false)}
                     className="flex items-center gap-3.5 rounded-[16px] px-5 py-3.5 text-[15px] font-bold text-[#3d4f45] transition-all duration-200 hover:bg-[#f2f7f4] hover:text-[#0a0f0d] hover:-translate-x-1"
                   >
                     <span className="text-lg">📅</span> Moje rezerwacje
                   </Link>
                   <Link
                     href="/wishlist"
                     onClick={() => setUserDropdownOpen(false)}
                     className="flex items-center gap-3.5 rounded-[16px] px-5 py-3.5 text-[15px] font-bold text-[#3d4f45] transition-all duration-200 hover:bg-[#f2f7f4] hover:text-[#0a0f0d] hover:-translate-x-1"
                   >
                     <span className="text-lg">❤️</span> Ulubione
                   </Link>
                      {!user.is_host ? (
                        <Link
                          href="/messages"
                          onClick={() => setUserDropdownOpen(false)}
                          className="flex items-center gap-3.5 rounded-[16px] px-5 py-3.5 text-[15px] font-bold text-[#3d4f45] transition-all duration-200 hover:bg-[#f2f7f4] hover:text-[#0a0f0d] hover:-translate-x-1"
                        >
                          <span className="text-lg">💬</span> Wiadomości{unreadTotal > 0 ? ` (${unreadTotal})` : ""}
                        </Link>
                      ) : null}
                   <div className="my-2 h-px bg-[#e4ebe7]/60" />
                   <button
                     type="button"
                     onClick={() => {
                       setUserDropdownOpen(false);
                       logout();
                        clearAuthTokens();
                       router.replace("/");
                       router.refresh();
                     }}
                     className="flex w-full items-center gap-3.5 rounded-[16px] px-5 py-3.5 text-[15px] font-bold text-[#dc2626] transition-all duration-200 hover:bg-[#fef2f2] hover:shadow-sm"
                   >
                     <span className="text-lg">🚪</span> Wyloguj się
                   </button>
                 </div>
               )}
             </div>
           )}
         </div>

         <button
           type="button"
            className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-[#e4ebe7] bg-white text-[#0a2e1a] shadow-md transition-all duration-300 active:scale-95 xl:hidden hover:border-[#16a34a]/30 hover:shadow-lg dark:border-brand-border dark:bg-[var(--bg3)] dark:text-[var(--foreground)]"
           aria-label="Otwórz menu"
           aria-expanded={menuOpen}
           aria-controls="mobile-main-nav"
           onClick={() => setMenuOpen((v) => !v)}
         >
           {menuOpen ? (
             <span className="text-xl">✕</span>
           ) : (
             <div className="flex flex-col gap-[4px]">
               <span className="h-[2.5px] w-5 rounded-full bg-current" />
               <span className="h-[2.5px] w-5 rounded-full bg-current" />
               <span className="h-[2.5px] w-5 rounded-full bg-current" />
             </div>
           )}
         </button>
       </div>

       {menuOpen ? (
         <button
           type="button"
           tabIndex={-1}
           aria-hidden
           className="fixed inset-0 z-[498] bg-black/65 backdrop-blur-md xl:hidden"
           onClick={() => setMenuOpen(false)}
         />
       ) : null}

       <div
         ref={drawerRef}
         id="mobile-main-nav"
         className={cn(
           "fixed inset-x-0 bottom-0 z-[499] flex max-h-[calc(100dvh-var(--nav-h,76px))] flex-col xl:hidden",
           "rounded-t-[22px] border-x border-t border-[#dfe8e2] bg-white shadow-[0_-12px_48px_rgba(10,15,13,.18)] ring-1 ring-black/[0.06] transition-transform duration-300 ease-out dark:border-brand-border dark:bg-[var(--bg2)] dark:ring-white/[0.08]",
           "top-[var(--nav-h,76px)]",
           menuOpen ? "translate-y-0" : "pointer-events-none translate-y-full opacity-0"
         )}
         style={{ overscrollBehavior: "contain" }}
         aria-hidden={!menuOpen}
       >
         <div className="flex shrink-0 flex-col items-center border-b border-[#e4ebe7] bg-[#fafcfb] px-4 pb-3 pt-2 dark:border-brand-border dark:bg-[var(--bg3)]">
           <div className="mb-3 h-1 w-10 shrink-0 rounded-full bg-[#c5cdc8] dark:bg-zinc-500" aria-hidden />
           <div className="flex w-full items-center justify-between gap-3">
             <p className="text-[11px] font-black uppercase tracking-[0.12em] text-[#0a2e1a] dark:text-zinc-100">
               Ustawienia
             </p>
             <ThemeToggle />
           </div>
         </div>

         <div className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto overscroll-contain bg-white px-3 pb-[max(12px,env(safe-area-inset-bottom))] pt-3 dark:bg-[var(--bg2)]">
           <p className="px-3 pb-1 text-[11px] font-black uppercase tracking-[0.12em] text-[#0a2e1a] dark:text-zinc-100">
             Platforma
           </p>
           {navItems.map((item) => (
             <Link
               key={item.href}
               href={item.href}
               onClick={() => setMenuOpen(false)}
               className={cn(
                 "flex min-h-[48px] items-center gap-3 rounded-[16px] px-4 py-3 text-[16px] font-bold transition-all duration-300",
                 item.ai
                   ? "text-[#6d28d9] hover:bg-violet-50 hover:text-[#5b21b6] active:scale-[0.99] dark:text-violet-300 dark:hover:bg-violet-950/50"
                   : item.href === "/wishlist"
                   ? "text-[#dc2626] hover:bg-red-50 hover:text-[#b91c1c] dark:text-red-400 dark:hover:bg-red-950/50"
                   : "text-[#0f1f18] hover:bg-[#eef6f0] hover:text-[#0a0f0d] dark:text-zinc-100 dark:hover:bg-zinc-800",
                 isActive(pathname, item.href) &&
                   !item.ai &&
                   item.href !== "/wishlist" &&
                   "bg-[#ecfdf3] text-[#15803d] font-extrabold dark:bg-emerald-950/70 dark:text-emerald-300",
                 isActive(pathname, item.href) &&
                   item.href === "/wishlist" &&
                   "bg-red-50 font-extrabold dark:bg-red-950/50"
               )}
             >
               <NavMenuIcon
                 name={item.icon}
                 className={
                   item.ai
                     ? "text-[#7c3aed] dark:text-violet-300"
                     : item.href === "/wishlist"
                     ? "text-[#dc2626] dark:text-red-400"
                     : "text-[#1e4d32] dark:text-zinc-300"
                 }
               />
               {item.href === "/wishlist" ? (
                 <span className="flex flex-1 items-center justify-between">
                   {item.label}
                   {wishCount > 0 && (
                     <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[#dc2626] px-1.5 text-[10px] font-bold text-white shadow-sm">
                       {wishCount > 99 ? "99+" : wishCount}
                     </span>
                   )}
                 </span>
               ) : item.label}
             </Link>
           ))}

           {!authReady ? (
             <div className="mt-3 h-24 animate-pulse rounded-[16px] bg-[#eef4f0] dark:bg-zinc-800" />
           ) : !user ? (
             <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2 sm:gap-3">
               <Link
                 href="/login"
                 onClick={() => setMenuOpen(false)}
                 className="flex min-h-[48px] items-center justify-center rounded-[16px] border border-[#cfd9d2] text-[15px] font-bold text-[#0f1f18] transition-all duration-200 hover:bg-[#eef6f0] dark:border-brand-border dark:text-zinc-100 dark:hover:bg-zinc-800"
               >
                 Zaloguj się
               </Link>
               <Link
                 href="/register"
                 onClick={() => setMenuOpen(false)}
                 className="flex min-h-[48px] items-center justify-center rounded-[16px] bg-gradient-to-r from-[#16a34a] to-[#15803d] text-[15px] font-bold text-white transition-all duration-200 hover:shadow-md"
               >
                 Rejestracja
               </Link>
             </div>
           ) : (
             <div className="mt-4 flex flex-col gap-1 rounded-[20px] border border-[#e4ebe7] bg-[#f5faf7] p-3 dark:border-zinc-700 dark:bg-[var(--bg3)]">
               <div className="px-3 py-2 text-[11px] font-black uppercase tracking-[0.12em] text-[#0a2e1a] dark:text-zinc-100">
                 Konto
               </div>
               <Link
                 href="/account"
                 onClick={() => setMenuOpen(false)}
                 className="flex min-h-[48px] items-center gap-3 rounded-[14px] px-3 py-3 text-[15px] font-bold text-[#0f1f18] transition-all duration-200 hover:bg-white dark:text-zinc-100 dark:hover:bg-zinc-800/90"
               >
                 <svg
                   className="h-5 w-5 shrink-0 text-[#1e4d32] dark:text-zinc-300"
                   fill="none"
                   viewBox="0 0 24 24"
                   stroke="currentColor"
                   strokeWidth={2}
                   aria-hidden
                 >
                   <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
                   <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                 </svg>
                 Moje konto
               </Link>
               <Link
                 href="/bookings"
                 onClick={() => setMenuOpen(false)}
                 className="flex min-h-[48px] items-center gap-3 rounded-[14px] px-3 py-3 text-[15px] font-bold text-[#0f1f18] transition-all duration-200 hover:bg-white dark:text-zinc-100 dark:hover:bg-zinc-800/90"
               >
                 <svg
                   className="h-5 w-5 shrink-0 text-[#1e4d32] dark:text-zinc-300"
                   fill="none"
                   viewBox="0 0 24 24"
                   stroke="currentColor"
                   strokeWidth={2}
                   aria-hidden
                 >
                   <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0021 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5a2.25 2.25 0 002.25-2.25m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5a2.25 2.25 0 012.25 2.25v7.5" />
                 </svg>
                 Moje rezerwacje
               </Link>
               {!user.is_host ? (
                 <Link
                   href="/messages"
                   onClick={() => setMenuOpen(false)}
                   className="flex min-h-[48px] items-center gap-3 rounded-[14px] px-3 py-3 text-[15px] font-bold text-[#0f1f18] transition-all duration-200 hover:bg-white dark:text-zinc-100 dark:hover:bg-zinc-800/90"
                 >
                   <svg
                     className="h-5 w-5 shrink-0 text-[#1e4d32] dark:text-zinc-300"
                     fill="none"
                     viewBox="0 0 24 24"
                     stroke="currentColor"
                     strokeWidth={2}
                     aria-hidden
                   >
                     <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 0112 18.75a5.972 5.972 0 01-1.635-.337 9.764 9.764 0 01-2.555.337c-4.97 0-9-3.694-9-8.25s4.03-8.25 9-8.25 9 3.694 9 8.25z" />
                   </svg>
                   Wiadomości{unreadTotal > 0 ? ` (${unreadTotal})` : ""}
                 </Link>
               ) : null}
               <button
                 type="button"
                 onClick={() => {
                   logout();
                   clearAuthTokens();
                   router.replace("/");
                   router.refresh();
                   setMenuOpen(false);
                 }}
                 className="mt-1 flex min-h-[48px] items-center gap-3 rounded-[14px] border border-[#fecaca] bg-white px-3 py-3 text-[15px] font-bold text-[#b91c1c] transition-all duration-200 hover:bg-red-50 dark:border-red-900/50 dark:bg-[var(--bg2)] dark:text-red-400 dark:hover:bg-red-950/50"
               >
                 <svg
                   className="h-5 w-5 shrink-0"
                   fill="none"
                   viewBox="0 0 24 24"
                   stroke="currentColor"
                   strokeWidth={2}
                   aria-hidden
                 >
                   <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
                 </svg>
                 Wyloguj się
               </button>
             </div>
           )}
         </div>
       </div>
     </header>
   );
}

