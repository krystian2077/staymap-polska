"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api, refreshSession } from "@/lib/api";
import { getAccessToken } from "@/lib/authStorage";
import { useAuthStore } from "@/lib/store/authStore";

export default function HostOnboardingPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [hasToken, setHasToken] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setHasToken(Boolean(getAccessToken()));
  }, []);

  const activate = async () => {
    setBusy(true);
    setErr(null);
    try {
      await api.post("/api/v1/host/onboarding/start/", {});
      await refreshSession();
      const me = await api.get<{
        data: {
          id: string;
          email: string;
          first_name: string;
          last_name: string;
          is_host?: boolean;
          is_admin?: boolean;
          roles?: string[];
        };
      }>("/api/v1/auth/me/");
      if (me.data) setUser(me.data);
      router.push("/host/dashboard");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Nie udało się aktywować profilu gospodarza.");
    } finally {
      setBusy(false);
    }
  };

  if (user?.is_host) {
    return (
      <main className="mx-auto max-w-[640px] px-8 py-16 text-center">
        <p className="text-sm font-bold uppercase tracking-widest text-brand">
          Host
        </p>
        <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-brand-dark">
          Jesteś już gospodarzem!
        </h1>
        <p className="mt-4 text-text-secondary leading-relaxed">
          Twój profil gospodarza jest aktywny. Przejdź do panelu, aby zarządzać
          ofertami i rezerwacjami.
        </p>
        <div className="mt-10 flex flex-wrap justify-center gap-3">
          <Link href="/host/dashboard" className="btn-primary px-6">
            Przejdź do panelu
          </Link>
          <Link href="/host/new-listing" className="btn-secondary px-6">
            Dodaj ofertę
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-[640px] px-8 py-16 text-center">
      <p className="text-sm font-bold uppercase tracking-widest text-brand">
        Host
      </p>
      <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-brand-dark">
        Zostań gospodarzem
      </h1>
      <p className="mt-4 text-text-secondary leading-relaxed">
        Aktywuj profil gospodarza, aby zarządzać ofertami, rezerwacjami i
        zarabiać na swojej nieruchomości.
      </p>

      {err && (
        <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {err}
        </p>
      )}

      <div className="mt-10 flex flex-wrap justify-center gap-3">
        {hasToken ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => void activate()}
            className="btn-primary px-6 py-3 disabled:opacity-60"
          >
            {busy ? "Aktywowanie…" : "Aktywuj profil gospodarza"}
          </button>
        ) : (
          <Link href="/login?next=/host/onboarding" className="btn-primary px-6 py-3">
            Zaloguj się, aby zostać gospodarzem
          </Link>
        )}
        <Link href="/search" className="btn-secondary px-6">
          Przeglądaj oferty
        </Link>
      </div>
    </main>
  );
}
