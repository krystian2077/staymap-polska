import type { Metadata } from "next";
import { Suspense } from "react";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { AccountPageClient } from "./AccountPageClient";

export const metadata: Metadata = {
  title: "Moje konto — StayMap Polska",
  description: "Profil, rezerwacje i ustawienia konta.",
};

export default function AccountPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 px-4">
          <LoadingSpinner className="h-12 w-12 text-brand" />
          <p className="text-sm font-medium text-text-secondary">Ładowanie…</p>
        </div>
      }
    >
      <AccountPageClient />
    </Suspense>
  );
}
