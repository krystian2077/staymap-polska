import { Suspense } from "react";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { LoginForm } from "./LoginForm";

export default function LoginPage() {
  return (
    <div className="flex min-h-full items-center justify-center px-4 py-10">
      <Suspense
        fallback={
          <div className="flex items-center gap-2 text-text-muted">
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
