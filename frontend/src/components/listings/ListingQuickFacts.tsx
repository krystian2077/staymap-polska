import type { Listing } from "@/types/listing";

const policyShort: Record<Listing["cancellation_policy"], string> = {
  flexible: "Elastyczna",
  moderate: "Umiarkowana",
  strict: "Ścisła",
  non_refundable: "Bezzwrotna",
};

type Props = {
  listing: Listing;
  sidebar?: boolean;
};

export function ListingQuickFacts({ listing, sidebar }: Props) {
  const pol = policyShort[listing.cancellation_policy] ?? listing.cancellation_policy;
  
  if (sidebar) {
    return (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-1">
        <QuickFactItem
          icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />}
          label="Typ obiektu"
          value={listing.listing_type.name}
        />
        <QuickFactItem
          icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />}
          label="Sypialnie"
          value={`${listing.bedrooms} ${listing.bedrooms === 1 ? 'Sypialnia' : 'Sypialnie'}`}
        />
        <QuickFactItem
          icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />}
          label="Dla kogo"
          value={`do ${listing.max_guests} osób`}
        />
        <QuickFactItem
          icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A3.323 3.323 0 0010.603 2L2 2v8.603a3.323 3.323 0 002.016 3.015L10.746 15l1.396.35c.102.025.204.05.306.075" />}
          label="Anulowanie"
          value={pol}
        />
      </div>
    );
  }

  return (
    <div className="mb-10 grid grid-cols-2 gap-4 sm:grid-cols-4">
      <QuickFactItem
        icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />}
        label="Typ obiektu"
        value={listing.listing_type.name}
      />
      <QuickFactItem
        icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />}
        label="Sypialnie"
        value={`${listing.bedrooms} ${listing.bedrooms === 1 ? 'Sypialnia' : 'Sypialnie'}`}
      />
      <QuickFactItem
        icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />}
        label="Dla kogo"
        value={`do ${listing.max_guests} osób`}
      />
      <QuickFactItem
        icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A3.323 3.323 0 0010.603 2L2 2v8.603a3.323 3.323 0 002.016 3.015L10.746 15l1.396.35c.102.025.204.05.306.075" />}
        label="Anulowanie"
        value={pol}
      />
    </div>
  );
}

function QuickFactItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="group relative overflow-hidden rounded-3xl border border-black/[0.03] bg-white p-5 transition-all duration-300 hover:-translate-y-1 hover:border-brand/20 hover:shadow-[0_15px_30px_rgba(0,0,0,0.05)]">
      <div className="mb-3.5 flex h-10 w-10 items-center justify-center rounded-xl bg-brand/5 text-brand group-hover:bg-brand group-hover:text-white transition-all duration-300 group-hover:scale-110">
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          {icon}
        </svg>
      </div>
      <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-gray-400">{label}</p>
      <p className="mt-1 text-[17px] font-black text-brand-dark">{value}</p>
      <div className="absolute -bottom-1 -right-1 h-12 w-12 translate-x-4 translate-y-4 rounded-full bg-brand/5 transition-transform group-hover:scale-150" />
    </div>
  );
}
