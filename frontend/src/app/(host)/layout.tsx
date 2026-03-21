import { HostLayoutClient } from "./HostLayoutClient";

export default function HostGroupLayout({ children }: { children: React.ReactNode }) {
  return <HostLayoutClient>{children}</HostLayoutClient>;
}
