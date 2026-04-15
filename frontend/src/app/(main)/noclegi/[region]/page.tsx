import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Footer } from "@/components/layout/Footer";
import { apiUrl } from "@/lib/api";
import RegionPageClient, { type RegionPageData } from "./RegionPageClient";

const REGIONS = ["mazury", "tatry", "bieszczady", "baltyk", "karkonosze"] as const;

export function generateStaticParams() {
  return REGIONS.map((region) => ({ region }));
}

export async function generateMetadata({
  params,
}: {
  params: { region: string };
}): Promise<Metadata> {
  const { region } = params;
  const res = await fetch(apiUrl(`/api/v1/search/regions/${region}/`), {
    next: { revalidate: 3600 },
  });
  if (!res.ok) return {};
  const data = (await res.json()) as { title?: string; description?: string };
  const title = data.title ?? region;
  const desc = data.description ?? "";
  return {
    title: `Noclegi ${title} — domki, apartamenty | StayMap`,
    description: desc,
    openGraph: {
      title: `Noclegi ${title} | StayMap Polska`,
      description: desc,
    },
  };
}

export default async function RegionPage({
  params,
}: {
  params: { region: string };
}) {
  const { region } = params;
  const res = await fetch(apiUrl(`/api/v1/search/regions/${region}/`), {
    next: { revalidate: 3600 },
  });
  if (!res.ok) notFound();
  const data = (await res.json()) as RegionPageData;

  return (
    <>
      <RegionPageClient data={data} />
      <Footer />
    </>
  );
}
