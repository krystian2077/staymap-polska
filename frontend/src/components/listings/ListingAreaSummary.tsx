type Props = {
  text: string;
};

/** Krótki „location intel” z API — cache 7 dni, może zawierać wskazówki z OSM. */
export function ListingAreaSummary({ text }: Props) {
  const t = text.trim();
  if (!t) return null;
  return (
    <section
      className="mb-8 rounded-[14px] border border-brand-border/80 bg-gradient-to-br from-[#f0fdf4]/90 to-brand-surface px-5 py-4 shadow-sm"
      aria-labelledby="listing-area-summary-heading"
    >
      <h2
        id="listing-area-summary-heading"
        className="mb-2 text-xs font-extrabold uppercase tracking-[0.12em] text-brand"
      >
        Okolica w skrócie
      </h2>
      <p className="text-[15px] leading-relaxed text-gray-700">{t}</p>
    </section>
  );
}
