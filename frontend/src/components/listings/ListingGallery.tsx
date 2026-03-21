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
    <div className="relative mb-8 overflow-hidden rounded-[22px] shadow-lg ring-1 ring-black/[0.06]">
      <div className="grid grid-cols-1 gap-1.5 md:grid-cols-[2fr_1fr_1fr] md:grid-rows-[220px_220px]">
        <div className="relative row-span-1 min-h-[240px] md:row-span-2 md:min-h-0">
          {main && url(main) ? (
            <Image
              src={url(main)!}
              alt={main.alt_text || ""}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 66vw"
              priority
            />
          ) : (
            <div className="flex h-full min-h-[240px] items-center justify-center bg-gradient-to-br from-brand to-brand-dark text-8xl md:min-h-0">
              {typeIcon}
            </div>
          )}
        </div>
        {side.map((im) => (
          <div key={im.id} className="relative hidden min-h-0 md:block">
            {url(im) ? (
              <Image
                src={url(im)!}
                alt={im.alt_text || ""}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 0vw, 17vw"
              />
            ) : (
              <div className="flex h-full items-center justify-center bg-brand-muted text-4xl">
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
          className="absolute bottom-3.5 right-3.5 rounded-lg border border-gray-200 bg-white/95 px-3.5 py-1.5 text-xs font-bold text-gray-800 shadow-sm transition-colors hover:border-brand hover:text-brand"
        >
          Pokaż wszystkie ({ordered.length})
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
