import { z } from "zod";
import { api, ok, parseBody, ApiError } from "@/lib/http/api";
import { LIMITS } from "@/lib/security/rate-limit";
import { db } from "@/lib/db/client";
import { requireUser } from "@/lib/auth/session";
import { getAirport, getDestinationBySlug } from "@/lib/travel/repository";
import { INTERESTS, toEnum } from "@/lib/travel/interests";
import { styleSchema } from "@/lib/travel/schemas";
import { SUPPORTED_CURRENCIES } from "@/lib/currency";

/** Authenticated account resources: preferences, saved-destinations, price-alerts. */

const prefs = z.object({
  homeAirport: z.string().trim().toUpperCase().regex(/^[A-Z]{3}$/).nullable().optional(),
  travelStyle: styleSchema.optional(),
  interests: z.array(z.enum(INTERESTS)).max(10).optional(),
  emailAlerts: z.boolean().optional(),
  currency: z.string().trim().toUpperCase().pipe(z.enum(SUPPORTED_CURRENCIES)).optional(),
});
const slugBody = z.object({ slug: z.string().trim().min(1).max(80) });
const alertBody = z.object({
  destination: z.string().trim().min(1).max(80),
  origin: z.string().trim().toUpperCase().regex(/^[A-Z]{3}$/),
  maxPriceUsd: z.number().int().min(50).max(50000),
});
const idBody = z.object({ id: z.string().uuid() });

const RESOURCES = ["preferences", "saved-destinations", "price-alerts"];

export const GET = api(async ({ params }) => {
  const user = await requireUser();
  switch (params.resource) {
    case "preferences":
      return ok(await db.userPreference.findUnique({ where: { userId: user.id } }));
    case "saved-destinations":
      return ok((await db.savedDestination.findMany({ where: { userId: user.id }, include: { destination: { select: { slug: true, name: true } } } })).map((s) => s.destination));
    case "price-alerts":
      return ok(await db.priceAlert.findMany({ where: { userId: user.id }, include: { destination: { select: { slug: true, name: true } } }, orderBy: { createdAt: "desc" } }));
    default:
      throw new ApiError("NOT_FOUND", "Unknown resource");
  }
});

export const POST = api(
  async ({ req, params }) => {
    const user = await requireUser();
    if (!RESOURCES.includes(String(params.resource))) throw new ApiError("NOT_FOUND", "Unknown resource");
    if (params.resource === "saved-destinations") {
      const { slug } = await parseBody(req, slugBody);
      const dest = await getDestinationBySlug(slug);
      if (!dest) throw new ApiError("NOT_FOUND", "Destination not found");
      await db.savedDestination.upsert({
        where: { userId_destinationId: { userId: user.id, destinationId: dest.id } },
        update: {},
        create: { userId: user.id, destinationId: dest.id },
      });
      return ok({ saved: true }, { status: 201 });
    }
    if (params.resource === "price-alerts") {
      const body = await parseBody(req, alertBody);
      const [dest, origin] = await Promise.all([getDestinationBySlug(body.destination), getAirport(body.origin)]);
      if (!dest || !origin) throw new ApiError("VALIDATION_ERROR", "Unknown destination or origin");
      const count = await db.priceAlert.count({ where: { userId: user.id, active: true } });
      if (count >= 20) throw new ApiError("CONFLICT", "You can have up to 20 active alerts");
      const alert = await db.priceAlert.create({ data: { userId: user.id, destinationId: dest.id, origin: origin.iata, maxPriceUsd: body.maxPriceUsd } });
      return ok({ id: alert.id }, { status: 201 });
    }
    throw new ApiError("NOT_FOUND", "Use PUT for preferences");
  },
  { limit: LIMITS.write },
);

export const PUT = api(
  async ({ req, params }) => {
    const user = await requireUser();
    if (params.resource !== "preferences") throw new ApiError("NOT_FOUND", "Unknown resource");
    const body = await parseBody(req, prefs);
    const data = { ...body, interests: body.interests?.map(toEnum) };
    const row = await db.userPreference.upsert({ where: { userId: user.id }, update: data, create: { userId: user.id, ...data } });
    return ok(row);
  },
  { limit: LIMITS.write },
);

export const DELETE = api(
  async ({ req, params }) => {
    const user = await requireUser();
    if (params.resource === "saved-destinations") {
      const { slug } = await parseBody(req, slugBody);
      const dest = await getDestinationBySlug(slug);
      if (dest) await db.savedDestination.deleteMany({ where: { userId: user.id, destinationId: dest.id } });
      return ok({ removed: true });
    }
    if (params.resource === "price-alerts") {
      const { id } = await parseBody(req, idBody);
      await db.priceAlert.deleteMany({ where: { id, userId: user.id } }); // scoped to the owner
      return ok({ removed: true });
    }
    throw new ApiError("NOT_FOUND", "Unknown resource");
  },
  { limit: LIMITS.write },
);
