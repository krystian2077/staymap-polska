"use client";

import Link from "next/link";
import { ListingCard } from "@/components/listings/ListingCard";
import { LastMinuteBanner } from "@/components/discovery/LastMinuteCard";
import { LastMinute3DSlider } from "@/components/discovery/LastMinute3DSlider";
import { similarListingToSearch } from "@/lib/listingAdapters";
import { MODE_EMOJI, TRAVEL_MODE_LABELS } from "@/lib/travelModes";
import type { Collection, DiscoveryHomepage, LastMinuteListing } from "@/types/ai";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";

async function loadDiscovery(): Promise<DiscoveryHomepage> {
  const empty: DiscoveryHomepage = { featured_collections: [], last_minute: [] };
  try {
    const res = await fetch(`/api/v1/discovery/homepage/`, {
      cache: "no-store",
    });
    if (!res.ok) return empty;
    const json = await res.json();
    const raw = json?.data ?? json;
    const collections: Collection[] =
      raw?.featured_collections ?? raw?.collections ?? [];
    const last_minute: LastMinuteListing[] = raw?.last_minute ?? [];
    return { featured_collections: collections, last_minute };
  } catch {
    return empty;
  }
}

export default function DiscoveryPage() {
  const [data, setData] = useState<DiscoveryHomepage | null>(null);

  useEffect(() => {
    loadDiscovery().then(setData);
  }, []);

  if (!data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white dark:bg-[var(--background)]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fafbfc] pb-[calc(6rem+env(safe-area-inset-bottom,0px))] dark:bg-[var(--background)]">
      <section className="relative overflow-hidden bg-white px-4 py-14 dark:bg-[var(--bg2)] sm:px-7 sm:py-20 lg:py-28">
        {/* Dekoracyjne elementy tła */}
        <div className="absolute -left-20 -top-20 h-96 w-96 rounded-full bg-brand-surface opacity-30 blur-3xl" />
        <div className="absolute -right-20 top-0 h-[500px] w-[500px] rounded-full bg-blue-50 opacity-40 blur-3xl" />
        
        <div className="relative mx-auto max-w-4xl text-center">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mb-6 inline-flex items-center gap-2 rounded-full border border-brand-border bg-white px-4 py-1.5 text-[13px] font-bold text-brand-dark shadow-sm dark:border-white/20 dark:bg-[var(--bg3)] dark:text-white"
          >
            <span className="flex h-2 w-2 rounded-full bg-brand animate-pulse" />
            🗺️ Odkrywaj Polskę na nowo
          </motion.div>
          
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-[clamp(32px,6vw,64px)] font-black leading-[1.1] tracking-tight text-brand-dark dark:text-white"
          >
            Miejsca z duszą,<br />
            <span className="bg-gradient-to-r from-brand to-emerald-600 bg-clip-text text-transparent">wybrane dla Ciebie.</span>
          </motion.h1>

          <div className="mt-12 flex justify-center gap-8 md:gap-16">
            {[
              { label: "Wyjątkowe", icon: "✨" },
              { label: "Sprawdzone", icon: "✅" },
              { label: "Premium", icon: "💎" }
            ].map((item, i) => (
              <motion.div
                key={item.label}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 + i * 0.1 }}
                className="flex flex-col items-center gap-2"
              >
                <span className="text-2xl">{item.icon}</span>
                <span className="text-[10px] font-black uppercase tracking-widest text-text-muted dark:text-white/65">{item.label}</span>
              </motion.div>
            ))}
          </div>
          
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mx-auto mt-8 max-w-[640px] text-lg leading-relaxed text-text-secondary dark:text-white/75"
          >
            Nasz zespół kuratorów podróży przeczesuje Polskę, by dostarczyć Ci zestawienia najpiękniejszych domów, pensjonatów i ukrytych perełek.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mt-10 flex flex-wrap justify-center gap-4"
          >
            <Link 
              href="/search"
              className="rounded-full bg-brand px-8 py-3.5 text-base font-bold text-white shadow-lg shadow-brand/20 transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-brand/30"
            >
              Przeglądaj wszystko
            </Link>
            <Link 
              href="/ai"
              className="rounded-full bg-brand-dark px-8 py-3.5 text-base font-bold text-white shadow-lg transition-all hover:-translate-y-0.5 hover:bg-black"
            >
              Asystent AI ✨
            </Link>
          </motion.div>
        </div>
      </section>

      <div className="mx-auto max-w-[1240px] px-4 sm:px-6">
        <div className="mt-12">
          <LastMinuteBanner />
        </div>

        <LastMinute3DSlider listings={data.last_minute} />

        <div className="space-y-24">
          {data.featured_collections
            .filter((collection) => collection.title !== "Nad jeziorem i wodą")
            .map((collection) => (
            <section key={collection.id} className="relative">
              <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div className="max-w-2xl">
                  <div className="flex items-center gap-3 mb-3">
                    {collection.mode ? (
                       <span className="inline-flex items-center rounded-lg bg-brand-surface px-2.5 py-1 text-[12px] font-bold text-brand-dark ring-1 ring-brand-border dark:border-white/20 dark:bg-[var(--bg3)] dark:text-white">
                        {MODE_EMOJI[collection.mode] ?? "✨"}{" "}
                        {TRAVEL_MODE_LABELS[collection.mode] ?? collection.mode}
                      </span>
                    ) : null}
                    <span className="h-px min-w-[40px] flex-1 bg-gray-100 dark:bg-white/20 md:hidden" />
                  </div>
                  <h2 className="mb-4 text-3xl font-black tracking-tight text-brand-dark dark:text-white">
                    {collection.title}
                  </h2>
                  <p className="max-w-xl text-base leading-relaxed text-text-muted dark:text-white/70">
                    {collection.description}
                  </p>
                </div>
                
                <Link
                  href={
                    collection.mode
                      ? `/search?travel_mode=${encodeURIComponent(collection.mode)}`
                      : `/search?collection=${encodeURIComponent(collection.id)}`
                  }
                  className="group flex items-center gap-2 text-sm font-bold text-brand transition-colors hover:text-brand-dark dark:hover:text-white"
                >
                  Zobacz całą kolekcję
                  <span className="transition-transform group-hover:translate-x-1">→</span>
                </Link>
              </div>

              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {collection.listings.map((listing, cardIndex) => (
                  <motion.div
                    key={listing.id}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-50px" }}
                    transition={{ duration: 0.5, delay: cardIndex * 0.05 }}
                  >
                    <ListingCard
                      listing={similarListingToSearch(listing)}
                      variant="grid"
                      availabilityBadge="✨ Premium"
                    />
                  </motion.div>
                ))}
              </div>
            </section>
          ))}
        </div>

        {/* Ciekawa propozycja: Sekcja "Inspiracje" */}
        <section className="mt-24 rounded-[1.5rem] bg-brand-dark px-4 py-12 text-center text-white sm:mt-32 sm:rounded-[2rem] sm:px-8 sm:py-16 lg:px-16">
          <div className="mx-auto max-w-3xl">
            <h2 className="mb-6 text-3xl font-black lg:text-4xl">Nie wiesz dokąd pojechać?</h2>
            <p className="mb-10 text-lg text-white/70">
              Opisz naszemu asystentowi swoje wymarzone wakacje, a on znajdzie dla Ciebie idealne miejsce w kilka sekund.
            </p>
            <Link 
              href="/ai"
              className="inline-flex items-center gap-2 rounded-full bg-brand px-10 py-4 text-lg font-bold transition-transform hover:scale-105"
            >
              Zapytaj AI ✨
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
