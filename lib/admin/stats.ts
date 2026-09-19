import "server-only";
import { db } from "@/lib/db/client";

/** Read-only analytics queries for the admin dashboard. Revenue figures only sum USD conversions that were not rejected. */

export type Range = { days: number; since: Date };
export const rangeFromDays = (days: number): Range => ({ days, since: new Date(Date.now() - days * 86_400_000) });

type Point = { day: string; n: number };
type Ranked = { key: string; clicks: number; revenue: number };

const iso = (d: Date) => d.toISOString().slice(0, 10);

export async function overview(r: Range) {
  const [visitors, searches, trips, clicks, conversions, revenue] = await Promise.all([
    db.analyticsEvent.findMany({ where: { name: "page_view", createdAt: { gte: r.since } }, distinct: ["sessionId"], select: { sessionId: true } }).then((x) => x.length),
    db.search.count({ where: { createdAt: { gte: r.since } } }),
    db.trip.count({ where: { createdAt: { gte: r.since } } }),
    db.affiliateClick.count({ where: { createdAt: { gte: r.since } } }),
    db.conversion.count({ where: { createdAt: { gte: r.since }, status: { not: "REJECTED" } } }),
    db.conversion.aggregate({ _sum: { commission: true }, where: { createdAt: { gte: r.since }, status: { not: "REJECTED" }, currency: "USD" } }),
  ]);
  return {
    visitors,
    searches,
    trips,
    clicks,
    conversionRate: clicks ? Math.round((conversions / clicks) * 1000) / 10 : 0,
    revenue: Number(revenue._sum.commission ?? 0),
  };
}

export async function trafficOverTime(r: Range): Promise<Point[]> {
  const rows = await db.$queryRaw<{ day: Date; n: number }[]>`
    SELECT date_trunc('day', "createdAt") AS day, count(*)::int AS n
    FROM "AnalyticsEvent" WHERE name = 'page_view' AND "createdAt" >= ${r.since} GROUP BY 1 ORDER BY 1`;
  return rows.map((x) => ({ day: iso(x.day), n: x.n }));
}

export async function clicksOverTime(r: Range): Promise<Point[]> {
  const rows = await db.$queryRaw<{ day: Date; n: number }[]>`
    SELECT date_trunc('day', "createdAt") AS day, count(*)::int AS n
    FROM "AffiliateClick" WHERE "createdAt" >= ${r.since} GROUP BY 1 ORDER BY 1`;
  return rows.map((x) => ({ day: iso(x.day), n: x.n }));
}

type Dim = "provider" | "page" | "destination";

/** Revenue and clicks grouped by provider, source page or destination: the attribution view. */
export async function revenueBy(dim: Dim, r: Range): Promise<Ranked[]> {
  const rows =
    dim === "provider"
      ? await db.$queryRaw<{ key: string; clicks: number; revenue: number }[]>`
          SELECT k.provider AS key, count(DISTINCT k.id)::int AS clicks,
                 COALESCE(sum(v.commission) FILTER (WHERE v.status <> 'REJECTED' AND v.currency = 'USD'), 0)::float AS revenue
          FROM "AffiliateClick" k LEFT JOIN "Conversion" v ON v."affiliateClickId" = k.id
          WHERE k."createdAt" >= ${r.since} GROUP BY 1 ORDER BY 3 DESC, 2 DESC LIMIT 10`
      : dim === "page"
        ? await db.$queryRaw<{ key: string; clicks: number; revenue: number }[]>`
          SELECT k."sourcePage" AS key, count(DISTINCT k.id)::int AS clicks,
                 COALESCE(sum(v.commission) FILTER (WHERE v.status <> 'REJECTED' AND v.currency = 'USD'), 0)::float AS revenue
          FROM "AffiliateClick" k LEFT JOIN "Conversion" v ON v."affiliateClickId" = k.id
          WHERE k."createdAt" >= ${r.since} GROUP BY 1 ORDER BY 3 DESC, 2 DESC LIMIT 10`
        : await db.$queryRaw<{ key: string; clicks: number; revenue: number }[]>`
          SELECT COALESCE(d.name, 'Unattributed') AS key, count(DISTINCT k.id)::int AS clicks,
                 COALESCE(sum(v.commission) FILTER (WHERE v.status <> 'REJECTED' AND v.currency = 'USD'), 0)::float AS revenue
          FROM "AffiliateClick" k LEFT JOIN "Destination" d ON d.id = k."destinationId"
          LEFT JOIN "Conversion" v ON v."affiliateClickId" = k.id
          WHERE k."createdAt" >= ${r.since} GROUP BY 1 ORDER BY 3 DESC, 2 DESC LIMIT 10`;
  return rows;
}

export async function topDestinations(r: Range) {
  const rows = await db.$queryRaw<{ key: string; n: number }[]>`
    SELECT destination AS key, count(*)::int AS n FROM "AnalyticsEvent"
    WHERE name = 'destination_viewed' AND destination IS NOT NULL AND "createdAt" >= ${r.since}
    GROUP BY 1 ORDER BY 2 DESC LIMIT 10`;
  return rows;
}

export async function funnel(r: Range) {
  const rows = await db.analyticsEvent.groupBy({ by: ["name"], where: { createdAt: { gte: r.since } }, _count: { _all: true }, orderBy: { _count: { name: "desc" } } });
  return rows.map((x) => ({ name: x.name, count: x._count._all }));
}
