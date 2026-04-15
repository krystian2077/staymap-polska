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
        data: {
          id: string;
          email: string;
          first_name: string;
          last_name: string;
        };
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
    <div className="animate-scale-in w-full max-w-[430px] rounded-[22px] border border-gray-200 bg-white p-9 shadow-[0_16px_48px_rgba(0,0,0,.08)]">
      <div className="mb-6 text-center">
        <Link href="/" className="inline-flex items-baseline text-xl font-extrabold">
          <span className="text-brand-dark">StayMap</span>
          <span className="text-brand">.</span>
        </Link>
      </div>
      <h1 className="text-center text-[25px] font-extrabold tracking-tight text-text">Witaj z powrotem</h1>
      <p className="mb-6 text-center text-sm text-text-muted">Zaloguj się do swojego konta</p>

      {formError && (
        <div className="mb-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm font-medium text-red-600">
          <span aria-hidden>⚠</span>
          {formError}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="mb-1.5 block text-[13px] font-semibold text-text">E-mail</label>
          <input type="email" className="input" autoComplete="email" {...register("email")} />
          {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>}
        </div>
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <label className="text-[13px] font-semibold text-text">Hasło</label>
            <span className="cursor-not-allowed text-xs text-brand opacity-60">Zapomniałem hasła</span>
          </div>
          <div className="relative">
            <input
              type={showPw ? "text" : "password"}
              className="input pr-10"
              autoComplete="current-password"
              {...register("password")}
            />
            <button
              type="button"
              className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-text-muted"
              onClick={() => setShowPw(!showPw)}
            >
              {showPw ? "Ukryj" : "Pokaż"}
            </button>
          </div>
          {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>}
        </div>
        <button type="submit" disabled={isSubmitting} className="btn-primary mt-1 w-full py-3 text-[15px]">
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

      <div className="my-6 flex items-center gap-3 text-xs text-text-muted">
        <span className="h-px flex-1 bg-gray-200" />
        lub
        <span className="h-px flex-1 bg-gray-200" />
      </div>
      <button
        type="button"
        className="btn-secondary w-full py-3 text-sm"
        onClick={onGoogleLogin}
        disabled={isSubmitting || isGoogleSubmitting}
      >
        {isGoogleSubmitting ? "Łączenie z Google…" : "Kontynuuj z Google"}
      </button>
      <p className="mt-6 text-center text-sm text-text-muted">
        Nie masz konta?{" "}
        <Link href={regHref} className="font-bold text-brand hover:underline">
          Zarejestruj się
        </Link>
      </p>
    </div>
  );
}
