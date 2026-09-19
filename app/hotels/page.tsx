import Link from "next/link";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { buildMetadata } from "@/lib/seo/metadata";
import { getDestinations } from "@/lib/travel/repository";
import { formatUsd } from "@/lib/utils/format";

export const revalidate = 3600;

export const metadata = buildMetadata({
  title: "Hotels: typical nightly prices by destination",
  description: "Typical budget, mid-range and luxury hotel prices per night across our destinations, with links to check live availability.",
  path: "/hotels",
});

export default async function HotelsPage() {
  const list = await getDestinations();
  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <Breadcrumbs items={[{ name: "Home", path: "/" }, { name: "Hotels", path: "/hotels" }]} />
      <h1 className="mt-4 text-3xl font-bold sm:text-4xl">Hotels</h1>
      <p className="mt-2 max-w-2xl text-muted-foreground">Estimated typical room prices per night (USD). Providers show current availability and final pricing.</p>
      <div className="mt-8 overflow-x-auto rounded-xl border bg-card">
        <table className="w-full text-left text-sm">
          <caption className="sr-only">Estimated hotel prices per night by destination</caption>
          <thead className="bg-muted/60 text-muted-foreground">
            <tr>
              <th scope="col" className="px-4 py-3">Destination</th>
              <th scope="col" className="px-4 py-3">Budget</th>
              <th scope="col" className="px-4 py-3">Mid-range</th>
              <th scope="col" className="px-4 py-3">Luxury</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {list.map((d) => (
              <tr key={d.slug}>
                <th scope="row" className="px-4 py-3 font-medium">
                  <Link href={`/hotels/${d.slug}`} className="text-primary hover:underline">{d.name}</Link>
                </th>
                <td className="px-4 py-3 tabular-nums">{formatUsd(d.hotelNightBudget)}</td>
                <td className="px-4 py-3 tabular-nums">{formatUsd(d.hotelNightMid)}</td>
                <td className="px-4 py-3 tabular-nums">{formatUsd(d.hotelNightLuxury)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
