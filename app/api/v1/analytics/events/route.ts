import { api, ok, parseBody } from "@/lib/http/api";
import { LIMITS } from "@/lib/security/rate-limit";
import { analyticsEventSchema } from "@/lib/analytics/events";
import { track } from "@/lib/analytics/track";
import { cleanText } from "@/lib/security/sanitize";
import { getCurrentUser } from "@/lib/auth/session";

export const POST = api(
  async ({ req }) => {
    const event = await parseBody(req, analyticsEventSchema);
    const user = await getCurrentUser();
    await track(event.name, {
      userId: user?.id,
      path: event.path ? cleanText(event.path, 500) : undefined,
      destination: event.destination ? cleanText(event.destination, 120) : undefined,
      properties: event.properties,
    });
    return ok({ recorded: true }, { status: 202 });
  },
  { limit: LIMITS.analytics },
);
