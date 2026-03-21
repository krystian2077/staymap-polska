import type { ReactNode } from "react";

export default function AuthLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="min-h-[calc(100dvh-4rem)] bg-[linear-gradient(140deg,#f0fdf4_0%,#fff_55%,#f9fafb_100%)] px-5 py-10">
      {children}
    </div>
  );
}
