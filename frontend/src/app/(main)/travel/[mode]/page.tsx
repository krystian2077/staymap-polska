import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ListingCard } from "@/components/listings/ListingCard";
import { Footer } from "@/components/layout/Footer";
import { apiUrl } from "@/lib/api";

const MODES: Record<
  string,
  {
    emoji: string;
    headline: string;
    description: string;
    gradient: string;
    bgColor: string;
    accentColor: string;
    tagline: string;
    benefits: string[];
  }
> = {
  romantic: {
    emoji: "💑",
    headline: "Noclegi dla par",
    description: "Kameralne domki z jacuzzi i kominkiem — na rocznicę lub spontaniczny wypad we dwoje.",
    gradient: "from-rose-500 to-red-600",
    bgColor: "from-rose-50 to-rose-100",
    accentColor: "rose",
    tagline: "Atmosfera dla dwojga, która zapamiętacie na zawsze",
    benefits: ["Jacuzzi", "Kominek", "Prywatność", "Romantyczne otoczenie"],
  },
  family: {
    emoji: "👨‍👩‍👧",
    headline: "Noclegi dla rodzin z dziećmi",
    description: "Przestronne domki z placem zabaw przy jeziorze lub w górach. Bezpieczne i duże.",
    gradient: "from-sky-500 to-blue-600",
    bgColor: "from-sky-50 to-blue-100",
    accentColor: "sky",
    tagline: "Bezpieczeństwo, wygoda i zabawy dla całej rodziny",
    benefits: ["Plac zabaw", "Bezpieczne otoczenie", "Duże przestrzenie", "Dla dzieci"],
  },
  pet: {
    emoji: "🐕",
    headline: "Noclegi przyjazne zwierzętom",
    description: "Obiekty gdzie Twój pies jest mile widziany — ogrodzone tereny, lasy, swoboda.",
    gradient: "from-amber-500 to-orange-600",
    bgColor: "from-amber-50 to-orange-100",
    accentColor: "amber",
    tagline: "Twój pupil będzie tak szczęśliwy, że nie będzie chciał wyjechać",
    benefits: ["Ogrodzone tereny", "Blisko lasów", "Spacery", "Przyjazne właściciele"],
  },
  workation: {
    emoji: "💻",
    headline: "Praca zdalna w pięknym miejscu",
    description: "Szybki internet, biurko, spokój do skupienia — i widok który inspiruje.",
    gradient: "from-indigo-500 to-purple-600",
    bgColor: "from-indigo-50 to-purple-100",
    accentColor: "indigo",
    tagline: "Produktywność z widokiem, o którym marzyłeś",
    benefits: ["Szybki WiFi", "Biurko", "Spokojne otoczenie", "Niezawodny Internet"],
  },
  slow: {
    emoji: "🌿",
    headline: "Noclegi do oddechu i relaksu",
    description: "Agroturystyki, leśne domki, głęboka cisza i brak zasięgu jako feature.",
    gradient: "from-emerald-500 to-teal-600",
    bgColor: "from-emerald-50 to-teal-100",
    accentColor: "emerald",
    tagline: "Reset od rzeczywistości w otoczeniu naturalnej piękności",
    benefits: ["Cisza", "Natura", "Agroturystyka", "Detox"],
  },
  outdoor: {
    emoji: "🚵",
    headline: "Noclegi dla aktywnych",
    description: "Baza wypadowa na szlaki, trasy rowerowe, kajaki. Garaże na rowery.",
    gradient: "from-orange-500 to-amber-600",
    bgColor: "from-orange-50 to-amber-100",
    accentColor: "orange",
    tagline: "Baza do przygód, które będziesz opowiadać przez całe życie",
    benefits: ["Szlaki", "Rowery", "Kajaki", "Przechownia sprzętu"],
  },
  lake: {
    emoji: "🌊",
    headline: "Domki i apartamenty nad jeziorem",
    description: "Własny pomost, kajak przy domu, wschód słońca nad wodą. Mazury, Kaszuby.",
    gradient: "from-cyan-500 to-blue-600",
    bgColor: "from-cyan-50 to-blue-100",
    accentColor: "cyan",
    tagline: "Budzisz się nad wodą, zasypiasz z szumem fal",
    benefits: ["Pomost", "Kajaki", "Plaża", "Wschody słońca"],
  },
  mountains: {
    emoji: "🏔️",
    headline: "Noclegi w polskich górach",
    description: "Tatry, Beskidy, Bieszczady, Karkonosze — domki z widokiem, sauna po szlaku.",
    gradient: "from-slate-500 to-gray-700",
    bgColor: "from-slate-50 to-gray-100",
    accentColor: "slate",
    tagline: "Widoki, które robią wrażenie, wysoko nad codziennością",
    benefits: ["Szczyty", "Sauna", "Narty", "Panoramiczne widoki"],
  },
  wellness: {
    emoji: "🧖",
    headline: "Noclegi z sauną i jacuzzi",
    description: "Prywatna bania, jacuzzi, masaże — prawdziwy reset bez wychodzenia z domku.",
    gradient: "from-purple-500 to-pink-600",
    bgColor: "from-purple-50 to-pink-100",
    accentColor: "purple",
    tagline: "Spa na wsi — czysty luksus i całkowity relaks",
    benefits: ["Sauna", "Jacuzzi", "Basen", "Wellness"],
  },
};

export function generateStaticParams() {
  return Object.keys(MODES).map((mode) => ({ mode }));
}

export function generateMetadata({ params }: { params: { mode: string } }): Metadata {
  const m = MODES[params.mode];
  if (!m) return {};
  return {
    title: `${m.headline} | StayMap Polska`,
    description: m.description,
    openGraph: { title: `${m.headline} | StayMap Polska`, description: m.description },
  };
}

export default async function TravelModePage({ params }: { params: { mode: string } }) {
  const meta = MODES[params.mode];
  if (!meta) notFound();

  const url = apiUrl(
    `/api/v1/search/?travel_mode=${params.mode}&ordering=recommended&page_size=12`
  );
  console.log(`[TravelModePage] Fetching listings for ${params.mode} from: ${url}`);
  type ListingCardItem = Parameters<typeof ListingCard>[0]["listing"];
  let listings: ListingCardItem[] = [];

  try {
    const res = await fetch(url, { next: { revalidate: 60 } });
    console.log(`[TravelModePage] Response status: ${res.status}`);
    if (res.ok) {
      const data = await res.json();
      console.log(`[TravelModePage] Data received keys:`, Object.keys(data));
      listings = (data?.data ?? data?.results ?? []) as ListingCardItem[];
      console.log(`[TravelModePage] Listings count: ${listings.length}`);
    } else {
      const errorText = await res.text();
      console.error(`[TravelModePage] API error: ${errorText}`);
    }
  } catch (err) {
    console.error("[TravelModePage] Fetch error:", err);
  }

  return (
    <div className="min-h-screen bg-white dark:bg-[var(--background)]">
      {/* Hero Section */}
      <section className={`relative overflow-hidden bg-gradient-to-br ${meta.bgColor} py-14 dark:from-[var(--bg2)] dark:to-[var(--bg)] sm:py-20 md:py-32`}>
        {/* Animated Background Decorative Elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div
            className={`absolute -left-32 -top-32 h-72 w-72 rounded-full bg-gradient-to-r ${meta.gradient} opacity-20 blur-3xl`}
          />
          <div className={`absolute -right-32 -bottom-32 h-72 w-72 rounded-full bg-gradient-to-r ${meta.gradient} opacity-15 blur-3xl`} />
        </div>

        <div className="relative z-10 mx-auto max-w-[1360px] px-4 text-center sm:px-6 md:px-12">
          {/* Back Button */}
          <div className="mb-8 flex justify-center">
            <Link
              href="/travel"
              className="group inline-flex items-center gap-2 rounded-full border border-gray-300 bg-white/80 px-6 py-2.5 text-sm font-bold text-gray-700 backdrop-blur-sm transition-all duration-300 hover:border-gray-400 hover:bg-white hover:shadow-lg dark:border-white/25 dark:bg-[var(--bg3)]/90 dark:text-white dark:hover:bg-[var(--bg2)]"
            >
              <span className="transition-transform group-hover:-translate-x-1">←</span>
              <span>Wróć do trybów</span>
            </Link>
          </div>

          {/* Main Emoji */}
          <div className="mb-8 inline-block animate-bounce text-[clamp(72px,22vw,120px)] drop-shadow-2xl motion-reduce:animate-none">
            {meta.emoji}
          </div>

          {/* Heading */}
          <h1 className="mb-6 text-[clamp(36px,6vw,64px)] font-black leading-[1.1] tracking-tight text-gray-900 dark:text-white">
            {meta.headline}
          </h1>

          {/* Tagline */}
          <p className={`mx-auto mb-8 max-w-2xl bg-gradient-to-r ${meta.gradient} bg-clip-text text-lg font-bold text-transparent md:text-xl`}>
            {meta.tagline}
          </p>

          {/* Description */}
          <p className="mx-auto max-w-2xl text-lg leading-relaxed text-gray-700 dark:text-white/78 md:text-[17px]">
            {meta.description}
          </p>

          {/* Benefits Pills */}
          <div className="mt-10 flex flex-wrap justify-center gap-3 sm:mt-12">
            {meta.benefits.map((benefit) => (
              <div
                key={benefit}
                className={`inline-flex min-h-[44px] items-center gap-2 rounded-full bg-white px-4 py-2.5 font-bold text-gray-900 shadow-md transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5 dark:border dark:border-white/20 dark:bg-[var(--bg3)] dark:text-white dark:shadow-[0_12px_30px_-18px_rgba(0,0,0,.55)] motion-reduce:hover:translate-y-0`}
              >
                <span>✨</span>
                <span>{benefit}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Listings Grid */}
      <main className="mx-auto max-w-[1360px] px-4 py-14 sm:px-6 sm:py-20 md:px-12 md:py-28">
        {/* Header */}
        <div className="mb-16 flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
          <div>
            <h2 className="mb-3 text-[clamp(28px,5vw,42px)] font-black text-gray-900 dark:text-white">
              Oferty na miarę Twoich marzeń
            </h2>
            <p className="text-lg text-gray-600 dark:text-white/72">
              {listings.length > 0
                ? `Znaleźliśmy ${listings.length} niesamowitych miejsc dla Ciebie`
                : "Czytaj dalej — mamy coś dla każdego"}
            </p>
          </div>

          {/* See All Button */}
          {listings.length > 0 && (
            <Link
              href={`/search?travel_mode=${params.mode}&ordering=recommended`}
              className="group inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-brand to-emerald-500 px-8 py-4 font-bold text-white shadow-lg transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 md:whitespace-nowrap"
            >
              <span>Zobacz wszystkie</span>
              <span className="transition-transform group-hover:translate-x-1">→</span>
            </Link>
          )}
        </div>

        {/* Listings Grid or Empty State */}
        {listings.length > 0 ? (
          <div className="grid gap-6 sm:grid-cols-2 sm:gap-8 lg:grid-cols-3 xl:grid-cols-4">
            {listings.map((listing, idx: number) => (
              <div key={listing.id} style={{ animationDelay: `${idx * 0.08}s` }} className="animate-fade-up">
                <ListingCard listing={listing} />
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-3xl border-2 border-dashed border-gray-300 bg-gray-50 py-32 text-center dark:border-white/20 dark:bg-[var(--bg2)]">
            <div className="mb-6 text-6xl">🔍</div>
            <h3 className="mb-2 text-2xl font-bold text-gray-900 dark:text-white">Chwilowo brak dedykowanych ofert</h3>
            <p className="mb-8 max-w-md text-gray-600 dark:text-white/72">
              Ale nie martw się! Mamy wiele wspaniałych miejsc, które mogą Ci się spodobać. Sprawdź inne propozycje w
              naszym wyszukiwarce.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                href="/search"
                className="group inline-flex items-center justify-center gap-2 rounded-full bg-brand px-8 py-3 font-bold text-white transition-all hover:shadow-lg hover:-translate-y-1"
              >
                <span>Odkryj wszystkie noclegi</span>
                <span className="transition-transform group-hover:translate-x-1">→</span>
              </Link>
              <Link
                href="/ai"
                className="group inline-flex items-center justify-center gap-2 rounded-full border-2 border-brand bg-white px-8 py-3 font-bold text-brand transition-all hover:bg-brand-surface hover:shadow-lg hover:-translate-y-1 dark:border-white/25 dark:bg-[var(--bg3)] dark:text-white dark:hover:bg-[var(--bg)]"
              >
                <span>Spróbuj AI</span>
                <span>✨</span>
              </Link>
            </div>
          </div>
        )}

        {/* CTA Section */}
        {listings.length > 0 && (
          <div className="mt-20 text-center md:hidden">
            <Link
              href={`/search?travel_mode=${params.mode}&ordering=recommended`}
              className="group inline-flex w-full items-center justify-center gap-2 rounded-full bg-brand px-8 py-4 font-bold text-white shadow-lg transition-all hover:shadow-2xl hover:-translate-y-1"
            >
              <span>Pokaż wszystkie oferty</span>
              <span className="transition-transform group-hover:translate-x-1">→</span>
            </Link>
          </div>
        )}
      </main>

      {/* Bottom CTA Section */}
      <section className="relative overflow-hidden bg-gradient-to-r from-brand via-emerald-500 to-brand px-4 py-16 text-center sm:px-6 sm:py-20 md:px-12 md:py-28">
        <div className="relative z-10 mx-auto max-w-2xl">
          <h2 className="mb-6 text-[clamp(28px,5vw,48px)] font-black leading-tight text-white">
            Jeszcze nie wiesz, jaki tryb pasuje do Ciebie?
          </h2>
          <p className="mb-10 text-lg text-white/90">
            Nasz inteligentny asystent AI dopasuje idealne miejsce do Twoich preferencji w kilka sekund.
          </p>
          <Link
            href="/ai"
            className="group inline-flex items-center gap-3 rounded-full bg-white px-8 py-4 font-bold text-brand shadow-2xl transition-all duration-300 hover:shadow-3xl hover:-translate-y-2"
          >
            <span>StayMap AI</span>
            <span className="transition-transform group-hover:scale-125">✨</span>
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
}
