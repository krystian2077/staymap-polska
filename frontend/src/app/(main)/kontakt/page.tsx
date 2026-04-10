export default function ContactPage() {
  return (
    <main className="mx-auto max-w-[840px] px-6 py-16 md:px-8">
      <p className="text-sm font-bold uppercase tracking-[.18em] text-[#7a8f84]">
        StayMap Polska
      </p>
      <h1 className="mt-3 text-3xl font-black tracking-[-.04em] text-[#0a2e1a] md:text-5xl">
        Kontakt
      </h1>
      <div className="mt-8 space-y-5 text-[15px] leading-8 text-[#3d4f45]">
        <p>
          Masz pytanie dotyczące ofert, współpracy lub działania platformy? Napisz do naszego
          zespołu lub skorzystaj z formularza kontaktowego.
        </p>
        <p>
          E-mail: <a className="font-semibold text-[#16a34a]" href="mailto:kontakt@staymap.pl">kontakt@staymap.pl</a>
          <br />
          Godziny wsparcia: poniedziałek–piątek, 9:00–17:00
        </p>
      </div>
    </main>
  );
}

