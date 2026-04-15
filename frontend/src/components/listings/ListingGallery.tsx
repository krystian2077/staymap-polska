"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";

import { publicMediaUrl } from "@/lib/mediaUrl";
import type { ListingImage as ListingImageT } from "@/types/listing";

export function ListingGallery({
  images,
  typeIcon,
}: {
  images: ListingImageT[];
  typeIcon: string;
}) {
  const [modal, setModal] = useState(false);

  useEffect(() => {
    if (!modal) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setModal(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [modal]);

  const ordered = useMemo(
    () =>
      [...images].sort(
        (a, b) =>
          Number(b.is_cover) - Number(a.is_cover) || a.sort_order - b.sort_order
      ),
    [images]
  );
  const main = ordered[0];
  const side = ordered.slice(1, 5);
  const url = (im: ListingImageT) => publicMediaUrl(im.display_url || im.url);

  return (
    <div className="relative mb-0 overflow-hidden rounded-[22px] shadow-lg ring-1 ring-black/[0.06] group/gallery">
      {/* Mobile: poziomy scroll + snap (gest jak w aplikacjach rezerwacji) */}
      <div className="scrollbar-hide flex snap-x snap-mandatory gap-0 overflow-x-auto overscroll-x-contain md:hidden">
        {ordered.length === 0 ? (
          <div className="relative flex min-h-[min(72vw,320px)] w-full shrink-0 snap-center items-center justify-center bg-gradient-to-br from-brand to-brand-dark text-8xl">
            {typeIcon}
          </div>
        ) : (
          ordered.map((im) => (
            <div
              key={im.id}
              className="relative aspect-[4/3] min-h-[min(72vw,320px)] w-full shrink-0 snap-center"
            >
              {url(im) ? (
                <Image
                  src={url(im)!}
                  alt={im.alt_text || ""}
                  fill
                  className="object-cover"
                  sizes="100vw"
                  priority={im === main}
                  unoptimized
                />
              ) : (
                <div className="flex h-full items-center justify-center bg-brand-muted text-6xl">{typeIcon}</div>
              )}
            </div>
          ))
        )}
      </div>

      <div className="hidden grid-cols-1 gap-2 md:grid md:grid-cols-[2fr_1fr_1fr] md:grid-rows-[240px_240px]">
        <div className="relative row-span-1 min-h-[260px] overflow-hidden md:row-span-2 md:min-h-0">
          {main && url(main) ? (
            <Image
              src={url(main)!}
              alt={main.alt_text || ""}
              fill
              className="object-cover transition-transform duration-700 hover:scale-110"
              sizes="(max-width: 768px) 100vw, 66vw"
              priority
              unoptimized
            />
          ) : (
            <div className="flex h-full min-h-[260px] items-center justify-center bg-gradient-to-br from-brand to-brand-dark text-8xl md:min-h-0">
              {typeIcon}
            </div>
          )}
        </div>
        {side.map((im) => (
          <div key={im.id} className="relative hidden min-h-0 overflow-hidden md:block">
            {url(im) ? (
              <Image
                src={url(im)!}
                alt={im.alt_text || ""}
                fill
                className="object-cover transition-transform duration-700 hover:scale-110"
                sizes="(max-width: 768px) 0vw, 17vw"
                unoptimized
              />
            ) : (
              <div className="flex h-full items-center justify-center bg-brand-muted text-4xl transition-transform hover:scale-110">
                {typeIcon}
              </div>
            )}
          </div>
        ))}
      </div>
      {ordered.length > 0 && (
        <button
          type="button"
          onClick={() => setModal(true)}
          className="absolute bottom-4 right-4 flex min-h-[var(--tap-min)] items-center gap-2 rounded-xl border border-gray-200 bg-white/95 px-4 py-2 text-sm font-black text-brand-dark shadow-xl transition-all hover:border-brand hover:bg-brand hover:text-white"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
          </svg>
          Pokaż wszystkie zdjęcia ({ordered.length})
        </button>
      )}

      {modal && (
        <button
          type="button"
          className="fixed inset-0 z-50 cursor-default overflow-y-auto border-0 bg-black/80 p-6 text-left"
          onClick={() => setModal(false)}
          aria-label="Zamknij galerię"
        >
          <span
            className="absolute right-4 top-4 flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-white text-lg font-bold text-gray-800 shadow"
            onClick={(e) => {
              e.stopPropagation();
              setModal(false);
            }}
          >
            ×
          </span>
          <div
            className="mx-auto mt-10 grid max-w-5xl grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3"
            onClick={(e) => e.stopPropagation()}
          >
            {ordered.map((im) =>
              url(im) ? (
                <div key={im.id} className="relative aspect-[4/3] overflow-hidden rounded-xl">
                  <Image
                    src={url(im)!}
                    alt={im.alt_text || ""}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, 33vw"
                    loading="lazy"
                    unoptimized
                  />
                </div>
              ) : null
            )}
          </div>
        </button>
      )}
    </div>
  );
}
