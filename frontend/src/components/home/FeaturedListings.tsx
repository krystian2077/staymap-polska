"use client";

import Link from "next/link";
import { useMemo, useRef, useState, type TouchEvent } from "react";
import type { SearchListing } from "@/lib/searchTypes";
import { ListingCard } from "@/components/home/ListingCard";

export function FeaturedListings({ listings }: { listings: SearchListing[] }) {
  const PAGE_SIZE = 9;
  const curated = useMemo(() => listings.slice(0, 18), [listings]);
  const pageCount = Math.max(1, Math.ceil(curated.length / PAGE_SIZE));
  const [page, setPage] = useState(0);
  const touchStartX = useRef<number | null>(null);

  const visible = useMemo(
    () => curated.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE),
    [curated, page]
  );

  const goToPage = (nextPage: number) => {
    if (nextPage < 0 || nextPage >= pageCount) return;
    setPage(nextPage);
  };

  const onTouchStart = (event: TouchEvent<HTMLDivElement>) => {
    touchStartX.current = event.touches[0]?.clientX ?? null;
  };

  const onTouchEnd = (event: TouchEvent<HTMLDivElement>) => {
    if (touchStartX.current == null) return;
    const endX = event.changedTouches[0]?.clientX ?? touchStartX.current;
    const delta = endX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(delta) < 60) return;
    if (delta < 0) goToPage(page + 1);
    if (delta > 0) goToPage(page - 1);
  };

  return (
    <section className="mx-auto w-full max-w-[1320px] px-6 pb-20 md:px-12">
      <div className="rounded-[28px] border border-[#e8efe9] bg-white p-6 shadow-[0_18px_44px_-30px_rgba(10,15,13,0.28)] md:p-8">
        <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
          <div>
            <span className="inline-flex rounded-full border border-[#d4e9da] bg-[#f6fbf7] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.08em] text-[#1f6f43]">
              Kolekcja premium
            </span>
            <h2 className="mt-3 text-[30px] font-black tracking-[-.8px] text-[#0a2e1a]">Polecane noclegi</h2>
            <p className="mt-2 text-[14px] text-[#5f7369]">
              18 najlepszych ofert wybranych pod kątem jakości, ocen i dostępności.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {pageCount > 1 ? (
              <>
                <button
                  type="button"
                  onClick={() => goToPage(page - 1)}
                  disabled={page === 0}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#d9e8de] text-[#294337] transition-all enabled:hover:-translate-y-0.5 enabled:hover:border-[#b9d8c6] enabled:hover:shadow-sm disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label="Poprzednia strona polecanych ofert"
                >
                  ←
                </button>

                {Array.from({ length: pageCount }).map((_, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => goToPage(idx)}
                    aria-current={page === idx ? "page" : undefined}
                    className={
                      page === idx
                        ? "inline-flex h-10 min-w-[40px] items-center justify-center rounded-full bg-[#0f3b25] px-3 text-sm font-bold text-white shadow-[0_10px_20px_-12px_rgba(15,59,37,0.8)]"
                        : "inline-flex h-10 min-w-[40px] items-center justify-center rounded-full border border-[#d9e8de] px-3 text-sm font-bold text-[#345647] transition-all hover:border-[#b9d8c6]"
                    }
                  >
                    {idx + 1}
                  </button>
                ))}

                <button
                  type="button"
                  onClick={() => goToPage(page + 1)}
                  disabled={page >= pageCount - 1}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#d9e8de] text-[#294337] transition-all enabled:hover:-translate-y-0.5 enabled:hover:border-[#b9d8c6] enabled:hover:shadow-sm disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label="Następna strona polecanych ofert"
                >
                  →
                </button>
              </>
            ) : null}

            <Link
              href="/search?ordering=recommended"
              className="group ml-2 inline-flex items-center gap-1 text-[13px] font-bold text-[#16a34a] transition-all duration-200 hover:gap-2.5"
            >
              Zobacz wszystkie <span className="transition-transform group-hover:translate-x-0.5">→</span>
            </Link>
          </div>
        </div>

        {curated.length ? (
          <div onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
            <div className="mb-5 flex items-center justify-between">
              <p className="text-sm font-semibold text-[#5f7369]">
                Strona {page + 1} z {pageCount}
              </p>
              {pageCount > 1 ? (
                <p className="text-xs text-[#7f9087]">Przesuń w lewo/prawo na mobile, aby zmienić stronę</p>
              ) : null}
            </div>

            <div className="grid grid-cols-[repeat(auto-fill,minmax(296px,1fr))] gap-[22px]">
              {visible.map((listing, index) => (
                <ListingCard key={listing.id} listing={listing} index={index} />
              ))}
            </div>
          </div>
        ) : (
          <p className="rounded-[14px] border border-[#e4ebe7] bg-[#f8faf9] px-4 py-3 text-sm text-[#7a8f84]">
            Brak publicznych ofert do wyświetlenia.
          </p>
        )}
      </div>
    </section>
  );
}
