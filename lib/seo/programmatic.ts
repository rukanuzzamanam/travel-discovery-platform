import "server-only";
import { getAirports, type AirportRef } from "@/lib/travel/repository";
import { slugify } from "@/lib/utils/format";

/**
 * Programmatic SEO guard rails. We only publish landing pages for a small, curated set of origins and budgets,
 * and each page must have real content (checked by the page) or it 404s. No arbitrary combinations are indexed.
 */
export const HUB_ORIGINS = ["sydney", "melbourne", "brisbane", "perth", "adelaide", "auckland", "singapore", "london", "new-york", "los-angeles"] as const;
export const BUDGET_PAGES = [1000, 1500, 2000, 3000] as const;

export async function originFromSlug(slug: string): Promise<AirportRef | undefined> {
  if (!(HUB_ORIGINS as readonly string[]).includes(slug)) return undefined;
  const airports = await getAirports();
  return airports.find((a) => slugify(a.city) === slug);
}

export async function hubOrigins() {
  const airports = await getAirports();
  return HUB_ORIGINS.map((s) => airports.find((a) => slugify(a.city) === s)).filter((a): a is AirportRef => !!a);
}
