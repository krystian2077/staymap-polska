import { Suspense } from "react";
import SearchPageClient from "@/components/search/SearchPageClient";

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center text-neutral-500">
          Ładowanie wyszukiwarki…
        </div>
      }
    >
      <SearchPageClient />
    </Suspense>
  );
}
