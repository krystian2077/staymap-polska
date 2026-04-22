"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { setAuthTokens } from "@/lib/authStorage";
import { api } from "@/lib/api";
import { requestGoogleCredential } from "@/lib/googleIdentity";
import { useAuthStore } from "@/lib/store/authStore";

const schema = z.object({
  first_name: z.string().min(2, "Min. 2 znaki"),
  last_name: z.string().min(2, "Min. 2 znaki"),
  email: z.string().email("Niepoprawny e-mail"),
  password: z.string().min(8, "Min. 8 znaków"),
});

type Form = z.infer<typeof schema>;

function passwordStrength(pw: string): number {
  let s = 0;
  if (pw.length >= 8) s++;
  if (/[A-Z]/.test(pw)) s++;
  if (/[0-9]/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  return Math.min(4, s);
}

export default function RegisterPage() {
  const router = useRouter();
  const setUser = useAuthStore((s) => s.setUser);
  const [formError, setFormError] = useState<string | null>(null);
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<Form>({ resolver: zodResolver(schema) });

  const pw = watch("password") || "";
  const strength = useMemo(() => passwordStrength(pw), [pw]);
  const segColors = ["bg-red-500", "bg-amber-500", "bg-green-500", "bg-brand"];

  async function onSubmit(data: Form) {
    setFormError(null);
    try {
      await api.post("/api/v1/auth/register/", {
        email: data.email,
        password: data.password,
        first_name: data.first_name,
        last_name: data.last_name,
      });
      const tokens = await api.post<{ access: string; refresh: string }>(
        "/api/v1/auth/login/",
        { email: data.email, password: data.password }
      );
      setAuthTokens(tokens.access, tokens.refresh);
      const me = await api.get<{
        data: { id: string; email: string; first_name: string; last_name: string };
      }>("/api/v1/auth/me/");
      if (me.data) setUser(me.data);
      router.push("/");
      router.refresh();
    } catch (e) {
      const err = e as Error & {
        field?: string | null;
        payload?: { error?: { field?: string | null } };
      };
      const field = err.field ?? err.payload?.error?.field;
      if (field === "email") {
        setError("email", { message: "Ten e-mail jest już zajęty" });
      }
      setFormError(err.message || "Błąd rejestracji");
    }
  }

  async function onGoogleRegister() {
    const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";
    setFormError(null);
    setIsGoogleSubmitting(true);
    try {
      const credential = await requestGoogleCredential(googleClientId);
      const tokens = await api.post<{ access: string; refresh: string }>("/api/v1/auth/google/", { credential });
      setAuthTokens(tokens.access, tokens.refresh);
      const me = await api.get<{
        data: { id: string; email: string; first_name: string; last_name: string };
      }>("/api/v1/auth/me/");
      if (me.data) setUser(me.data);
      router.push("/");
      router.refresh();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Błąd logowania Google");
    } finally {
      setIsGoogleSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-full items-start justify-center pb-[calc(1.2rem+var(--mobile-safe-bottom))] pt-1.5 sm:items-center">
      <div className="animate-scale-in w-full max-w-[460px] overflow-hidden rounded-[22px] border border-gray-200 bg-white shadow-[0_20px_60px_rgba(0,0,0,.10)] lg:max-w-[960px] lg:grid lg:grid-cols-[5fr_6fr] lg:rounded-[28px]">

        {/* Dekoracyjny panel - tylko desktop */}
        <div className="hidden lg:flex lg:flex-col lg:justify-between bg-gradient-to-br from-[#071c10] via-[#0f4d24] to-[#16a34a] p-12 text-white relative overflow-hidden">
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle at 70% 20%, #22c55e 0%, transparent 60%), radial-gradient(circle at 20% 80%, #15803d 0%, transparent 50%)" }} />
          <div className="relative">
            <Link href="/" className="inline-flex items-baseline">
              <span className="text-[28px] font-black text-white">StayMap</span>
              <span className="text-[28px] font-black text-green-300">.</span>
            </Link>
          </div>
          <div className="relative space-y-6">
            <div>
              <h2 className="text-[32px] font-black leading-tight text-white">Dołącz do nas!</h2>
              <p className="mt-3 text-base leading-relaxed text-green-100/80">
                Tysiące podróżników już odkrywa Polskę razem ze StayMap.
              </p>
            </div>
            <div className="space-y-3.5">
              {[
                { icon: "🗺️", text: "Odkrywaj unikalne noclegi w całej Polsce" },
                { icon: "💚", text: "Zapisuj ulubione miejsca i porównuj oferty" },
                { icon: "🤖", text: "StayMap AI dopasuje noclegi do Twoich planów" },
                { icon: "🔒", text: "Bezpieczne rezerwacje i płatności" },
              ].map((f) => (
                <div key={f.text} className="flex items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-base">{f.icon}</span>
                  <span className="text-sm font-medium text-green-50">{f.text}</span>
                </div>
              ))}
            </div>
          </div>
          <p className="relative text-xs text-green-200/40">© 2026 StayMap Polska</p>
        </div>

        {/* Panel formularza */}
        <div className="p-6 sm:p-9 lg:p-12">
          <div className="mb-5 text-center lg:hidden">
            <Link href="/" className="inline-flex items-baseline text-xl font-extrabold">
              <span className="text-brand-dark">StayMap</span>
              <span className="text-brand">.</span>
            </Link>
          </div>

          <h1 className="text-center text-[24px] font-extrabold tracking-tight text-text sm:text-[26px] lg:text-left lg:text-[28px]">
            Utwórz konto
          </h1>
          <p className="mb-6 mt-1 text-center text-sm text-text-muted lg:text-left lg:text-base">
            Masz już konto?{" "}
            <Link href="/login" className="font-bold text-brand hover:underline">
              Zaloguj się
            </Link>
          </p>

          {formError && (
            <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
              {formError}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 lg:space-y-5">
            <div className="grid grid-cols-2 gap-3 lg:gap-4">
              <div>
                <label className="mb-1.5 block text-[13px] font-semibold lg:text-sm">Imię</label>
                <input className="input min-h-[48px] lg:min-h-[52px] lg:text-base" autoComplete="given-name" {...register("first_name")} />
                {errors.first_name && <p className="mt-1 text-xs text-red-600">{errors.first_name.message}</p>}
              </div>
              <div>
                <label className="mb-1.5 block text-[13px] font-semibold lg:text-sm">Nazwisko</label>
                <input className="input min-h-[48px] lg:min-h-[52px] lg:text-base" autoComplete="family-name" {...register("last_name")} />
                {errors.last_name && <p className="mt-1 text-xs text-red-600">{errors.last_name.message}</p>}
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-[13px] font-semibold lg:text-sm">E-mail</label>
              <input
                type="email"
                className="input min-h-[48px] lg:min-h-[52px] lg:text-base"
                autoComplete="email"
                {...register("email")}
              />
              {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>}
            </div>
            <div>
              <label className="mb-1.5 block text-[13px] font-semibold lg:text-sm">Hasło</label>
              <input
                type="password"
                className="input min-h-[48px] lg:min-h-[52px] lg:text-base"
                autoComplete="new-password"
                {...register("password")}
              />
              <div className="mt-2 flex gap-1">
                {[0, 1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className={`h-1 flex-1 rounded-sm transition-colors duration-300 ${
                      i < strength ? segColors[Math.max(0, strength - 1)] : "bg-gray-200"
                    }`}
                  />
                ))}
              </div>
              {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>}
            </div>
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary w-full py-3.5 lg:py-4 lg:text-base"
            >
              {isSubmitting ? (
                <span className="flex items-center justify-center gap-2">
                  <LoadingSpinner className="h-5 w-5 text-white" />
                  Tworzenie konta…
                </span>
              ) : (
                "Załóż konto"
              )}
            </button>
          </form>

          <div className="my-5 flex items-center gap-3 text-xs text-text-muted lg:my-6">
            <span className="h-px flex-1 bg-gray-200" />
            lub
            <span className="h-px flex-1 bg-gray-200" />
          </div>

          <button
            type="button"
            className="btn-secondary w-full py-3.5 text-sm lg:py-4 lg:text-base"
            onClick={onGoogleRegister}
            disabled={isSubmitting || isGoogleSubmitting}
          >
            {isGoogleSubmitting ? "Łączenie z Google…" : "Kontynuuj z Google"}
          </button>

          <p className="mt-4 text-center text-[11px] leading-relaxed text-text-muted lg:text-xs">
            Rejestrując się akceptujesz{" "}
            <span className="cursor-not-allowed text-brand opacity-80">Regulamin</span> i{" "}
            <span className="cursor-not-allowed text-brand opacity-80">Politykę prywatności</span> StayMap Polska.
          </p>
        </div>
      </div>
    </div>
  );
}
