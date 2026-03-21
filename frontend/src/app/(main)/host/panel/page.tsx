import type { Metadata } from "next";
import { HostPanelClient } from "@/components/host/HostPanelClient";

export const metadata: Metadata = {
  title: "Panel gospodarza — StayMap Polska",
  description: "Oferty, rezerwacje i moderacja (admin).",
};

export default function HostPanelPage() {
  return <HostPanelClient />;
}
