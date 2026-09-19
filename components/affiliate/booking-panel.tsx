import { Car, Hotel, Plane, Ticket } from "lucide-react";
import { AffiliateLink } from "./affiliate-link";
import { createLink, withSource } from "@/lib/affiliate/links";
import { DEFAULT_ORIGIN } from "@/lib/site";

type Dest = { id: string; slug: string; name: string; airportCode: string };

/** Server component: creates the internal /go links, renders CTAs. No provider code leaks into the UI. */
export async function BookingPanel({ destination, sourcePage }: { destination: Dest; sourcePage: string }) {
  const opts = { destinationId: destination.id };
  const [flight, hotel, activity, car] = await Promise.all([
    createLink("FLIGHT", { origin: DEFAULT_ORIGIN, destination: destination.airportCode, adults: 2 }, opts),
    createLink("HOTEL", { destinationName: destination.name, adults: 2 }, opts),
    createLink("ACTIVITY", { destinationName: destination.name }, opts),
    createLink("CAR", { destinationName: destination.name }, opts),
  ]);
  const src = (path: string, component: string) => withSource(path, { page: sourcePage, component });

  return (
    <section aria-labelledby="book" className="rounded-2xl border bg-secondary/50 p-5 sm:p-6">
      <h2 id="book" className="text-2xl font-bold">
        Check live prices for {destination.name}
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        You&apos;ll go to a trusted booking partner to see live prices and availability. We may earn a commission at no extra cost to you.
      </p>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <AffiliateLink href={src(flight, "booking-panel-flight")}>
          <Plane aria-hidden /> Flights
        </AffiliateLink>
        <AffiliateLink href={src(hotel, "booking-panel-hotel")} variant="outline">
          <Hotel aria-hidden /> Hotels
        </AffiliateLink>
        <AffiliateLink href={src(activity, "booking-panel-activity")} variant="outline">
          <Ticket aria-hidden /> Activities
        </AffiliateLink>
        <AffiliateLink href={src(car, "booking-panel-car")} variant="outline">
          <Car aria-hidden /> Car rental
        </AffiliateLink>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">Flights shown from {DEFAULT_ORIGIN} as an example — change your departure city on the partner site.</p>
    </section>
  );
}
