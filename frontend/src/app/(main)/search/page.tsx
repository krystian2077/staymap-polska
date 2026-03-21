import { Suspense } from "react";
import SearchPageClient from "@/components/search/SearchPageClient";

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[50vh] items-center justify-center text-text-muted">
          Ładowanie wyszukiwarki…
        </div>
      }
    >
      <SearchPageClient />
    </Suspense>
  );
}
