import { redirect } from "next/navigation";

export default function LegacyListingSlug({ params }: { params: { slug: string } }) {
  redirect(`/listing/${params.slug}`);
}
