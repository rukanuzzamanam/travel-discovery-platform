import { z } from "zod";
import { api, ok, parseBody, ApiError } from "@/lib/http/api";
import { db } from "@/lib/db/client";
import { requireAdmin } from "@/lib/auth/session";
import { LIMITS } from "@/lib/security/rate-limit";

const schema = z.object({
  subId: z.string().trim().regex(/^[A-Za-z0-9]{6,64}$/),
  commission: z.number().min(0).max(1_000_000).nullable(),
  currency: z.string().length(3).default("USD"),
  status: z.enum(["PENDING", "CONFIRMED", "REJECTED"]),
  bookingReference: z.string().trim().max(100).nullable().optional(),
});

/** Record or update a conversion against a click (matched by the sub id sent to the provider). Requires EDITOR or above. */
export const POST = api(
  async ({ req }) => {
    await requireAdmin("EDITOR");
    const body = await parseBody(req, schema);
    const click = await db.affiliateClick.findUnique({ where: { subId: body.subId } });
    if (!click) throw new ApiError("NOT_FOUND", "No click with that sub id");
    const existing = await db.conversion.findFirst({ where: { affiliateClickId: click.id, bookingReference: body.bookingReference ?? null } });
    const data = { commission: body.commission, currency: body.currency, status: body.status, bookingReference: body.bookingReference ?? null };
    const row = existing
      ? await db.conversion.update({ where: { id: existing.id }, data })
      : await db.conversion.create({ data: { ...data, affiliateClickId: click.id, provider: click.provider, productType: click.productType } });
    return ok({ id: row.id }, { status: existing ? 200 : 201 });
  },
  { limit: LIMITS.write },
);
