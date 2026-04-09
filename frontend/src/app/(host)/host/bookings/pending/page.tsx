import { HostBookingsClient } from "@/components/host/HostBookingsClient";

export default function Page() {
  return <HostBookingsClient title="Oczekujące rezerwacje" statusFilter="pending" />;
}
