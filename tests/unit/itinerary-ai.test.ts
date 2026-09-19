import { describe, expect, it } from "vitest";
import { generateItinerary } from "@/lib/travel/itinerary";
import { itineraryDaysSchema } from "@/lib/travel/itinerary-schema";
import { computeTotals } from "@/lib/travel/trip";
import { addBeachActivities, extendTrip, makeFamilyFriendly, reduceTripCost, removeExpensiveActivities, shortenTrip, upgradeTrip, runOperation } from "@/lib/ai/operations";
import { interpretWithRules } from "@/lib/ai/interpreter";
import { model, SYDNEY, tripState } from "../helpers/fixtures";

const total = (dest: ReturnType<typeof model>, s: ReturnType<typeof tripState>["state"]) => computeTotals(dest, SYDNEY, s).total;

describe("itinerary generator", () => {
  it("creates one valid day per night without repeating activities", () => {
    const dest = model("bali");
    const days = generateItinerary(dest, { days: 7, style: "MID_RANGE", interests: [], travellers: 2 });
    expect(days).toHaveLength(7);
    expect(() => itineraryDaysSchema.parse(days)).not.toThrow();
    const titles = days.flatMap((d) => d.items).filter((i) => i.category !== "transport" && !i.title.startsWith("Free")).map((i) => i.title);
    expect(new Set(titles).size).toBe(titles.length);
  });

  it("only schedules catalogue activities with catalogue-derived estimate prices", () => {
    const dest = model("tokyo");
    const days = generateItinerary(dest, { days: 5, style: "MID_RANGE", interests: ["food"], travellers: 2 });
    const cat = new Map(dest.activities.map((a) => [a.title, a.costUsd]));
    for (const item of days.flatMap((d) => d.items)) {
      expect(item.priceKind).toBe("ESTIMATE");
      if (item.category !== "transport" && !item.title.startsWith("Free")) expect(cat.get(item.title)).toBe(item.costUsd);
    }
  });

  it("puts interest-matching activities first", () => {
    const dest = model("bali");
    const days = generateItinerary(dest, { days: 3, style: "MID_RANGE", interests: ["food"], travellers: 2 });
    const titles = days.flatMap((d) => d.items.map((i) => i.title));
    expect(titles.some((t) => t.includes("cooking class") || t.includes("Warung"))).toBe(true);
  });
});

describe("AI trip operations (deterministic, catalogue-only)", () => {
  it("reduces cost toward a target without touching user-entered prices", () => {
    const { dest, state } = tripState("tokyo", { style: "LUXURY" });
    state.days[1].items[0] = { ...state.days[1].items[0], costUsd: 500, priceKind: "USER" };
    const before = total(dest, state);
    const r = reduceTripCost(state, { dest, origin: SYDNEY }, 300);
    expect(total(dest, r.state)).toBeLessThan(before - 250);
    expect(r.state.days.flatMap((d) => d.items).some((i) => i.priceKind === "USER" && i.costUsd === 500)).toBe(true);
    expect(r.changes.at(-1)).toMatch(/saving/i);
  });

  it("never invents prices: every ESTIMATE cost comes from the catalogue, style scaling or the transport model", () => {
    const { dest, state } = tripState("bali");
    const ops = [
      (s: typeof state) => reduceTripCost(s, { dest, origin: SYDNEY }, 400).state,
      (s: typeof state) => upgradeTrip(s, { dest, origin: SYDNEY }).state,
      (s: typeof state) => addBeachActivities(s, { dest, origin: SYDNEY }).state,
      (s: typeof state) => makeFamilyFriendly(s, { dest, origin: SYDNEY }).state,
    ];
    const mult = { BUDGET: 0.75, MID_RANGE: 1, LUXURY: 1.8 } as const;
    for (const op of ops) {
      const out = op(state);
      const cat = new Map(dest.activities.map((a) => [a.title, a.costUsd]));
      for (const i of out.days.flatMap((d) => d.items)) {
        if (i.category === "transport" || i.title.startsWith("Free")) continue;
        expect(Math.round((cat.get(i.title) ?? NaN) * mult[out.style])).toBe(i.costUsd);
      }
    }
  });

  it("upgradeTrip raises the style and the estimate", () => {
    const { dest, state } = tripState("bali");
    const r = upgradeTrip(state, { dest, origin: SYDNEY });
    expect(r.state.style).toBe("LUXURY");
    expect(total(dest, r.state)).toBeGreaterThan(total(dest, state));
  });

  it("removeExpensiveActivities lowers per-item prices above the threshold", () => {
    const { dest, state } = tripState("cairns");
    const r = removeExpensiveActivities(state, { dest, origin: SYDNEY }, 60);
    expect(total(dest, r.state)).toBeLessThan(total(dest, state));
  });

  it("adds beach activities from the catalogue and tags the interest", () => {
    const { dest, state } = tripState("bali", { nights: 5 });
    const r = addBeachActivities(state, { dest, origin: SYDNEY });
    expect(r.state.interests).toContain("beach");
    expect(r.changes.length).toBeGreaterThan(0);
  });

  it("shortens and extends trips, keeping day numbers contiguous", () => {
    const { dest, state } = tripState("bali", { nights: 6 });
    const short = shortenTrip(state, { dest, origin: SYDNEY }, 2).state;
    expect(short.days).toHaveLength(4);
    expect(short.days.map((d) => d.day)).toEqual([1, 2, 3, 4]);
    const long = extendTrip(state, { dest, origin: SYDNEY }, 2).state;
    expect(long.days).toHaveLength(8);
    expect(long.days.map((d) => d.day)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect(long.nights).toBe(8);
  });

  it("dispatches by operation name", () => {
    const { dest, state } = tripState("bali");
    expect(runOperation({ operation: "upgradeTrip" }, state, { dest, origin: SYDNEY }).state.style).toBe("LUXURY");
  });
});

describe("request interpretation (rules fallback)", () => {
  it.each([
    ["Make this trip $300 cheaper", { operation: "reduceTripCost", amount: 300 }],
    ["Make this trip €250 cheaper", { operation: "reduceTripCost", amount: 250 }],
    ["take £400 off please save", { operation: "reduceTripCost", amount: 400 }],
    ["I want to save 500 aud", { operation: "reduceTripCost", amount: 500 }],
    ["Save $1,200 please", { operation: "reduceTripCost", amount: 1200 }],
    ["upgrade this to something nicer", { operation: "upgradeTrip" }],
    ["make it family friendly for the kids", { operation: "makeFamilyFriendly" }],
    ["add some beach time", { operation: "addBeachActivities" }],
    ["shorten it by 2 days", { operation: "shortenTrip", days: 2 }],
    ["I want a longer trip", { operation: "extendTrip", days: 1 }],
  ])("%s", (msg, expected) => {
    expect(interpretWithRules(msg)).toMatchObject(expected);
  });

  it("declines requests it can't do instead of guessing", () => {
    expect(interpretWithRules("book me a flight to Mars")).toEqual({ operation: "unsupported" });
  });
});
