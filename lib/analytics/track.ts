import "server-only";
import { db } from "@/lib/db/client";
import { getSessionId } from "@/lib/auth/session";
import { logger, errorMeta } from "@/lib/logger";
import type { EventName } from "./events";

type TrackOptions = {
  userId?: string;
  path?: string;
  destination?: string;
  sessionId?: string;
  properties?: Record<string, string | number | boolean | null>;
};

/** Server-side event recording. Analytics must never break a user request, so errors are only logged. */
export async function track(name: EventName, opts: TrackOptions = {}) {
  try {
    await db.analyticsEvent.create({
      data: {
        name,
        sessionId: opts.sessionId ?? (await getSessionId()),
        userId: opts.userId,
        path: opts.path,
        destination: opts.destination,
        properties: opts.properties ?? {},
      },
    });
  } catch (e) {
    logger.warn("track_failed", { name, ...errorMeta(e) });
  }
}
