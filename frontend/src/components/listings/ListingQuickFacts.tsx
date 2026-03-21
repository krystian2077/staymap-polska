import type { Listing } from "@/types/listing";

const policyShort: Record<Listing["cancellation_policy"], string> = {
  flexible: "Elastyczna",
  moderate: "Umiarkowana",
  strict: "Ścisła",
  non_refundable: "Bezzwrotna",
};

type Props = {
  listing: Listing;
};

export function ListingQuickFacts({ listing }: Props) {
  const pol = policyShort[listing.cancellation_policy] ?? listing.cancellation_policy;
  return (
    <div className="mb-7 grid grid-cols-2 gap-2 sm:grid-cols-4">
      <div className="rounded-xl border border-brand-border bg-brand-surface px-3 py-2.5 text-center sm:text-left">
        <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Zameldowanie</p>
        <p className="mt-0.5 text-sm font-extrabold text-brand-dark">{listing.check_in_time}</p>
      </div>
      <div className="rounded-xl border border-brand-border bg-brand-surface px-3 py-2.5 text-center sm:text-left">
        <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Wymeldowanie</p>
        <p className="mt-0.5 text-sm font-extrabold text-brand-dark">{listing.check_out_time}</p>
      </div>
      <div className="rounded-xl border border-brand-border bg-brand-surface px-3 py-2.5 text-center sm:text-left">
        <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Goście</p>
        <p className="mt-0.5 text-sm font-extrabold text-brand-dark">do {listing.max_guests}</p>
      </div>
      <div className="rounded-xl border border-brand-border bg-brand-surface px-3 py-2.5 text-center sm:text-left">
        <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Anulowanie</p>
        <p className="mt-0.5 text-sm font-extrabold text-brand-dark">{pol}</p>
      </div>
    </div>
  );
}
