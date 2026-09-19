import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/site";
import { getActiveDeals, getDestinations, getPublishedGuides, getPublishedItineraries } from "@/lib/travel/repository";
import { BUDGET_PAGES, hubOrigins } from "@/lib/seo/programmatic";
import { discover } from "@/lib/travel/discover";
import { DEFAULT_ORIGIN } from "@/lib/site";
import { logger, errorMeta } from "@/lib/logger";

// Generated on demand and cached; never fails the build if the database is unreachable.
export const dynamic = "force-dynamic";

const STATIC = ["/", "/discover", "/destinations", "/guides", "/itineraries", "/deals", "/flights", "/hotels", "/cars", "/activities", "/newsletter"];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = STATIC.filter((p) => p !== "/discover").map((p) => ({
    url: absoluteUrl(p),
    changeFrequency: p === "/" ? "daily" : "weekly",
    priority: p === "/" ? 1 : 0.7,
  }));

  try {
    const [dests, guides, itins, deals, origins] = await Promise.all([getDestinations(), getPublishedGuides(), getPublishedItineraries(), getActiveDeals(), hubOrigins()]);

    entries.push(...dests.map((d) => ({ url: absoluteUrl(`/destinations/${d.slug}`), lastModified: d.updatedAt, changeFrequency: "weekly" as const, priority: 0.9 })));
    entries.push(...dests.map((d) => ({ url: absoluteUrl(`/hotels/${d.slug}`), lastModified: d.updatedAt, changeFrequency: "weekly" as const, priority: 0.6 })));
    entries.push(...guides.map((g) => ({ url: absoluteUrl(`/guides/${g.slug}`), lastModified: g.updatedAt, changeFrequency: "monthly" as const, priority: 0.8 })));
    entries.push(...itins.map((i) => ({ url: absoluteUrl(`/itineraries/${i.slug}`), lastModified: i.updatedAt, changeFrequency: "monthly" as const, priority: 0.8 })));
    entries.push(...deals.map((d) => ({ url: absoluteUrl(`/deals/${d.slug}`), lastModified: d.updatedAt, changeFrequency: "daily" as const, priority: 0.6 })));
    entries.push(...deals.filter((d) => d.productType === "FLIGHT").map((d) => ({ url: absoluteUrl(`/cheap-flights/${d.slug}`), lastModified: d.updatedAt, changeFrequency: "weekly" as const, priority: 0.7 })));

    // Programmatic pages are listed only when they have enough real content to render (same guards as the pages).
    for (const o of origins) {
      const slug = o.city.toLowerCase().replace(/[^a-z0-9]+/g, "-");
      const [all, weekend] = await Promise.all([
        discover({ origin: o.iata, budget: 3000, nights: 7, travellers: 2, interests: [], style: "MID_RANGE" }, 12),
        discover({ origin: o.iata, budget: 2500, nights: 3, travellers: 2, interests: [], style: "MID_RANGE" }, 30),
      ]);
      if (all.items.length >= 3) entries.push({ url: absoluteUrl(`/travel-from/${slug}`), changeFrequency: "weekly", priority: 0.6 });
      if (weekend.items.filter((i) => i.flightHours <= 5.5).length >= 3) entries.push({ url: absoluteUrl(`/weekend-getaways/${slug}`), changeFrequency: "weekly", priority: 0.6 });
    }
    for (const b of BUDGET_PAGES) {
      const r = await discover({ origin: DEFAULT_ORIGIN, budget: b, nights: 5, travellers: 1, interests: [], style: "BUDGET" }, 12);
      if (r.items.filter((i) => i.withinBudget).length >= 2) entries.push({ url: absoluteUrl(`/travel-budget/${b}`), changeFrequency: "weekly", priority: 0.6 });
    }
  } catch (e) {
    logger.error("sitemap_dynamic_failed", errorMeta(e));
  }
  return entries;
}
