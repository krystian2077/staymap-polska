import type { Metadata } from "next";
import { AccountPageClient } from "./AccountPageClient";

export const metadata: Metadata = {
  title: "Moje konto — StayMap Polska",
  description: "Profil, rezerwacje i ustawienia konta.",
};

export default function AccountPage() {
  return <AccountPageClient />;
}
