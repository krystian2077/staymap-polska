import { HostBookingsClient } from "@/components/host/HostBookingsClient";

export default function Page() {
  return <HostBookingsClient title="Potwierdzone rezerwacje" statusFilter="confirmed" />;
}
