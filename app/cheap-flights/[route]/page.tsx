import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Plane } from "lucide-react";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { AffiliateLink } from "@/components/affiliate/affiliate-link";
import { EstimateBadge } from "@/components/travel/estimate-badge";
import { Faq } from "@/components/destination/faq";
import { buildMetadata } from "@/lib/seo/metadata";
import { getActiveDeals, getAirport, getDestinationBySlug } from "@/lib/travel/repository";
import { getFlightOptions } from "@/lib/travel/products";
import { flightHours, haversineKm } from "@/lib/travel/estimator";
import { formatMonthRange, formatUsd } from "@/lib/utils/format";

export const revalidate = 1800;

/** Only routes backed by a published deal record get a page (no arbitrary origin/destination combinations). */
async function load(route: string) {
  const deal = (await getActiveDeals()).find((d) => d.slug === route && d.productType === "FLIGHT" && d.origin);
  if (!deal) return null;
  const [origin, dest] = await Promise.all([getAirport(deal.origin!), getDestinationBySlug(deal.destination.slug)]);
  return origin && dest ? { deal, origin, dest } : null;
}

export async function generateStaticParams() {
  try {
    return (await getActiveDeals()).filter((d) => d.productType === "FLIGHT").map((d) => ({ route: d.slug }));
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }: PageProps<"/cheap-flights/[route]">): Promise<Metadata> {
  const r = await load((await params).route);
  if (!r) return {};
  return buildMetadata({
    title: `Cheap flights from ${r.origin.city} to ${r.dest.name}: typical fares and best time`,
    description: `Typical return fares from ${r.origin.city} to ${r.dest.name}, flight time, the cheapest months to go and how to find lower fares.`,
    path: `/cheap-flights/${r.deal.slug}`,
  });
}

export default async function CheapFlightsPage({ params }: PageProps<"/cheap-flights/[route]">) {
  const route = (await params).route;
  const r = await load(route);
  if (!r) notFound();
  const path = `/cheap-flights/${route}`;
  const opts = await getFlightOptions({ origin: r.origin.iata, destinationSlug: r.dest.slug, adults: 1, source: { page: path, component: "cheap-flights" } });
  const hours = flightHours(haversineKm(r.origin, r.dest));
  const faq = [
    { q: `How long is the flight from ${r.origin.city} to ${r.dest.name}?`, a: `Roughly ${hours} hours each way, depending on the route and any stopovers.` },
    { q: `When is it cheapest to fly to ${r.dest.name}?`, a: `Fares tend to be lower outside the best-weather months (${formatMonthRange(r.dest.bestMonths)}) and outside school holidays. Being flexible by a few days often helps.` },
  ];
  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-10 sm:px-6">
      <Breadcrumbs items={[{ name: "Home", path: "/" }, { name: "Deals", path: "/deals" }, { name: `${r.origin.city} to ${r.dest.name}`, path }]} />
      <header>
        <h1 className="text-3xl font-bold sm:text-4xl">
          Cheap flights from {r.origin.city} to {r.dest.name}
        </h1>
        <p className="mt-3 flex flex-wrap items-center gap-2 text-lg">
          Typical return fare: <strong>{formatUsd(opts.estimate.priceUsd)}</strong> <EstimateBadge label="Estimate" />
        </p>
        <p className="mt-1 text-sm text-muted-foreground">{opts.estimate.note}</p>
      </header>

      {opts.providerPrices.length > 0 && (
        <section aria-labelledby="recent">
          <h2 id="recent" className="text-xl font-bold">
            Recently found fares
          </h2>
          <p className="text-sm text-muted-foreground">Cached results from a travel partner. Prices may have changed. Confirm on the partner site.</p>
          <ul className="mt-3 divide-y rounded-xl border bg-card">
            {opts.providerPrices.map((p) => (
              <li key={`${p.priceUsd}-${p.departAt}`} className="flex justify-between p-3">
                <span>{p.departAt ? p.departAt.slice(0, 10) : "Flexible dates"}</span>
                <span className="font-semibold">{formatUsd(p.priceUsd)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <AffiliateLink href={opts.bookPath}>
        <Plane aria-hidden /> Check live fares
      </AffiliateLink>

      <section>
        <h2 className="text-xl font-bold">Trip snapshot</h2>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-muted-foreground">
          <li>Flight time: about {hours} hours each way</li>
          <li>Best time to visit: {formatMonthRange(r.dest.bestMonths)}</li>
          <li>Recommended stay: {r.dest.recommendedDaysMin}–{r.dest.recommendedDaysMax} nights</li>
        </ul>
        <p className="mt-4">
          <Link href={`/destinations/${r.dest.slug}`} className="font-medium text-primary underline">
            {r.dest.name} travel guide and cost estimator
          </Link>
        </p>
      </section>
      <Faq items={faq} />
    </div>
  );
}
