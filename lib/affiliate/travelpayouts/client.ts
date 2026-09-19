import "server-only";
import { z } from "zod";
import { ApiError } from "@/lib/http/api";
import { logger } from "@/lib/logger";
import type { FlightPriceProvider, ProviderFlightPrice } from "../affiliate-provider";
import { travelpayoutsConfig } from "./config";

/**
 * Travelpayouts Data API client. Only the documented Flight Data endpoint `GET /v1/prices/cheap`
 * is used, authenticated with the `X-Access-Token` header.
 * These are CACHED fares seen in recent searches, not live availability, so they are surfaced as
 * provider prices with a timestamp and a "may have changed" disclaimer in the UI.
 */

const cheapResponse = z.object({
  success: z.boolean().optional(),
  data: z
    .record(
      z.string(),
      z.record(
        z.string(),
        z.object({
          price: z.number(),
          airline: z.string().optional(),
          departure_at: z.string().optional(),
          return_at: z.string().optional(),
        }),
      ),
    )
    .default({}),
});

export class TravelpayoutsData implements FlightPriceProvider {
  readonly id = "travelpayouts";

  isConfigured() {
    return !!travelpayoutsConfig().apiToken;
  }

  async getFlightPrices(q: { origin: string; destination: string; departDate?: string; returnDate?: string }): Promise<ProviderFlightPrice[]> {
    const c = travelpayoutsConfig();
    if (!c.apiToken) return [];
    const url = new URL(`${c.dataApiBase}/v1/prices/cheap`);
    url.searchParams.set("origin", q.origin);
    url.searchParams.set("destination", q.destination);
    url.searchParams.set("currency", "usd");
    if (q.departDate) url.searchParams.set("depart_date", q.departDate.slice(0, 7));
    if (q.returnDate) url.searchParams.set("return_date", q.returnDate.slice(0, 7));

    let res: Response;
    try {
      res = await fetch(url, { headers: { "X-Access-Token": c.apiToken }, signal: AbortSignal.timeout(6000), cache: "no-store" });
    } catch (e) {
      logger.warn("travelpayouts_fetch_failed", { message: (e as Error).message });
      throw new ApiError("PROVIDER_UNAVAILABLE", "Travel provider temporarily unavailable");
    }
    if (!res.ok) {
      logger.warn("travelpayouts_bad_status", { status: res.status });
      throw new ApiError("PROVIDER_UNAVAILABLE", "Travel provider temporarily unavailable");
    }
    const parsed = cheapResponse.safeParse(await res.json());
    if (!parsed.success) {
      logger.warn("travelpayouts_bad_shape", { issues: parsed.error.issues.length });
      throw new ApiError("PROVIDER_UNAVAILABLE", "Travel provider temporarily unavailable");
    }
    const fetchedAt = new Date().toISOString();
    return Object.values(parsed.data.data)
      .flatMap((byIndex) => Object.values(byIndex))
      .map((t) => ({
        provider: this.id,
        priceUsd: Math.round(t.price),
        airline: t.airline,
        departAt: t.departure_at,
        returnAt: t.return_at,
        fetchedAt,
      }))
      .sort((a, b) => a.priceUsd - b.priceUsd);
  }
}
