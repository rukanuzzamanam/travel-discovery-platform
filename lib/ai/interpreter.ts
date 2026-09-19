import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { env } from "@/lib/env";
import { logger, errorMeta } from "@/lib/logger";
import { cleanText } from "@/lib/security/sanitize";
import type { OperationName } from "./operations";

/**
 * Turns a free-text request ("make this trip $300 cheaper") into ONE of the fixed operations.
 * The model only chooses an operation and its numeric parameter. It never writes itinerary content or prices;
 * the operation then runs deterministically on structured trip data. Without AI_API_KEY a rule-based parser is used.
 */

/** `amount` is in the traveller's own currency. The service converts it to USD before running an operation. */
export type RequestedOperation = { operation: OperationName; amount?: number; days?: number };
export type Interpretation = RequestedOperation | { operation: "unsupported" };

export function interpretWithRules(message: string): Interpretation {
  const m = message.toLowerCase();
  const amount = Number(m.match(/[$€£]\s?(\d[\d,]*)/)?.[1]?.replace(/,/g, "") ?? m.match(/(\d[\d,]{1,})\s*(?:usd|aud|eur|gbp|nzd|cad|sgd|dollars?|euros?|pounds?|bucks)/)?.[1]?.replace(/,/g, ""));
  const n = Number(m.match(/\b(\d)\s*(?:more\s+)?(?:day|night)/)?.[1]);
  if (/(cheaper|reduce|save|cut (?:the )?cost|lower (?:the )?cost|less expensive|under budget)/.test(m)) {
    return { operation: "reduceTripCost", amount: Number.isFinite(amount) ? amount : 200 };
  }
  if (/(too expensive|pricey|remove.*expensive|expensive activit)/.test(m)) return { operation: "removeExpensiveActivities" };
  if (/(upgrade|luxur|nicer|more comfortable|treat)/.test(m)) return { operation: "upgradeTrip" };
  if (/(family|kids|children|toddler)/.test(m)) return { operation: "makeFamilyFriendly" };
  if (/beach/.test(m)) return { operation: "addBeachActivities" };
  if (/(shorten|shorter|fewer days|cut.*day|one less|remove a day)/.test(m)) return { operation: "shortenTrip", days: Number.isFinite(n) ? n : 1 };
  if (/(extend|longer|add.*day|more days|extra day)/.test(m)) return { operation: "extendTrip", days: Number.isFinite(n) ? n : 1 };
  return { operation: "unsupported" };
}

const llmSchema = z.object({
  operation: z.enum(["reduceTripCost", "upgradeTrip", "makeFamilyFriendly", "addBeachActivities", "removeExpensiveActivities", "shortenTrip", "extendTrip", "unsupported"]),
  amount: z.number().min(1).max(1_000_000).nullable(),
  days: z.number().int().min(1).max(5).nullable(),
});

const SYSTEM = `You route a traveller's request about their trip to exactly one edit operation.
Operations: reduceTripCost (needs amount: the total saving wanted, as a number in the traveller's own currency; default 200 if unspecified), upgradeTrip, makeFamilyFriendly, addBeachActivities, removeExpensiveActivities, shortenTrip (days), extendTrip (days), unsupported.
Choose "unsupported" if the request does not fit. Do not invent prices, places or activities. Output JSON only.`;

export async function interpret(message: string): Promise<{ call: Interpretation; via: "ai" | "rules" }> {
  const text = cleanText(message, 400);
  const key = env().AI_API_KEY;
  if (!key) return { call: interpretWithRules(text), via: "rules" };
  try {
    const client = new Anthropic({ apiKey: key });
    const res = await client.messages.create({
      model: env().AI_MODEL,
      max_tokens: 500,
      system: SYSTEM,
      output_config: {
        effort: "low",
        format: { type: "json_schema", schema: z.toJSONSchema(llmSchema) as Record<string, unknown> },
      },
      messages: [{ role: "user", content: text }],
    });
    const block = res.content.find((b) => b.type === "text");
    const parsed = llmSchema.parse(JSON.parse(block && block.type === "text" ? block.text : "{}"));
    if (parsed.operation === "unsupported") return { call: { operation: "unsupported" }, via: "ai" };
    return {
      call: { operation: parsed.operation as OperationName, amount: parsed.amount ?? undefined, days: parsed.days ?? undefined },
      via: "ai",
    };
  } catch (e) {
    // AI outage or bad output must never block editing: fall back to rules.
    logger.warn("ai_interpret_failed", errorMeta(e));
    return { call: interpretWithRules(text), via: "rules" };
  }
}
