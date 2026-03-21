import Link from "next/link";
import { apiUrl } from "@/lib/api";

type ListingRow = {
  id: string;
  title: string;
  slug: string;
  base_price: string;
  currency: string;
  status: string;
};

type ListingsResponse = {
  data: ListingRow[];
  meta: { next: string | null; previous: string | null };
};

async function loadListings(): Promise<ListingsResponse | null> {
  try {
    const res = await fetch(`${apiUrl("/api/v1/listings/")}`, {
      cache: "no-store",
    });
    if (!res.ok) return null;
    return (await res.json()) as ListingsResponse;
  } catch {
    return null;
  }
}

export default async function Home() {
  const listings = await loadListings();

  return (
    <main className="mx-auto min-h-screen max-w-3xl px-4 py-12">
      <header className="mb-10 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-widest text-neutral-500">
            Etap 1–2
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">StayMap Polska</h1>
        </div>
        <nav className="flex flex-wrap gap-4 text-sm">
          <Link href="/search" className="font-medium text-emerald-800 underline dark:text-emerald-400">
            Wyszukiwarka / mapa
          </Link>
          <Link href="/login" className="underline">
            Logowanie
          </Link>
          <Link href="/register" className="underline">
            Rejestracja
          </Link>
        </nav>
      </header>

      <section>
        <h2 className="mb-4 text-lg font-medium">Publiczne oferty</h2>
        {!listings && (
          <p className="text-neutral-600 dark:text-neutral-400">
            Nie udało się połączyć z API. Uruchom backend (
            <code className="rounded bg-neutral-100 px-1 dark:bg-neutral-800">
              make dev
            </code>
            ) i odśwież stronę.
          </p>
        )}
        {listings && listings.data.length === 0 && (
          <p className="text-neutral-600 dark:text-neutral-400">
            Brak zatwierdzonych ofert. Zaloguj się i dodaj ofertę przez API lub admin.
          </p>
        )}
        {listings && listings.data.length > 0 && (
          <ul className="space-y-3">
            {listings.data.map((l) => (
              <li
                key={l.id}
                className="rounded-lg border border-neutral-200 p-4 dark:border-neutral-700"
              >
                <Link href={`/listings/${l.slug}`} className="font-medium hover:underline">
                  {l.title}
                </Link>
                <p className="text-sm text-neutral-600 dark:text-neutral-400">
                  {l.base_price} {l.currency} / noc · {l.status}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
