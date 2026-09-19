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

export async function generateMetadata({ params }: PageProps<"/travel-from/[origin]">): Promise<Metadata> {
  const o = await originFromSlug((await params).origin);
  if (!o) return {};
  return buildMetadata({
    title: `Where to travel from ${o.city}: destinations, costs and best times`,
    description: `Trip ideas from ${o.city} with estimated costs for a week away, flight times and the best season for each destination.`,
    path: `/travel-from/${(await params).origin}`,
  });
}

export default async function TravelFromPage({ params }: PageProps<"/travel-from/[origin]">) {
  const slug = (await params).origin;
  const o = await originFromSlug(slug);
  if (!o) notFound();
  const res = await discover({ origin: o.iata, budget: 3000, nights: 7, travellers: 2, interests: [], style: "MID_RANGE" }, 12);
  const items = res.items.map((i) => ({ destination: i, fromUsd: i.cost.total, fromLabel: "7 nights, 2 travellers" }));
  if (items.length < 3) notFound();
  const path = `/travel-from/${slug}`;
  return (
    <div className="mx-auto max-w-7xl space-y-10 px-4 py-10 sm:px-6 lg:px-8">
      <div>
        <Breadcrumbs items={[{ name: "Home", path: "/" }, { name: `Travel from ${o.city}`, path }]} />
        <h1 className="mt-4 text-3xl font-bold sm:text-4xl">Where to travel from {o.city}</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Destinations ranked for a week away from {o.city} ({o.iata}), with estimated total trip costs for two travellers. Estimates use typical prices for the
          current month; live fares vary.
        </p>
      </div>
      <DestinationRail id="all" title={`Trip ideas from ${o.city}`} items={items.slice(0, 4)} />
      <DestinationRail id="more" title="More destinations" items={items.slice(4, 8)} />
      <DestinationRail id="even-more" title="Further afield" items={items.slice(8, 12)} />
    </div>
  );
}
