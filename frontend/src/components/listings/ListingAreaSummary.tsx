type Props = {
  text: string;
};

/** Krótki „location intel” z API — cache 7 dni, może zawierać wskazówki z OSM. */
export function ListingAreaSummary({ text }: Props) {
  const t = text.trim();
  if (!t) return null;
  return (
    <section
      className="mb-10 group relative overflow-hidden rounded-[3rem] border border-brand/20 bg-gradient-to-br from-brand-950 via-brand-900 to-brand-800 p-10 shadow-2xl transition-all hover:shadow-brand/20 hover:border-brand/40 ring-1 ring-white/5"
      aria-labelledby="listing-area-summary-heading"
    >
      <div className="absolute -right-8 -top-8 h-48 w-48 rounded-full bg-brand-light/10 blur-2xl transition-transform duration-1000 group-hover:scale-150 group-hover:rotate-12" />
      <div className="absolute -left-10 -bottom-10 h-40 w-40 rounded-full bg-brand-light/5 blur-xl transition-transform duration-1000 group-hover:scale-125" />
      
      <h2
        id="listing-area-summary-heading"
        className="mb-8 flex items-center gap-3 text-[14px] font-black uppercase tracking-[0.3em] text-brand-light/90"
      >
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-brand-light shadow-inner ring-1 ring-white/10 group-hover:scale-110 transition-transform">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </span>
        Okolica w skrócie
      </h2>
      <p className="relative z-10 text-[19px] font-medium leading-[1.8] text-white/95 tracking-tight drop-shadow-sm">{t}</p>
    </section>
  );
}
