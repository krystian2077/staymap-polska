import type { Metadata } from "next";
import { BookingsPageClient } from "./BookingsPageClient";

export const metadata: Metadata = {
  title: "Moje rezerwacje — StayMap Polska",
  description: "Lista Twoich rezerwacji i statusów płatności.",
};

export default function BookingsPage() {
  return <BookingsPageClient />;
}
