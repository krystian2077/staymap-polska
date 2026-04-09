import Link from "next/link";
import type { SearchListing } from "@/lib/searchTypes";
import { ListingCard } from "@/components/home/ListingCard";

export function FeaturedListings({ listings }: { listings: SearchListing[] }) {
  return (
    <section className="mx-auto w-full max-w-[1240px] px-6 pb-20 md:px-12">
      <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-[30px] font-black tracking-[-.8px] text-[#0a2e1a]">Polecane noclegi</h2>
          <p className="mt-2 text-[14px] text-[#7a8f84]">Wybrane oferty z najlepszą dostępnością i ocenami</p>
        </div>
        <Link href="/search" className="group inline-flex items-center gap-1 text-[13px] font-bold text-[#16a34a] transition-all duration-200 hover:gap-2.5">
          Zobacz wszystkie <span className="transition-transform group-hover:translate-x-0.5">→</span>
        </Link>
      </div>

      {listings.length ? (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(296px,1fr))] gap-[22px]">
          {listings.map((listing, index) => (
            <ListingCard key={listing.id} listing={listing} index={index} />
          ))}
        </div>
      ) : (
        <p className="rounded-[14px] border border-[#e4ebe7] bg-[#f8faf9] px-4 py-3 text-sm text-[#7a8f84]">
          Brak publicznych ofert do wyświetlenia.
        </p>
      )}
    </section>
  );
}
