import Link from "next/link";

export default function PrivacyPolicyPage() {
  return (
    <main className="mx-auto max-w-[840px] px-6 py-16 md:px-8">
      <p className="text-sm font-bold uppercase tracking-[.18em] text-[#7a8f84]">StayMap Polska</p>
      <h1 className="mt-3 text-3xl font-black tracking-[-.04em] text-[#0a2e1a] md:text-5xl">Polityka prywatności</h1>
      <section className="mt-8 space-y-5 text-[15px] leading-8 text-[#3d4f45]">
        <p>
          Ta strona zbiera informacje o tym, w jaki sposób przetwarzamy dane użytkowników, aby umożliwić
          rezerwacje, komunikację i personalizację ofert.
        </p>
        <p>
          W sprawach dotyczących danych osobowych skontaktuj się z nami przez stronę kontaktową lub wróć na
          stronę główną.
        </p>
      </section>
      <div className="mt-10 flex flex-wrap gap-3">
        <Link href="/kontakt" className="rounded-[12px] bg-[#16a34a] px-5 py-3 text-sm font-bold text-white">
          Kontakt
        </Link>
        <Link href="/" className="rounded-[12px] border border-[#e4ebe7] px-5 py-3 text-sm font-bold text-[#0a2e1a]">
          Wróć do strony głównej
        </Link>
      </div>
    </main>
  );
}
