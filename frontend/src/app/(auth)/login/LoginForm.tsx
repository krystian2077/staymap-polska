"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { setAuthTokens } from "@/lib/authStorage";
import { api } from "@/lib/api";
import { requestGoogleCredential } from "@/lib/googleIdentity";
import { useAuthStore } from "@/lib/store/authStore";

const schema = z.object({
  email: z.string().email("Podaj poprawny e-mail"),
  password: z.string().min(6, "Min. 6 znaków"),
});

type Form = z.infer<typeof schema>;

function safeNext(raw: string | null): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return "/";
  return raw;
}

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = safeNext(searchParams.get("next"));
  const setUser = useAuthStore((s) => s.setUser);
  const [showPw, setShowPw] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Form>({ resolver: zodResolver(schema) });

  async function onSubmit(data: Form) {
    setFormError(null);
    try {
      const tokens = await api.post<{ access: string; refresh: string }>(
        "/api/v1/auth/login/",
        { email: data.email, password: data.password }
      );
      setAuthTokens(tokens.access, tokens.refresh);
      const me = await api.get<{
        data: { id: string; email: string; first_name: string; last_name: string };
      }>("/api/v1/auth/me/");
      if (me.data) setUser(me.data);
      router.push(next);
      router.refresh();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Błąd logowania");
    }
  }

  async function onGoogleLogin() {
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
      router.push(next);
      router.refresh();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Błąd logowania Google");
    } finally {
      setIsGoogleSubmitting(false);
    }
  }

  const regHref = next !== "/" ? `/register?next=${encodeURIComponent(next)}` : "/register";

  return (
    <div className="animate-scale-in w-full max-w-[460px] overflow-hidden rounded-[22px] border border-gray-200 bg-white shadow-[0_20px_60px_rgba(0,0,0,.10)] lg:max-w-[920px] lg:grid lg:grid-cols-[1fr_1fr] lg:rounded-[28px]">

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
            <h2 className="text-[32px] font-black leading-tight text-white">Witaj z powrotem!</h2>
            <p className="mt-3 text-base leading-relaxed text-green-100/80">
              Zaloguj się i kontynuuj odkrywanie najlepszych miejsc noclegowych w Polsce.
            </p>
          </div>
          <div className="space-y-3.5">
            {[
              { icon: "🔍", text: "Inteligentne wyszukiwanie noclegów" },
              { icon: "⭐", text: "Twoje ulubione miejsca w jednym miejscu" },
              { icon: "🤖", text: "StayMap AI — asystent podróży" },
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
        <div className="mb-6 text-center lg:hidden">
          <Link href="/" className="inline-flex items-baseline text-xl font-extrabold">
            <span className="text-brand-dark">StayMap</span>
            <span className="text-brand">.</span>
          </Link>
        </div>

        <h1 className="text-center text-[24px] font-extrabold tracking-tight text-text sm:text-[26px] lg:text-left lg:text-[28px]">
          Zaloguj się
        </h1>
        <p className="mb-6 mt-1 text-center text-sm text-text-muted lg:text-left lg:text-base">
          Nie masz konta?{" "}
          <Link href={regHref} className="font-bold text-brand hover:underline">
            Zarejestruj się
          </Link>
        </p>

        {formError && (
          <div className="mb-5 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
            <span aria-hidden>⚠</span>
            {formError}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 lg:space-y-5">
          <div>
            <label className="mb-1.5 block text-[13px] font-semibold text-text lg:text-sm">E-mail</label>
            <input
              type="email"
              className="input min-h-[48px] lg:min-h-[52px] lg:text-base"
              autoComplete="email"
              {...register("email")}
            />
            {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>}
          </div>
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label className="text-[13px] font-semibold text-text lg:text-sm">Hasło</label>
              <span className="cursor-not-allowed text-xs text-brand opacity-60">Zapomniałem hasła</span>
            </div>
            <div className="relative">
              <input
                type={showPw ? "text" : "password"}
                className="input min-h-[48px] pr-16 lg:min-h-[52px] lg:text-base"
                autoComplete="current-password"
                {...register("password")}
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 min-h-[34px] -translate-y-1/2 rounded-md px-2 text-xs font-semibold text-text-muted"
                onClick={() => setShowPw(!showPw)}
              >
                {showPw ? "Ukryj" : "Pokaż"}
              </button>
            </div>
            {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>}
          </div>
          <button
            type="submit"
            disabled={isSubmitting}
            className="btn-primary mt-1 w-full py-3.5 text-[15px] lg:py-4 lg:text-base"
          >
            {isSubmitting ? (
              <span className="flex items-center justify-center gap-2">
                <LoadingSpinner className="h-5 w-5 text-white" />
                Logowanie…
              </span>
            ) : (
              "Zaloguj się"
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
          onClick={onGoogleLogin}
          disabled={isSubmitting || isGoogleSubmitting}
        >
          {isGoogleSubmitting ? "Łączenie z Google…" : "Kontynuuj z Google"}
        </button>
      </div>
    </div>
  );
}
