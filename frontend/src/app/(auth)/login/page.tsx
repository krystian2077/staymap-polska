import { Suspense } from "react";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { LoginForm } from "./LoginForm";

export default function LoginPage() {
  return (
    <div className="flex min-h-full items-start justify-center px-2 pb-[calc(1.2rem+var(--mobile-safe-bottom))] pt-2 sm:items-center sm:px-4 sm:py-10">
      <Suspense
        fallback={
          <div className="flex items-center gap-2 text-sm text-text-muted">
            <LoadingSpinner className="h-6 w-6 text-brand" />
            Ładowanie…
          </div>
        }
      >
        <LoginForm />
      </Suspense>
    </div>
  );
}
