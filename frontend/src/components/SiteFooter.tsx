import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="border-t border-gray-200 bg-gray-50 px-8 py-6">
      <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-4">
        <Link href="/" className="text-sm font-extrabold text-brand-dark">
          StayMap<span className="text-brand">.</span>
        </Link>
        <div className="flex flex-wrap gap-4 text-sm text-text-secondary">
          <span className="cursor-not-allowed opacity-60">Polityka prywatności</span>
          <span className="cursor-not-allowed opacity-60">Regulamin</span>
          <span className="cursor-not-allowed opacity-60">Pomoc</span>
          <span className="cursor-not-allowed opacity-60">Kontakt</span>
        </div>
        <p className="text-xs text-text-muted">© {new Date().getFullYear()} StayMap Polska</p>
      </div>
    </footer>
  );
}
