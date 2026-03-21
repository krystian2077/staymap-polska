import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Zostań gospodarzem — StayMap Polska",
  description: "Onboarding gospodarza i panel hosta.",
};

export default function HostOnboardingPlaceholderPage() {
  return (
    <main className="mx-auto max-w-[640px] px-8 py-16 text-center">
      <p className="text-sm font-bold uppercase tracking-widest text-brand">Host</p>
      <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-brand-dark">
        Zostań gospodarzem
      </h1>
      <p className="mt-4 text-text-secondary leading-relaxed">
        Aktywuj profil gospodarza w panelu (endpoint <code className="text-xs">POST /api/v1/host/onboarding/start/</code>
        ), następnie zarządzaj ofertami i rezerwacjami.
      </p>
      <div className="mt-10 flex flex-wrap justify-center gap-3">
        <Link href="/host/panel" className="btn-primary px-6">
          Otwórz panel gospodarza
        </Link>
        <Link href="/search" className="btn-secondary px-6">
          Przeglądaj oferty
        </Link>
      </div>
    </main>
  );
}
