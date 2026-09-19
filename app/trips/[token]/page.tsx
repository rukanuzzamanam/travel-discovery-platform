import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Hotel, Plane, Ticket } from "lucide-react";
import { TripWorkspace } from "@/components/planner/trip-workspace";
import { AffiliateLink } from "@/components/affiliate/affiliate-link";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { computeTotals, loadTrip } from "@/lib/travel/trip";
import { getAirport, getDestinationBySlug } from "@/lib/travel/repository";
import { createLink, withSource } from "@/lib/affiliate/links";
import { getCurrentUser } from "@/lib/auth/session";
import { addDays } from "@/lib/travel/schemas";
import { plural } from "@/lib/utils/format";
import { PRICE_DISCLAIMER } from "@/lib/travel/price-kind";

// User-specific trip pages must never be indexed.
export const metadata: Metadata = { title: "Your trip", robots: { index: false, follow: false } };

export default async function TripPage({ params }: PageProps<"/trips/[token]">) {
  const { token } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(token)) notFound();
  const trip = await loadTrip(token);
  if (!trip) notFound();
  const [dest, origin, user] = await Promise.all([getDestinationBySlug(trip.state.destinationSlug), getAirport(trip.state.origin), getCurrentUser()]);
  if (!dest || !origin) notFound();

  const totals = computeTotals(dest, origin, trip.state);
  const end = addDays(trip.state.startDate, trip.state.nights);
  const path = `/trips/${token}`;
  const [flight, hotel, activity] = await Promise.all([
    createLink("FLIGHT", { origin: origin.iata, destination: dest.airportCode, departDate: trip.state.startDate, returnDate: end, adults: trip.state.travellers }, { destinationId: dest.id }),
    createLink("HOTEL", { destinationName: dest.name, checkIn: trip.state.startDate, checkOut: end, adults: trip.state.travellers }, { destinationId: dest.id }),
    createLink("ACTIVITY", { destinationName: dest.name }, { destinationId: dest.id }),
  ]);
  const src = (p: string, c: string) => withSource(p, { page: "/trips", component: c });
  const readOnly = !!trip.userId && trip.userId !== user?.id;

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <Breadcrumbs items={[{ name: "Home", path: "/" }, { name: "Trip planner", path: "/trip-planner" }, { name: trip.title, path }]} />
      <h1 className="mt-4 text-3xl font-bold sm:text-4xl">{trip.title}</h1>
      <p className="mt-1 text-muted-foreground">
        {origin.city} → {dest.name} · {trip.state.startDate} to {end} · {plural(trip.state.travellers, "traveller")}
      </p>

      <div className="mt-8">
        <TripWorkspace
          token={token}
          initialDays={trip.state.days}
          initialTotals={totals}
          travellers={trip.state.travellers}
          budget={trip.state.budgetUsd}
          style={trip.state.style}
          readOnly={readOnly}
        />
      </div>

      <section className="mt-12 rounded-2xl border bg-secondary/50 p-6" aria-labelledby="live-prices">
        <h2 id="live-prices" className="text-xl font-bold">
          Ready to book? Check live prices
        </h2>
        <p className="mb-4 mt-1 text-sm text-muted-foreground">{PRICE_DISCLAIMER} We may earn a commission at no extra cost to you.</p>
        <div className="grid gap-3 sm:grid-cols-3">
          <AffiliateLink href={src(flight, "trip-flight")}>
            <Plane aria-hidden /> Flights
          </AffiliateLink>
          <AffiliateLink href={src(hotel, "trip-hotel")} variant="outline">
            <Hotel aria-hidden /> Hotels
          </AffiliateLink>
          <AffiliateLink href={src(activity, "trip-activity")} variant="outline">
            <Ticket aria-hidden /> Activities
          </AffiliateLink>
        </div>
      </section>
    </div>
  );
}
