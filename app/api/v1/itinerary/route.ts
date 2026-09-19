import { z } from "zod";
import { api, ok, parseBody } from "@/lib/http/api";
import { LIMITS } from "@/lib/security/rate-limit";
import { modifyItinerary } from "@/lib/ai/service";
import { OPERATION_NAMES } from "@/lib/ai/operations";
import { getCurrentUser } from "@/lib/auth/session";
import { DEFAULT_CURRENCY, SUPPORTED_CURRENCIES } from "@/lib/currency";

const schema = z
  .object({
    token: z.string().uuid(),
    message: z.string().trim().min(2).max(400).optional(),
    operation: z.enum(OPERATION_NAMES as [string, ...string[]]).optional(),
    /** Saving wanted, in `currency`. `amountUsd` is accepted for older clients. */
    amount: z.number().min(1).max(1_000_000).optional(),
    amountUsd: z.number().min(1).max(100000).optional(),
    currency: z.string().trim().toUpperCase().pipe(z.enum(SUPPORTED_CURRENCIES)).default(DEFAULT_CURRENCY),
    days: z.number().int().min(1).max(5).optional(),
  })
  .refine((v) => v.message || v.operation, { message: "Provide a message or an operation" });

/** POST /api/v1/itinerary  { token, message | operation } -> edits the trip and returns the new state. */
export const POST = api(
  async ({ req }) => {
    const body = await parseBody(req, schema);
    const user = await getCurrentUser();
    const result = await modifyItinerary(
      body.token,
      { message: body.message, operation: body.operation as never, amount: body.amount, amountUsd: body.amountUsd, currency: body.currency, days: body.days },
      user?.id,
    );
    return ok(result);
  },
  { limit: LIMITS.ai },
);
