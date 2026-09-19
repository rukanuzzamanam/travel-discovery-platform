import "server-only";
import { env } from "@/lib/env";

/**
 * Travelpayouts configuration. Everything comes from environment variables; nothing is hard-coded in UI code.
 *
 * TRAVELPOUTS_PROJECT_ID   -> affiliate marker (attribution id shown in your Travelpayouts dashboard)
 * TRAVELPOUTS_API_TOKEN    -> Data API token (server-side only)
 * TRAVELPOUTS_WHITE_LABEL_URL -> optional search subdomain, e.g. https://search.example.com
 * TRAVELPOUTS_TRS          -> project id ("trs") used on tp.media partner links
 * TRAVELPOUTS_PROGRAM_*    -> per-brand program ids ("p") copied from your Travelpayouts dashboard
 */
export function travelpayoutsConfig() {
  const e = env();
  const raw = process.env;
  return {
    marker: e.TRAVELPOUTS_PROJECT_ID ?? "",
    trs: raw.TRAVELPOUTS_TRS ?? "",
    apiToken: e.TRAVELPOUTS_API_TOKEN ?? "",
    whiteLabelUrl: (e.TRAVELPOUTS_WHITE_LABEL_URL ?? "").replace(/\/$/, ""),
    programs: {
      flight: raw.TRAVELPOUTS_PROGRAM_FLIGHTS ?? "",
      hotel: raw.TRAVELPOUTS_PROGRAM_HOTELS ?? "",
      activity: raw.TRAVELPOUTS_PROGRAM_ACTIVITIES ?? "",
      car: raw.TRAVELPOUTS_PROGRAM_CARS ?? "",
    },
    dataApiBase: "https://api.travelpayouts.com",
  };
}

/** Brand sites we deep-link into. Also the redirect allow-list (defence in depth against open redirects). */
export const BRAND_HOSTS = {
  flight: "www.aviasales.com",
  hotel: "search.hotellook.com",
  activity: "www.getyourguide.com",
  car: "www.economybookings.com",
} as const;

export const TRACKING_HOST = "tp.media";
