import Link from "next/link";

export default function HelpPage() {
  return (
    <main className="mx-auto max-w-[840px] px-6 py-16 md:px-8">
      <p className="text-sm font-bold uppercase tracking-[.18em] text-[#7a8f84]">
        StayMap Polska
      </p>
      <h1 className="mt-3 text-3xl font-black tracking-[-.04em] text-[#0a2e1a] md:text-5xl">
        Pomoc
      </h1>
      <div className="mt-8 space-y-5 text-[15px] leading-8 text-[#3d4f45]">
        <p>
          Potrzebujesz wsparcia przy rezerwacji, płatności lub ustawieniach konta? Zebraliśmy
          najważniejsze informacje w jednym miejscu.
        </p>
        <p>
          Jeśli nie znalazłeś odpowiedzi, napisz do nas — odpowiadamy najszybciej, jak to
          możliwe.
        </p>
      </div>
      <div className="mt-10">
        <Link href="/kontakt" className="rounded-[12px] bg-[#16a34a] px-5 py-3 text-sm font-bold text-white">
          Skontaktuj się z nami
        </Link>
      </div>
    </main>
  );
}

