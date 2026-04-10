import Link from "next/link";

export default function HostLandingPage() {
  return (
    <main className="mx-auto max-w-[980px] px-6 py-16 md:px-8">
      <p className="text-sm font-bold uppercase tracking-[.18em] text-[#7a8f84]">Panel gospodarza</p>
      <h1 className="mt-3 text-3xl font-black tracking-[-.04em] text-[#0a2e1a] md:text-5xl">
        Zostań gospodarzem na StayMap
      </h1>
      <p className="mt-6 max-w-[640px] text-[15px] leading-8 text-[#3d4f45]">
        To jest główny punkt wejścia do panelu gospodarza. Po zalogowaniu zobaczysz dashboard,
        statystyki, rezerwacje i narzędzia do dodawania ofert.
      </p>
      <div className="mt-10 flex flex-wrap gap-3">
        <Link href="/host/dashboard" className="rounded-[12px] bg-[#0a2e1a] px-5 py-3 text-sm font-bold text-white">
          Przejdź do panelu
        </Link>
        <Link href="/host/new-listing" className="rounded-[12px] border border-[#e4ebe7] px-5 py-3 text-sm font-bold text-[#0a2e1a]">
          Dodaj nową ofertę
        </Link>
      </div>
    </main>
  );
}

