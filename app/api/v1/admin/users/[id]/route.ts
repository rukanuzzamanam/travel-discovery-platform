import { z } from "zod";
import { api, ok, parseBody, ApiError } from "@/lib/http/api";
import { db } from "@/lib/db/client";
import { requireAdmin } from "@/lib/auth/session";
import { LIMITS } from "@/lib/security/rate-limit";

const schema = z.object({ role: z.enum(["ADMIN", "EDITOR", "ANALYST"]).nullable() });

/** Grant, change or revoke an admin role. ADMIN only; admins cannot demote themselves (prevents lock-out). */
export const PATCH = api(
  async ({ req, params }) => {
    const actor = await requireAdmin("ADMIN");
    const id = z.string().uuid().parse(params.id);
    if (id === actor.id) throw new ApiError("FORBIDDEN", "You can't change your own role");
    const { role } = await parseBody(req, schema);
    if (!(await db.user.findUnique({ where: { id }, select: { id: true } }))) throw new ApiError("NOT_FOUND", "User not found");
    if (role === null) await db.adminUser.deleteMany({ where: { userId: id } });
    else await db.adminUser.upsert({ where: { userId: id }, update: { role }, create: { userId: id, role } });
    return ok({ role });
  },
  { limit: LIMITS.write },
);
