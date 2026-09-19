import { z } from "zod";
import { revalidatePath } from "next/cache";
import { api, ok, parseBody, ApiError } from "@/lib/http/api";
import { db } from "@/lib/db/client";
import { requireAdmin } from "@/lib/auth/session";
import { cache } from "@/lib/cache/cache";
import { LIMITS } from "@/lib/security/rate-limit";
import { slugify } from "@/lib/utils/format";

const status = z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]);
const seo = { seoTitle: z.string().trim().max(160).nullable().optional(), seoDescription: z.string().trim().max(300).nullable().optional() };

const SCHEMAS = {
  destinations: z.object({ name: z.string().trim().min(1).max(120).optional(), tagline: z.string().trim().max(300).optional(), overview: z.string().trim().max(4000).optional(), status: status.optional(), ...seo }),
  guides: z.object({ title: z.string().trim().min(1).max(200).optional(), description: z.string().trim().max(500).optional(), content: z.string().max(100_000).optional(), status: status.optional(), ...seo }),
  itineraries: z.object({ title: z.string().trim().min(1).max(200).optional(), description: z.string().trim().max(500).optional(), status: status.optional(), ...seo }),
  deals: z.object({ title: z.string().trim().min(1).max(200).optional(), description: z.string().trim().max(500).optional(), fromPriceUsd: z.number().int().min(0).max(100000).nullable().optional(), status: status.optional(), ...seo }),
} as const;
type Kind = keyof typeof SCHEMAS;

const model = (k: Kind) => ({ destinations: db.destination, guides: db.travelGuide, itineraries: db.itinerary, deals: db.deal })[k] as unknown as {
  update: (a: unknown) => Promise<unknown>;
};

const CACHE_KEYS = ["destinations:all", "guides:all", "itineraries:all", "deals:active"];

async function purge() {
  await Promise.all(CACHE_KEYS.map((k) => cache.delete(k)));
  revalidatePath("/", "layout"); // published content changed: refresh cached pages
}

function kindOf(v: unknown): Kind {
  if (typeof v !== "string" || !(v in SCHEMAS)) throw new ApiError("NOT_FOUND", "Unknown content type");
  return v as Kind;
}

/** PATCH /api/v1/admin/content/<kind>/<id>: edit or (un)publish content. EDITOR or above. */
export const PATCH = api(
  async ({ req, params }) => {
    await requireAdmin("EDITOR");
    const kind = kindOf(params.kind);
    const id = (params.id as string[] | undefined)?.[0];
    if (!id || !z.string().uuid().safeParse(id).success) throw new ApiError("VALIDATION_ERROR", "Invalid id");
    const data = await parseBody(req, SCHEMAS[kind]);
    try {
      await model(kind).update({ where: { id }, data });
    } catch {
      throw new ApiError("NOT_FOUND", "Item not found");
    }
    await purge();
    return ok({ updated: true });
  },
  { limit: LIMITS.write },
);

const newGuide = z.object({ title: z.string().trim().min(3).max(200), description: z.string().trim().min(10).max(500), content: z.string().min(20).max(100_000) });

/** POST /api/v1/admin/content/guides: create a draft guide. */
export const POST = api(
  async ({ req, params }) => {
    await requireAdmin("EDITOR");
    if (kindOf(params.kind) !== "guides") throw new ApiError("VALIDATION_ERROR", "Only guides can be created here");
    const body = await parseBody(req, newGuide);
    const slug = slugify(body.title).slice(0, 80);
    if (await db.travelGuide.findUnique({ where: { slug } })) throw new ApiError("CONFLICT", "A guide with this title already exists");
    const g = await db.travelGuide.create({ data: { ...body, slug, heroImage: "/images/destinations/bali.svg", heroImageAlt: "Travel illustration", status: "DRAFT" }, select: { id: true } });
    await purge();
    return ok({ id: g.id, slug }, { status: 201 });
  },
  { limit: LIMITS.write },
);
