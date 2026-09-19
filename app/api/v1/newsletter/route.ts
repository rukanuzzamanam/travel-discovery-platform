import { z } from "zod";
import { api, ok, parseBody } from "@/lib/http/api";
import { LIMITS } from "@/lib/security/rate-limit";
import { db } from "@/lib/db/client";
import { cleanText } from "@/lib/security/sanitize";
import { track } from "@/lib/analytics/track";

export const NEWSLETTER_CATEGORIES = ["deals", "weekend", "inspiration", "budget"] as const;

const schema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  preferences: z.array(z.enum(NEWSLETTER_CATEGORIES)).default(["deals", "inspiration"]),
  source: z.string().max(80).default("unknown"),
});

export const POST = api(
  async ({ req }) => {
    const input = await parseBody(req, schema);
    const preferences = [...new Set(input.preferences)];
    await db.newsletterSubscriber.upsert({
      where: { email: input.email },
      update: { preferences, source: cleanText(input.source, 80) },
      create: { email: input.email, preferences, source: cleanText(input.source, 80) },
    });
    await track("newsletter_signup", { properties: { source: input.source } });
    // Same response whether new or existing: do not reveal which emails are subscribed.
    return ok({ subscribed: true }, { status: 201 });
  },
  { limit: LIMITS.write },
);
