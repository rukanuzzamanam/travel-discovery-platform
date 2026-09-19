import { afterAll, describe, expect, it } from "vitest";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/lib/db/generated/client";
import { discover, recordSearch } from "@/lib/travel/discover";
import { discoverSchema, tripPlanSchema } from "@/lib/travel/schemas";
import { createTrip, loadTrip } from "@/lib/travel/trip";
import { modifyItinerary } from "@/lib/ai/service";
import { createLink } from "@/lib/affiliate/links";
import { registerUser, verifyCredentials } from "@/lib/auth/service";
import { ApiError } from "@/lib/http/api";
import { analyticsEventSchema } from "@/lib/analytics/events";
import { buildMetadata } from "@/lib/seo/metadata";
import sitemap from "@/app/sitemap";
import { resetEnvCache } from "@/lib/env";

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
const run = Date.now();
const emails: string[] = [];
const sessions: string[] = [];

afterAll(async () => {
  await db.trip.deleteMany({ where: { OR: [{ user: { email: { in: emails } } }, { title: { contains: "TESTRUN" } }] } });
  await db.search.deleteMany({ where: { sessionId: { in: sessions } } });
  await db.user.deleteMany({ where: { email: { in: emails } } });
  await db.$disconnect();
});

describe("discovery", () => {
  it("ranks destinations for a budget and records inputs plus result metadata", async () => {
    const input = discoverSchema.parse({ origin: "syd", budget: 1500, nights: 5, travellers: 1, style: "BUDGET", interests: ["beach", "food"] });
    const res = await discover(input);
    expect(res.items.length).toBeGreaterThan(2);
    const scores = res.items.map((i) => i.score);
    expect([...scores].sort((a, b) => b - a)).toEqual(scores);
    expect(res.items.every((i) => i.cost.kind === "ESTIMATE")).toBe(true);
    expect(res.items.filter((i) => i.withinBudget).every((i) => i.cost.total <= 1500)).toBe(true);
    // every item exposes its scoring breakdown
    expect(res.items[0].factors.length).toBeGreaterThanOrEqual(6);

    const sessionId = `test-${run}-discover`;
    sessions.push(sessionId);
    const saved = await recordSearch(res, { sessionId });
    const row = await db.search.findUnique({ where: { id: saved.id }, include: { results: true } });
    expect(row?.origin).toBe("SYD");
    expect(row?.budgetUsd).toBe(1500);
    expect(row?.interests).toEqual(["BEACH", "FOOD"]);
    expect(row?.results).toHaveLength(res.items.length);
    expect(row?.results[0].metadata).toHaveProperty("factors");
  });

  it("rejects invalid input and unknown origins", async () => {
    expect(discoverSchema.safeParse({ origin: "SYD", budget: 5 }).success).toBe(false);
    expect(discoverSchema.safeParse({ origin: "SYDNEY", budget: 1000 }).success).toBe(false);
    await expect(discover(discoverSchema.parse({ origin: "ZZZ", budget: 1000 }))).rejects.toBeInstanceOf(ApiError);
  });

  it("changes recommendations with interests and season", async () => {
    const base = { origin: "SYD", budget: 6000, nights: 7, travellers: 2, style: "MID_RANGE" as const };
    const beach = await discover(discoverSchema.parse({ ...base, interests: ["beach"], startDate: "2027-07-10" }), 3);
    const culture = await discover(discoverSchema.parse({ ...base, interests: ["culture", "food"], startDate: "2027-11-10" }), 3);
    expect(beach.items.map((i) => i.slug)).not.toEqual(culture.items.map((i) => i.slug));
  });
});

describe("trips and itineraries", () => {
  it("creates a trip with days, activities and budget lines; totals add up", async () => {
    const input = tripPlanSchema.parse({ origin: "SYD", destination: "bali", startDate: "2027-05-10", endDate: "2027-05-17", travellers: 2, budget: 3000, style: "MID_RANGE", interests: ["food"] });
    const trip = await createTrip(input);
    const row = await db.trip.findUnique({ where: { shareToken: trip.token }, include: { items: true, days: { include: { activities: true } } } });
    expect(row?.days).toHaveLength(7);
    expect(row!.days.every((d) => d.activities.length > 0)).toBe(true);
    expect(row?.items.map((i) => i.type).sort()).toEqual(["ACTIVITY", "FLIGHT", "FOOD", "HOTEL", "TRANSPORT"]);
    expect(row!.items.every((i) => i.priceKind === "ESTIMATE")).toBe(true);
    expect(row!.items.reduce((s, i) => s + i.amountUsd, 0)).toBe(row!.totalEstimateUsd);
    await db.trip.update({ where: { id: row!.id }, data: { title: `TESTRUN ${run}` } });
  });

  it("builds a trip from a published itinerary", async () => {
    const input = tripPlanSchema.parse({ origin: "SYD", destination: "bali", startDate: "2027-05-10", endDate: "2027-05-17", travellers: 2 });
    const trip = await createTrip({ ...input, itinerarySlug: "7-days-bali" });
    expect(trip.state.days[0].title).toBe("Arrive and settle in Ubud");
    await db.trip.update({ where: { shareToken: trip.token }, data: { title: `TESTRUN ${run} tpl` } });
  });

  it('"Make this trip $300 cheaper" edits the saved trip using structured data', async () => {
    const input = tripPlanSchema.parse({ origin: "SYD", destination: "tokyo", startDate: "2027-05-10", endDate: "2027-05-15", travellers: 2, style: "LUXURY" });
    const trip = await createTrip(input);
    await db.trip.update({ where: { shareToken: trip.token }, data: { title: `TESTRUN ${run} ai` } });
    const res = await modifyItinerary(trip.token, { message: "Make this trip $300 cheaper" });
    expect(res.via).toBe("rules");
    expect(res.before - res.totals.total).toBeGreaterThanOrEqual(250);
    const reloaded = await loadTrip(trip.token);
    expect(reloaded!.state.days.flatMap((d) => d.items).every((i) => i.priceKind !== "PROVIDER")).toBe(true);
    const saved = await db.trip.findUnique({ where: { shareToken: trip.token } });
    expect(saved?.totalEstimateUsd).toBe(res.totals.total);
  });

  it("interprets the request amount in the visitor's currency and replies in it", async () => {
    const input = tripPlanSchema.parse({ origin: "SYD", destination: "tokyo", startDate: "2027-05-10", endDate: "2027-05-15", travellers: 2, style: "LUXURY" });
    const trip = await createTrip(input);
    await db.trip.update({ where: { shareToken: trip.token }, data: { title: `TESTRUN ${run} aud` } });
    const res = await modifyItinerary(trip.token, { message: "Make this trip $300 cheaper", currency: "AUD" });
    // A$300 is about US$200 at the static rate: the saving is in that range, not US$300.
    expect(res.before - res.totals.total).toBeGreaterThanOrEqual(190);
    expect(res.before - res.totals.total).toBeLessThan(400);
    expect(res.reply).toMatch(/A\$\d/);
    expect(res.reply).not.toMatch(/(^|[^A-Z])\$\d/); // never a bare $
    expect(res.changes.join(" ")).toMatch(/A\$\d/);
  });

  it("converts a typed trip budget to stored USD", async () => {
    const input = tripPlanSchema.parse({ origin: "SYD", destination: "bali", startDate: "2027-05-10", endDate: "2027-05-14", travellers: 1, budget: 3000, currency: "AUD" });
    const trip = await createTrip(input);
    await db.trip.update({ where: { shareToken: trip.token }, data: { title: `TESTRUN ${run} budget` } });
    expect((await db.trip.findUnique({ where: { shareToken: trip.token } }))?.budgetUsd).toBe(2000);
  });

  it("refuses to edit another user's trip", async () => {
    const email = `owner-${run}@example.test`;
    emails.push(email);
    const owner = await registerUser({ email, password: "correct horse battery" });
    const input = tripPlanSchema.parse({ origin: "SYD", destination: "bali", startDate: "2027-05-10", endDate: "2027-05-14", travellers: 1 });
    const trip = await createTrip(input, owner.id);
    await expect(modifyItinerary(trip.token, { operation: "upgradeTrip" }, undefined)).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(modifyItinerary(trip.token, { operation: "upgradeTrip" }, owner.id)).resolves.toBeTruthy();
  });
});

describe("affiliate link records", () => {
  it("stores validated parameters (never a URL) and reuses identical links", async () => {
    const a = await createLink("FLIGHT", { origin: "SYD", destination: "DPS", adults: 2 });
    const b = await createLink("FLIGHT", { origin: "SYD", destination: "DPS", adults: 2 });
    expect(a).toBe(b);
    expect(a).toMatch(/^\/go\/flight\/[0-9a-f-]{36}$/);
    const row = await db.affiliateLink.findUnique({ where: { id: a.split("/").pop()! } });
    expect(row?.provider).toBe("travelpayouts");
    expect(JSON.stringify(row?.params)).not.toContain("http");
  });

  it("rejects malformed link params", async () => {
    await expect(createLink("FLIGHT", { origin: "SYDNEY", destination: "DPS" } as never)).rejects.toThrow();
  });
});

describe("authentication", () => {
  it("registers, hashes passwords, blocks duplicates and verifies credentials", async () => {
    const email = `user-${run}@example.test`;
    emails.push(email);
    const user = await registerUser({ email, password: "correct horse battery", name: "T" });
    const row = await db.user.findUnique({ where: { id: user.id }, include: { adminUser: true } });
    expect(row?.passwordHash).not.toContain("correct horse");
    expect(row?.passwordHash.startsWith("$2")).toBe(true);
    expect(row?.adminUser).toBeNull(); // regular users are never admins
    expect((await db.userPreference.findUnique({ where: { userId: user.id } }))?.currency).toBe("AUD"); // default display currency
    await expect(registerUser({ email, password: "another password" })).rejects.toMatchObject({ code: "CONFLICT" });
    await expect(verifyCredentials({ email, password: "wrong password" })).rejects.toMatchObject({ code: "UNAUTHENTICATED" });
    await expect(verifyCredentials({ email: "nobody@example.test", password: "x" })).rejects.toMatchObject({ code: "UNAUTHENTICATED" });
    await expect(verifyCredentials({ email, password: "correct horse battery" })).resolves.toMatchObject({ email });
  });

  it("stores the visitor's chosen currency on the existing preference field", async () => {
    const email = `cur-${run}@example.test`;
    emails.push(email);
    const user = await registerUser({ email, password: "correct horse battery" }, { currency: "EUR" });
    expect((await db.userPreference.findUnique({ where: { userId: user.id } }))?.currency).toBe("EUR");
  });

  it("only grants ADMIN to bootstrap emails", async () => {
    const email = `boot-${run}@example.test`;
    emails.push(email);
    process.env.ADMIN_BOOTSTRAP_EMAILS = email;
    resetEnvCache();
    const user = await registerUser({ email, password: "correct horse battery" });
    expect((await db.adminUser.findUnique({ where: { userId: user.id } }))?.role).toBe("ADMIN");
    process.env.ADMIN_BOOTSTRAP_EMAILS = "";
    resetEnvCache();
  });
});

describe("analytics + SEO", () => {
  it("validates analytics events with Zod", () => {
    expect(analyticsEventSchema.safeParse({ name: "page_view", path: "/" }).success).toBe(true);
    expect(analyticsEventSchema.safeParse({ name: "hack_the_planet" }).success).toBe(false);
    expect(analyticsEventSchema.safeParse({ name: "page_view", properties: { a: { nested: 1 } } }).success).toBe(false);
  });

  it("builds canonical, OG and robots metadata", () => {
    const m = buildMetadata({ title: "T", description: "D", path: "/destinations/bali", image: "/x.svg" });
    expect(m.alternates?.canonical).toBe("http://localhost:3000/destinations/bali");
    expect(m.openGraph).toMatchObject({ title: "T", url: "http://localhost:3000/destinations/bali" });
    expect(m.robots).toMatchObject({ index: true });
    expect(buildMetadata({ title: "T", description: "D", path: "/x", noindex: true }).robots).toMatchObject({ index: false });
  });

  it("sitemap lists content pages and excludes private and search URLs", async () => {
    const urls = (await sitemap()).map((e) => e.url);
    expect(urls).toContain("http://localhost:3000/destinations/bali");
    expect(urls).toContain("http://localhost:3000/itineraries/7-days-bali");
    expect(urls.some((u) => /\/(admin|account|go|trips|api|discover|trip-planner)(\/|$)/.test(u))).toBe(false);
    expect(new Set(urls).size).toBe(urls.length);
  });
});
