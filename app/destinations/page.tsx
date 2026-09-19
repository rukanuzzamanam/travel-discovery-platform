import { buildMetadata } from "@/lib/seo/metadata";
import { getDestinations } from "@/lib/travel/repository";
import { DestinationCard } from "@/components/destination/destination-card";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { INTERESTS, INTEREST_LABELS, fromEnum } from "@/lib/travel/interests";
import Link from "next/link";
import { cn } from "@/lib/utils";

export const revalidate = 3600;

export const metadata = buildMetadata({
  title: "Travel destinations: costs, best time to visit and things to do",
  description: "Browse destinations across Asia, the Pacific and beyond with estimated trip costs, seasons and itineraries.",
  path: "/destinations",
});

export default async function DestinationsPage({ searchParams }: PageProps<"/destinations">) {
  const sp = await searchParams;
  const interest = typeof sp.interest === "string" && (INTERESTS as readonly string[]).includes(sp.interest) ? sp.interest : undefined;
  const q = typeof sp.q === "string" ? sp.q.trim().toLowerCase().slice(0, 60) : "";
  let list = await getDestinations();
  if (interest) list = list.filter((d) => d.interestScores[fromEnum(interest)] >= 4);
  if (q) list = list.filter((d) => d.name.toLowerCase().includes(q) || d.country.toLowerCase().includes(q));

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <Breadcrumbs
        items={[
          { name: "Home", path: "/" },
          { name: "Destinations", path: "/destinations" },
        ]}
      />
      <h1 className="mt-4 text-3xl font-bold sm:text-4xl">Destinations</h1>
      <p className="mt-2 max-w-2xl text-muted-foreground">Every destination includes estimated costs, the best time to go and ready-made itineraries.</p>

      <nav aria-label="Filter by interest" className="mt-6 flex flex-wrap gap-2">
        <Link
          href="/destinations"
          className={cn("rounded-full border px-4 py-2 text-sm font-medium", !interest && "border-primary bg-primary text-primary-foreground")}
        >
          All
        </Link>
        {INTERESTS.map((i) => (
          <Link
            key={i}
            href={`/destinations?interest=${i}`}
            aria-current={interest === i ? "true" : undefined}
            className={cn("rounded-full border px-4 py-2 text-sm font-medium hover:bg-muted", interest === i && "border-primary bg-primary text-primary-foreground hover:bg-primary")}
          >
            {INTEREST_LABELS[i]}
          </Link>
        ))}
      </nav>

      <ul className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {list.map((d, i) => (
          <li key={d.slug}>
            <DestinationCard destination={d} priority={i < 3} />
          </li>
        ))}
      </ul>
      {list.length === 0 && <p className="mt-8 text-muted-foreground">No destinations match your filters.</p>}
    </div>
  );
}
