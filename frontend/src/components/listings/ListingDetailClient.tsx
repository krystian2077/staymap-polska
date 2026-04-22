"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import DOMPurify from "isomorphic-dompurify";
import { useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";

import { api } from "@/lib/api";
import { useAuthStore } from "@/lib/store/authStore";
import type { Listing } from "@/types/listing";
import { AMENITY_EMOJI, MODE_EMOJI, SCORE_LABELS, topScores } from "@/lib/utils/booking";

const DESC_ALLOWED_TAGS = ["p", "br", "strong", "b", "em", "i", "ul", "ol", "li", "a", "span"];

const AMENITY_LABELS: Record<string, string> = {
  wifi: "Wi-Fi",
  kitchen: "Kuchnia",
  parking: "Parking",
  air_conditioning: "Klimatyzacja",
  heating: "Ogrzewanie",
  washer: "Pralka",
  tv: "TV",
  workspace: "Miejsce do pracy",
  pet_friendly: "Przyjazne zwierzętom",
  pool: "Basen",
  sauna: "Sauna",
  grill: "Grill",
  fireplace: "Kominek",
  hot_tub: "Jacuzzi",
  child_friendly: "Dla rodzin z dziećmi",
  accessible: "Udogodnienia dla osób z niepełnosprawnością",
};

function looksLikeHtml(s: string): boolean {
  return /<[a-z][\s\S]*>/i.test(s);
}

function stripForLength(s: string): string {
  return s.replace(/<[^>]*>/g, "");
}

function hostYears(memberSince: string): number {
  if (!memberSince) return 1;
  const y = new Date(memberSince).getFullYear();
  const now = new Date().getFullYear();
  return Math.max(1, now - y);
}

export function ListingDescription({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  const isHtml = useMemo(() => looksLikeHtml(text), [text]);
  const safeHtml = useMemo(
    () =>
      DOMPurify.sanitize(text, {
        ALLOWED_TAGS: DESC_ALLOWED_TAGS,
        ALLOWED_ATTR: ["href", "target", "rel", "class"],
      }),
    [text]
  );
  const plainLen = useMemo(
    () => (isHtml ? stripForLength(text).length : text.length),
    [text, isHtml]
  );
  const short = plainLen > 450;
  const truncatedPlain =
    !isHtml && short && !open ? `${text.slice(0, 450)}…` : null;

  return (
    <section className="mb-12 group relative overflow-hidden rounded-[3rem] border border-slate-100 bg-white p-10 shadow-2xl transition-all hover:shadow-brand/5 hover:border-brand/20 ring-1 ring-slate-200/50 sm:p-12">
      <div className="absolute -right-16 -bottom-16 h-64 w-64 rounded-full bg-brand-light/5 blur-3xl transition-transform duration-1000 group-hover:scale-110" />
      <div className="absolute -left-20 -top-20 h-48 w-48 rounded-full bg-blue-400/5 blur-2xl transition-transform duration-1000 group-hover:scale-125" />

      <h2 className="relative z-10 mb-8 text-4xl font-black tracking-tight text-slate-900">
        O tym miejscu
      </h2>
      
      {isHtml ? (
        <div
          className={`relative z-10 text-[19px] leading-[1.8] text-slate-600 [&_a]:text-brand [&_a]:underline [&_li]:my-2 [&_ol]:my-4 [&_p]:my-4 [&_ul]:my-4 ${
            short && !open ? "max-h-[18rem] overflow-hidden" : ""
          }`}
        >
          <div
            className="listing-desc-html"
            dangerouslySetInnerHTML={{ __html: safeHtml }}
          />
          {short && !open ? (
            <div
              className="pointer-events-none absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-white via-white/60 to-transparent"
              aria-hidden
            />
          ) : null}
        </div>
      ) : (
        <p className="relative z-10 whitespace-pre-wrap text-[19px] leading-[1.8] text-slate-600">
          {truncatedPlain ?? text}
        </p>
      )}

      {short && (
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="relative z-10 mt-10 flex items-center gap-3 rounded-2xl bg-brand-light/10 px-6 py-3 text-[15px] font-bold text-brand-800 shadow-sm ring-1 ring-brand-light/20 backdrop-blur-md transition-all hover:bg-brand-light/20 hover:text-brand-900 hover:shadow-md active:scale-95 group/btn"
        >
          <span>{open ? "Pokaż mniej" : "Czytaj więcej o ofercie"}</span>
          <svg className={`h-4.5 w-4.5 transition-transform duration-300 ${open ? 'rotate-180' : 'group-hover/btn:translate-y-1'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      )}
    </section>
  );
}

export function ListingAmenities({ amenities }: { amenities: Listing["amenities"] }) {
  const [all, setAll] = useState(false);
  const first = all ? amenities : amenities.slice(0, 8);
  return (
    <section className="group relative mb-12 overflow-hidden rounded-[3rem] border border-brand/20 bg-gradient-to-br from-brand-950 via-brand-900 to-brand-800 p-10 shadow-2xl transition-all hover:shadow-brand/20 hover:border-brand/40 ring-1 ring-white/5 sm:p-12">
      {/* Decorative background elements */}
      <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-brand-light/10 blur-3xl transition-transform duration-1000 group-hover:scale-125 group-hover:rotate-12" />
      <div className="absolute -left-24 -bottom-24 h-72 w-72 rounded-full bg-blue-400/10 blur-2xl transition-transform duration-1000 group-hover:scale-110" />
      <div className="absolute left-1/2 top-1/4 h-32 w-32 -translate-x-1/2 rounded-full bg-brand-light/20 blur-3xl transition-opacity duration-1000 group-hover:opacity-60" />

      <div className="relative z-10 mb-10 flex items-center justify-between">
        <h2 className="text-4xl font-black tracking-tight text-white">
          Co oferuje to miejsce
        </h2>
      </div>

      <div className="relative z-10 grid grid-cols-1 gap-6 sm:grid-cols-2">
        {first.map((a, idx) => (
          <div 
            key={a.id} 
            className="group/item flex items-center gap-5 rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-md transition-all hover:border-brand-light/30 hover:bg-white/10 hover:shadow-2xl hover:shadow-brand-light/5 active:scale-[0.98]"
            style={{ transitionDelay: `${idx * 30}ms` }}
          >
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-white/10 text-3xl shadow-inner ring-1 ring-white/10 transition-all group-hover/item:scale-110 group-hover/item:rotate-3 group-hover/item:bg-white/20">
              {AMENITY_EMOJI[a.icon] ?? AMENITY_EMOJI.default}
            </span>
            <div className="flex flex-col">
              <span className="text-[17px] font-bold text-white transition-colors group-hover/item:text-brand-light">{AMENITY_LABELS[a.id] ?? a.name}</span>
              <span className="text-[13px] font-medium text-white/50">Udogodnienie zweryfikowane</span>
            </div>
          </div>
        ))}
      </div>

      {amenities.length > 8 && (
        <button
          type="button"
          onClick={() => setAll(!all)}
          className="relative z-10 mt-12 flex w-full items-center justify-center gap-3 rounded-2xl bg-white/10 px-8 py-5 text-[15px] font-black uppercase tracking-widest text-brand-light shadow-sm ring-1 ring-white/20 backdrop-blur-md transition-all hover:bg-brand-light hover:text-brand-dark hover:shadow-xl hover:shadow-brand-light/20 active:scale-95 sm:w-auto"
        >
          <span>{all ? "Zwiń listę" : `Pokaż wszystkie udogodnienia (${amenities.length})`}</span>
          <svg 
            className={`h-5 w-5 transition-transform duration-500 ${all ? 'rotate-180' : 'group-hover:translate-y-1'}`} 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      )}
    </section>
  );
}

export function ListingDestinationScores({ listing }: { listing: Listing }) {
  const s = listing.destination_score_cache;
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e?.isIntersecting) setVisible(true);
      },
      { threshold: 0.2 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  if (!s) return null;

  const entries = Object.entries(s).filter(
    ([k]) => k !== "calculated_at" && k !== "version"
  );
  return (
    <section ref={ref} className="mb-10">
      <h2 className="mb-6 text-xl font-black tracking-tight text-brand-dark">Ocena lokalizacji</h2>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        {entries.map(([key, val], idx) => {
          const score = typeof val === "number" ? val : 0;
          const pct = Math.min(100, score * 10);
          return (
            <div
              key={key}
              className="rounded-2xl border border-black/[0.03] bg-white px-4 py-4 shadow-sm transition-all hover:border-brand/20 hover:shadow-md"
              style={{
                transitionDelay: visible ? `${idx * 80}ms` : "0ms",
              }}
            >
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-black uppercase tracking-widest text-gray-400">
                  {SCORE_LABELS[key] ?? key}
                </p>
                <p className="text-xl font-black tracking-tight text-brand-dark">
                  {score.toFixed(1)}
                </p>
              </div>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-gray-100">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-brand/60 to-brand transition-all duration-[1000ms] ease-[cubic-bezier(.16,1,.3,1)]"
                  style={{ width: visible ? `${pct}%` : "0%" }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export function TravelModeBadges({ listing }: { listing: Listing }) {
  const s = listing.destination_score_cache;
  if (!s) return null;
  const scores: Record<string, number> = {};
  for (const [k, v] of Object.entries(s)) {
    if (k === "calculated_at" || k === "version") continue;
    if (typeof v === "number") scores[k] = v;
  }
  const tops = topScores(scores, 2);
  return (
    <div className="mb-4 flex flex-wrap gap-2.5">
      {tops.map((k) => (
        <span
          key={k}
          className="inline-flex items-center rounded-xl bg-green-50 px-3.5 py-1.5 text-[13px] font-black text-green-700 ring-1 ring-inset ring-green-600/10 shadow-sm"
        >
          <span className="mr-2 text-base">{MODE_EMOJI[k] ?? "✨"}</span> {SCORE_LABELS[k] ?? k}
        </span>
      ))}
      {listing.host.is_verified && (
        <span className="inline-flex items-center rounded-xl bg-amber-50 px-3.5 py-1.5 text-[13px] font-black text-amber-700 ring-1 ring-inset ring-amber-600/10 shadow-sm">
          <span className="mr-2 text-base">⭐</span> Superhost
        </span>
      )}
      {listing.is_pet_friendly && (
        <span className="inline-flex items-center rounded-xl bg-brand/5 px-3.5 py-1.5 text-[13px] font-black text-brand ring-1 ring-inset ring-brand/10 shadow-sm">
          <span className="mr-2 text-base">🐕</span> Przyjazne zwierzętom
        </span>
      )}
    </div>
  );
}

export function HostStrip({ listing }: { listing: Listing }) {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [startingThread, setStartingThread] = useState(false);
  const h = listing.host;
  const initials = `${h.display_name[0] ?? "?"}`;
  const years = hostYears(h.member_since);
  const resp =
    h.response_rate >= 0.9 ? "kilka godzin" : h.response_rate >= 0.7 ? "tego samego dnia" : "24h";

  const onStartConversation = async () => {
    if (!user) {
      router.push(`/login?next=${encodeURIComponent(`/listing/${listing.slug}`)}`);
      return;
    }
    if (user.is_host) {
      toast("Jako gospodarz skorzystaj z panelu wiadomości.");
      router.push("/host/messages");
      return;
    }

    setStartingThread(true);
    try {
      const res = await api.post<{ data: { id: string } }>("/api/v1/conversations/", {
        listing_id: listing.id,
      });
      const convId = res.data?.id;
      if (!convId) {
        toast.error("Nie udało się utworzyć rozmowy.");
        return;
      }
      router.push(`/messages?conv=${encodeURIComponent(convId)}`);
    } catch {
      toast.error("Nie udało się rozpocząć rozmowy. Spróbuj ponownie.");
    } finally {
      setStartingThread(false);
    }
  };

  return (
    <div className="group relative mb-12 overflow-hidden rounded-[3rem] border border-brand/20 bg-gradient-to-br from-brand-950 via-brand-900 to-brand-800 shadow-2xl transition-all hover:shadow-brand/20 hover:border-brand/40 ring-1 ring-white/5">
      {/* Decorative background elements */}
      <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-brand-light/10 blur-3xl transition-transform duration-1000 group-hover:scale-125" />
      <div className="absolute -left-24 -bottom-24 h-72 w-72 rounded-full bg-blue-400/10 blur-2xl transition-transform duration-1000 group-hover:scale-110" />

      <div className="relative z-10 flex flex-col lg:flex-row">
        {/* Main Info Section */}
        <div className="flex flex-1 flex-col p-8 sm:p-12">
          <div className="flex flex-col gap-8 sm:flex-row sm:items-center">
            <div className="relative shrink-0">
              <div className="relative h-24 w-24 overflow-hidden rounded-3xl border-4 border-white/10 bg-white/5 shadow-2xl transition-all group-hover:scale-110 group-hover:rotate-3 group-hover:border-brand-light/30">
                {h.avatar_url ? (
                  <Image
                    src={h.avatar_url}
                    alt={h.display_name}
                    fill
                    className="object-cover transition-transform duration-700 group-hover:scale-110"
                    sizes="96px"
                  />
                ) : (
                  <span className="flex h-full w-full items-center justify-center text-3xl font-black text-brand-light/30">
                    {initials}
                  </span>
                )}
              </div>
              {h.is_verified && (
                <div className="absolute -bottom-2 -right-2 flex h-8 w-8 items-center justify-center rounded-2xl bg-brand-light text-brand-dark shadow-lg ring-4 ring-brand-900 transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-12" title="Tożsamość zweryfikowana">
                   <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                     <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                   </svg>
                </div>
              )}
            </div>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-3">
                <h3 className="text-3xl font-black tracking-tight text-white">
                  Poznaj gospodarza: {h.display_name}
                </h3>
                {h.is_verified && (
                  <span className="rounded-full bg-white/10 px-3 py-1 text-[11px] font-black uppercase tracking-widest text-brand-light ring-1 ring-white/20 backdrop-blur-md">
                    Premium Host
                  </span>
                )}
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-2 text-[15.5px] font-bold text-brand-light/70">
                <span className="flex items-center gap-2">
                   <span className="text-lg">📅</span>
                   {years} {years === 1 ? "rok" : years >= 2 && years <= 4 ? "lata" : "lat"} na StayMap
                </span>
                <span className="flex items-center gap-2">
                   <span className="text-lg">★</span>
                   {h.average_rating != null ? Number(h.average_rating).toFixed(1) : "—"} ({h.review_count} opinii)
                </span>
              </div>
            </div>
          </div>

          {h.bio && (
            <div className="relative mt-10 overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-8 backdrop-blur-md transition-all hover:bg-white/10 hover:border-brand-light/20">
               {/* Quote icon background ornament */}
               <div className="absolute -left-2 -top-4 opacity-10">
                 <svg className="h-16 w-16 fill-brand-light" viewBox="0 0 24 24">
                   <path d="M14.017 21L14.017 18C14.017 16.8954 14.9124 16 16.017 16H19.017C19.5693 16 20.017 15.5523 20.017 15V9C20.017 8.44772 19.5693 8 19.017 8H16.017C14.9124 8 14.017 7.10457 14.017 6V3H21.017V15C21.017 18.3137 18.3307 21 15.017 21H14.017ZM3.01697 21L3.01697 18C3.01697 16.8954 3.91241 16 5.01697 16H8.01697C8.56925 16 9.01697 15.5523 9.01697 15V9C9.01697 8.44772 8.56925 8 8.01697 8H5.01697C3.91241 8 3.01697 7.10457 3.01697 6V3H10.017V15C10.017 18.3137 7.33072 21 4.01697 21H3.01697Z" />
                 </svg>
               </div>
               <p className="relative z-10 text-[18.5px] leading-relaxed text-white italic">
                 {h.bio}
               </p>
            </div>
          )}
        </div>

        {/* Action Sidebar Section */}
        <div className="flex flex-col justify-center gap-8 border-white/10 bg-white/5 p-8 lg:w-[320px] lg:border-l lg:p-12">
          <div className="space-y-2 text-center lg:text-left">
            <p className="text-[11px] font-black uppercase tracking-[0.25em] text-brand-light/50">Responsywność</p>
            <div className="flex items-center justify-center gap-2 lg:justify-start">
               <span className="relative flex h-2.5 w-2.5">
                 <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-light opacity-75"></span>
                 <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-brand-light"></span>
               </span>
               <p className="text-lg font-black text-white italic">W {resp}</p>
            </div>
          </div>
          
          <button
            type="button"
            onClick={() => void onStartConversation()}
            disabled={startingThread}
            className="group/btn relative overflow-hidden rounded-2xl bg-white px-8 py-5 text-[15px] font-black uppercase tracking-[0.15em] text-brand-dark shadow-2xl transition-all hover:-translate-y-1 hover:bg-brand-light hover:shadow-brand-light/20 active:scale-95"
          >
             <div className="absolute inset-0 bg-gradient-to-tr from-brand-950/10 to-transparent opacity-0 transition-opacity group-hover/btn:opacity-100" />
             <span className="relative">{startingThread ? "Otwieranie..." : "Wyślij wiadomość"}</span>
          </button>
          
          <p className="text-center text-[12px] font-bold text-brand-light/40 lg:text-left">
             Średni czas odpowiedzi gospodarza
          </p>
        </div>
      </div>
    </div>
  );
}

export function ListingBreadcrumb({ listing }: { listing: Listing }) {
  const t = listing.title.length > 40 ? `${listing.title.slice(0, 40)}…` : listing.title;
  return (
    <nav className="mb-5 flex flex-wrap items-center gap-1.5 text-sm text-gray-400">
      <Link href="/" className="hover:text-brand">
        Strona główna
      </Link>
      <span>›</span>
      <Link href="/search" className="hover:text-brand">
        {listing.location?.city || "Polska"}
      </Link>
      <span>›</span>
      <span className="text-gray-500">{t}</span>
    </nav>
  );
}
