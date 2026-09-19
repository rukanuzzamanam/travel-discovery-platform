import { z } from "zod";
import { api, ok } from "@/lib/http/api";
import { getFlightOptions } from "@/lib/travel/products";
import { safeInternalPath } from "@/lib/security/sanitize";
import { track } from "@/lib/analytics/track";

const query = z.object({
  origin: z.string().trim().toUpperCase().regex(/^[A-Z]{3}$/),
  destination: z.string().trim().min(1).max(80), // destination slug
  departDate: z.iso.date().optional(),
  returnDate: z.iso.date().optional(),
  adults: z.coerce.number().int().min(1).max(9).default(1),
  from: z.string().max(300).optional(),
});

export const GET = api(async ({ req }) => {
  const q = query.parse(Object.fromEntries(req.nextUrl.searchParams));
  const data = await getFlightOptions({
    origin: q.origin,
    destinationSlug: q.destination,
    departDate: q.departDate,
    returnDate: q.returnDate,
    adults: q.adults,
    source: { page: safeInternalPath(q.from, "/flights"), component: "api" },
  });
  await track("flight_result_viewed", { destination: q.destination, properties: { origin: q.origin, providerPrices: data.providerPrices.length } });
  return ok(data, { headers: { "Cache-Control": "private, max-age=60" } });
});
