import { z } from "zod";
import { api, ok } from "@/lib/http/api";
import { LIMITS } from "@/lib/security/rate-limit";
import { tripPlanSchema } from "@/lib/travel/schemas";
import { createTrip } from "@/lib/travel/trip";
import { getCurrentUser, getSessionId, requireUser } from "@/lib/auth/session";
import { track } from "@/lib/analytics/track";
import { db } from "@/lib/db/client";

export const POST = api(
  async ({ req }) => {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      body = null;
    }
    const input = tripPlanSchema.parse(body);
    const itinerarySlug = z.string().max(80).optional().parse((body as { itinerarySlug?: string }).itinerarySlug);
    const [user, sessionId] = await Promise.all([getCurrentUser(), getSessionId()]);
    const trip = await createTrip({ ...input, itinerarySlug }, user?.id);
    await track("trip_created", { sessionId, userId: user?.id, destination: input.destination, properties: { totalUsd: trip.totals.total } });
    await track("itinerary_generated", { sessionId, userId: user?.id, destination: input.destination, properties: { source: itinerarySlug ? "template" : "generator" } });
    return ok({ token: trip.token, path: `/trips/${trip.token}`, totals: trip.totals, state: trip.state }, { status: 201 });
  },
  { limit: LIMITS.write },
);

export const GET = api(async () => {
  const user = await requireUser();
  const trips = await db.trip.findMany({
    where: { userId: user.id },
    orderBy: { updatedAt: "desc" },
    include: { destination: { select: { slug: true, name: true } } },
  });
  return ok(
    trips.map((t) => ({
      token: t.shareToken,
      title: t.title,
      destination: t.destination,
      totalEstimateUsd: t.totalEstimateUsd,
      startDate: t.startDate,
      updatedAt: t.updatedAt,
    })),
  );
});
