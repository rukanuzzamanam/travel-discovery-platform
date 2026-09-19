import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { estimateTripCost } from "@/lib/travel/estimator";
import { computeTotals } from "@/lib/travel/trip";
import { COST_COMPONENTS, PRICE_DISCLAIMER, componentLabel, priceKindLabel } from "@/lib/travel/price-kind";
import { CostBreakdownList } from "@/components/travel/cost-breakdown";
import { PriceKindBadge } from "@/components/travel/price-kind-badge";
import type { CostBreakdown } from "@/lib/travel/types";
import { model, SYDNEY, tripState } from "../helpers/fixtures";

const html = (el: Parameters<typeof renderToStaticMarkup>[0]) => renderToStaticMarkup(el);

describe("price kind wording", () => {
  it("names the three kinds", () => {
    expect(priceKindLabel("ESTIMATE")).toBe("Estimated");
    expect(priceKindLabel("PROVIDER")).toBe("Provider price");
    expect(priceKindLabel("USER")).toBe("User entered");
  });

  it("uses card wording for provider-derived summaries", () => {
    expect(priceKindLabel("PROVIDER", "card")).toBe("Based on recent provider data");
    expect(priceKindLabel("ESTIMATE", "card")).toBe("Estimated");
  });

  it("flags estimated components that include user-entered prices", () => {
    expect(componentLabel("ESTIMATE", true)).toBe("Estimated + user entered");
    expect(componentLabel("ESTIMATE")).toBe("Estimated");
    expect(componentLabel("USER", true)).toBe("User entered");
  });

  it("has one concise standard disclaimer", () => {
    expect(PRICE_DISCLAIMER).toBe("Prices are estimates and may change. Check the provider for current availability and final pricing.");
  });
});

describe("per-component price kinds", () => {
  it("estimator marks every component as estimated", () => {
    const c = estimateTripCost(model("bali"), SYDNEY, { origin: "SYD", nights: 5, travellers: 2, style: "MID_RANGE", month: 6 });
    expect(c.kind).toBe("ESTIMATE");
    for (const k of COST_COMPONENTS) expect(c.kinds[k]).toBe("ESTIMATE");
  });

  it("trip totals are estimated by default", () => {
    const { dest, state } = tripState("bali");
    const t = computeTotals(dest, SYDNEY, state);
    for (const k of COST_COMPONENTS) expect(t.kinds[k]).toBe("ESTIMATE");
    expect(t.includesUserPrices).toBe(false);
  });

  it("marks activities as mixed when the user overrides some prices", () => {
    const { dest, state } = tripState("bali");
    const first = state.days[1].items.find((i) => i.category === "activity" || i.category === "attraction")!;
    first.priceKind = "USER";
    first.costUsd = 5;
    const t = computeTotals(dest, SYDNEY, state);
    expect(t.kinds.activities).toBe("ESTIMATE");
    expect(t.includesUserPrices).toBe(true);
    expect(t.kinds.flight).toBe("ESTIMATE"); // other components stay estimated
  });

  it("marks activities as user entered when every priced activity is the user's", () => {
    const { dest, state } = tripState("bali");
    for (const d of state.days) for (const i of d.items) if (i.category === "activity" || i.category === "attraction") i.priceKind = "USER";
    const t = computeTotals(dest, SYDNEY, state);
    expect(t.kinds.activities).toBe("USER");
    expect(t.includesUserPrices).toBe(false);
  });
});

describe("rendered pricing", () => {
  const base: CostBreakdown = {
    flight: 1000,
    hotel: 800,
    food: 300,
    activities: 200,
    transport: 100,
    total: 2400,
    kind: "ESTIMATE",
    kinds: { flight: "ESTIMATE", hotel: "ESTIMATE", food: "ESTIMATE", activities: "ESTIMATE", transport: "ESTIMATE" },
  };

  it("shows 'Estimated trip cost' and an 'Estimated' label on every line in the full breakdown", () => {
    const out = html(createElement(CostBreakdownList, { cost: base }));
    expect(out).toContain("Estimated trip cost");
    for (const label of ["Flights", "Hotels", "Food", "Activities", "Transport"]) expect(out).toContain(label);
    // one badge for the total plus one per component
    expect(out.match(/Estimated<\/span>/g)?.length).toBe(6);
  });

  it("summarises uniform estimates once on compact cards", () => {
    const out = html(createElement(CostBreakdownList, { cost: base, compact: true }));
    expect(out.match(/Estimated<\/span>/g)?.length).toBe(1);
    expect(out).toContain("Every line above is estimated.");
  });

  it("labels provider-derived and user-entered components individually", () => {
    const mixed: CostBreakdown = { ...base, kinds: { ...base.kinds, flight: "PROVIDER", activities: "USER" } };
    const out = html(createElement(CostBreakdownList, { cost: mixed, compact: true }));
    expect(out).toContain("Provider price");
    expect(out).toContain("User entered");
    expect(out).not.toContain("Every line above is estimated.");
    expect(out).toContain("Estimated trip cost"); // the total is still described as an estimate
  });

  it("shows 'Estimated + user entered' for mixed activities", () => {
    const out = html(createElement(CostBreakdownList, { cost: { ...base, includesUserPrices: true } }));
    expect(out).toContain("Estimated + user entered");
  });

  it("badge summarises provider data on cards", () => {
    expect(html(createElement(PriceKindBadge, { kind: "PROVIDER", variant: "card" }))).toContain("Based on recent provider data");
    expect(html(createElement(PriceKindBadge, { kind: "ESTIMATE", variant: "card" }))).toContain("Estimated");
  });
});

describe("misleading wording guard", () => {
  function files(dir: string): string[] {
    return readdirSync(dir).flatMap((n) => {
      const p = path.join(dir, n);
      return statSync(p).isDirectory() ? files(p) : /\.(tsx?)$/.test(n) ? [p] : [];
    });
  }
  const root = path.resolve(__dirname, "../..");
  const sources = ["app", "components", "lib"].flatMap((d) => files(path.join(root, d))).filter((f) => !f.includes(`${path.sep}generated${path.sep}`));

  it.each(["Live price", "Current price", "Guaranteed price", "Best price guarantee"])("no user-facing copy says %s", (phrase) => {
    const offenders = sources.filter((f) => readFileSync(f, "utf8").includes(phrase)).map((f) => path.relative(root, f));
    expect(offenders).toEqual([]);
  });
});
