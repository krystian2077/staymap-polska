import { redirect } from "next/navigation";

export default function LegacyBookingSuccess({ params }: { params: { id: string } }) {
  redirect(`/booking/${params.id}/success`);
}
