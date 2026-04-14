"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "@/lib/api";
import { clearAuthTokens, getAccessToken } from "@/lib/authStorage";
import { useAuthStore } from "@/lib/store/authStore";
import { useMessagingStore } from "@/lib/store/messagingStore";
import { cn } from "@/lib/utils";

type NavItem = { label: string; href: string; ai?: boolean };

const NAV_ITEMS: NavItem[] = [
  { label: "Wyszukaj", href: "/search" },
  { label: "Discovery", href: "/discovery" },
  { label: "Ulubione", href: "/wishlist" },
  { label: "Tryby Podróży", href: "/travel" },
  { label: "Zostań gospodarzem", href: "/host" },
  { label: "✨ StayMap AI", href: "/ai", ai: true },
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
  const unreadTotal = useMessagingStore((s) => s.unreadTotal);
  const setUnreadTotal = useMessagingStore((s) => s.setUnreadTotal);

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
       "group relative flex items-center h-full px-3 lg:px-4 xl:px-5 text-[16px] font-bold tracking-[-0.3px] transition-all duration-300 ease-[cubic-bezier(0.23,1,0.32,1)]",
       ai
         ? "mx-2 px-4 py-1 text-[#7c3aed] hover:text-[#6d28d9] hover:scale-105"
          : "text-[#1f2937] hover:text-[#0a0f0d]",
       isActive(pathname, href) && !ai && "text-[#16a34a] font-extrabold after:absolute after:bottom-[12px] after:left-4 after:right-4 after:h-[3px] after:rounded-full after:bg-gradient-to-r after:from-[#16a34a] after:to-[#22c55e] after:content-['']"
     );

   return (
     <header
       className={cn(
         "sticky top-0 z-[500] h-[88px] border-b border-gray-200 bg-white shadow-[0_6px_24px_-12px_rgba(0,0,0,0.18)] transition-all duration-500",
         scrolled && "h-[80px] shadow-[0_10px_28px_-14px_rgba(0,0,0,0.24)]"
       )}
     >
       <div className="mx-auto flex h-full w-full max-w-[1560px] items-center justify-between px-4 md:px-8 lg:px-10 xl:px-12">
         <Link href="/" className="group flex items-end leading-none transition-all duration-300 hover:scale-[1.03] active:scale-95">
           <span className="text-[28px] font-[900] tracking-[-1.2px] text-[#0a2e1a] sm:text-[30px]">StayMap</span>
           <span className="ml-0.5 text-[32px] leading-none text-[#16a34a] transition-all duration-500 group-hover:ml-1.5 group-hover:scale-150 sm:text-[36px]">.</span>
         </Link>

          <nav className="hidden h-full flex-nowrap items-center gap-[8px] md:flex lg:gap-[12px]" aria-label="Nawigacja główna">
           {navItems.map((item) => (
             <Link key={item.href} href={item.href} className={linkClass(item.href, item.ai)}>
               {item.label}
               {!item.ai && (
                 <span className="absolute bottom-[12px] left-4 right-4 h-[3px] origin-left scale-x-0 rounded-full bg-gradient-to-r from-[#16a34a]/50 to-[#22c55e]/50 transition-transform duration-300 group-hover:scale-x-100" />
               )}
             </Link>
           ))}
         </nav>

         <div className="hidden items-center gap-5 md:flex">
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
           className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-[#e4ebe7] bg-white text-[#0a2e1a] shadow-md transition-all duration-300 active:scale-95 md:hidden hover:border-[#16a34a]/30 hover:shadow-lg"
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

       <div
         ref={drawerRef}
         id="mobile-main-nav"
         className={cn(
           "absolute left-4 right-4 top-[88px] z-[499] overflow-hidden rounded-[28px] border border-[#e4ebe7] bg-white/98 p-4 shadow-[0_28px_56px_-12px_rgba(10,15,13,.2)] backdrop-blur-xl transition-all duration-500 md:hidden",
           scrolled && "top-[80px]",
           menuOpen ? "translate-y-0 opacity-100" : "pointer-events-none -translate-y-4 opacity-0"
         )}
         aria-hidden={!menuOpen}
       >
         <div className="flex flex-col gap-2">
           {navItems.map((item) => (
             <Link
               key={item.href}
               href={item.href}
               onClick={() => setMenuOpen(false)}
               className={cn(
                  "flex items-center rounded-[16px] px-5 py-4 text-[16px] font-bold transition-all duration-300",
                  item.ai
                    ? "text-[#7c3aed] hover:text-[#6d28d9] hover:scale-105 active:scale-95"
                    : "text-[#3d4f45] hover:bg-[#f2f7f4] hover:text-[#0a0f0d]",
                  isActive(pathname, item.href) && !item.ai && "bg-[#f0fdf4] text-[#16a34a] font-extrabold"
                )}
             >
               {item.label}
             </Link>
           ))}

           {!authReady ? (
             <div className="h-24 animate-pulse rounded-[16px] bg-[#f2f7f4]" />
           ) : !user ? (
             <div className="mt-4 grid grid-cols-2 gap-3">
               <Link
                 href="/login"
                 onClick={() => setMenuOpen(false)}
                 className="flex h-14 items-center justify-center rounded-[16px] border border-[#e4ebe7] text-[15px] font-bold text-[#3d4f45] transition-all duration-200 hover:bg-[#f2f7f4]"
               >
                 Zaloguj się
               </Link>
               <Link
                 href="/register"
                 onClick={() => setMenuOpen(false)}
                 className="flex h-14 items-center justify-center rounded-[16px] bg-gradient-to-r from-[#16a34a] to-[#15803d] text-[15px] font-bold text-white transition-all duration-200 hover:shadow-md"
               >
                 Rejestracja
               </Link>
             </div>
           ) : (
             <div className="mt-4 flex flex-col gap-2 rounded-[20px] bg-[#f8faf9] p-3">
               <div className="px-4 py-2.5 text-[12px] font-[900] uppercase tracking-wider text-[#3d4f45]/50">
                 Twoje konto
               </div>
               <Link
                 href="/account"
                 onClick={() => setMenuOpen(false)}
                 className="flex items-center gap-3.5 rounded-[14px] px-4 py-3.5 text-[15px] font-bold text-[#3d4f45] transition-all duration-200 hover:bg-white"
               >
                 ⚙️ Moje konto
               </Link>
               <Link
                 href="/bookings"
                 onClick={() => setMenuOpen(false)}
                 className="flex items-center gap-3.5 rounded-[14px] px-4 py-3.5 text-[15px] font-bold text-[#3d4f45] transition-all duration-200 hover:bg-white"
               >
                 📅 Moje rezerwacje
               </Link>
                {!user.is_host ? (
                  <Link
                    href="/messages"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-3.5 rounded-[14px] px-4 py-3.5 text-[15px] font-bold text-[#3d4f45] transition-all duration-200 hover:bg-white"
                  >
                    💬 Wiadomości{unreadTotal > 0 ? ` (${unreadTotal})` : ""}
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
                 className="mt-2 flex items-center gap-3.5 rounded-[14px] border border-[#e4ebe7] bg-white px-4 py-3.5 text-[15px] font-bold text-[#dc2626] transition-all duration-200 hover:bg-[#fef2f2]"
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

