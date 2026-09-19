import "server-only";
import { z } from "zod";
import { logger } from "@/lib/logger";
import { SUPPORTED_CURRENCIES, STATIC_RATE_TABLE, type Currency, type RateTable } from "./index";

/**
 * Exchange-rate provider abstraction (server side).
 *
 * TODAY: StaticFxRateProvider: fixed development rates, optionally overridden with FX_RATES_JSON.
 *        These are NOT live. The resulting table has `live: false` and the UI says so.
 * LATER: implement FxRateProvider against a real exchange-rate API (fetch, cache with lib/cache, return live: true)
 *        and register it in `fxProviders` below. Nothing else changes: components only see a RateTable.
 */
export interface FxRateProvider {
  readonly id: string;
  isConfigured(): boolean;
  getRates(): Promise<RateTable>;
}

/**
 * Optional override, e.g. FX_RATES_JSON='{"AUD":1.52,"EUR":0.93}' (units per 1 USD).
 * Still labelled static/not-live: an environment variable is not a market feed.
 */
const override = z.record(z.string(), z.number().positive().finite());

export class StaticFxRateProvider implements FxRateProvider {
  readonly id = "static-dev";

  isConfigured() {
    return true;
  }

  async getRates(): Promise<RateTable> {
    const raw = process.env.FX_RATES_JSON;
    if (!raw) return STATIC_RATE_TABLE;
    try {
      const parsed = override.parse(JSON.parse(raw));
      const rates = { ...STATIC_RATE_TABLE.rates };
      for (const c of SUPPORTED_CURRENCIES) if (parsed[c] !== undefined && c !== "USD") rates[c] = parsed[c];
      return { ...STATIC_RATE_TABLE, rates, source: "static-env", asOf: process.env.FX_RATES_AS_OF || STATIC_RATE_TABLE.asOf };
    } catch {
      logger.warn("fx_rates_override_invalid", { note: "FX_RATES_JSON ignored; using built-in static rates" });
      return STATIC_RATE_TABLE;
    }
  }
}

/** Registry, in priority order. Add a live provider here and it will be used when configured. */
export const fxProviders: FxRateProvider[] = [new StaticFxRateProvider()];

export async function getRateTable(): Promise<RateTable> {
  const provider = fxProviders.find((p) => p.isConfigured()) ?? fxProviders[fxProviders.length - 1];
  try {
    return await provider.getRates();
  } catch (e) {
    logger.error("fx_provider_failed", { provider: provider.id, message: (e as Error).message });
    return STATIC_RATE_TABLE; // never break pages because of FX
  }
}

export type { Currency, RateTable };
