"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { publicMediaUrl } from "@/lib/mediaUrl";
import type { SearchListing } from "@/lib/searchTypes";

const SPIN_EMOJIS = ["🏔️", "🌊", "🌲", "🏖️", "🧖", "💑", "🐕", "💻", "🌿", "🎯", "🔮", "✨"];

const RING_ITEMS = [
  { em: "🏔️", label: "Góry" },
  { em: "🌊", label: "Morze" },
  { em: "🌲", label: "Las" },
  { em: "🏕️", label: "Camping" },
  { em: "🧖", label: "SPA" },
  { em: "🛶", label: "Kajaki" },
  { em: "🏡", label: "Domek" },
  { em: "🌄", label: "Widok" },
];

const CARD_GRADIENTS = [
  "linear-gradient(135deg,#0c2418,#1a3d2a)",
  "linear-gradient(135deg,#102238,#1a3a52)",
  "linear-gradient(135deg,#1f0e2e,#342060)",
  "linear-gradient(135deg,#2a1005,#4a1e08)",
];

type Phase = "idle" | "spinning" | "result" | "error";

function getTypeEmoji(listing: SearchListing): string {
  const icon = listing.listing_type?.icon;
  if (icon) return icon;
  const slug = listing.listing_type?.slug ?? "";
  const map: Record<string, string> = {
    domek: "🏡",
    glamping: "🏕️",
    pensjonat: "🏨",
    apartament: "🏢",
    chata: "🌲",
    willa: "🏰",
  };
  return map[slug] ?? "🏡";
}

// ─── Offer popup ─────────────────────────────────────────────────────────────

function OfferPopup({
  listing,
  onDismiss,
  onReSpin,
}: {
  listing: SearchListing;
  onDismiss: () => void;
  onReSpin: () => void;
}) {
  const price = Math.round(Number(listing.base_price) || 199);
  const ratingRaw =
    typeof listing.average_rating === "number"
      ? listing.average_rating
      : Number(listing.average_rating);
  const rating = Number.isFinite(ratingRaw) ? ratingRaw : null;
  const loc =
    [listing.location?.city, listing.location?.region].filter(Boolean).join(", ") || "Polska";
  const cover = publicMediaUrl(listing.cover_image);
  const emoji = getTypeEmoji(listing);
  const typeName = listing.listing_type?.name ?? "Nocleg";
  const bg = CARD_GRADIENTS[listing.slug.charCodeAt(0) % CARD_GRADIENTS.length];

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-6"
      onClick={(e) => {
        if (e.target === e.currentTarget) onDismiss();
      }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-[#050d08]/75 backdrop-blur-[10px]" />

      {/* Card */}
      <div
        className={cn(
          "relative z-10 w-full max-w-[440px] overflow-hidden",
          "rounded-t-[30px] sm:rounded-[28px]",
          "border border-white/10",
          "shadow-[0_-20px_80px_rgba(0,0,0,.55),0_8px_40px_rgba(0,0,0,.8)]",
        )}
        style={{
          background: "linear-gradient(160deg,#111e16 0%,#0d1910 100%)",
          animation: "lmPop 0.45s cubic-bezier(.16,1,.3,1) forwards",
        }}
      >
        {/* Drag handle (mobile) */}
        <div className="flex justify-center pt-3 sm:hidden">
          <span className="h-1 w-10 rounded-full bg-white/20" />
        </div>

        {/* Image / emoji header */}
        <div
          className="relative flex h-[210px] items-center justify-center overflow-hidden"
          style={{ background: bg }}
        >
          {cover ? (
            <img
              src={cover}
              alt={listing.title}
              className="absolute inset-0 h-full w-full object-cover"
              loading="lazy"
            />
          ) : (
            <span className="text-[80px] drop-shadow-[0_10px_28px_rgba(0,0,0,.7)] select-none">
              {emoji}
            </span>
          )}

          {/* Dark vignette */}
          <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(0,0,0,.1)_0%,rgba(0,0,0,.6)_100%)]" />

          {/* "Wylosowano" badge */}
          <div className="absolute left-3 top-3">
            <span
              className={cn(
                "flex items-center gap-1.5 rounded-full px-3 py-1",
                "bg-[#16a34a] text-[11px] font-bold text-white",
                "shadow-[0_4px_16px_rgba(22,163,74,.5)]",
              )}
            >
              ✨ Wylosowano dla Ciebie!
            </span>
          </div>

          {/* Close button */}
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Zamknij"
            className={cn(
              "absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full",
              "bg-black/55 text-[13px] text-white/80 backdrop-blur-sm",
              "transition hover:bg-black/75 hover:text-white",
            )}
          >
            ✕
          </button>

          {/* Bottom info row */}
          <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between gap-2">
            <span className="truncate rounded-full bg-black/55 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur-sm">
              📍 {loc}
            </span>
            <span className="shrink-0 rounded-full bg-black/55 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur-sm">
              {typeName}
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="px-5 pb-5 pt-4">
          <h3 className="mb-2 line-clamp-2 text-[18px] font-black leading-[1.25] text-white">
            {listing.title}
          </h3>

          {/* Meta row */}
          <div className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-1">
            {rating !== null && (
              <span className="flex items-center gap-1 text-[13px] font-bold text-[#4ade80]">
                ★ {rating.toFixed(1)}
                {listing.review_count ? (
                  <span className="font-normal text-white/60">
                    {" "}
                    ({listing.review_count} opinii)
                  </span>
                ) : null}
              </span>
            )}
            {listing.max_guests > 0 && (
              <>
                <span className="text-white/20">·</span>
                <span className="text-[13px] text-white/75">
                  maks. {listing.max_guests} os.
                </span>
              </>
            )}
          </div>

          {/* Price */}
          <div className="mb-5 flex items-baseline gap-1.5">
            <span className="text-[34px] font-black leading-none text-white">{price}</span>
            <span className="text-[14px] text-white/75">zł / noc</span>
          </div>

          {/* Primary CTA */}
          <Link
            href={`/listing/${listing.slug}`}
            className={cn(
              "mb-3 flex w-full items-center justify-center gap-2",
              "rounded-[16px] bg-[#16a34a] py-3.5 text-[15px] font-black text-white",
              "shadow-[0_8px_28px_rgba(22,163,74,.38)]",
              "transition-all hover:bg-[#15803d] hover:shadow-[0_14px_40px_rgba(22,163,74,.55)]",
            )}
          >
            Sprawdź tę ofertę →
          </Link>

          {/* Secondary actions */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onReSpin}
              className={cn(
                "flex flex-1 items-center justify-center gap-2 rounded-[14px] py-3",
                "border border-[rgba(74,222,128,.25)] bg-[rgba(74,222,128,.07)]",
                "text-[13px] font-bold text-[#4ade80]",
                "transition hover:border-[rgba(74,222,128,.45)] hover:bg-[rgba(74,222,128,.12)]",
              )}
            >
              🎲 Losuj jeszcze raz
            </button>
            <button
              type="button"
              onClick={onDismiss}
              className={cn(
                "flex items-center justify-center rounded-[14px] px-4",
                "border border-white/10 bg-transparent",
                "text-[13px] font-medium text-white/60",
                "transition hover:border-white/20 hover:text-white",
              )}
            >
              Odrzuć
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Spin button ──────────────────────────────────────────────────────────────

function SpinButton({ phase, onClick }: { phase: Phase; onClick: () => void }) {
  const isSpinning = phase === "spinning";
  const isError = phase === "error";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isSpinning || isError}
      className={cn(
        "relative overflow-hidden rounded-[18px] px-9 py-4 text-[16px] font-black",
        "bg-[#16a34a] text-white",
        "shadow-[0_12px_36px_rgba(22,163,74,.38)]",
        "transition-all duration-300 ease-[cubic-bezier(.16,1,.3,1)]",
        "hover:bg-[#15803d] hover:shadow-[0_16px_48px_rgba(22,163,74,.55)] hover:-translate-y-0.5",
        "active:translate-y-0 active:shadow-[0_6px_20px_rgba(22,163,74,.3)]",
        "disabled:cursor-wait disabled:opacity-55 disabled:translate-y-0",
      )}
    >
      {/* Shimmer sweep */}
      {!isSpinning && !isError && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "linear-gradient(105deg, transparent 35%, rgba(255,255,255,.22) 50%, transparent 65%)",
            animation: "btnShimmer 3s ease-in-out infinite",
          }}
        />
      )}

      <span className="relative flex items-center gap-2.5">
        {isSpinning ? (
          <>
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            Szukam niespodzianki...
          </>
        ) : isError ? (
          <>😕 Brak wyników — spróbuj ponownie</>
        ) : (
          <>🎲 Losuj nocleg</>
        )}
      </span>
    </button>
  );
}

// ─── Main section ─────────────────────────────────────────────────────────────

export function SpontanSection() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [emoji, setEmoji] = useState("🎲");
  const [result, setResult] = useState<SearchListing | null>(null);

  const doSpin = useCallback(async () => {
    setPhase("spinning");
    setResult(null);

    let tick = 0;
    const interval = setInterval(() => {
      setEmoji(SPIN_EMOJIS[tick++ % SPIN_EMOJIS.length]);
    }, 120);

    try {
      const res = await fetch("/api/v1/search/?ordering=recommended&page_size=30");
      const data = (await res.json()) as { data?: SearchListing[]; results?: SearchListing[] };
      const listings = data?.data ?? data?.results ?? [];

      await new Promise<void>((r) => setTimeout(r, 1500));
      clearInterval(interval);

      if (listings.length > 0) {
        const pick = listings[Math.floor(Math.random() * listings.length)];
        setResult(pick);
        setPhase("result");
        setEmoji("🎲");
      } else {
        setPhase("error");
        setEmoji("😕");
        setTimeout(() => {
          setPhase("idle");
          setEmoji("🎲");
        }, 2500);
      }
    } catch {
      clearInterval(interval);
      setPhase("error");
      setEmoji("😕");
      setTimeout(() => {
        setPhase("idle");
        setEmoji("🎲");
      }, 2500);
    }
  }, []);

  const handleSpin = () => {
    if (phase === "spinning") return;
    void doSpin();
  };

  const handleDismiss = () => {
    setResult(null);
    setPhase("idle");
    setEmoji("🎲");
  };

  const handleReSpin = () => {
    void doSpin();
  };

  const isSpinning = phase === "spinning";

  return (
    <>
      <section className="mx-auto w-full max-w-[1240px] px-6 pb-20 md:px-12">
        <div
          className="relative overflow-hidden rounded-[28px] px-6 py-14 md:px-12 md:py-16"
          style={{
            background: "linear-gradient(135deg,#0c1f12 0%,#13291a 45%,#0a1a0e 100%)",
            boxShadow:
              "0 0 0 1px rgba(74,222,128,.12), 0 28px 80px rgba(0,0,0,.35), inset 0 1px 0 rgba(255,255,255,.06)",
          }}
        >
          {/* Atmospheric radial glows */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "radial-gradient(ellipse 620px 420px at 5% 75%, rgba(22,163,74,.22), transparent)," +
                "radial-gradient(ellipse 480px 340px at 90% 10%, rgba(74,222,128,.13), transparent)," +
                "radial-gradient(ellipse 360px 260px at 50% 112%, rgba(22,163,74,.18), transparent)," +
                "radial-gradient(ellipse 200px 180px at 72% 55%, rgba(74,222,128,.06), transparent)",
            }}
          />

          {/* Dot grid texture */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-[.032]"
            style={{
              backgroundImage: "radial-gradient(rgba(255,255,255,.9) 1px, transparent 1px)",
              backgroundSize: "28px 28px",
            }}
          />

          {/* Top scanline */}
          <div
            aria-hidden
            className="pointer-events-none absolute left-0 right-0 top-0 h-[2px] bg-[linear-gradient(90deg,transparent,rgba(74,222,128,.4),transparent)]"
            style={{ animation: "scanline 6s linear infinite" }}
          />

          {/* Bottom accent bar */}
          <div
            aria-hidden
            className="absolute bottom-0 left-0 right-0 h-[3px] bg-[linear-gradient(90deg,#16a34a,#4ade80,#34d399,#16a34a)]"
          />

          {/* Decorative dice watermark */}
          <span
            aria-hidden
            className="pointer-events-none absolute -right-3 bottom-0 select-none text-[150px] opacity-[.04] grayscale"
          >
            🎲
          </span>

          {/* Layout: two columns on desktop */}
          <div className="relative z-[1] flex flex-col items-center gap-10 lg:flex-row lg:items-center lg:gap-14">

            {/* ── Left: text content ── */}
            <div className="flex-1 text-center lg:text-left">
              {/* Badge */}
              <span
                className={cn(
                  "mb-4 inline-flex items-center gap-2 rounded-full px-3.5 py-1",
                  "border border-[rgba(74,222,128,.28)] bg-[rgba(74,222,128,.08)]",
                  "text-[11px] font-bold uppercase tracking-[.07em] text-[#4ade80]",
                )}
              >
                <span className="h-[7px] w-[7px] animate-pulse rounded-full bg-[#4ade80]" />
                Tryb Spontan
              </span>

              {/* Heading */}
              <h2 className="mt-3 text-balance text-[clamp(28px,3.5vw,46px)] font-black leading-[1.05] tracking-[-1.2px] text-white">
                Nie wiesz{" "}
                <span className="bg-[linear-gradient(90deg,#4ade80_0%,#22c55e_50%,#34d399_100%)] bg-clip-text text-transparent">
                  dokąd jechać?
                </span>
              </h2>

              {/* Decorative separator */}
              <div className="mt-4 flex items-center justify-center gap-3 lg:justify-start">
                <div className="h-px w-8 bg-[linear-gradient(90deg,transparent,rgba(74,222,128,.5))]" />
                <span className="text-[11px] font-bold uppercase tracking-[.1em] text-[#4ade80]">
                  jeden klik wystarczy
                </span>
                <div className="h-px w-8 bg-[linear-gradient(90deg,rgba(74,222,128,.5),transparent)]" />
              </div>

              {/* Description */}
              <p className="mt-3 max-w-[440px] text-[15px] leading-[1.76] text-white/95 md:text-[16px] lg:max-w-full">
                Wciśnij przycisk, a my wylosujemy dla Ciebie idealny nocleg blisko natury —
                z dobrą ceną i świetnymi opiniami. Po prostu jedź.
              </p>

              {/* Stats strip */}
              <div className="mt-7 flex flex-wrap justify-center gap-3 lg:justify-start">
                {[
                  { val: "500+", label: "ofert w puli", icon: "🏡", green: false },
                  { val: "★ 4.8+", label: "średnia ocen", icon: "⭐", green: true },
                  { val: "100%", label: "blisko natury", icon: "🌲", green: false },
                ].map(({ val, label, icon, green }) => (
                  <div
                    key={label}
                    className={cn(
                      "rounded-2xl px-4 py-3.5 text-center backdrop-blur-sm",
                      "border bg-white/[0.07]",
                      green
                        ? "border-[rgba(74,222,128,.22)] shadow-[0_0_18px_rgba(74,222,128,.08)]"
                        : "border-white/14",
                    )}
                  >
                    <span className="mb-1 block text-[16px] leading-none">{icon}</span>
                    <p
                      className={cn(
                        "text-[22px] font-black leading-none",
                        green ? "text-[#4ade80]" : "text-white",
                      )}
                    >
                      {val}
                    </p>
                    <p className="mt-1.5 text-[12px] font-medium text-white/90">{label}</p>
                  </div>
                ))}
              </div>

              {/* Feature pills */}
              <div className="mt-5 flex flex-wrap justify-center gap-2 lg:justify-start">
                {["✓ Bez rejestracji", "✓ Top oferty", "✓ Najlepsze opinie", "✓ Maks. 2 sekundy"].map(
                  (feat) => (
                    <span
                      key={feat}
                      className="rounded-full border border-[rgba(74,222,128,.18)] bg-[rgba(74,222,128,.07)] px-3 py-1 text-[11px] font-semibold text-[#86efac]"
                    >
                      {feat}
                    </span>
                  ),
                )}
              </div>

              {/* CTA – visible only on desktop (lg+) */}
              <div className="mt-7 hidden lg:block">
                <SpinButton phase={phase} onClick={handleSpin} />
                <p className="mt-3 text-[12px] text-white/75">
                  Losujemy z rekomendowanych ofert · Bez rejestracji
                </p>
              </div>
            </div>

            {/* ── Right: spinning roulette wheel ── */}
            <div className="flex flex-col items-center gap-6">
              {/* Wheel container */}
              <div className="relative h-[250px] w-[250px] sm:h-[290px] sm:w-[290px]">
                {/* Outer glow ring */}
                <div
                  className={cn(
                    "absolute inset-0 rounded-full border-2 transition-all duration-700",
                    isSpinning
                      ? "border-[#4ade80] shadow-[0_0_60px_rgba(74,222,128,.55),inset_0_0_36px_rgba(74,222,128,.12)]"
                      : "border-[#16a34a]/22 shadow-none",
                  )}
                  style={
                    isSpinning
                      ? { animation: "pulse 1.4s ease-in-out infinite" }
                      : undefined
                  }
                />

                {/* Mid ring */}
                <div
                  className={cn(
                    "absolute inset-[22px] rounded-full border transition-all duration-500",
                    isSpinning ? "border-[#16a34a]/45" : "border-[#16a34a]/12",
                  )}
                />

                {/* Inner dashed ring */}
                <div className="absolute inset-[44px] rounded-full border border-dashed border-[#16a34a]/10" />

                {/* Ring emoji badges (clock-face layout) */}
                {RING_ITEMS.map(({ em, label }, i) => {
                  const angle = (i / RING_ITEMS.length) * 2 * Math.PI - Math.PI / 2;
                  const r = 104;
                  const x = Math.cos(angle) * r;
                  const y = Math.sin(angle) * r;
                  return (
                    <span
                      key={label}
                      title={label}
                      aria-hidden
                      className={cn(
                        "absolute flex h-9 w-9 select-none items-center justify-center rounded-full text-[15px]",
                        "border bg-[rgba(22,163,74,.1)] transition-all duration-500",
                        isSpinning
                          ? "border-[rgba(74,222,128,.38)] shadow-[0_0_14px_rgba(74,222,128,.35)]"
                          : "border-[rgba(22,163,74,.18)]",
                      )}
                      style={{
                        left: `calc(50% + ${x}px - 18px)`,
                        top: `calc(50% + ${y}px - 18px)`,
                        ...(isSpinning
                          ? { animation: `pulse 1.4s ${i * 90}ms ease-in-out infinite` }
                          : undefined),
                      }}
                    >
                      {em}
                    </span>
                  );
                })}

                {/* Center emoji disc */}
                <div
                  className={cn(
                    "absolute left-1/2 top-1/2 flex h-[100px] w-[100px] -translate-x-1/2 -translate-y-1/2",
                    "items-center justify-center rounded-full",
                    "bg-[linear-gradient(135deg,rgba(22,163,74,.2),rgba(74,222,128,.1))]",
                    "border border-[rgba(22,163,74,.32)] transition-all duration-500",
                    isSpinning &&
                      "shadow-[0_0_70px_rgba(74,222,128,.65),inset_0_0_20px_rgba(74,222,128,.1)]",
                  )}
                >
                  <span
                    className={cn(
                      "select-none text-[50px] transition-all duration-150",
                      isSpinning && "animate-spin",
                    )}
                    style={isSpinning ? { animationDuration: "0.4s" } : undefined}
                  >
                    {emoji}
                  </span>
                </div>
              </div>

              {/* CTA + hint – visible only on mobile (< lg) */}
              <div className="flex flex-col items-center gap-2 lg:hidden">
                <SpinButton phase={phase} onClick={handleSpin} />
                <p className="text-[12px] text-white/75">Bez rejestracji · Losowe oferty</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Offer popup */}
      {phase === "result" && result && (
        <OfferPopup listing={result} onDismiss={handleDismiss} onReSpin={handleReSpin} />
      )}
    </>
  );
}
