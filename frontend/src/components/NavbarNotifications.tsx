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
        className="relative inline-flex p-2 text-lg text-brand-dark"
        aria-label="Powiadomienia"
        onClick={() => setOpen((o) => !o)}
      >
        🔔
        {unreadTotal > 0 ? (
          <span className="absolute -right-0.5 -top-0 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-brand px-0.5 text-[9px] font-bold text-white">
            {unreadTotal > 99 ? "99+" : unreadTotal}
          </span>
        ) : null}
      </button>
      {open ? (
        <div className="absolute right-0 top-full z-50 mt-2 w-[min(100vw-2rem,320px)] rounded-xl border border-[#e5e7eb] bg-white py-2 shadow-elevated">
          <div className="max-h-64 overflow-y-auto px-2">
            {notifications.length === 0 ? (
              <p className="px-3 py-4 text-center text-xs text-text-muted">Brak powiadomień</p>
            ) : (
              notifications.map((n, i) => (
                <Link
                  key={i}
                  href={n.link || "#"}
                  className="block rounded-lg px-3 py-2 text-xs hover:bg-gray-50"
                  onClick={() => setOpen(false)}
                >
                  <span className="font-semibold text-brand-dark">{n.title}</span>
                  {n.body ? <p className="text-text-muted">{n.body}</p> : null}
                </Link>
              ))
            )}
          </div>
          <div className="flex border-t border-[#e5e7eb]">
            <button
              type="button"
              className="flex-1 px-3 py-2 text-center text-[11px] font-semibold text-text-secondary hover:bg-gray-50"
              onClick={() => {
                markAllRead();
                setOpen(false);
              }}
            >
              Oznacz jako przeczytane
            </button>
            <button
              type="button"
              className="flex-1 border-l border-[#e5e7eb] px-3 py-2 text-center text-[11px] font-semibold text-brand"
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
