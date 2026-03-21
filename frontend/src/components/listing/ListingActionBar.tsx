"use client";

import * as Dialog from "@radix-ui/react-dialog";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";

import { api } from "@/lib/api/client";
import { useAuthJsonGet } from "@/lib/hooks/useJsonGet";
import { useAuthStore } from "@/lib/store/authStore";

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
    } catch {
      setOptimisticLiked(null);
      toast.error("Nie udało się zaktualizować listy życzeń.");
    }
  }

  return (
    <>
      <div
        className="mb-6 flex items-center justify-between rounded-xl border border-[#e5e7eb] bg-white px-4 py-3.5 shadow-[0_2px_8px_rgba(0,0,0,.05)]"
        style={{ position: "relative" }}
      >
        <p className="max-w-[60%] truncate text-[13px] font-semibold text-[#111827]">
          {listingTitle}
        </p>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => void share()}
            className="flex items-center gap-1.5 rounded-lg border border-[#e5e7eb] bg-white px-3 py-1.5 text-xs font-semibold text-[#6b7280] transition-all duration-150 hover:border-brand hover:bg-[#f0fdf4] hover:text-brand"
          >
            <svg className="h-3 w-3" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d="M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z" />
            </svg>
            Udostępnij
          </button>
          <button
            type="button"
            onClick={() => void toggleWishlist()}
            className={`flex items-center gap-1.5 rounded-lg border-[1.5px] bg-white px-3.5 py-1.5 text-xs font-bold transition-all duration-200 ${
              liked
                ? "border-rose-600 bg-rose-50 text-rose-600"
                : "border-[#e5e7eb] text-[#111827] hover:border-brand hover:text-brand"
            }`}
          >
            <span aria-hidden>{liked ? "♥" : "♡"}</span>
            {liked ? "Zapisane" : "Zapisz"}
          </button>
        </div>
      </div>

      <Dialog.Root open={authOpen} onOpenChange={setAuthOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-[200] bg-black/40" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-[201] w-[min(92vw,380px)] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-[#e5e7eb] bg-white p-6 shadow-xl">
            <Dialog.Title className="text-lg font-extrabold text-brand-dark">
              Zaloguj się
            </Dialog.Title>
            <Dialog.Description className="mt-2 text-sm text-[#6b7280]">
              Zaloguj się, żeby zapisać tę ofertę w ulubionych.
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
