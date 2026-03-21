import Link from "next/link";

export default function ListingSubmittedPage() {
  return (
    <div className="mx-auto max-w-lg px-6 py-20 text-center">
      <p className="text-4xl">🎉</p>
      <h1 className="mt-4 text-2xl font-extrabold text-brand-dark">Oferta wysłana do moderacji</h1>
      <p className="mt-4 text-sm text-text-secondary">
        Sprawdzimy ją w ciągu ok. 24 godzin. Dostaniesz e-mail z wynikiem.
      </p>
      <div className="mt-10 flex flex-wrap justify-center gap-3">
        <Link href="/host/dashboard" className="btn-primary">
          Wróć do panelu
        </Link>
        <Link href="/host/listings" className="btn-secondary">
          Moje oferty
        </Link>
      </div>
    </div>
  );
}
