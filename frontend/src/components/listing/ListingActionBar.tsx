"use client";

import * as Dialog from "@radix-ui/react-dialog";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { motion } from "framer-motion";

import { api } from "@/lib/api/client";
import { useAuthJsonGet } from "@/lib/hooks/useJsonGet";
import { useAuthStore } from "@/lib/store/authStore";
import { cn } from "@/lib/utils";

function wishlistListingIds(payload: unknown): string[] {
  const d = (payload as { data?: unknown })?.data;
  if (!Array.isArray(d)) return [];
  return d
    .map((x) => {
      if (typeof x === "string") return x;
      if (x && typeof x === "object") {
        const o = x as Record<string, unknown>;
        if (typeof o.listing_id === "string") return o.listing_id;
        if (o.listing && typeof o.listing === "object") {
          const id = (o.listing as { id?: string }).id;
          if (id) return String(id);
        }
        if (typeof o.id === "string") return o.id;
      }
      return "";
    })
    .filter(Boolean);
}

type Props = {
  listingId: string;
  listingTitle: string;
  slug: string;
};

export function ListingActionBar({ listingId, listingTitle, slug }: Props) {
  const user = useAuthStore((s) => s.user);
  const [authOpen, setAuthOpen] = useState(false);
  const [optimisticLiked, setOptimisticLiked] = useState<boolean | null>(null);

  const { data, mutate: refetchWishlist } = useAuthJsonGet<unknown>(
    user ? "/api/v1/wishlist/" : null,
    { enabled: Boolean(user) }
  );

  const ids = useMemo(() => wishlistListingIds(data), [data]);
  const serverLiked = ids.includes(listingId);
  const liked = optimisticLiked ?? serverLiked;

  useEffect(() => {
    setOptimisticLiked(null);
  }, [serverLiked, listingId]);

  const share = useCallback(async () => {
    const url =
      typeof window !== "undefined"
        ? `${window.location.origin}/listing/${slug}`
        : `/listing/${slug}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: listingTitle, url });
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        toast.success("Link skopiowany!");
      } else {
        toast.error("Nie można skopiować linku.");
      }
    } catch (e) {
      if ((e as Error).name !== "AbortError") {
        try {
          await navigator.clipboard.writeText(url);
          toast.success("Link skopiowany!");
        } catch {
          /* ignore */
        }
      }
    }
  }, [listingTitle, slug]);

  async function toggleWishlist() {
    if (!user) {
      setAuthOpen(true);
      return;
    }
    const next = !liked;
    setOptimisticLiked(next);
    try {
      if (next) {
        await api.post("/api/v1/wishlist/", { listing_id: listingId });
        toast.success("Zapisano w ulubionych");
      } else {
        await api.delete(`/api/v1/wishlist/${listingId}/`);
        toast.success("Usunięto z ulubionych");
      }
      await refetchWishlist();
      setOptimisticLiked(null);
    } catch (err) {
      console.error("[Wishlist] Toggle failed:", err);
      setOptimisticLiked(null);
      toast.error("Nie udało się zaktualizować listy życzeń.");
    }
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="group relative flex flex-col gap-6 overflow-hidden rounded-[2.5rem] border border-brand/20 bg-gradient-to-br from-brand-950 via-brand-900 to-brand-800 p-6 shadow-2xl backdrop-blur-2xl ring-1 ring-white/5 transition-all hover:shadow-brand/20 hover:border-brand/40 sm:flex-row sm:items-center sm:justify-between sm:px-10 sm:py-7"
      >
        {/* Decorative elements */}
        <div className="absolute -right-20 -top-20 h-40 w-40 rounded-full bg-brand-light/10 blur-3xl transition-all group-hover:scale-150 group-hover:bg-brand-light/20" />
        <div className="absolute -bottom-10 -left-10 h-32 w-32 rounded-full bg-blue-400/10 blur-3xl transition-all group-hover:scale-125 group-hover:bg-blue-400/20" />

        <div className="relative min-w-0">
          <p className="text-[22px] font-black leading-tight tracking-tight text-white sm:text-2xl drop-shadow-sm">
            {listingTitle}
          </p>
          <p className="mt-1 text-[11px] font-bold uppercase tracking-[0.3em] text-brand-light/70">
            Szczegóły oferty
          </p>
        </div>

        <div className="relative flex shrink-0 items-center gap-3">
          <motion.button
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.95 }}
            type="button"
            onClick={() => void share()}
            className="group/btn flex items-center gap-2.5 rounded-2xl border border-white/10 bg-white/10 px-6 py-3.5 text-sm font-bold text-white shadow-sm transition-all hover:border-brand/30 hover:bg-brand hover:text-white hover:shadow-lg hover:shadow-brand/20 backdrop-blur-sm"
          >
            <svg
              className="h-4.5 w-4.5 transition-transform duration-300 group-hover/btn:-translate-y-1 group-hover/btn:translate-x-0.5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
              <polyline points="16 6 12 2 8 6" />
              <line x1="12" y1="2" x2="12" y2="15" />
            </svg>
            Udostępnij
          </motion.button>

          <motion.button
            layout
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.95 }}
            type="button"
            onClick={() => void toggleWishlist()}
            className={cn(
              "group/btn relative flex items-center gap-2.5 overflow-hidden rounded-2xl border-[1.5px] px-6 py-3.5 text-sm font-bold transition-all duration-500 backdrop-blur-sm whitespace-nowrap",
              liked
                ? "border-rose-500/50 bg-gradient-to-r from-rose-500 to-rose-600 text-white shadow-xl shadow-rose-950/40 ring-1 ring-white/20"
                : "border-white/10 bg-white/10 text-white hover:border-rose-400/30 hover:bg-rose-500 hover:text-white hover:shadow-lg hover:shadow-rose-900/40"
            )}
          >
            <svg
              className={cn(
                "h-4.5 w-4.5 transition-all duration-500",
                liked ? "scale-110 fill-current text-white" : "group-hover/btn:scale-125"
              )}
              viewBox="0 0 24 24"
              fill={liked ? "currentColor" : "none"}
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
            </svg>
            <motion.span layout className="relative">
              {liked ? "W ulubionych" : "Zapisz"}
            </motion.span>
          </motion.button>
        </div>
      </motion.div>

      <Dialog.Root open={authOpen} onOpenChange={setAuthOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-[200] bg-black/40" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-[201] w-[min(92vw,380px)] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-[#e5e7eb] bg-white p-6 shadow-xl">
            <Dialog.Title className="text-lg font-extrabold text-brand-dark">
              Zaloguj się
            </Dialog.Title>
            <Dialog.Description className="mt-2 text-sm text-[#6b7280]">
              Zaloguj się, aby dodać tę ofertę do ulubionych.
            </Dialog.Description>
            <div className="mt-5 flex justify-end gap-2">
              <Dialog.Close asChild>
                <button
                  type="button"
                  className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50"
                >
                  Zamknij
                </button>
              </Dialog.Close>
              <Dialog.Close asChild>
                <Link
                  href={`/login?next=${encodeURIComponent(`/listing/${slug}`)}`}
                  className="rounded-lg bg-brand px-4 py-2 text-sm font-bold text-white hover:bg-green-600"
                >
                  Przejdź do logowania
                </Link>
              </Dialog.Close>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}
