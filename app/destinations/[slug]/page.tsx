import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Baby, CalendarDays, Clock, Sun, Wallet } from "lucide-react";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { DestImage } from "@/components/travel/dest-image";
import { Faq } from "@/components/destination/faq";
import { DestinationCard } from "@/components/destination/destination-card";
import { CostEstimator } from "@/components/planner/cost-estimator";
import { TrackOnMount } from "@/components/analytics/tracker";
import { JsonLd } from "@/components/seo/json-ld";
import { buttonVariants } from "@/components/ui/button";
import { buildMetadata } from "@/lib/seo/metadata";
import { destinationSchema } from "@/lib/seo/schema";
import { getAirports, getDestinationBySlug, getDestinations, getPublishedItineraries } from "@/lib/travel/repository";
import { formatMonthRange, formatUsd } from "@/lib/utils/format";
import { INTEREST_LABELS } from "@/lib/travel/interests";
import { cn } from "@/lib/utils";
import { SaveDestinationButton } from "@/components/layout/account-panels";
import { BookingPanel } from "@/components/affiliate/booking-panel";

export const revalidate = 3600;

export async function generateStaticParams() {
  try {
    return (await getDestinations()).map((d) => ({ slug: d.slug }));
  } catch {
    return []; // Build without a database: pages render on demand and are cached.
  }
}

export async function generateMetadata({ params }: PageProps<"/destinations/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const d = await getDestinationBySlug(slug);
  if (!d) return {};
  return buildMetadata({
    title: d.seoTitle ?? `${d.name} Travel Guide: Costs, Best Time to Visit & Things to Do`,
    description: d.seoDescription ?? d.tagline,
    path: `/destinations/${d.slug}`,
    image: d.heroImage,
  });
}

export default async function DestinationPage({ params }: PageProps<"/destinations/[slug]">) {
  const { slug } = await params;
  const d = await getDestinationBySlug(slug);
  if (!d) notFound();

  const [airports, itineraries, all] = await Promise.all([getAirports(), getPublishedItineraries(), getDestinations()]);
  const myItineraries = itineraries.filter((i) => i.destination.slug === d.slug);
  const related = d.relatedSlugs.map((s) => all.find((x) => x.slug === s)).filter((x) => !!x);
  const topInterests = Object.entries(d.interestScores)
    .filter(([, v]) => v >= 4)
    .map(([k]) => INTEREST_LABELS[k as keyof typeof INTEREST_LABELS]);
  const { activities, ...modelForClient } = d;
  void activities;

  const path = `/destinations/${d.slug}`;
  const crumbs = [
    { name: "Home", path: "/" },
    { name: "Destinations", path: "/destinations" },
    { name: d.name, path },
  ];

  return (
    <article>
      <TrackOnMount name="destination_viewed" destination={d.slug} />
      <JsonLd data={destinationSchema({ name: d.name, description: d.overview, path, image: d.heroImage, country: d.country })} />

      <header className="relative isolate overflow-hidden bg-slate-900 text-white">
        <DestImage src={d.heroImage} alt={d.heroImageAlt} priority sizes="100vw" className="-z-10 opacity-90" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-t from-slate-950/80 via-slate-950/30 to-slate-950/10" />
        <div className="mx-auto max-w-7xl px-4 pb-10 pt-24 sm:px-6 sm:pt-32 lg:px-8">
          <Breadcrumbs items={crumbs} light />
          <h1 className="mt-4 text-4xl font-bold drop-shadow sm:text-6xl">{d.name}</h1>
          <p className="mt-3 max-w-2xl text-lg text-white/90">{d.tagline}</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href={`/trip-planner?destination=${d.slug}`} className={cn(buttonVariants({ size: "xl" }), "bg-coral text-coral-foreground hover:bg-coral/90")}>
              Plan a trip to {d.name}
            </Link>
            <a href="#estimate" className={cn(buttonVariants({ size: "xl", variant: "outline" }), "border-white/40 bg-white/10 text-white hover:bg-white/20 hover:text-white")}>
              Estimate the cost
            </a>
            <SaveDestinationButton slug={d.slug} />
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl space-y-14 px-4 py-10 sm:px-6 lg:px-8">
        <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Fact icon={Sun} label="Best time to visit" value={formatMonthRange(d.bestMonths)} />
          <Fact icon={Clock} label="Recommended stay" value={`${d.recommendedDaysMin}–${d.recommendedDaysMax} nights`} />
          <Fact icon={Baby} label="Family suitability" value={`${d.familyScore} / 5`} />
          <Fact icon={Wallet} label="Typical daily spend" value={`${formatUsd(d.dailyFood + d.dailyTransport + d.dailyActivities)} pp`} note="Excludes hotel and flights" />
        </dl>

        <section aria-labelledby="overview">
          <h2 id="overview" className="text-2xl font-bold">
            About {d.name}
          </h2>
          <p className="mt-3 max-w-3xl text-lg leading-relaxed text-muted-foreground">{d.overview}</p>
          {topInterests.length > 0 && (
            <p className="mt-3 text-sm">
              <span className="font-medium">Great for:</span> {topInterests.join(" · ")}
            </p>
          )}
          <p className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
            <CalendarDays className="size-4" aria-hidden /> Avoid if possible: {d.avoidMonths.length ? formatMonthRange(d.avoidMonths) : "no major low season"}
          </p>
        </section>

        <section id="estimate" aria-labelledby="cost" className="scroll-mt-24">
          <h2 id="cost" className="text-2xl font-bold">
            How much does a trip to {d.name} cost?
          </h2>
          <p className="mb-4 mt-1 text-muted-foreground">
            Adjust the details to see an <strong>estimated trip cost</strong> based on typical prices. Each line shows whether it is estimated.
          </p>
          <CostEstimator destination={modelForClient} airports={airports} />
        </section>

        <section aria-labelledby="costs-table">
          <h2 id="costs-table" className="text-2xl font-bold">
            Typical costs
          </h2>
          <div className="mt-4 overflow-x-auto rounded-xl border bg-card">
            <table className="w-full text-left text-sm">
              <caption className="sr-only">Estimated typical costs in {d.name}, in US dollars</caption>
              <thead className="bg-muted/60 text-muted-foreground">
                <tr>
                  <th scope="col" className="px-4 py-3 font-medium">Item</th>
                  <th scope="col" className="px-4 py-3 font-medium">Estimated (USD)</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                <Row label="Hotel room, budget (per night)" value={formatUsd(d.hotelNightBudget)} />
                <Row label="Hotel room, mid-range (per night)" value={formatUsd(d.hotelNightMid)} />
                <Row label="Hotel room, luxury (per night)" value={formatUsd(d.hotelNightLuxury)} />
                <Row label="Food (per person per day)" value={formatUsd(d.dailyFood)} />
                <Row label="Local transport (per person per day)" value={formatUsd(d.dailyTransport)} />
                <Row label="Activities (per person per day)" value={formatUsd(d.dailyActivities)} />
              </tbody>
            </table>
          </div>
        </section>

        <BookingPanel destination={{ id: d.id, slug: d.slug, name: d.name, airportCode: d.airportCode }} sourcePage={path} />

        <section aria-labelledby="things">
          <h2 id="things" className="text-2xl font-bold">
            Things to do in {d.name}
          </h2>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {d.activities.map((a) => (
              <li key={a.title} className="flex items-start justify-between gap-3 rounded-xl border bg-card p-4">
                <div>
                  <p className="font-medium">{a.title}</p>
                  <p className="text-sm text-muted-foreground">
                    ~{Math.round(a.durationMin / 60 * 10) / 10}h · {a.category}
                  </p>
                </div>
                <p className="shrink-0 text-sm font-semibold">{a.costUsd === 0 ? "Free" : `≈ ${formatUsd(a.costUsd)}`}</p>
              </li>
            ))}
          </ul>
        </section>

        <section className="grid gap-8 md:grid-cols-2" aria-label="Getting around and food">
          <div>
            <h2 className="text-2xl font-bold">Getting around</h2>
            <p className="mt-3 text-muted-foreground">{d.transportTips}</p>
          </div>
          <div>
            <h2 className="text-2xl font-bold">Food and drink</h2>
            <p className="mt-3 text-muted-foreground">{d.foodHighlights}</p>
          </div>
        </section>

        <section aria-labelledby="tips">
          <h2 id="tips" className="text-2xl font-bold">
            Travel tips
          </h2>
          <ul className="mt-4 list-disc space-y-2 pl-5 text-muted-foreground">
            {d.travelTips.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </section>

        {myItineraries.length > 0 && (
          <section aria-labelledby="itins">
            <h2 id="itins" className="text-2xl font-bold">
              Itineraries for {d.name}
            </h2>
            <ul className="mt-4 grid gap-3 sm:grid-cols-2">
              {myItineraries.map((i) => (
                <li key={i.slug}>
                  <Link href={`/itineraries/${i.slug}`} className="block rounded-xl border bg-card p-4 transition-shadow hover:shadow-md">
                    <p className="font-semibold">{i.title}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{i.description}</p>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        <Faq items={d.faq} heading={`${d.name} travel FAQ`} />

        {related.length > 0 && (
          <section aria-labelledby="related">
            <h2 id="related" className="text-2xl font-bold">
              Similar destinations
            </h2>
            <ul className="mt-4 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((r) => (
                <li key={r!.slug}>
                  <DestinationCard destination={r!} />
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </article>
  );
}

function Fact({ icon: Icon, label, value, note }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string; note?: string }) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <dt className="flex items-center gap-2 text-sm text-muted-foreground">
        <Icon className="size-4 text-primary" /> {label}
      </dt>
      <dd className="mt-1 text-lg font-semibold">{value}</dd>
      {note && <p className="text-xs text-muted-foreground">{note}</p>}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <tr>
      <th scope="row" className="px-4 py-3 font-normal">
        {label}
      </th>
      <td className="px-4 py-3 font-medium tabular-nums">{value}</td>
    </tr>
  );
}
