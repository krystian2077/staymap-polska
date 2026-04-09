"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

export default function HostPanelRedirectPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/host/dashboard");
  }, [router]);

  return (
    <div className="flex justify-center py-24">
      <LoadingSpinner className="h-10 w-10 text-brand" />
    </div>
  );
}
