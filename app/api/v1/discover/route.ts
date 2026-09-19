import { api, ok, parseBody } from "@/lib/http/api";
import { LIMITS } from "@/lib/security/rate-limit";
import { discoverRequestSchema } from "@/lib/travel/schemas";
import { discover, recordSearch } from "@/lib/travel/discover";
import { getCurrentUser, getSessionId } from "@/lib/auth/session";
import { track } from "@/lib/analytics/track";

export const POST = api(
  async ({ req }) => {
    const input = await parseBody(req, discoverRequestSchema);
    const [result, user, sessionId] = await Promise.all([discover(input), getCurrentUser(), getSessionId()]);
    const saved = await recordSearch(result, { sessionId, userId: user?.id });
    await track("search_completed", {
      sessionId,
      userId: user?.id,
      properties: { origin: result.search.origin, budget: result.search.budget, results: result.items.length },
    });
    return ok({ searchId: saved.id, search: result.search, results: result.items });
  },
  { limit: LIMITS.write },
);
