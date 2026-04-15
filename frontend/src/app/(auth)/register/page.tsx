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
        data: {
          id: string;
          email: string;
          first_name: string;
          last_name: string;
        };
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
      const tokens = await api.post<{ access: string; refresh: string }>("/api/v1/auth/google/", {
        credential,
      });
      setAuthTokens(tokens.access, tokens.refresh);
      const me = await api.get<{
        data: {
          id: string;
          email: string;
          first_name: string;
          last_name: string;
        };
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
      <div className="animate-scale-in w-full max-w-[430px] rounded-[20px] border border-gray-200 bg-white p-4 shadow-[0_16px_48px_rgba(0,0,0,.08)] sm:rounded-[22px] sm:p-9">
        <div className="mb-5 text-center sm:mb-6">
          <Link href="/" className="inline-flex items-baseline text-xl font-extrabold">
            <span className="text-brand-dark">StayMap</span>
            <span className="text-brand">.</span>
          </Link>
        </div>
        <h1 className="text-center text-[23px] font-extrabold tracking-tight text-text sm:text-[25px]">
          Utwórz konto
        </h1>
        <p className="mb-5 text-center text-sm text-text-muted sm:mb-6">
          Dołącz do tysięcy podróżników w Polsce
        </p>

        {formError && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm font-medium text-red-600">
            {formError}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3.5 sm:space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-[13px] font-semibold">Imię</label>
              <input className="input min-h-[46px]" {...register("first_name")} />
              {errors.first_name && (
                <p className="mt-1 text-xs text-red-600">{errors.first_name.message}</p>
              )}
            </div>
            <div>
              <label className="mb-1.5 block text-[13px] font-semibold">Nazwisko</label>
              <input className="input min-h-[46px]" {...register("last_name")} />
              {errors.last_name && (
                <p className="mt-1 text-xs text-red-600">{errors.last_name.message}</p>
              )}
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-[13px] font-semibold">E-mail</label>
            <input type="email" className="input min-h-[46px]" autoComplete="email" {...register("email")} />
            {errors.email && (
              <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>
            )}
          </div>
          <div>
            <label className="mb-1.5 block text-[13px] font-semibold">Hasło</label>
            <input
              type="password"
              className="input min-h-[46px]"
              autoComplete="new-password"
              {...register("password")}
            />
            <div className="mt-2 flex gap-1">
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className={`h-0.5 flex-1 rounded-sm transition-colors duration-300 ${
                    i < strength ? segColors[Math.max(0, strength - 1)] : "bg-gray-200"
                  }`}
                />
              ))}
            </div>
            {errors.password && (
              <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>
            )}
          </div>
          <button type="submit" disabled={isSubmitting} className="btn-primary w-full py-3 sm:py-3.5">
            {isSubmitting ? (
              <span className="flex items-center justify-center gap-2">
                <LoadingSpinner className="h-5 w-5 text-white" />
                Tworzenie…
              </span>
            ) : (
              "Załóż konto"
            )}
          </button>
        </form>
        <div className="my-5 flex items-center gap-3 text-xs text-text-muted sm:my-6">
          <span className="h-px flex-1 bg-gray-200" />
          lub
          <span className="h-px flex-1 bg-gray-200" />
        </div>
        <button
          type="button"
          className="btn-secondary w-full py-3 text-sm"
          onClick={onGoogleRegister}
          disabled={isSubmitting || isGoogleSubmitting}
        >
          {isGoogleSubmitting ? "Łączenie z Google…" : "Kontynuuj z Google"}
        </button>
        <p className="mt-4 text-center text-[11px] leading-relaxed text-text-muted">
          Rejestrując się akceptujesz{" "}
          <span className="cursor-not-allowed text-brand opacity-80">Regulamin</span> i{" "}
          <span className="cursor-not-allowed text-brand opacity-80">Politykę prywatności</span> StayMap
          Polska.
        </p>
        <p className="mt-5 text-center text-sm text-text-muted">
          Masz już konto?{" "}
          <Link href="/login" className="font-bold text-brand hover:underline">
            Zaloguj się
          </Link>
        </p>
      </div>
    </div>
  );
}
