import "server-only";
import type { AffiliateProvider } from "../affiliate-provider";
import { BRAND_HOSTS, TRACKING_HOST, travelpayoutsConfig } from "./config";
import { activityLink, carLink, flightLink, hotelLink } from "./links";

export class TravelpayoutsProvider implements AffiliateProvider {
  readonly id = "travelpayouts";

  isConfigured() {
    return !!travelpayoutsConfig().marker;
  }

  supports() {
    return true;
  }

  allowedHosts() {
    const wl = travelpayoutsConfig().whiteLabelUrl;
    return [TRACKING_HOST, ...Object.values(BRAND_HOSTS), ...(wl ? [new URL(wl).hostname] : [])];
  }

  createFlightLink = flightLink;
  createHotelLink = hotelLink;
  createActivityLink = activityLink;
  createCarLink = carLink;
}
