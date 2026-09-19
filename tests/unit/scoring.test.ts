import { describe, expect, it } from "vitest";
import { estimateTripCost } from "@/lib/travel/estimator";
import { scoreDestination, SCORERS, seasonScorer, interestScorer } from "@/lib/travel/scoring";
import { destinations } from "@/content/destinations/destinations";
import { model, SYDNEY } from "../helpers/fixtures";

function ctx(slug: string, over: Partial<Parameters<typeof scoreDestination>[0]> = {}) {
  const destination = model(slug);
  const cost = estimateTripCost(destination, SYDNEY, { origin: "SYD", nights: 7, travellers: 2, style: "MID_RANGE", month: 6 });
  return { destination, cost, budgetUsd: 4000, nights: 7, travellers: 2, month: 6, interests: [] as never[], style: "MID_RANGE" as const, ...over };
}

describe("recommendation scoring", () => {
  it("returns a factor for every scorer with weights that drive the result", () => {
    const r = scoreDestination(ctx("bali"));
    expect(r.factors.map((f) => f.id).sort()).toEqual(SCORERS.map((s) => s.id).sort());
    expect(r.score).toBeGreaterThan(0);
    expect(r.score).toBeLessThanOrEqual(1);
  });

  it("scores interest matches higher", () => {
    const beach = interestScorer.score(ctx("bali", { interests: ["beach"] })).score;
    const beachInCity = interestScorer.score(ctx("seoul", { interests: ["beach"] })).score;
    expect(beach).toBeGreaterThan(beachInCity);
  });

  it("prefers the right season", () => {
    const good = seasonScorer.score(ctx("bali", { month: 7 })).score;
    const bad = seasonScorer.score(ctx("bali", { month: 1 })).score;
    expect(good).toBeGreaterThan(bad);
  });

  it("penalises going over budget", () => {
    const fits = scoreDestination(ctx("bali", { budgetUsd: 10000 })).factors.find((f) => f.id === "cost")!.score;
    const over = scoreDestination(ctx("bali", { budgetUsd: 1000 })).factors.find((f) => f.id === "cost")!.score;
    expect(fits).toBeGreaterThan(over);
    expect(over).toBe(0);
  });

  it("does not hard-code a winner: different inputs give different top destinations", () => {
    const top = (interests: string[], month: number, budget: number) =>
      destinations
        .map((d) => {
          const destination = model(d.slug);
          const cost = estimateTripCost(destination, SYDNEY, { origin: "SYD", nights: 7, travellers: 2, style: "MID_RANGE", month });
          return { slug: d.slug, score: scoreDestination({ destination, cost, budgetUsd: budget, nights: 7, travellers: 2, month, interests: interests as never[], style: "MID_RANGE" }).score };
        })
        .sort((a, b) => b.score - a.score)[0].slug;
    const winners = new Set([top(["beach"], 7, 4000), top(["food", "shopping"], 11, 4000), top(["adventure", "nature"], 1, 6000), top(["luxury"], 12, 8000)]);
    expect(winners.size).toBeGreaterThan(1);
  });
});
