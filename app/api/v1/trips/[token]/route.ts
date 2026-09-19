import { z } from "zod";
import { api, ok, parseBody, ApiError } from "@/lib/http/api";
import { LIMITS } from "@/lib/security/rate-limit";
import { loadTrip, saveTrip } from "@/lib/travel/trip";
import { itineraryDaysSchema } from "@/lib/travel/itinerary-schema";
import { getCurrentUser } from "@/lib/auth/session";
import { getAirport, getDestinationBySlug } from "@/lib/travel/repository";
import { computeTotals } from "@/lib/travel/trip";

const UUID = z.string().uuid();

const saveSchema = z.object({
  days: itineraryDaysSchema,
  style: z.enum(["BUDGET", "MID_RANGE", "LUXURY"]).optional(),
});

/** Trips are addressed by an unguessable share token. Owned trips can only be edited by their owner. */
async function authorise(token: string) {
  const parsed = UUID.safeParse(token);
  if (!parsed.success) throw new ApiError("NOT_FOUND", "Trip not found");
  const trip = await loadTrip(token);
  if (!trip) throw new ApiError("NOT_FOUND", "Trip not found");
  return trip;
}

export const GET = api(async ({ params }) => {
  const trip = await authorise(String(params.token));
  const [dest, origin] = await Promise.all([getDestinationBySlug(trip.state.destinationSlug), getAirport(trip.state.origin)]);
  const totals = dest && origin ? computeTotals(dest, origin, trip.state) : undefined;
  return ok({ token: trip.token, title: trip.title, state: trip.state, totals }, { headers: { "Cache-Control": "private, no-store" } });
});

export const PUT = api(
  async ({ req, params }) => {
    const trip = await authorise(String(params.token));
    if (trip.userId) {
      const user = await getCurrentUser();
      if (user?.id !== trip.userId) throw new ApiError("FORBIDDEN", "You can't edit this trip");
    }
    const body = await parseBody(req, saveSchema);
    const saved = await saveTrip(trip.token, { ...trip.state, days: body.days, style: body.style ?? trip.state.style });
    return ok({ state: saved.state, totals: saved.totals });
  },
  { limit: LIMITS.write },
);
