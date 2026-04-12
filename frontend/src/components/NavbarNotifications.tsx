"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { useNotifications } from "@/hooks/useNotifications";
import { useMessagingStore } from "@/lib/store/messagingStore";

export function NavbarNotifications() {
  const [token, setToken] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const unreadTotal = useMessagingStore((s) => s.unreadTotal);
  const markAllRead = useMessagingStore((s) => s.markAllRead);
  const { notifications } = useNotifications(token);

  useEffect(() => {
    setToken(typeof window !== "undefined" ? localStorage.getItem("access") : null);
  }, []);

   return (
     <div className="relative">
       <button
         type="button"
         className="relative inline-flex p-2.5 text-2xl text-brand-dark transition-all duration-300 hover:scale-110 active:scale-95"
         aria-label="Powiadomienia"
         onClick={() => setOpen((o) => !o)}
       >
         🔔
         {unreadTotal > 0 ? (
           <span className="absolute -right-1 -top-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-brand px-1 text-[10px] font-bold text-white shadow-md animate-pulse">
             {unreadTotal > 99 ? "99+" : unreadTotal}
           </span>
         ) : null}
       </button>
       {open ? (
         <div className="absolute right-0 top-full z-50 mt-3 w-[min(100vw-2rem,380px)] rounded-xl border border-gray-200/60 bg-white shadow-lg overflow-hidden">
           <div className="border-b border-gray-200/50 px-4 py-3">
             <h3 className="text-sm font-bold text-text">Powiadomienia</h3>
           </div>
           <div className="max-h-80 overflow-y-auto">
             {notifications.length === 0 ? (
               <p className="px-4 py-8 text-center text-sm text-text-muted">Brak powiadomień</p>
             ) : (
               notifications.map((n, i) => (
                 <Link
                   key={i}
                   href={n.link || "#"}
                   className="block border-b border-gray-100/60 px-4 py-3 text-sm transition-all duration-200 hover:bg-brand-surface/50 last:border-b-0"
                   onClick={() => setOpen(false)}
                 >
                   <span className="font-semibold text-brand-dark block">{n.title}</span>
                   {n.body ? <p className="mt-1 text-text-muted text-xs">{n.body}</p> : null}
                 </Link>
               ))
             )}
           </div>
           <div className="flex gap-2 border-t border-gray-200/50 p-3">
             <button
               type="button"
               className="flex-1 rounded-lg px-3 py-2.5 text-xs font-semibold text-text-secondary transition-all duration-200 hover:bg-brand-surface/80 active:scale-95"
               onClick={() => {
                 markAllRead();
                 setOpen(false);
               }}
             >
               Przeczytane
             </button>
             <button
               type="button"
               className="flex-1 rounded-lg bg-brand px-3 py-2.5 text-xs font-bold text-white transition-all duration-200 hover:bg-brand-700 active:scale-95"
               onClick={() => setOpen(false)}
             >
               Zamknij
             </button>
           </div>
         </div>
       ) : null}
     </div>
   );
}
