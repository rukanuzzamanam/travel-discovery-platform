import Link from "next/link";
import { Plane } from "lucide-react";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { AffiliateLink } from "@/components/affiliate/affiliate-link";
import { EstimateBadge } from "@/components/travel/estimate-badge";
import { TrackOnMount } from "@/components/analytics/tracker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { buildMetadata } from "@/lib/seo/metadata";
import { getActiveDeals, getAirports, getDestinations } from "@/lib/travel/repository";
import { getFlightOptions } from "@/lib/travel/products";
import { DEFAULT_ORIGIN } from "@/lib/site";
import { formatUsd } from "@/lib/utils/format";
import type { Metadata } from "next";

// The index is indexable; result variants (with query params) are canonicalised to /flights and noindexed.
export async function generateMetadata({ searchParams }: PageProps<"/flights">): Promise<Metadata> {
  const sp = await searchParams;
  const hasQuery = !!sp.origin || !!sp.destination;
  return { ...buildMetadata({ title: "Flights: estimated fares and live price checks", description: "Compare typical fares to popular destinations and check live prices with our booking partners.", path: "/flights" }), ...(hasQuery ? { robots: { index: false, follow: true } } : {}) };
}

export default async function FlightsPage({ searchParams }: PageProps<"/flights">) {
  const sp = await searchParams;
  const str = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : undefined);
  const [airports, destinations, deals] = await Promise.all([getAirports(), getDestinations(), getActiveDeals()]);
  const origin = (str("origin") ?? DEFAULT_ORIGIN).toUpperCase();
  const dest = str("destination");
  const valid = dest && /^[A-Z]{3}$/.test(origin) && destinations.some((d) => d.slug === dest);
  const result = valid
    ? await getFlightOptions({ origin, destinationSlug: dest, departDate: str("departDate"), returnDate: str("returnDate"), adults: Number(str("adults")) || 1, source: { page: "/flights", component: "flights-search" } })
    : null;

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      {result && <TrackOnMount name="flight_result_viewed" destination={dest} />}
      <Breadcrumbs items={[{ name: "Home", path: "/" }, { name: "Flights", path: "/flights" }]} />
      <h1 className="mt-4 text-3xl font-bold sm:text-4xl">Flights</h1>
      <p className="mt-2 max-w-2xl text-muted-foreground">See a typical fare for your route, then check live prices with our partner.</p>

      <form action="/flights" className="mt-6 grid gap-4 rounded-2xl border bg-card p-5 sm:grid-cols-2 lg:grid-cols-5">
        <div className="space-y-1.5">
          <Label htmlFor="f-origin">From</Label>
          <NativeSelect id="f-origin" name="origin" defaultValue={origin}>
            {airports.map((a) => (
              <option key={a.iata} value={a.iata}>{a.city} ({a.iata})</option>
            ))}
          </NativeSelect>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="f-dest">To</Label>
          <NativeSelect id="f-dest" name="destination" defaultValue={dest ?? ""} required>
            <option value="" disabled>Choose destination</option>
            {destinations.map((d) => (
              <option key={d.slug} value={d.slug}>{d.name}</option>
            ))}
          </NativeSelect>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="f-dep">Depart</Label>
          <Input id="f-dep" type="date" name="departDate" defaultValue={str("departDate")} className="h-11" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="f-ret">Return</Label>
          <Input id="f-ret" type="date" name="returnDate" defaultValue={str("returnDate")} className="h-11" />
        </div>
        <div className="flex items-end">
          <Button type="submit" size="xl" className="w-full">Search</Button>
        </div>
      </form>

      {result && (
        <section className="mt-8 rounded-2xl border bg-card p-6" aria-labelledby="res">
          <h2 id="res" className="text-xl font-bold">{result.origin} → {result.destination}</h2>
          <p className="mt-2 flex flex-wrap items-center gap-2">
            Typical return fare: <strong className="text-2xl">{formatUsd(result.estimate.priceUsd)}</strong> <EstimateBadge />
          </p>
          <p className="text-sm text-muted-foreground">{result.estimate.note}</p>
          {result.providerPrices.length > 0 && (
            <div className="mt-4">
              <h3 className="font-semibold">Recently found by our partner</h3>
              <p className="text-xs text-muted-foreground">Cached fares. They may have changed. Confirm before booking.</p>
              <ul className="mt-2 divide-y rounded-lg border">
                {result.providerPrices.map((p) => (
                  <li key={`${p.priceUsd}-${p.departAt}`} className="flex justify-between p-3 text-sm">
                    <span>{p.departAt?.slice(0, 10) ?? "Flexible"}{p.airline ? ` · ${p.airline}` : ""}</span>
                    <span className="font-semibold">{formatUsd(p.priceUsd)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className="mt-5">
            <AffiliateLink href={result.bookPath}><Plane aria-hidden /> Check live prices</AffiliateLink>
          </div>
        </section>
      )}

      <section className="mt-12" aria-labelledby="pop">
        <h2 id="pop" className="text-2xl font-bold">Popular routes</h2>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {deals.filter((d) => d.productType === "FLIGHT").map((d) => (
            <li key={d.slug}>
              <Link href={`/cheap-flights/${d.slug}`} className="flex items-center justify-between rounded-xl border bg-card p-4 hover:shadow-md">
                <span className="font-medium">{d.title}</span>
                {d.fromPriceUsd && <span className="text-sm">~{formatUsd(d.fromPriceUsd)}</span>}
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
