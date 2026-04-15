"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { publicMediaUrl } from "@/lib/mediaUrl";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { cn } from "@/lib/utils";

import { motion, AnimatePresence } from "framer-motion";
import { toast } from "react-hot-toast";

type ListingRow = {
  id: string;
  title: string;
  slug: string;
  status: string;
  base_price: string;
  currency: string;
  max_guests: number;
  booking_mode: string;
  average_rating: number | null;
  review_count: number;
  cover_image: string | null;
  created_at: string;
  location?: { city?: string; region?: string } | null;
};

const STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  draft: { label: "Szkic", cls: "bg-gray-100 text-gray-700" },
  pending: { label: "Aktywna", cls: "bg-emerald-100 text-emerald-800" },
  approved: { label: "Aktywna", cls: "bg-emerald-100 text-emerald-800" },
  rejected: { label: "Odrzucona", cls: "bg-red-100 text-red-800" },
  archived: { label: "Zarchiwizowana", cls: "bg-gray-100 text-gray-500" },
};

type StatusFilter = "all" | "draft" | "approved" | "rejected" | "archived";

export default function HostListingsPage() {
  const [listings, setListings] = useState<ListingRow[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  const fetchListings = async () => {
    try {
      const res = await api.get<{ data: ListingRow[] }>("/api/v1/host/listings/");
      const normalized = (res.data ?? []).map((row) => ({
        ...row,
        // Historyczne rekordy pending traktujemy jako opublikowane.
        status: row.status === "pending" ? "approved" : row.status,
      }));
      setListings(normalized);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Błąd ładowania ofert.");
    }
  };

  useEffect(() => {
    fetchListings();
  }, []);

  const handleDelete = async (id: string) => {
    if (!window.confirm("Czy na pewno chcesz usunąć tę ofertę? Ta operacja jest nieodwracalna.")) return;
    
    setIsDeleting(id);
    try {
      await api.delete(`/api/v1/host/listings/${id}/`);
      toast.success("Oferta została usunięta");
      await fetchListings();
    } catch (e: unknown) {
      console.error("Delete error:", e);
      // APIClient rzuca Error, gdzie message to treść błędu z API (jeśli dostępna)
      const msg = e instanceof Error ? e.message : "Nie udało się usunąć oferty";
      toast.error(msg);
    } finally {
      setIsDeleting(null);
    }
  };

  const filtered = listings?.filter((l) => filter === "all" || l.status === filter) ?? null;
  const counts = listings ? {
    all: listings.length,
    approved: listings.filter((l) => l.status === "approved").length,
    draft: listings.filter((l) => l.status === "draft").length,
  } : null;

  return (
    <div className="p-6 lg:p-10 max-w-7xl mx-auto">
      <div className="mb-10 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <p className="text-[12px] font-extrabold uppercase tracking-[.2em] text-brand mb-1">Moje portfolio</p>
          <h1 className="text-4xl font-extrabold text-brand-dark tracking-tight dark:text-white">Twoje oferty</h1>
          <p className="mt-2 max-w-lg text-text-secondary dark:text-white/70">
            Zarządzaj swoimi nieruchomościami, aktualizuj ceny i dostępność, aby przyciągnąć więcej gości.
          </p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <Link href="/host/new-listing" className="group relative flex items-center gap-2 overflow-hidden rounded-2xl bg-brand-dark px-8 py-4 font-bold text-white shadow-xl transition-all duration-300 hover:-translate-y-1 hover:bg-brand hover:shadow-2xl active:scale-95">
            <span className="relative z-10 flex items-center gap-2 text-lg">
              <span className="text-2xl leading-none">＋</span>
              Dodaj nową ofertę
            </span>
            <div className="absolute inset-0 z-0 bg-gradient-to-r from-brand to-emerald-500 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
          </Link>
        </motion.div>
      </div>

      <div className="mb-8 flex flex-col gap-6 border-b border-brand-dark/5 pb-8">
        {counts && listings && listings.length > 0 && (
          <div className="flex flex-wrap gap-3">
            {([
              ["all", "Wszystkie", counts.all],
              ["approved", "Aktywne", counts.approved],
              ["draft", "Szkice", counts.draft],
            ] as const).map(([val, label, count]) => (
              <button
                key={val}
                type="button"
                onClick={() => setFilter(val)}
                className={cn(
                  "relative rounded-xl px-5 py-2.5 text-sm font-bold transition-all duration-300 active:scale-95",
                  filter === val
                    ? "bg-brand text-white shadow-lg shadow-brand/20 ring-1 ring-brand/10"
                    : "bg-white text-brand-dark/60 hover:text-brand-dark hover:bg-brand-surface/40 hover:shadow-sm ring-1 ring-black/[.03] dark:bg-[var(--bg3)] dark:text-white/70 dark:ring-white/20 dark:hover:text-white dark:hover:shadow-[0_10px_26px_rgba(0,0,0,.35)]"
                )}
              >
                {label}
                <span className={cn(
                  "ml-2.5 rounded-full px-2 py-0.5 text-[11px] font-extrabold",
                  filter === val ? "bg-white/20 text-white" : "bg-brand-surface text-brand"
                )}>
                  {count}
                </span>
                {filter === val && (
                  <motion.div layoutId="filter-pill" className="absolute inset-0 rounded-xl bg-brand -z-10" transition={{ type: "spring", bounce: 0.2, duration: 0.6 }} />
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {err && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 rounded-2xl border-l-4 border-red-500 bg-red-50 p-6 shadow-sm dark:bg-red-950/35 dark:shadow-[0_16px_40px_rgba(0,0,0,.35)]"
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl">⚠️</span>
            <div>
              <p className="font-bold text-red-800 dark:text-red-200">Wystąpił błąd</p>
              <p className="text-sm text-red-600 dark:text-red-300">{err}</p>
            </div>
          </div>
        </motion.div>
      )}

      {filtered === null ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <LoadingSpinner className="h-12 w-12 text-brand" />
          <p className="font-bold animate-pulse text-brand-dark/40 dark:text-white/55">Ładowanie Twoich skarbów...</p>
        </div>
      ) : filtered.length === 0 ? (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="rounded-3xl bg-white border-2 border-dashed border-brand/20 py-24 text-center shadow-[0_20px_50px_rgba(22,163,74,0.03)] dark:bg-[var(--bg2)]"
        >
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-brand-surface text-4xl mb-6">🏠</div>
          <p className="text-2xl font-black text-brand-dark dark:text-white">Jeszcze nic tu nie ma</p>
          <p className="mx-auto mt-2 max-w-sm text-text-secondary dark:text-white/70">
            {filter !== "all" ? "Brak ofert o wybranym statusie." : "Wygląda na to, że nie masz jeszcze żadnych ofert. Czas to zmienić!"}
          </p>
          {filter === "all" && (
            <Link href="/host/new-listing" className="btn-primary mt-8 inline-flex px-8 py-4 text-base rounded-2xl">Dodaj pierwszą ofertę</Link>
          )}
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          <AnimatePresence mode="popLayout">
            {filtered.map((listing, idx) => {
              const st = STATUS_LABELS[listing.status] ?? { label: listing.status, cls: "bg-gray-100 text-gray-600" };
              const coverSrc = publicMediaUrl(listing.cover_image);
              return (
                <motion.div
                  layout
                  key={listing.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0, transition: { delay: idx * 0.05 } }}
                  exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
                  className="group relative flex flex-col gap-6 overflow-hidden rounded-[32px] bg-white p-5 shadow-[0_4px_20px_rgba(0,0,0,0.03)] ring-1 ring-black/[0.02] transition-all duration-500 hover:-translate-y-1 hover:shadow-[0_20px_40px_rgba(0,0,0,0.06)] hover:ring-brand/10 dark:bg-[var(--bg2)] dark:ring-brand-border/45 sm:flex-row sm:items-center"
                >
                  <div className="relative h-32 w-full shrink-0 overflow-hidden rounded-2xl sm:h-28 sm:w-40">
                    {coverSrc ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img 
                        src={coverSrc}
                        alt=""
                        className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110" 
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-gray-50 text-3xl">🏠</div>
                    )}
                    <div className="absolute left-2 top-2">
                      <span className={cn("rounded-lg px-2.5 py-1 text-[10px] font-black uppercase tracking-wider shadow-sm", st.cls)}>
                        {st.label}
                      </span>
                    </div>
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <div>
                        <Link href={`/listing/${listing.slug}`} className="text-lg font-black text-brand-dark transition-colors hover:text-brand dark:text-white dark:hover:text-brand-light">
                          {listing.title}
                        </Link>
                        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-text-muted dark:text-white/70">
                          <div className="flex items-center gap-1.5 font-bold text-brand">
                            <span className="text-lg">💰</span>
                            {listing.base_price} {listing.currency} <span className="text-[11px] font-medium text-text-muted uppercase">/ noc</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-lg">👥</span>
                            {listing.max_guests > 0 ? `${listing.max_guests} gości` : "Nieokreślono"}
                          </div>
                          {listing.average_rating != null && (
                            <div className="flex items-center gap-1.5">
                              <span className="text-brand">★</span>
                              <span className="font-bold text-brand-dark dark:text-white">{Number(listing.average_rating).toFixed(2)}</span>
                              <span className="text-xs">({listing.review_count} opinii)</span>
                            </div>
                          )}
                          {listing.location?.city && (
                            <div className="flex items-center gap-1.5">
                              <span className="text-lg">📍</span>
                              {listing.location.city}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex shrink-0 items-center gap-2">
                        <Link
                          href={`/host/new-listing?listingId=${listing.id}`}
                          className="flex h-11 items-center gap-2 rounded-xl border border-black/[0.05] px-5 text-sm font-bold text-brand-dark transition-all hover:bg-white hover:shadow-md active:scale-95 dark:border-white/20 dark:text-white dark:hover:bg-[var(--bg3)] dark:hover:shadow-[0_12px_28px_rgba(0,0,0,.35)]"
                        >
                          Edytuj
                        </Link>
                        <Link
                          href={`/host/calendar`} 
                          title="Kalendarz"
                          className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-surface text-brand transition-all hover:bg-brand hover:text-white hover:shadow-lg hover:shadow-brand/20 active:scale-90"
                        >
                          📅
                        </Link>
                        <Link 
                          href={`/listing/${listing.slug}`} 
                          className="flex h-11 items-center gap-2 rounded-xl border border-black/[0.05] px-5 text-sm font-bold text-brand-dark transition-all hover:bg-white hover:shadow-md active:scale-95 dark:border-white/20 dark:text-white dark:hover:bg-[var(--bg3)] dark:hover:shadow-[0_12px_28px_rgba(0,0,0,.35)]"
                        >
                          Podgląd
                        </Link>
                        <button
                          onClick={() => handleDelete(listing.id)}
                          disabled={isDeleting === listing.id}
                          className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-50 text-red-500 transition-all hover:bg-red-500 hover:text-white hover:shadow-lg hover:shadow-red-200 active:scale-90 disabled:opacity-50"
                          title="Usuń ofertę"
                        >
                          {isDeleting === listing.id ? (
                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                          ) : (
                            "🗑️"
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                  
                  {/* Decorative background element */}
                  <div className="absolute -right-4 -top-4 -z-10 h-24 w-24 rounded-full bg-brand/5 blur-2xl transition-all duration-500 group-hover:scale-150 group-hover:bg-brand/10" />
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
