import Link from "next/link";

export default function ListingSubmittedPage() {
  return (
    <div className="mx-auto max-w-lg px-6 py-20 text-center">
      <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-brand-surface ring-4 ring-brand/10">
        <span className="text-4xl">🎉</span>
      </div>
      <h1 className="mt-6 text-2xl font-extrabold text-brand-dark">Oferta opublikowana</h1>
      <p className="mt-3 text-sm leading-relaxed text-text-secondary">
        Gratulacje! Twoja oferta jest już dostępna i może pojawiać się w wynikach wyszukiwania.
      </p>
      <div className="mt-10 flex flex-wrap justify-center gap-3">
        <Link href="/host/dashboard" className="btn-primary shadow-brand-lg">
          Wróć do panelu
        </Link>
        <Link href="/host/listings" className="btn-secondary shadow-card ring-1 ring-black/[.04]">
          Moje oferty
        </Link>
      </div>
    </div>
  );
}
