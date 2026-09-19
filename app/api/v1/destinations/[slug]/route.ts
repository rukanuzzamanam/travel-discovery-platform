import { api, ok, ApiError } from "@/lib/http/api";
import { getDestinationBySlug } from "@/lib/travel/repository";

export const GET = api(async ({ params }) => {
  const d = await getDestinationBySlug(String(params.slug));
  if (!d) throw new ApiError("NOT_FOUND", "Destination not found");
  return ok(d, { headers: { "Cache-Control": "public, s-maxage=600, stale-while-revalidate=3600" } });
});
