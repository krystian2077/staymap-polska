import type { ReactNode } from "react";

export default function AuthLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="min-h-[calc(100dvh-var(--nav-h))] bg-[linear-gradient(160deg,#f0fdf4_0%,#ffffff_48%,#f8fafc_100%)] px-3 py-5 sm:px-5 sm:py-10">
      {children}
    </div>
  );
}
