"use client";

import { CompareBar } from "@/components/compare/CompareBar";

export function MainShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div
        className="min-h-[calc(100dvh-4rem)]"
        style={{ paddingBottom: "var(--compare-bar-pad, 0px)" }}
      >
        {children}
      </div>
      <CompareBar />
    </>
  );
}
