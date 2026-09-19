import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { DestinationRail } from "@/components/destination/destination-rail";
import { buildMetadata } from "@/lib/seo/metadata";
import { HUB_ORIGINS, originFromSlug } from "@/lib/seo/programmatic";
import { discover } from "@/lib/travel/discover";

export const revalidate = 3600;

export function generateStaticParams() {
  return HUB_ORIGINS.map((origin) => ({ origin }));
}

export async function generateMetadata({ params }: PageProps<"/weekend-getaways/[origin]">): Promise<Metadata> {
  const o = await originFromSlug((await params).origin);
  if (!o) return {};
  return buildMetadata({
    title: `Weekend getaways from ${o.city}: short-flight trips with costs`,
    description: `Three-night escapes within about five hours of ${o.city}, with estimated costs and the best time to go.`,
    path: `/weekend-getaways/${(await params).origin}`,
  });
}

export default async function WeekendPage({ params }: PageProps<"/weekend-getaways/[origin]">) {
  const slug = (await params).origin;
  const o = await originFromSlug(slug);
  if (!o) notFound();
  const res = await discover({ origin: o.iata, budget: 2500, nights: 3, travellers: 2, interests: [], style: "MID_RANGE" }, 30);
  const near = res.items.filter((i) => i.flightHours <= 5.5);
  // Thin-content guard: only publish when there is a real set of options.
  if (near.length < 3) notFound();
  const path = `/weekend-getaways/${slug}`;
  return (
    <div className="mx-auto max-w-7xl space-y-10 px-4 py-10 sm:px-6 lg:px-8">
      <div>
        <Breadcrumbs items={[{ name: "Home", path: "/" }, { name: `Weekend getaways from ${o.city}`, path }]} />
        <h1 className="mt-4 text-3xl font-bold sm:text-4xl">Weekend getaways from {o.city}</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">Three-night trips with flights of about five hours or less each way. Costs are estimates for two travellers.</p>
      </div>
      <DestinationRail id="wk" title="Best short escapes" items={near.slice(0, 8).map((i) => ({ destination: i, fromUsd: i.cost.total, fromLabel: "3 nights" }))} />
    </div>
  );
}
