import Link from "next/link";

export function HostPlaceholderPage({ title }: { title: string }) {
  return (
    <div className="p-8">
      <h1 className="text-xl font-extrabold text-brand-dark">{title}</h1>
      <p className="mt-2 text-sm text-text-muted">Ta sekcja jest w przygotowaniu.</p>
      <Link href="/host/dashboard" className="btn-primary mt-6 inline-flex">
        Dashboard
      </Link>
    </div>
  );
}
