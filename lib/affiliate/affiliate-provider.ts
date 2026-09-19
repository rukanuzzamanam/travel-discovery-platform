import { z } from "zod";

/**
 * Provider-neutral affiliate contracts. The UI and application services depend ONLY on these types;
 * concrete providers (Travelpayouts today; Duffel, Booking-style hotel or activity providers later) implement them.
 */

export type ProductKind = "FLIGHT" | "HOTEL" | "ACTIVITY" | "CAR";

const iata = z.string().regex(/^[A-Z]{3}$/);
const isoDate = z.iso.date();

export const flightParamsSchema = z.object({
  origin: iata,
  destination: iata,
  departDate: isoDate.optional(),
  returnDate: isoDate.optional(),
  adults: z.number().int().min(1).max(9).default(1),
});
export const hotelParamsSchema = z.object({
  destinationName: z.string().min(1).max(80),
  checkIn: isoDate.optional(),
  checkOut: isoDate.optional(),
  adults: z.number().int().min(1).max(9).default(2),
});
export const activityParamsSchema = z.object({ destinationName: z.string().min(1).max(80) });
export const carParamsSchema = z.object({
  destinationName: z.string().min(1).max(80),
  pickupDate: isoDate.optional(),
  dropoffDate: isoDate.optional(),
});

export type FlightLinkParams = z.infer<typeof flightParamsSchema>;
export type HotelLinkParams = z.infer<typeof hotelParamsSchema>;
export type ActivityLinkParams = z.infer<typeof activityParamsSchema>;
export type CarLinkParams = z.infer<typeof carParamsSchema>;

export const PARAM_SCHEMAS = {
  FLIGHT: flightParamsSchema,
  HOTEL: hotelParamsSchema,
  ACTIVITY: activityParamsSchema,
  CAR: carParamsSchema,
} as const;

export type LinkContext = {
  /** Unique per click; lets the provider's reports be joined back to our AffiliateClick row. */
  subId: string;
  campaign?: string;
};

export interface AffiliateProvider {
  readonly id: string;
  /** True when required configuration (e.g. marker/project id) is present. */
  isConfigured(): boolean;
  supports(product: ProductKind): boolean;
  /** Hostnames this provider may redirect to. The router refuses any URL outside this list. */
  allowedHosts(): string[];
  createFlightLink(params: FlightLinkParams, ctx: LinkContext): string;
  createHotelLink(params: HotelLinkParams, ctx: LinkContext): string;
  createActivityLink(params: ActivityLinkParams, ctx: LinkContext): string;
  createCarLink(params: CarLinkParams, ctx: LinkContext): string;
}

/** A price returned by a provider's data API. Always PROVIDER kind, with freshness metadata. */
export type ProviderFlightPrice = {
  provider: string;
  priceUsd: number;
  airline?: string;
  departAt?: string;
  returnAt?: string;
  fetchedAt: string;
};

/** Optional capability: providers that can return (cached) fare data. */
export interface FlightPriceProvider {
  readonly id: string;
  isConfigured(): boolean;
  getFlightPrices(query: { origin: string; destination: string; departDate?: string; returnDate?: string }): Promise<ProviderFlightPrice[]>;
}
