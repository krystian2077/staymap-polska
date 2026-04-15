"use client";

import { AuthCrossTabSync } from "@/components/auth/AuthCrossTabSync";
import { CompareBar } from "@/components/compare/CompareBar";
import { GuestMobileNav } from "@/components/layout/GuestMobileNav";

export function MainShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AuthCrossTabSync />
      <div
        className="min-h-[calc(100dvh-var(--nav-h))]"
        style={{
          paddingBottom:
            "calc(var(--compare-bar-pad, 0px) + var(--guest-mobile-nav-pad, 0px) + var(--mobile-safe-bottom))",
        }}
      >
        {children}
      </div>
      <GuestMobileNav />
      <CompareBar />
    </>
  );
}
