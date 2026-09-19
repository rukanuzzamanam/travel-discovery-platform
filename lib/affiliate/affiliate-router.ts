import "server-only";
import type { AffiliateProvider, FlightPriceProvider, LinkContext, ProductKind } from "./affiliate-provider";
import { PARAM_SCHEMAS } from "./affiliate-provider";
import { TravelpayoutsProvider } from "./travelpayouts/provider";
import { TravelpayoutsData } from "./travelpayouts/client";

/**
 * Registry of providers. Add a new provider by implementing AffiliateProvider and appending it here
 * (order = priority). Nothing in the UI or application services changes.
 */
export const affiliateProviders: AffiliateProvider[] = [new TravelpayoutsProvider()];
export const flightPriceProviders: FlightPriceProvider[] = [new TravelpayoutsData()];

export function getAffiliateProvider(product: ProductKind, preferredId?: string): AffiliateProvider | undefined {
  const usable = affiliateProviders.filter((p) => p.supports(product));
  return usable.find((p) => p.id === preferredId) ?? usable.find((p) => p.isConfigured()) ?? usable[0];
}

export class UnsafeRedirectError extends Error {}

/** Final safety net: only https URLs on the provider's allow-listed hosts may ever be redirected to. */
export function assertSafeRedirect(url: string, provider: AffiliateProvider): string {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    throw new UnsafeRedirectError("Malformed affiliate URL");
  }
  const hosts = provider.allowedHosts();
  const process_ = process.env.NODE_ENV;
  const httpOk = process_ !== "production" && u.protocol === "http:" && u.hostname === "localhost";
  if (!httpOk && u.protocol !== "https:") throw new UnsafeRedirectError("Only https redirects are allowed");
  if (u.username || u.password) throw new UnsafeRedirectError("Credentials in URL are not allowed");
  if (!httpOk && !hosts.includes(u.hostname)) throw new UnsafeRedirectError(`Host not allow-listed: ${u.hostname}`);
  return u.toString();
}

/** Build the approved affiliate URL for a stored link (params are re-validated on every use). */
export function buildAffiliateUrl(
  link: { provider: string; productType: ProductKind; params: unknown },
  ctx: LinkContext,
): { url: string; provider: AffiliateProvider } {
  const provider = getAffiliateProvider(link.productType, link.provider);
  if (!provider) throw new UnsafeRedirectError("No provider available");
  let url: string;
  switch (link.productType) {
    case "FLIGHT":
      url = provider.createFlightLink(PARAM_SCHEMAS.FLIGHT.parse(link.params), ctx);
      break;
    case "HOTEL":
      url = provider.createHotelLink(PARAM_SCHEMAS.HOTEL.parse(link.params), ctx);
      break;
    case "ACTIVITY":
      url = provider.createActivityLink(PARAM_SCHEMAS.ACTIVITY.parse(link.params), ctx);
      break;
    case "CAR":
      url = provider.createCarLink(PARAM_SCHEMAS.CAR.parse(link.params), ctx);
      break;
  }
  return { url: assertSafeRedirect(url, provider), provider };
}
