import Link from "next/link";
import { Compass, Sparkles, Wallet, Map } from "lucide-react";
import { DiscoveryForm } from "@/components/travel/discovery-form";
import { DestinationRail, type RailItem } from "@/components/destination/destination-rail";
import { DestImage } from "@/components/travel/dest-image";
import { PriceKindBadge } from "@/components/travel/price-kind-badge";
import { NewsletterForm } from "@/components/layout/newsletter-form";
import { buttonVariants } from "@/components/ui/button";
import { discover } from "@/lib/travel/discover";
import { getActiveDeals, getAirports, getDestinations, getPublishedGuides } from "@/lib/travel/repository";
import { DEFAULT_ORIGIN, SITE } from "@/lib/site";
import { buildMetadata } from "@/lib/seo/metadata";
import { formatUsd } from "@/lib/utils/format";
import { cn } from "@/lib/utils";

export const revalidate = 3600;

export const metadata = buildMetadata({
  title: `${SITE.name} — ${SITE.tagline}`,
  description: SITE.description,
  path: "/",
});

const tripRail = (items: Awaited<ReturnType<typeof discover>>["items"]): RailItem[] =>
  items.filter((i) => i.withinBudget).slice(0, 4).map((i) => ({ destination: i, fromUsd: i.cost.total, fromLabel: "5-night trip" }));

export default async function HomePage() {
  const [airports, destinations, deals, guides, b1000, b1500, weekend] = await Promise.all([
    getAirports(),
    getDestinations(),
    getActiveDeals(),
    getPublishedGuides(),
    discover({ origin: DEFAULT_ORIGIN, budget: 1000, nights: 5, travellers: 1, interests: [], style: "BUDGET" }, 8),
    discover({ origin: DEFAULT_ORIGIN, budget: 1500, nights: 5, travellers: 1, interests: [], style: "BUDGET" }, 8),
    discover({ origin: DEFAULT_ORIGIN, budget: 900, nights: 3, travellers: 2, interests: [], style: "MID_RANGE" }, 20),
  ]);

  const byInterest = (key: "family" | "beach" | "adventure", min = 5): RailItem[] =>
    destinations
      .filter((d) => d.interestScores[key] >= min && (key !== "family" || d.familyScore >= 5))
      .slice(0, 4)
      .map((d) => ({ destination: d }));

  const weekendItems: RailItem[] = weekend.items
    .filter((i) => i.flightHours <= 5.5)
    .slice(0, 4)
    .map((i) => ({ destination: i, fromUsd: i.cost.total, fromLabel: "Est. 3-night trip" }));

  const popular = ["bali", "tokyo", "bangkok", "singapore"]
    .map((s) => destinations.find((d) => d.slug === s))
    .filter((d) => !!d)
    .map((d) => ({ destination: d! }));

  return (
    <>
      <section className="relative isolate overflow-hidden bg-primary text-primary-foreground">
        <DestImage src="/images/destinations/bali.svg" alt="" priority sizes="100vw" className="-z-10 opacity-40" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-primary/60 to-primary/90" />
        <div className="mx-auto max-w-7xl px-4 pb-14 pt-14 sm:px-6 sm:pt-20 lg:px-8">
          <h1 className="animate-fade-up max-w-3xl text-4xl font-bold leading-tight sm:text-6xl">Where can your budget take you?</h1>
          <p className="animate-fade-up mt-4 max-w-2xl text-lg text-primary-foreground/90 [animation-delay:100ms]">
            Discover destinations, estimate your trip cost and build your perfect itinerary.
          </p>
          <div className="animate-fade-up mt-8 text-foreground [animation-delay:200ms]">
            <DiscoveryForm airports={airports.map((a) => ({ iata: a.iata, city: a.city }))} />
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl space-y-20 px-4 py-16 sm:px-6 lg:px-8">
        <DestinationRail
          id="for-1000"
          title="Where can I go for $1,000?"
          subtitle={`One traveller, 5 nights, budget style, flying from Sydney. Estimated total trip cost.`}
          items={tripRail(b1000.items)}
          href={`/discover?origin=${DEFAULT_ORIGIN}&budget=1000&nights=5&travellers=1&style=BUDGET`}
          hrefLabel="More ideas"
        />
        <DestinationRail
          id="for-1500"
          title="Where can I go for $1,500?"
          subtitle="Room for a little more comfort — or a longer flight."
          items={tripRail(b1500.items)}
          href={`/discover?origin=${DEFAULT_ORIGIN}&budget=1500&nights=5&travellers=1&style=BUDGET`}
          hrefLabel="More ideas"
        />
        <DestinationRail id="weekend" title="Weekend escapes" subtitle="Short flights, three nights." items={weekendItems} href="/weekend-getaways/sydney" />
        <DestinationRail id="popular" title="Popular destinations" items={popular} href="/destinations" hrefLabel="All destinations" />
        <DestinationRail id="family" title="Family holidays" subtitle="Easy, kid-friendly places." items={byInterest("family")} href="/destinations?interest=family" />
        <DestinationRail id="beach" title="Beach destinations" items={byInterest("beach")} href="/destinations?interest=beach" />
        <DestinationRail id="adventure" title="Adventure destinations" items={byInterest("adventure")} href="/destinations?interest=adventure" />

        <section aria-labelledby="build" className="rounded-3xl bg-secondary/60 p-6 sm:p-10">
          <h2 id="build" className="text-2xl font-bold sm:text-3xl">
            Build your trip in three steps
          </h2>
          <ol className="mt-6 grid gap-6 sm:grid-cols-3">
            {[
              [Compass, "Discover", "Enter budget, dates and interests to see where you can go."],
              [Wallet, "Estimate", "See flights, hotel, food, transport and activities in one estimate."],
              [Map, "Plan", "Get a day-by-day itinerary, tweak it, then check live prices."],
            ].map(([Icon, title, text], i) => {
              const I = Icon as typeof Compass;
              return (
                <li key={String(title)} className="flex gap-4">
                  <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground">
                    <I className="size-5" aria-hidden />
                  </span>
                  <div>
                    <h3 className="font-semibold">
                      {i + 1}. {String(title)}
                    </h3>
                    <p className="text-sm text-muted-foreground">{String(text)}</p>
                  </div>
                </li>
              );
            })}
          </ol>
          <Link href="/trip-planner" className={cn(buttonVariants({ size: "xl" }), "mt-8")}>
            <Sparkles aria-hidden /> Start planning
          </Link>
        </section>

        {deals.length > 0 && (
          <section aria-labelledby="deals">
            <div className="flex items-end justify-between">
              <h2 id="deals" className="text-2xl font-bold sm:text-3xl">
                Latest travel deals
              </h2>
              <Link href="/deals" className="text-sm font-medium text-primary hover:underline">
                All deals
              </Link>
            </div>
            <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {deals.slice(0, 3).map((d) => (
                <li key={d.slug}>
                  <Link href={`/deals/${d.slug}`} className="block rounded-2xl border bg-card p-5 transition-shadow hover:shadow-md">
                    <h3 className="font-semibold">{d.title}</h3>
                    {d.fromPriceUsd && (
                      <p className="mt-2 flex items-center gap-2">
                        <span className="text-2xl font-bold">{formatUsd(d.fromPriceUsd)}</span>
                        <PriceKindBadge kind={d.priceKind} variant="card" />
                      </p>
                    )}
                    <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{d.description}</p>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {guides.length > 0 && (
          <section aria-labelledby="guides">
            <div className="flex items-end justify-between">
              <h2 id="guides" className="text-2xl font-bold sm:text-3xl">
                Travel guides
              </h2>
              <Link href="/guides" className="text-sm font-medium text-primary hover:underline">
                All guides
              </Link>
            </div>
            <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {guides.slice(0, 3).map((g) => (
                <li key={g.slug}>
                  <Link href={`/guides/${g.slug}`} className="block h-full rounded-2xl border bg-card p-5 transition-shadow hover:shadow-md">
                    <h3 className="font-semibold">{g.title}</h3>
                    <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">{g.description}</p>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section aria-labelledby="newsletter" className="mx-auto max-w-2xl text-center">
          <h2 id="newsletter" className="text-2xl font-bold sm:text-3xl">
            Get trip ideas that fit your budget
          </h2>
          <p className="mb-6 mt-2 text-muted-foreground">Deals, weekend getaways and destination inspiration, straight to your inbox.</p>
          <NewsletterForm source="homepage" />
        </section>
      </div>
    </>
  );
}
