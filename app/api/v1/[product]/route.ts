import { z } from "zod";
import { api, ok, ApiError } from "@/lib/http/api";
import { getActivityOptions, getCarOptions, getHotelOptions } from "@/lib/travel/products";
import { getDestinationBySlug } from "@/lib/travel/repository";
import { safeInternalPath } from "@/lib/security/sanitize";
import { track } from "@/lib/analytics/track";

/** Shared read endpoint for hotels, activities and cars: /api/v1/hotels?destination=bali */
const query = z.object({
  destination: z.string().trim().min(1).max(80),
  checkIn: z.iso.date().optional(),
  checkOut: z.iso.date().optional(),
  adults: z.coerce.number().int().min(1).max(9).optional(),
  from: z.string().max(300).optional(),
});

export const GET = api(async ({ req, params }) => {
  const product = String(params.product);
  if (!["hotels", "activities", "cars"].includes(product)) throw new ApiError("NOT_FOUND", "Unknown resource");
  const q = query.parse(Object.fromEntries(req.nextUrl.searchParams));
  const dest = await getDestinationBySlug(q.destination);
  if (!dest) throw new ApiError("NOT_FOUND", "Destination not found");
  const source = { page: safeInternalPath(q.from, `/${product}`), component: "api" };

  if (product === "hotels") {
    await track("hotel_result_viewed", { destination: dest.slug });
    return ok(await getHotelOptions(dest, source, q));
  }
  if (product === "activities") return ok(await getActivityOptions(dest, source));
  return ok(await getCarOptions(dest, source));
});
