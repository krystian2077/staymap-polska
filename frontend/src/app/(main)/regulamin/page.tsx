import Link from "next/link";

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-[840px] px-6 py-16 md:px-8">
      <p className="text-sm font-bold uppercase tracking-[.18em] text-[#7a8f84]">
        StayMap Polska
      </p>
      <h1 className="mt-3 text-3xl font-black tracking-[-.04em] text-[#0a2e1a] md:text-5xl">
        Regulamin
      </h1>
      <div className="mt-8 space-y-5 text-[15px] leading-8 text-[#3d4f45]">
        <p>
          Niniejszy regulamin określa zasady korzystania z platformy StayMap, w tym wyszukiwania
          noclegów, komunikacji oraz dokonywania rezerwacji.
        </p>
        <p>
          Jeśli masz pytania związane z zasadami korzystania z platformy, odwiedź naszą stronę
          pomocy lub skontaktuj się z zespołem wsparcia.
        </p>
      </div>
      <div className="mt-10">
        <Link href="/pomoc" className="rounded-[12px] bg-[#0a2e1a] px-5 py-3 text-sm font-bold text-white">
          Przejdź do pomocy
        </Link>
      </div>
    </main>
  );
}

