import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto max-w-lg px-5 py-20 text-center">
      <h1 className="text-2xl font-extrabold text-brand-dark">Nie znaleziono oferty</h1>
      <p className="mt-3 text-gray-600">Sprawdź link lub wróć do wyszukiwarki.</p>
      <Link href="/search" className="btn-primary mt-8 inline-block px-6 py-3">
        Wyszukiwarka
      </Link>
    </main>
  );
}
