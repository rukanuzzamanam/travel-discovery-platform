import "server-only";
import { cached, TTL } from "@/lib/cache/cache";
import { logger } from "@/lib/logger";
import { flightPriceProviders } from "@/lib/affiliate/affiliate-router";
import { createLink, withSource } from "@/lib/affiliate/links";
import type { ProviderFlightPrice } from "@/lib/affiliate/affiliate-provider";
import { ApiError } from "@/lib/http/api";
import { estimateFlightUsd, haversineKm } from "./estimator";
import { getAirport, getDestinationBySlug, type DestinationDetail } from "./repository";

/**
 * Application service for bookable products. The UI and API routes call THIS, never a provider directly.
 * Every price is labelled: ESTIMATE (our model) or PROVIDER (returned by a provider, with a timestamp).
 */

export type FlightOptions = {
  origin: string;
  destination: string;
  estimate: { priceUsd: number; kind: "ESTIMATE"; note: string };
  providerPrices: (ProviderFlightPrice & { kind: "PROVIDER" })[];
  bookPath: string;
};

export async function getFlightOptions(input: {
  origin: string;
  destinationSlug: string;
  departDate?: string;
  returnDate?: string;
  adults?: number;
  source: { page: string; component?: string };
}): Promise<FlightOptions> {
  const [origin, dest] = await Promise.all([getAirport(input.origin), getDestinationBySlug(input.destinationSlug)]);
  if (!origin) throw new ApiError("VALIDATION_ERROR", `Unknown origin airport: ${input.origin}`);
  if (!dest) throw new ApiError("NOT_FOUND", "Destination not found");

  const km = haversineKm(origin, dest);
  const provider = flightPriceProviders.find((p) => p.isConfigured());
  let providerPrices: FlightOptions["providerPrices"] = [];
  if (provider) {
    try {
      const key = `flight:${provider.id}:${origin.iata}:${dest.airportCode}:${input.departDate ?? ""}:${input.returnDate ?? ""}`;
      const prices = await cached(key, TTL.price, () =>
        provider.getFlightPrices({ origin: origin.iata, destination: dest.airportCode, departDate: input.departDate, returnDate: input.returnDate }),
      );
      providerPrices = prices.slice(0, 5).map((p) => ({ ...p, kind: "PROVIDER" as const }));
    } catch (e) {
      // Provider outage must not break the page: fall back to the estimate.
      logger.warn("flight_provider_unavailable", { message: (e as Error).message });
    }
  }

  const link = await createLink(
    "FLIGHT",
    { origin: origin.iata, destination: dest.airportCode, departDate: input.departDate, returnDate: input.returnDate, adults: input.adults ?? 1 },
    { destinationId: dest.id },
  );

  return {
    origin: origin.iata,
    destination: dest.airportCode,
    estimate: { priceUsd: estimateFlightUsd(km), kind: "ESTIMATE", note: "Typical return economy fare per person. Not a live quote." },
    providerPrices,
    bookPath: withSource(link, input.source),
  };
}

export type ProductLink = { path: string; estimateUsd?: number; kind: "ESTIMATE" };

export async function getHotelOptions(dest: DestinationDetail, source: { page: string; component?: string }, dates?: { checkIn?: string; checkOut?: string; adults?: number }) {
  const path = await createLink("HOTEL", { destinationName: dest.name, adults: dates?.adults ?? 2, checkIn: dates?.checkIn, checkOut: dates?.checkOut }, { destinationId: dest.id });
  return {
    tiers: { budget: dest.hotelNightBudget, mid: dest.hotelNightMid, luxury: dest.hotelNightLuxury, kind: "ESTIMATE" as const },
    bookPath: withSource(path, source),
  };
}

export async function getActivityOptions(dest: DestinationDetail, source: { page: string; component?: string }) {
  const path = await createLink("ACTIVITY", { destinationName: dest.name }, { destinationId: dest.id });
  return { activities: dest.activities, dailyEstimateUsd: dest.dailyActivities, kind: "ESTIMATE" as const, bookPath: withSource(path, source) };
}

export async function getCarOptions(dest: DestinationDetail, source: { page: string; component?: string }) {
  const path = await createLink("CAR", { destinationName: dest.name }, { destinationId: dest.id });
  return { bookPath: withSource(path, source), kind: "ESTIMATE" as const };
}
