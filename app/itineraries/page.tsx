import Link from "next/link";
import { buildMetadata } from "@/lib/seo/metadata";
import { getPublishedItineraries } from "@/lib/travel/repository";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";

export const revalidate = 3600;

export const metadata = buildMetadata({
  title: "Travel itineraries: day-by-day plans with estimated costs",
  description: "Ready-made itineraries for popular destinations. Customise any plan and see your estimated total.",
  path: "/itineraries",
});

export default async function ItinerariesPage() {
  const list = await getPublishedItineraries();
  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <Breadcrumbs items={[{ name: "Home", path: "/" }, { name: "Itineraries", path: "/itineraries" }]} />
      <h1 className="mt-4 text-3xl font-bold sm:text-4xl">Itineraries</h1>
      <p className="mt-2 text-muted-foreground">Day-by-day plans you can customise.</p>
      <ul className="mt-8 grid gap-4 sm:grid-cols-2">
        {list.map((i) => (
          <li key={i.slug}>
            <Link href={`/itineraries/${i.slug}`} className="block h-full rounded-2xl border bg-card p-5 transition-shadow hover:shadow-md">
              <p className="text-xs font-medium text-primary">{i.destination.name} · {i.durationDays} days</p>
              <h2 className="mt-1 text-lg font-semibold">{i.title}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{i.description}</p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
