import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { randomInt } from "node:crypto";
import { DiscoveryForm } from "@/components/travel/discovery-form";
import { DiscoverResultCard, plannerHref } from "@/components/travel/discover-result-card";
import { discover, recordSearch } from "@/lib/travel/discover";
import { discoverSchema, paramsToObject } from "@/lib/travel/schemas";
import { getAirports } from "@/lib/travel/repository";
import { getCurrentUser, getSessionId } from "@/lib/auth/session";
import { track } from "@/lib/analytics/track";
import { formatUsd, plural } from "@/lib/utils/format";
import { logger, errorMeta } from "@/lib/logger";

// Search results are user-specific combinations: never index them.
export const metadata: Metadata = {
  title: "Where can I go? Discover trips for your budget",
  description: "Enter your budget, dates and interests to see destinations you can afford, with estimated trip costs.",
  robots: { index: false, follow: true },
  alternates: { canonical: "/discover" },
};

export default async function DiscoverPage({ searchParams }: PageProps<"/discover">) {
  const sp = await searchParams;
  const airports = await getAirports();
  const raw = paramsToObject(sp);
  const hasQuery = !!raw.origin || !!raw.budget;
  const parsed = hasQuery ? discoverSchema.safeParse(raw) : null;

  const result = parsed?.success ? await discover(parsed.data) : null;

  if (result) {
    const [sessionId, user] = await Promise.all([getSessionId(), getCurrentUser()]);
    after(async () => {
      try {
        await recordSearch(result, { sessionId, userId: user?.id });
        await track("search_completed", {
          sessionId,
          userId: user?.id,
          properties: { origin: result.search.origin, budget: result.search.budget, results: result.items.length },
        });
      } catch (e) {
        logger.warn("record_search_failed", errorMeta(e));
      }
    });
  }

  if (result && sp.surprise === "1") {
    const pool = result.items.filter((i) => i.withinBudget).slice(0, 5);
    const pick = (pool.length ? pool : result.items)[randomInt(Math.max(1, pool.length || result.items.length))];
    if (pick) redirect(plannerHref(pick.slug, result.search));
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold sm:text-4xl">Where can your budget take you?</h1>
      <p className="mt-2 max-w-2xl text-muted-foreground">
        Tell us your budget, dates and interests. We rank destinations by estimated cost, flight time, season and how well they match what you love.
      </p>

      <DiscoveryForm
        className="mt-8"
        airports={airports.map((a) => ({ iata: a.iata, city: a.city }))}
        defaults={{
          origin: raw.origin,
          budget: raw.budget,
          startDate: raw.startDate,
          nights: raw.nights,
          travellers: raw.travellers,
          interests: parsed?.success ? parsed.data.interests : [],
        }}
      />

      {parsed && !parsed.success && (
        <div role="alert" className="mt-8 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm">
          <p className="font-medium text-destructive">Please check your search</p>
          <ul className="mt-1 list-disc pl-5">
            {parsed.error.issues.map((i) => (
              <li key={i.path.join(".") + i.message}>{i.message}</li>
            ))}
          </ul>
        </div>
      )}

      {result && (
        <section className="mt-10" aria-labelledby="results-heading">
          <h2 id="results-heading" className="text-2xl font-bold">
            {result.items.length} ideas from {result.originName} for {formatUsd(result.search.budget)}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {plural(result.search.nights, "night")} · {plural(result.search.travellers, "traveller")} · departing {result.search.startDate}. Every price is estimated from typical prices. None comes from a provider.
          </p>
          <div className="mt-6 grid gap-6">
            {result.items.map((item, i) => (
              <DiscoverResultCard key={item.slug} item={item} search={result.search} rank={i + 1} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
