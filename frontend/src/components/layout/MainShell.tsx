"use client";

import { AuthCrossTabSync } from "@/components/auth/AuthCrossTabSync";
import { CompareBar } from "@/components/compare/CompareBar";

export function MainShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AuthCrossTabSync />
      <div
        className="min-h-[calc(100dvh-88px)]"
        style={{ paddingBottom: "var(--compare-bar-pad, 0px)" }}
      >
        {children}
      </div>
      <CompareBar />
    </>
  );
}
