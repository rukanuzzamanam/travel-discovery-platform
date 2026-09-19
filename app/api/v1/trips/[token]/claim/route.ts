import { api, ok, ApiError } from "@/lib/http/api";
import { LIMITS } from "@/lib/security/rate-limit";
import { db } from "@/lib/db/client";
import { requireUser } from "@/lib/auth/session";

/** "Save this trip": attach an anonymous trip to the signed-in user. */
export const POST = api(
  async ({ params }) => {
    const user = await requireUser();
    const token = String(params.token);
    const trip = await db.trip.findUnique({ where: { shareToken: token }, select: { id: true, userId: true } });
    if (!trip) throw new ApiError("NOT_FOUND", "Trip not found");
    if (trip.userId && trip.userId !== user.id) throw new ApiError("FORBIDDEN", "This trip belongs to another account");
    await db.trip.update({ where: { id: trip.id }, data: { userId: user.id } });
    return ok({ saved: true });
  },
  { limit: LIMITS.write },
);
