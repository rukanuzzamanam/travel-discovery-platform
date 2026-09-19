import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Hotel } from "lucide-react";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { AffiliateLink } from "@/components/affiliate/affiliate-link";
import { EstimateBadge } from "@/components/travel/estimate-badge";
import { TrackOnMount } from "@/components/analytics/tracker";
import { buildMetadata } from "@/lib/seo/metadata";
import { getDestinationBySlug, getDestinations } from "@/lib/travel/repository";
import { getHotelOptions } from "@/lib/travel/products";
import { formatMonthRange, formatUsd } from "@/lib/utils/format";

export const revalidate = 3600;

export async function generateStaticParams() {
  try {
    return (await getDestinations()).map((d) => ({ slug: d.slug }));
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }: PageProps<"/hotels/[slug]">): Promise<Metadata> {
  const d = await getDestinationBySlug((await params).slug);
  if (!d) return {};
  return buildMetadata({
    title: `Hotels in ${d.name}: typical prices per night and when to book`,
    description: `Typical ${d.name} hotel prices for budget, mid-range and luxury stays, plus the best time to visit and how to check live availability.`,
    path: `/hotels/${d.slug}`,
    image: d.heroImage,
  });
}

export default async function HotelsInPage({ params }: PageProps<"/hotels/[slug]">) {
  const d = await getDestinationBySlug((await params).slug);
  if (!d) notFound();
  const path = `/hotels/${d.slug}`;
  const opts = await getHotelOptions(d, { page: path, component: "hotels-page" });
  const rows = [
    ["Budget", d.hotelNightBudget],
    ["Mid-range", d.hotelNightMid],
    ["Luxury", d.hotelNightLuxury],
  ] as const;
  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-10 sm:px-6">
      <TrackOnMount name="hotel_result_viewed" destination={d.slug} />
      <Breadcrumbs items={[{ name: "Home", path: "/" }, { name: "Hotels", path: "/hotels" }, { name: d.name, path }]} />
      <header>
        <h1 className="text-3xl font-bold sm:text-4xl">Hotels in {d.name}</h1>
        <p className="mt-2 text-muted-foreground">{d.tagline}</p>
      </header>
      <section aria-labelledby="prices">
        <h2 id="prices" className="flex items-center gap-2 text-xl font-bold">Typical room prices per night <EstimateBadge /></h2>
        <ul className="mt-3 grid gap-3 sm:grid-cols-3">
          {rows.map(([label, v]) => (
            <li key={label} className="rounded-xl border bg-card p-4">
              <p className="text-sm text-muted-foreground">{label}</p>
              <p className="text-2xl font-bold">{formatUsd(v)}</p>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-sm text-muted-foreground">Prices rise in peak season ({formatMonthRange(d.bestMonths)}) and during school holidays.</p>
      </section>
      <AffiliateLink href={opts.bookPath}>
        <Hotel aria-hidden /> Check live hotel prices
      </AffiliateLink>
      <p>
        <Link href={`/destinations/${d.slug}`} className="font-medium text-primary underline">Full {d.name} guide and cost estimator</Link>
      </p>
    </div>
  );
}
