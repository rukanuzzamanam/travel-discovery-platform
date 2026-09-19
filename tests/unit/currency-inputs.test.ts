import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { createElement, type ComponentType, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CurrencyProvider, Money } from "@/components/currency/currency-provider";
import { STATIC_RATE_TABLE, type RateTable } from "@/lib/currency";
import { resolveSearch } from "@/lib/travel/discover";
import { discoverRequestSchema, discoverSchema, tripPlanRequestSchema, tripPlanSchema } from "@/lib/travel/schemas";

const base = { origin: "SYD", budget: 1500 };
const trip = { origin: "SYD", destination: "bali", startDate: "2027-05-10", endDate: "2027-05-15", budget: 3000 };

describe("budget inputs are interpreted in a currency", () => {
  it("boundary schemas (pages, public API) default to AUD", () => {
    expect(discoverRequestSchema.parse(base).currency).toBe("AUD");
    expect(tripPlanRequestSchema.parse(trip).currency).toBe("AUD");
  });

  it("service schemas default to USD so internal callers are unchanged", () => {
    expect(discoverSchema.parse(base).currency).toBe("USD");
    expect(tripPlanSchema.parse(trip).currency).toBe("USD");
  });

  it("accepts any supported currency, case-insensitively", () => {
    expect(discoverRequestSchema.parse({ ...base, currency: "eur" }).currency).toBe("EUR");
    expect(tripPlanRequestSchema.parse({ ...trip, currency: " gbp " }).currency).toBe("GBP");
  });

  it("rejects unsupported currencies", () => {
    expect(discoverRequestSchema.safeParse({ ...base, currency: "XYZ" }).success).toBe(false);
    expect(discoverRequestSchema.safeParse({ ...base, currency: "" }).success).toBe(false);
    expect(tripPlanRequestSchema.safeParse({ ...trip, currency: "BTC" }).success).toBe(false);
  });

  it("converts the typed budget to stored USD exactly once", () => {
    expect(resolveSearch(discoverRequestSchema.parse(base)).budget).toBe(1000); // 1500 AUD at the static rate
    expect(resolveSearch(discoverRequestSchema.parse({ ...base, currency: "USD" })).budget).toBe(1500);
    expect(resolveSearch(discoverRequestSchema.parse({ ...base, currency: "EUR" })).budget).toBe(1630); // 1500 / 0.92
    expect(resolveSearch(discoverSchema.parse(base)).budget).toBe(1500); // service default: USD, unchanged
  });

  it("uses the supplied rate table", () => {
    const table: RateTable = { ...STATIC_RATE_TABLE, rates: { ...STATIC_RATE_TABLE.rates, AUD: 2 } };
    expect(resolveSearch(discoverRequestSchema.parse(base), table).budget).toBe(750);
  });
});

describe("<Money>", () => {
  // Same component; typed so children can be passed as createElement arguments.
  const Provider = CurrencyProvider as ComponentType<{ table: RateTable; children?: ReactNode }>;
  const html = (usd: number, table?: RateTable) => renderToStaticMarkup(createElement(Provider, { table: table ?? STATIC_RATE_TABLE }, createElement(Money, { usd })));

  it("renders stored USD in the default currency (AUD) as A$", () => {
    expect(html(1000)).toBe("<span>A$1,500</span>");
  });

  it("never renders a bare $", () => {
    expect(html(1000)).not.toMatch(/>\s*\$/);
  });

  it("follows the rate table it is given", () => {
    const table: RateTable = { ...STATIC_RATE_TABLE, rates: { ...STATIC_RATE_TABLE.rates, AUD: 2 }, live: true, source: "test" };
    expect(html(1000, table)).toBe("<span>A$2,000</span>");
  });

  it("works without a provider (falls back to the default currency)", () => {
    expect(renderToStaticMarkup(createElement(Money, { usd: 100 }))).toBe("<span>A$150</span>");
  });
});

describe("currency handling stays centralised", () => {
  function files(dir: string): string[] {
    return readdirSync(dir).flatMap((n) => {
      const p = path.join(dir, n);
      return statSync(p).isDirectory() ? files(p) : /\.tsx?$/.test(n) ? [p] : [];
    });
  }
  const root = path.resolve(__dirname, "../..");
  const outside = ["app", "components", "lib"]
    .flatMap((d) => files(path.join(root, d)))
    .filter((f) => !f.includes(`${path.sep}generated${path.sep}`) && !f.includes(`${path.sep}lib${path.sep}currency${path.sep}`));

  it("no code outside lib/currency formats money with Intl currency style", () => {
    const offenders = outside.filter((f) => /style:\s*["']currency["']/.test(readFileSync(f, "utf8"))).map((f) => path.relative(root, f));
    expect(offenders).toEqual([]);
  });

  it("the old USD-only formatter is gone", () => {
    const offenders = outside.filter((f) => readFileSync(f, "utf8").includes("formatUsd")).map((f) => path.relative(root, f));
    expect(offenders).toEqual([]);
  });

  it("no exchange rate literals or conversions are hard-coded in components or pages", () => {
    const offenders = outside
      .filter((f) => f.includes(`${path.sep}app${path.sep}`) || f.includes(`${path.sep}components${path.sep}`))
      .filter((f) => /\*\s*1\.5\b|\/\s*1\.5\b|\*\s*0\.92\b|rates\s*\[/.test(readFileSync(f, "utf8")))
      .map((f) => path.relative(root, f));
    expect(offenders).toEqual([]);
  });
});
