import type { Metadata } from "next";
import { PlannerForm } from "@/components/planner/planner-form";
import { BuildItineraryButton } from "@/components/planner/build-itinerary-button";
import { CostBreakdownList } from "@/components/travel/cost-breakdown";
import { TrackOnMount } from "@/components/analytics/tracker";
import { AffiliateLink } from "@/components/affiliate/affiliate-link";
import { getAirport, getAirports, getDestinationBySlug, getDestinations } from "@/lib/travel/repository";
import { tripPlanSchema, addDays, nightsBetween, paramsToObject } from "@/lib/travel/schemas";
import { generateItinerary } from "@/lib/travel/itinerary";
import { computeTotals } from "@/lib/travel/trip";
import { createLink, withSource } from "@/lib/affiliate/links";
import { DEFAULT_ORIGIN } from "@/lib/site";
import { formatUsd, plural } from "@/lib/utils/format";
import { Plane, Hotel } from "lucide-react";
import type { InterestKey } from "@/lib/travel/interests";

export const metadata: Metadata = {
  title: "Trip planner: estimate your trip cost and build an itinerary",
  description: "Choose a destination and dates to see estimated flights, hotel, food, transport and activity costs, then build a day-by-day itinerary.",
  robots: { index: false, follow: true },
  alternates: { canonical: "/trip-planner" },
};

const today = () => new Date().toISOString().slice(0, 10);

export default async function TripPlannerPage({ searchParams }: PageProps<"/trip-planner">) {
  const sp = await searchParams;
  const [airports, destinations] = await Promise.all([getAirports(), getDestinations()]);
  const raw = paramsToObject(sp);
  const rawDest = typeof sp.destination === "string" ? sp.destination : "";
  const start = raw.startDate ?? addDays(today(), 30);
  const end = raw.endDate ?? addDays(start, 7);

  const parsed = rawDest
    ? tripPlanSchema.safeParse({
        origin: raw.origin ?? DEFAULT_ORIGIN,
        destination: rawDest,
        startDate: start,
        endDate: end,
        travellers: raw.travellers ?? 2,
        budget: raw.budget || undefined,
        style: raw.style ?? "MID_RANGE",
        interests: raw.interests,
      })
    : null;

  let estimate: Awaited<ReturnType<typeof buildEstimate>> | null = null;
  if (parsed?.success) estimate = await buildEstimate(parsed.data);

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <TrackOnMount name="trip_planner_started" />
      <h1 className="text-3xl font-bold sm:text-4xl">Plan your trip</h1>
      <p className="mt-2 max-w-2xl text-muted-foreground">Pick a destination and dates to see an estimated total, then turn it into a day-by-day itinerary you can edit.</p>

      <div className="mt-8">
        <PlannerForm
          airports={airports.map((a) => ({ iata: a.iata, city: a.city }))}
          destinations={destinations.map((d) => ({ slug: d.slug, name: d.name }))}
          defaults={{
            origin: raw.origin ?? DEFAULT_ORIGIN,
            destination: rawDest,
            startDate: start,
            endDate: end,
            travellers: raw.travellers ?? "2",
            budget: raw.budget ?? "",
            style: raw.style ?? "MID_RANGE",
            interests: (parsed?.success ? parsed.data.interests : []) as InterestKey[],
          }}
        />
      </div>

      {parsed && !parsed.success && (
        <div role="alert" className="mt-8 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm">
          <p className="font-medium text-destructive">Please check your trip details</p>
          <ul className="mt-1 list-disc pl-5">
            {parsed.error.issues.map((i) => (
              <li key={i.path.join(".") + i.message}>{i.message}</li>
            ))}
          </ul>
        </div>
      )}

      {estimate && (
        <section className="mt-10 grid gap-6 lg:grid-cols-[3fr_2fr]" aria-labelledby="estimate">
          <div className="rounded-2xl border bg-card p-6">
            <h2 id="estimate" className="text-2xl font-bold">
              {estimate.destinationName}: total estimated trip cost
            </h2>
            <p className="mb-4 text-sm text-muted-foreground">
              {plural(estimate.nights, "night")} · {plural(estimate.input.travellers, "traveller")} · from {estimate.originLabel}
            </p>
            <CostBreakdownList cost={estimate.totals} />
            {estimate.input.budget !== undefined && (
              <p className={estimate.totals.total <= estimate.input.budget ? "mt-4 text-emerald-700" : "mt-4 text-amber-700"}>
                {estimate.totals.total <= estimate.input.budget
                  ? `${formatUsd(estimate.input.budget - estimate.totals.total)} under your ${formatUsd(estimate.input.budget)} budget`
                  : `${formatUsd(estimate.totals.total - estimate.input.budget)} over your ${formatUsd(estimate.input.budget)} budget. Try Budget style or fewer nights.`}
              </p>
            )}
            <div className="mt-6">
              <BuildItineraryButton
                payload={{
                  origin: estimate.input.origin,
                  destination: estimate.input.destination,
                  startDate: estimate.input.startDate,
                  endDate: estimate.input.endDate,
                  travellers: estimate.input.travellers,
                  budget: estimate.input.budget,
                  style: estimate.input.style,
                  interests: estimate.input.interests,
                }}
              />
            </div>
          </div>
          <aside className="rounded-2xl border bg-secondary/50 p-6" aria-labelledby="live">
            <h2 id="live" className="text-lg font-semibold">
              Check live prices
            </h2>
            <p className="mb-4 mt-1 text-sm text-muted-foreground">Estimates are a guide. See live fares and rooms for your exact dates with our booking partners.</p>
            <div className="grid gap-3">
              <AffiliateLink href={estimate.flightPath}>
                <Plane aria-hidden /> Flights
              </AffiliateLink>
              <AffiliateLink href={estimate.hotelPath} variant="outline">
                <Hotel aria-hidden /> Hotels
              </AffiliateLink>
            </div>
          </aside>
        </section>
      )}
    </div>
  );
}

async function buildEstimate(input: import("@/lib/travel/schemas").TripPlanInput) {
  const [dest, origin] = await Promise.all([getDestinationBySlug(input.destination), getAirport(input.origin)]);
  if (!dest || !origin) return null;
  const nights = nightsBetween(input.startDate, input.endDate);
  const days = generateItinerary(dest, { days: nights, style: input.style, interests: input.interests, travellers: input.travellers });
  const totals = computeTotals(dest, origin, {
    origin: origin.iata,
    destinationSlug: dest.slug,
    startDate: input.startDate,
    nights,
    travellers: input.travellers,
    style: input.style,
    interests: input.interests,
    days,
  });
  const page = "/trip-planner";
  const [flight, hotel] = await Promise.all([
    createLink("FLIGHT", { origin: origin.iata, destination: dest.airportCode, departDate: input.startDate, returnDate: input.endDate, adults: input.travellers }, { destinationId: dest.id }),
    createLink("HOTEL", { destinationName: dest.name, checkIn: input.startDate, checkOut: input.endDate, adults: input.travellers }, { destinationId: dest.id }),
  ]);
  return {
    input,
    nights,
    totals,
    destinationName: dest.name,
    originLabel: `${origin.city} (${origin.iata})`,
    flightPath: withSource(flight, { page, component: "planner-estimate-flight" }),
    hotelPath: withSource(hotel, { page, component: "planner-estimate-hotel" }),
  };
}
