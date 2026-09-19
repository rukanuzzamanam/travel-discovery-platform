import "server-only";
import { db } from "@/lib/db/client";
import type { z } from "zod";
import { PARAM_SCHEMAS, type ProductKind } from "./affiliate-provider";
import { getAffiliateProvider } from "./affiliate-router";

export const GO_SEGMENT: Record<ProductKind, string> = { FLIGHT: "flight", HOTEL: "hotel", ACTIVITY: "activity", CAR: "car" };
export const SEGMENT_TO_TYPE = Object.fromEntries(Object.entries(GO_SEGMENT).map(([k, v]) => [v, k])) as Record<string, ProductKind>;

type ParamsOf<K extends ProductKind> = z.input<(typeof PARAM_SCHEMAS)[K]>;

/**
 * Create (or reuse) an internal link record and return its public redirect path.
 * Only validated parameters are stored, never a URL, so /go can never be pointed at an arbitrary target.
 */
export async function createLink<K extends ProductKind>(
  product: K,
  params: ParamsOf<K>,
  opts: { destinationId?: string } = {},
): Promise<string> {
  const clean = PARAM_SCHEMAS[product].parse(params);
  const provider = getAffiliateProvider(product)?.id ?? "travelpayouts";
  const existing = await db.affiliateLink.findFirst({
    where: { provider, productType: product, destinationId: opts.destinationId ?? null, params: { equals: clean } },
    select: { id: true },
  });
  const id =
    existing?.id ??
    (
      await db.affiliateLink.create({
        data: { provider, productType: product, destinationId: opts.destinationId, params: clean },
        select: { id: true },
      })
    ).id;
  return `/go/${GO_SEGMENT[product]}/${id}`;
}

/** Append attribution hints understood by /go (validated there). */
export function withSource(path: string, source: { page: string; component?: string; campaign?: string }) {
  const q = new URLSearchParams({ from: source.page });
  if (source.component) q.set("c", source.component);
  if (source.campaign) q.set("cmp", source.campaign);
  return `${path}?${q.toString()}`;
}
