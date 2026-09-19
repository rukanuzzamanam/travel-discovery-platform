import Link from "next/link";
import { buildMetadata } from "@/lib/seo/metadata";
import { getActiveDeals } from "@/lib/travel/repository";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { EstimateBadge } from "@/components/travel/estimate-badge";
import { formatUsd } from "@/lib/utils/format";

export const revalidate = 1800;

export const metadata = buildMetadata({
  title: "Travel deals: typical fares and where to find cheaper trips",
  description: "Typical fares on popular routes, with links to check live prices. Estimates are labelled clearly.",
  path: "/deals",
});

export default async function DealsPage() {
  const deals = await getActiveDeals();
  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <Breadcrumbs items={[{ name: "Home", path: "/" }, { name: "Deals", path: "/deals" }]} />
      <h1 className="mt-4 text-3xl font-bold sm:text-4xl">Travel deals</h1>
      <p className="mt-2 max-w-2xl text-muted-foreground">
        Prices here are typical fares based on our estimates, not live offers. Use them as a benchmark, then check live prices with our partners.
      </p>
      <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {deals.map((d) => (
          <li key={d.slug}>
            <Link href={`/deals/${d.slug}`} className="block h-full rounded-2xl border bg-card p-5 transition-shadow hover:shadow-md">
              <h2 className="font-semibold">{d.title}</h2>
              {d.fromPriceUsd && (
                <p className="mt-2 flex items-center gap-2">
                  <span className="text-2xl font-bold">{formatUsd(d.fromPriceUsd)}</span>
                  <EstimateBadge label="Typical fare" />
                </p>
              )}
              <p className="mt-2 text-sm text-muted-foreground">{d.description}</p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
