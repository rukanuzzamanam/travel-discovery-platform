import { afterAll, describe, expect, it } from "vitest";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/lib/db/generated/client";

const BASE = process.env.E2E_BASE_URL;
const d = describe.skipIf(!BASE);
const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
const run = Date.now();
const emails: string[] = [];
const newsletter: string[] = [];

/** Minimal cookie jar so we can act as a signed-in user. */
class Client {
  cookies = new Map<string, string>();
  // Each simulated visitor gets its own IP so the app's per-IP rate limits don't couple tests or runs together.
  ip = `10.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}`;
  async fetch(path: string, init: RequestInit & { json?: unknown } = {}) {
    const headers = new Headers(init.headers);
    headers.set("x-forwarded-for", this.ip);
    if (this.cookies.size) headers.set("cookie", [...this.cookies].map(([k, v]) => `${k}=${v}`).join("; "));
    if (init.json !== undefined) {
      headers.set("content-type", "application/json");
      init.body = JSON.stringify(init.json);
    }
    const res = await fetch(`${BASE}${path}`, { redirect: "manual", ...init, headers });
    for (const c of res.headers.getSetCookie()) {
      const [pair] = c.split(";");
      const i = pair.indexOf("=");
      this.cookies.set(pair.slice(0, i), pair.slice(i + 1));
    }
    return res;
  }
  async register(prefix: string) {
    const email = `${prefix}-${run}@example.test`;
    emails.push(email);
    const res = await this.fetch("/api/v1/auth/register", { method: "POST", json: { email, password: "correct horse battery" } });
    expect(res.status).toBe(201);
    return email;
  }
}

afterAll(async () => {
  await db.analyticsEvent.deleteMany({ where: { sessionId: { startsWith: "e2e-" } } });
  await db.trip.deleteMany({ where: { title: { contains: "E2E" } } });
  await db.newsletterSubscriber.deleteMany({ where: { email: { in: newsletter } } });
  await db.user.deleteMany({ where: { email: { in: emails } } });
  await db.$disconnect();
});

d("public pages and SEO", () => {
  const pages = [
    "/", "/destinations", "/destinations/bali", "/discover", "/trip-planner", "/flights", "/hotels", "/hotels/bali", "/cars", "/activities", "/deals", "/guides",
    "/guides/bali-travel-guide", "/itineraries", "/itineraries/7-days-bali", "/cheap-flights/sydney-to-bali", "/travel-from/sydney", "/weekend-getaways/sydney", "/travel-budget/1500",
    "/newsletter", "/login", "/register", "/robots.txt", "/sitemap.xml",
  ];
  it.each(pages)("%s responds 200", async (p) => {
    const res = await fetch(`${BASE}${p}`);
    expect(res.status).toBe(200);
  });

  it("destination page has metadata, canonical and structured data", async () => {
    const html = await (await fetch(`${BASE}/destinations/bali`)).text();
    expect(html).toMatch(/<title>[^<]*Bali[^<]*<\/title>/);
    expect(html).toMatch(/rel="canonical" href="[^"]*\/destinations\/bali"/);
    expect(html).toContain('property="og:title"');
    expect(html).toContain('name="twitter:card"');
    expect(html).toContain('"@type":"TouristDestination"');
    expect(html).toContain('"@type":"BreadcrumbList"');
    expect(html).toContain('"@type":"FAQPage"');
    expect(html).toContain('"@type":"WebSite"');
    expect(html).toContain('"@type":"Organization"');
  });

  it("itinerary pages carry Article schema", async () => {
    expect(await (await fetch(`${BASE}/itineraries/7-days-bali`)).text()).toContain('"@type":"Article"');
  });

  it("search, planner and private pages are noindex", async () => {
    const discover = await (await fetch(`${BASE}/discover?origin=SYD&budget=1500`)).text();
    expect(discover).toMatch(/name="robots" content="noindex/);
    const planner = await (await fetch(`${BASE}/trip-planner`)).text();
    expect(planner).toMatch(/name="robots" content="noindex/);
  });

  it("robots.txt and sitemap.xml are correct", async () => {
    const robots = await (await fetch(`${BASE}/robots.txt`)).text();
    expect(robots).toMatch(/Disallow: \/admin/);
    expect(robots).toMatch(/Disallow: \/go\//);
    expect(robots).toMatch(/Sitemap: .*\/sitemap\.xml/);
    const map = await (await fetch(`${BASE}/sitemap.xml`)).text();
    expect(map).toContain("/destinations/bali");
    expect(map).not.toMatch(/\/admin|\/account|\/go\//);
  });

  it("unknown pages 404 and thin programmatic pages are not generated", async () => {
    expect((await fetch(`${BASE}/destinations/atlantis`)).status).toBe(404);
    expect((await fetch(`${BASE}/cheap-flights/sydney-to-atlantis`)).status).toBe(404);
    expect((await fetch(`${BASE}/travel-budget/12345`)).status).toBe(404);
    expect((await fetch(`${BASE}/travel-from/nowhere`)).status).toBe(404);
  });

  it("sends security headers and hides the framework", async () => {
    const res = await fetch(`${BASE}/`);
    expect(res.headers.get("x-content-type-options")).toBe("nosniff");
    expect(res.headers.get("x-frame-options")).toBe("DENY");
    expect(res.headers.get("content-security-policy")).toContain("frame-ancestors 'none'");
    expect(res.headers.get("strict-transport-security")).toBeTruthy();
    expect(res.headers.get("x-powered-by")).toBeNull();
  });
});

d("API envelope, validation and analytics", () => {
  it("returns a consistent error envelope without stack traces", async () => {
    const res = await fetch(`${BASE}/api/v1/destinations/atlantis`);
    const json = await res.json();
    expect(res.status).toBe(404);
    expect(json).toMatchObject({ success: false, error: { code: "NOT_FOUND" } });
    expect(JSON.stringify(json)).not.toMatch(/at \w+|node_modules|\.ts:/);
  });

  it("lists destinations", async () => {
    const json = await (await fetch(`${BASE}/api/v1/destinations`)).json();
    expect(json.success).toBe(true);
    expect(json.data.length).toBeGreaterThanOrEqual(20);
  });

  it("discover validates input (400) and returns ranked estimates", async () => {
    const c = new Client();
    const bad = await c.fetch("/api/v1/discover", { method: "POST", json: { origin: "SYD", budget: 1 } });
    expect(bad.status).toBe(400);
    expect((await bad.json()).error.code).toBe("VALIDATION_ERROR");
    const ok = await (await c.fetch("/api/v1/discover", { method: "POST", json: { origin: "SYD", budget: 2500, nights: 5, travellers: 2, interests: ["beach"] } })).json();
    expect(ok.success).toBe(true);
    expect(ok.data.results[0].cost.kind).toBe("ESTIMATE");
  });

  it("rejects malformed JSON and unknown events; accepts valid ones", async () => {
    const c = new Client();
    expect((await c.fetch("/api/v1/analytics/events", { method: "POST", body: "{not json", headers: { "content-type": "application/json" } })).status).toBe(400);
    expect((await c.fetch("/api/v1/analytics/events", { method: "POST", json: { name: "drop_tables" } })).status).toBe(400);
    const ok = await c.fetch("/api/v1/analytics/events", { method: "POST", json: { name: "destination_viewed", destination: "bali", path: "/destinations/bali" } });
    expect(ok.status).toBe(202);
  });

  it("captures newsletter signups without revealing existing subscribers", async () => {
    const email = `nl-${run}@example.test`;
    newsletter.push(email);
    const c = new Client();
    const first = await c.fetch("/api/v1/newsletter", { method: "POST", json: { email, preferences: ["deals"], source: "e2e" } });
    const again = await c.fetch("/api/v1/newsletter", { method: "POST", json: { email, source: "e2e" } });
    expect(first.status).toBe(201);
    expect(again.status).toBe(201);
    expect((await c.fetch("/api/v1/newsletter", { method: "POST", json: { email: "nope" } })).status).toBe(400);
    expect(await db.newsletterSubscriber.count({ where: { email } })).toBe(1);
  });
});

d("affiliate redirects", () => {
  async function hotelLink() {
    const json = await (await fetch(`${BASE}/api/v1/hotels?destination=bali&from=/hotels/bali`)).json();
    expect(json.success).toBe(true);
    return json.data.bookPath as string;
  }

  it("records the click and redirects to an allow-listed https URL", async () => {
    const path = await hotelLink();
    const c = new Client();
    await c.fetch("/"); // receives the anonymous session cookie
    const res = await c.fetch(path);
    expect(res.status).toBe(302);
    const location = new URL(res.headers.get("location")!);
    expect(location.protocol).toBe("https:");
    expect(["search.hotellook.com", "tp.media"]).toContain(location.hostname);
    expect(res.headers.get("cache-control")).toBe("no-store");

    const id = path.split("?")[0].split("/").pop()!;
    const click = await db.affiliateClick.findFirst({ where: { linkId: id }, orderBy: { createdAt: "desc" }, include: { destination: true } });
    expect(click).toMatchObject({ provider: "travelpayouts", productType: "HOTEL", sourcePage: "/hotels/bali", sourceComponent: "api" });
    expect(click?.destination?.slug).toBe("bali");
    expect(click?.sessionId).toBe(c.cookies.get("tripora_sid"));
    expect(click?.subId).toMatch(/^tr[a-f0-9]{18}$/);
    expect(click?.affiliateUrl).toBe(location.toString());
  });

  it("cannot be turned into an open redirect", async () => {
    const path = (await hotelLink()).split("?")[0];
    const res = await fetch(`${BASE}${path}?from=https://evil.example.com&c=x&url=https://evil.example.com&redirect=//evil.example.com`, { redirect: "manual" });
    expect(res.status).toBe(302);
    expect(new URL(res.headers.get("location")!).hostname).not.toContain("evil");
    const click = await db.affiliateClick.findFirst({ where: { linkId: path.split("/").pop()! }, orderBy: { createdAt: "desc" } });
    expect(click?.sourcePage).toBe("/"); // hostile source page was discarded
  });

  it("rejects bad ids, unknown types and mismatched product types", async () => {
    const path = (await hotelLink()).split("?")[0];
    const id = path.split("/").pop()!;
    expect((await fetch(`${BASE}/go/hotel/not-a-uuid`, { redirect: "manual" })).status).toBe(404);
    expect((await fetch(`${BASE}/go/hotel/00000000-0000-4000-8000-000000000000`, { redirect: "manual" })).status).toBe(404);
    expect((await fetch(`${BASE}/go/insurance/${id}`, { redirect: "manual" })).status).toBe(404);
    expect((await fetch(`${BASE}/go/flight/${id}`, { redirect: "manual" })).status).toBe(404);
  });

  it("serves the flight API with clearly labelled estimates", async () => {
    const json = await (await fetch(`${BASE}/api/v1/flights?origin=SYD&destination=bali`)).json();
    expect(json.data.estimate.kind).toBe("ESTIMATE");
    expect(json.data.bookPath).toMatch(/^\/go\/flight\//);
    expect(json.data.providerPrices).toEqual([]); // no API token configured in tests: nothing is faked
  });
});

d("authentication and admin authorization", () => {
  it("redirects anonymous visitors away from account and admin", async () => {
    for (const p of ["/admin", "/admin/revenue", "/account", "/account/trips"]) {
      const res = await fetch(`${BASE}${p}`, { redirect: "manual" });
      expect(res.status).toBe(307);
      expect(res.headers.get("location")).toContain("/login");
    }
  });

  it("returns 401/403 from admin APIs for anonymous and non-admin users", async () => {
    const anon = new Client();
    expect((await anon.fetch("/api/v1/admin/conversions", { method: "POST", json: { subId: "abcdef", commission: 1, status: "PENDING" } })).status).toBe(401);
    const user = new Client();
    await user.register("plain");
    expect((await user.fetch("/api/v1/admin/conversions", { method: "POST", json: { subId: "abcdef", commission: 1, status: "PENDING" } })).status).toBe(403);
    const adminPage = await user.fetch("/admin");
    expect(adminPage.status).toBe(307);
    expect(new URL(adminPage.headers.get("location")!, BASE).pathname).toBe("/");
  });

  it("rejects wrong passwords and forged session cookies", async () => {
    const c = new Client();
    const email = await c.register("login");
    const bad = new Client();
    expect((await bad.fetch("/api/v1/auth/login", { method: "POST", json: { email, password: "nope nope nope" } })).status).toBe(401);
    const forged = new Client();
    forged.cookies.set("tripora_session", "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ4In0.forged");
    expect((await forged.fetch("/account", { redirect: "manual" })).status).toBe(307);
    const good = new Client();
    expect((await good.fetch("/api/v1/auth/login", { method: "POST", json: { email, password: "correct horse battery" } })).status).toBe(200);
    expect((await good.fetch("/account")).status).toBe(200);
  });

  it("enforces role-based access to admin pages and APIs", async () => {
    const c = new Client();
    const email = await c.register("rbac");
    const user = await db.user.findUniqueOrThrow({ where: { email } });

    await db.adminUser.create({ data: { userId: user.id, role: "ANALYST" } });
    expect((await c.fetch("/admin")).status).toBe(200);
    expect((await c.fetch("/admin/revenue")).status).toBe(200);
    // analysts may view, not edit
    expect((await c.fetch("/api/v1/admin/conversions", { method: "POST", json: { subId: "abcdef", commission: 1, status: "PENDING" } })).status).toBe(403);
    expect((await c.fetch(`/api/v1/admin/users/${user.id}`, { method: "PATCH", json: { role: "ADMIN" } })).status).toBe(403);

    await db.adminUser.update({ where: { userId: user.id }, data: { role: "EDITOR" } });
    expect((await c.fetch("/api/v1/admin/conversions", { method: "POST", json: { subId: "abcdef123", commission: 1, status: "PENDING" } })).status).toBe(404); // authorised, unknown click
    expect((await c.fetch(`/api/v1/admin/users/${user.id}`, { method: "PATCH", json: { role: "ADMIN" } })).status).toBe(403); // editors can't manage users

    await db.adminUser.update({ where: { userId: user.id }, data: { role: "ADMIN" } });
    expect((await c.fetch(`/api/v1/admin/users/${user.id}`, { method: "PATCH", json: { role: null } })).status).toBe(403); // can't demote yourself
    for (const p of ["/admin", "/admin/analytics", "/admin/destinations", "/admin/guides", "/admin/itineraries", "/admin/deals", "/admin/searches", "/admin/affiliate-clicks", "/admin/revenue", "/admin/users"]) {
      expect((await c.fetch(p)).status, p).toBe(200);
    }
  });

  it("records a conversion against a click and attributes revenue to its source page", async () => {
    const link = (await (await fetch(`${BASE}/api/v1/hotels?destination=bali&from=/destinations/bali`)).json()).data.bookPath as string;
    const visitor = new Client();
    await visitor.fetch("/");
    await visitor.fetch(link);
    const click = await db.affiliateClick.findFirstOrThrow({ where: { sessionId: visitor.cookies.get("tripora_sid") }, orderBy: { createdAt: "desc" } });

    const admin = new Client();
    const email = await admin.register("rev");
    const u = await db.user.findUniqueOrThrow({ where: { email } });
    await db.adminUser.create({ data: { userId: u.id, role: "ADMIN" } });
    const res = await admin.fetch("/api/v1/admin/conversions", { method: "POST", json: { subId: click.subId, commission: 12.5, status: "CONFIRMED", bookingReference: `E2E-${run}` } });
    expect(res.status).toBe(201);
    const conv = await db.conversion.findFirstOrThrow({ where: { affiliateClickId: click.id } });
    expect(Number(conv.commission)).toBe(12.5);
    expect(conv.provider).toBe("travelpayouts");
    expect(conv.productType).toBe("HOTEL");
    const html = await (await admin.fetch("/admin/revenue")).text();
    expect(html).toContain("/destinations/bali");
    await db.conversion.delete({ where: { id: conv.id } });
  });
});

d("trip planner flow", () => {
  it("creates, edits and AI-modifies a trip", async () => {
    const c = new Client();
    const bad = await c.fetch("/api/v1/trips", { method: "POST", json: { origin: "SYD", destination: "bali", startDate: "2027-05-10", endDate: "2027-05-01" } });
    expect(bad.status).toBe(400);

    const created = await (await c.fetch("/api/v1/trips", { method: "POST", json: { origin: "SYD", destination: "bali", startDate: "2027-05-10", endDate: "2027-05-15", travellers: 2, style: "MID_RANGE", interests: ["beach"] } })).json();
    expect(created.success).toBe(true);
    const token = created.data.token as string;
    await db.trip.update({ where: { shareToken: token }, data: { title: `E2E ${run}` } });
    expect((await c.fetch(`/trips/${token}`)).status).toBe(200);
    expect(await (await c.fetch(`/trips/${token}`)).text()).toMatch(/name="robots" content="noindex/);

    const got = await (await c.fetch(`/api/v1/trips/${token}`)).json();
    const days = got.data.state.days;
    days[0].items[0] = { ...days[0].items[0], costUsd: 999, priceKind: "USER", title: "My own thing" };
    const put = await (await c.fetch(`/api/v1/trips/${token}`, { method: "PUT", json: { days } })).json();
    expect(put.success).toBe(true);
    expect(put.data.totals.total).toBeGreaterThan(got.data.totals.total);

    const invalid = await c.fetch(`/api/v1/trips/${token}`, { method: "PUT", json: { days: [{ day: 1, title: "x", items: [{ title: "y", category: "nope", costUsd: -5, priceKind: "ESTIMATE" }] }] } });
    expect(invalid.status).toBe(400);

    const ai = await (await c.fetch("/api/v1/itinerary", { method: "POST", json: { token, message: "Make this trip $300 cheaper" } })).json();
    expect(ai.success).toBe(true);
    expect(ai.data.totals.total).toBeLessThan(ai.data.before);
    const kept = ai.data.state.days.flatMap((d: { items: { title: string; costUsd: number }[] }) => d.items).find((i: { title: string }) => i.title === "My own thing");
    expect(kept?.costUsd).toBe(999); // user-entered prices are preserved

    expect((await c.fetch("/api/v1/itinerary", { method: "POST", json: { token: "not-a-uuid", message: "hi there" } })).status).toBe(400);
  });

  it("saving a trip requires sign-in, and owned trips can't be edited by others", async () => {
    const owner = new Client();
    await owner.register("tripowner");
    const created = await (await owner.fetch("/api/v1/trips", { method: "POST", json: { origin: "SYD", destination: "tokyo", startDate: "2027-05-10", endDate: "2027-05-14" } })).json();
    const token = created.data.token as string;
    await db.trip.update({ where: { shareToken: token }, data: { title: `E2E owned ${run}` } });

    const stranger = new Client();
    expect((await stranger.fetch(`/api/v1/trips/${token}/claim`, { method: "POST" })).status).toBe(401);
    const got = await (await stranger.fetch(`/api/v1/trips/${token}`)).json();
    expect((await stranger.fetch(`/api/v1/trips/${token}`, { method: "PUT", json: { days: got.data.state.days } })).status).toBe(403);
    expect((await stranger.fetch("/api/v1/itinerary", { method: "POST", json: { token, operation: "upgradeTrip" } })).status).toBe(403);
    expect((await owner.fetch(`/api/v1/trips/${token}`, { method: "PUT", json: { days: got.data.state.days } })).status).toBe(200);
  });
});

d("currency", () => {
  it("renders the default currency (AUD) with an unambiguous symbol and a currency selector", async () => {
    const html = await (await fetch(`${BASE}/`)).text();
    expect(html).toMatch(/Where can I go for A\$1,500\?/);
    expect(html).toMatch(/Where can I go for A\$2,000\?/);
    // React SSR separates adjacent text nodes with <!-- --> markers; ignore them when matching visible text.
    expect(html.replace(/<!-- -->/g, "")).toMatch(/Total budget \(AUD\)/);
    for (const code of ["AUD", "USD", "EUR", "GBP", "NZD", "CAD", "SGD"]) expect(html).toContain(`>${code}<`);
    expect(html).toContain("fixed, approximate exchange rates");
    expect(html).toContain("not live rates");
    expect(html).not.toMatch(/>\$[0-9]/); // no bare-$ prices in the markup
    const dest = await (await fetch(`${BASE}/destinations/bali`)).text();
    expect(dest).toMatch(/A\$[0-9]/);
    expect(dest).not.toMatch(/>\$[0-9]/);
  });

  it("interprets API budgets in the requested currency (default AUD) and converts to stored USD", async () => {
    const c = new Client();
    const post = async (extra: Record<string, unknown>) =>
      (await c.fetch("/api/v1/discover", { method: "POST", json: { origin: "SYD", budget: 1500, nights: 5, travellers: 1, style: "BUDGET", ...extra } })).json();
    expect((await post({})).data.search.budget).toBe(1000); // default AUD: 1500 AUD = 1000 USD
    expect((await post({ currency: "USD" })).data.search.budget).toBe(1500);
    expect((await post({ currency: "aud" })).data.search.budget).toBe(1000); // case-insensitive
    const bad = await c.fetch("/api/v1/discover", { method: "POST", json: { origin: "SYD", budget: 1500, currency: "XYZ" } });
    expect(bad.status).toBe(400);
    expect((await bad.json()).error.code).toBe("VALIDATION_ERROR");
  });

  it("persists the chosen currency on the account (existing preference field)", async () => {
    const c = new Client();
    c.cookies.set("tripora_currency", "GBP");
    await c.register("curpref");
    expect((await (await c.fetch("/api/v1/account/preferences")).json()).data.currency).toBe("GBP"); // taken from the cookie at sign-up
    const put = await (await c.fetch("/api/v1/account/preferences", { method: "PUT", json: { currency: "nzd" } })).json();
    expect(put.data.currency).toBe("NZD");
    expect((await c.fetch("/api/v1/account/preferences", { method: "PUT", json: { currency: "XYZ" } })).status).toBe(400);
    const anon = new Client();
    expect((await anon.fetch("/api/v1/account/preferences", { method: "PUT", json: { currency: "EUR" } })).status).toBe(401);
  });

  it("assistant replies use the requested currency and treat the typed amount as that currency", async () => {
    const c = new Client();
    const created = await (await c.fetch("/api/v1/trips", { method: "POST", json: { origin: "SYD", destination: "tokyo", startDate: "2027-05-10", endDate: "2027-05-15", style: "LUXURY" } })).json();
    const token = created.data.token as string;
    await db.trip.update({ where: { shareToken: token }, data: { title: `E2E cur ${run}` } });
    const aud = await (await c.fetch("/api/v1/itinerary", { method: "POST", json: { token, message: "Make this trip $300 cheaper" } })).json();
    expect(aud.data.reply).toMatch(/A\$\d/);
    const eur = await (await c.fetch("/api/v1/itinerary", { method: "POST", json: { token, operation: "reduceTripCost", amount: 500, currency: "EUR" } })).json(); // 500 EUR, not 500 USD
    expect(eur.data.reply).toMatch(/€\d/);
    expect((await c.fetch("/api/v1/itinerary", { method: "POST", json: { token, operation: "upgradeTrip", currency: "XYZ" } })).status).toBe(400);
  });
});
