"use client";

import Image from "next/image";
import Link from "next/link";
import DOMPurify from "isomorphic-dompurify";
import { useEffect, useMemo, useRef, useState } from "react";

import type { Listing } from "@/types/listing";
import { AMENITY_EMOJI, MODE_EMOJI, SCORE_LABELS, topScores } from "@/lib/utils/booking";

const DESC_ALLOWED_TAGS = ["p", "br", "strong", "b", "em", "i", "ul", "ol", "li", "a", "span"];

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
  const short = plainLen > 300;
  const truncatedPlain =
    !isHtml && short && !open ? `${text.slice(0, 300)}…` : null;

  return (
    <section className="mb-8">
      <h2 className="mb-3.5 text-lg font-extrabold text-brand-dark">O miejscu</h2>
      {isHtml ? (
        <div
          className={`relative text-[15px] leading-relaxed text-gray-600 [&_a]:text-brand [&_a]:underline [&_li]:my-0.5 [&_ol]:my-2 [&_p]:my-2 [&_ul]:my-2 ${
            short && !open ? "max-h-[14rem] overflow-hidden" : ""
          }`}
        >
          <div
            className="listing-desc-html"
            dangerouslySetInnerHTML={{ __html: safeHtml }}
          />
          {short && !open ? (
            <div
              className="pointer-events-none absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-[#f8faf8] to-transparent"
              aria-hidden
            />
          ) : null}
        </div>
      ) : (
        <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-gray-600">
          {truncatedPlain ?? text}
        </p>
      )}
      {short && (
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="mt-2 text-sm font-bold text-brand"
        >
          {open ? "Pokaż mniej" : "Pokaż więcej"}
        </button>
      )}
    </section>
  );
}

export function ListingAmenities({ amenities }: { amenities: Listing["amenities"] }) {
  const [all, setAll] = useState(false);
  const first = all ? amenities : amenities.slice(0, 8);
  return (
    <section className="mb-8">
      <h2 className="mb-3.5 text-lg font-extrabold text-brand-dark">Udogodnienia</h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {first.map((a) => (
          <div key={a.id} className="flex items-center gap-2.5 text-sm font-medium text-gray-600">
            <span className="text-2xl">{AMENITY_EMOJI[a.icon] ?? AMENITY_EMOJI.default}</span>
            {a.name}
          </div>
        ))}
      </div>
      {amenities.length > 8 && (
        <button
          type="button"
          onClick={() => setAll(!all)}
          className="mt-4 text-sm font-bold text-brand"
        >
          {all ? "Zwiń" : `Pokaż wszystkie ${amenities.length} udogodnienia ↓`}
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
    <section ref={ref} className="mb-8">
      <h2 className="mb-3.5 text-lg font-extrabold text-brand-dark">Ocena miejsca</h2>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        {entries.map(([key, val], idx) => {
          const score = typeof val === "number" ? val : 0;
          const pct = Math.min(100, score * 10);
          return (
            <div
              key={key}
              className="rounded-[14px] border border-brand-border bg-brand-surface px-3.5 py-3.5 text-center"
              style={{
                transitionDelay: visible ? `${idx * 100}ms` : "0ms",
              }}
            >
              <p className="text-2xl font-extrabold tracking-tight text-brand-dark">
                {score.toFixed(1)}
              </p>
              <div className="mt-2 h-1 overflow-hidden rounded-full bg-gray-200">
                <div
                  className="h-full rounded-full bg-brand transition-all duration-[800ms] ease-[cubic-bezier(.16,1,.3,1)]"
                  style={{ width: visible ? `${pct}%` : "0%" }}
                />
              </div>
              <p className="mt-2 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                {SCORE_LABELS[key] ?? key}
              </p>
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
    <div className="mb-4 flex flex-wrap gap-2">
      {tops.map((k) => (
        <span
          key={k}
          className="inline-flex items-center rounded-full border border-[#bbf7d0] bg-[#dcfce7] px-3 py-1 text-xs font-bold text-[#166534]"
        >
          {MODE_EMOJI[k] ?? "✨"} {SCORE_LABELS[k] ?? k}
        </span>
      ))}
      {listing.host.is_verified && (
        <span className="inline-flex items-center rounded-full border border-[#fde68a] bg-[#fef3c7] px-3 py-1 text-xs font-bold text-[#92400e]">
          ⭐ Superhost
        </span>
      )}
      {listing.is_pet_friendly && (
        <span className="inline-flex items-center rounded-full border border-[#bbf7d0] bg-[#dcfce7] px-3 py-1 text-xs font-bold text-[#166534]">
          🐕 Przyjazne zwierzętom
        </span>
      )}
    </div>
  );
}

export function HostStrip({ listing }: { listing: Listing }) {
  const h = listing.host;
  const initials = `${h.display_name[0] ?? "?"}`;
  const years = hostYears(h.member_since);
  const resp =
    h.response_rate >= 0.9 ? "kilka godzin" : h.response_rate >= 0.7 ? "tego samego dnia" : "24h";

  return (
    <div className="mb-7 flex flex-col justify-between gap-4 border-y border-gray-200 py-5 sm:flex-row sm:items-center">
      <div className="flex items-center gap-3.5">
        <div className="relative">
          <div className="relative h-[52px] w-[52px] overflow-hidden rounded-full bg-brand-muted">
            {h.avatar_url ? (
              <Image src={h.avatar_url} alt="" fill className="object-cover" sizes="52px" />
            ) : (
              <span className="flex h-full w-full items-center justify-center text-lg font-bold text-brand-dark">
                {initials}
              </span>
            )}
          </div>
          {h.is_verified && (
            <span className="absolute -bottom-0.5 -right-0.5 flex h-[18px] w-[18px] items-center justify-center rounded-full bg-brand text-[10px] text-white">
              ★
            </span>
          )}
        </div>
        <div>
          <p className="text-[15px] font-bold text-brand-dark">{h.display_name}</p>
          <p className="text-xs text-gray-400">
            Gospodarz od {years} {years === 1 ? "roku" : "lat"}
            {h.is_verified ? " · Superhost" : ""} · Odpowiada w ciągu {resp}
          </p>
        </div>
      </div>
      <button type="button" className="btn-secondary shrink-0 px-5 py-2.5 text-sm">
        Napisz wiadomość
      </button>
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
