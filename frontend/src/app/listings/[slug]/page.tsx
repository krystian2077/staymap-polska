import Link from "next/link";
import { apiUrl } from "@/lib/api";

type ListingImage = {
  id: string;
  url: string | null;
  is_cover: boolean;
  sort_order: number;
};

type ListingDetail = {
  id: string;
  title: string;
  slug: string;
  description: string;
  base_price: string;
  currency: string;
  status: string;
  max_guests: number;
  booking_mode: string;
  images?: ListingImage[];
  location: {
    lat: number;
    lng: number;
    city: string;
    region: string;
    country: string;
  } | null;
};

type DetailResponse = { data: ListingDetail; meta: Record<string, never> };

export default async function ListingDetailPage({
  params,
}: {
  params: { slug: string };
}) {
  const res = await fetch(apiUrl(`/api/v1/listings/${params.slug}/`), {
    cache: "no-store",
  });
  if (!res.ok) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-12">
        <p>Nie znaleziono oferty.</p>
        <Link href="/" className="mt-4 inline-block underline">
          Strona główna
        </Link>
      </main>
    );
  }
  const { data: l } = (await res.json()) as DetailResponse;

  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <Link href="/" className="text-sm underline">
        ← Oferty
      </Link>
      <h1 className="mt-4 text-3xl font-semibold tracking-tight">{l.title}</h1>
      <p className="mt-2 text-neutral-600 dark:text-neutral-400">
        {l.base_price} {l.currency} / noc · do {l.max_guests} os. · {l.status}
      </p>
      {l.location && (
        <p className="mt-2 text-sm text-neutral-500">
          {l.location.city}
          {l.location.region ? `, ${l.location.region}` : ""} · {l.location.lat.toFixed(4)},{" "}
          {l.location.lng.toFixed(4)}
        </p>
      )}
      {l.images && l.images.length > 0 && (
        <div className="mt-8 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {l.images.map((img) =>
            img.url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={img.id}
                src={img.url}
                alt=""
                className="aspect-video w-full rounded-lg object-cover"
              />
            ) : null
          )}
        </div>
      )}
      <article className="prose prose-neutral mt-8 max-w-none dark:prose-invert">
        <p className="whitespace-pre-wrap">{l.description || "Brak opisu."}</p>
      </article>
    </main>
  );
}
