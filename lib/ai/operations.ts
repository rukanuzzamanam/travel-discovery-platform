import { generateItinerary, itineraryPerPersonCost, rankActivities, STYLE_MULTIPLIER, toItem, transportItem } from "@/lib/travel/itinerary";
import type { InterestKey } from "@/lib/travel/interests";
import type { DestinationModel, ItineraryDay, TravelStyleKey } from "@/lib/travel/types";
import { computeTotals, type TripState } from "@/lib/travel/trip";

/**
 * Trip edit operations. They are deterministic functions over structured trip data.
 * Prices only ever come from the destination catalogue or the estimator, never from a language model.
 * Items the user priced themselves (priceKind USER) are never repriced or removed by automated cost cuts.
 */

type Origin = { latitude: number; longitude: number; iata: string };
export type OpContext = { dest: DestinationModel; origin: Origin };
export type OpResult = { state: TripState; changes: string[] };
export type OperationName =
  | "reduceTripCost"
  | "upgradeTrip"
  | "makeFamilyFriendly"
  | "addBeachActivities"
  | "removeExpensiveActivities"
  | "shortenTrip"
  | "extendTrip";

const STYLES: TravelStyleKey[] = ["BUDGET", "MID_RANGE", "LUXURY"];
const LABEL: Record<TravelStyleKey, string> = { BUDGET: "Budget", MID_RANGE: "Mid-range", LUXURY: "Luxury" };
const isMain = (c: string) => c === "activity" || c === "attraction";
const clone = (s: TripState): TripState => structuredClone(s);
const total = (ctx: OpContext, s: TripState) => computeTotals(ctx.dest, ctx.origin, s).total;
const usedTitles = (days: ItineraryDay[]) => new Set(days.flatMap((d) => d.items.map((i) => i.title)));

/** Recompute catalogue-derived costs after a style change. USER-entered prices are left alone. */
export function repriceForStyle(days: ItineraryDay[], dest: DestinationModel, style: TravelStyleKey): ItineraryDay[] {
  const cat = new Map(dest.activities.map((a) => [a.title, a]));
  return days.map((d) => ({
    ...d,
    items: d.items.map((i) => {
      if (i.priceKind !== "ESTIMATE") return i;
      if (i.category === "transport") return { ...i, costUsd: transportItem(dest, style).costUsd };
      const a = cat.get(i.title);
      return a ? { ...i, costUsd: Math.round(a.costUsd * STYLE_MULTIPLIER[style]) } : i;
    }),
  }));
}

function renumber(days: ItineraryDay[]): ItineraryDay[] {
  return days.map((d, i) => ({ ...d, day: i + 1 }));
}

export function removeExpensiveActivities(s0: TripState, ctx: OpContext, thresholdUsd = 60): OpResult {
  const s = clone(s0);
  const changes: string[] = [];
  const spare = rankActivities(ctx.dest.activities, s.interests, s.travellers)
    .filter((a) => a.category !== "restaurant" && !usedTitles(s.days).has(a.title))
    .sort((a, b) => a.costUsd - b.costUsd);
  for (const d of s.days) {
    d.items = d.items.flatMap((i) => {
      if (!isMain(i.category) || i.priceKind === "USER" || i.costUsd <= thresholdUsd) return [i];
      const swap = spare.find((a) => Math.round(a.costUsd * STYLE_MULTIPLIER[s.style]) < i.costUsd);
      if (swap) {
        spare.splice(spare.indexOf(swap), 1);
        const item = toItem(swap, s.style);
        changes.push(`Day ${d.day}: replaced "${i.title}" ($${i.costUsd} pp) with "${item.title}" ($${item.costUsd} pp)`);
        return [item];
      }
      changes.push(`Day ${d.day}: removed "${i.title}" ($${i.costUsd} pp)`);
      return [];
    });
    if (!d.items.some((i) => i.category !== "transport")) {
      d.items.unshift({ title: "Free time: explore at your own pace", category: "activity", costUsd: 0, priceKind: "ESTIMATE" });
    }
  }
  return { state: s, changes };
}

export function reduceTripCost(s0: TripState, ctx: OpContext, amountUsd: number): OpResult {
  const target = total(ctx, s0) - amountUsd;
  let s = clone(s0);
  const changes: string[] = [];

  const step = (r: OpResult) => {
    s = r.state;
    changes.push(...r.changes);
  };

  // 1. Swap or drop the priciest activities, most expensive first.
  for (const threshold of [120, 80, 50, 30]) {
    if (total(ctx, s) <= target) break;
    step(removeExpensiveActivities(s, ctx, threshold));
  }
  // 2. Step the travel style down.
  while (total(ctx, s) > target && STYLES.indexOf(s.style) > 0) {
    const next = STYLES[STYLES.indexOf(s.style) - 1];
    s = { ...s, style: next, days: repriceForStyle(s.days, ctx.dest, next) };
    changes.push(`Switched travel style to ${LABEL[next]} (cheaper rooms, food and transport estimates)`);
  }
  // 3. Trim nights, keeping at least 2.
  while (total(ctx, s) > target && s.days.length > 2) {
    const r = shortenTrip(s, ctx, 1);
    step(r);
  }
  const saved = total(ctx, s0) - total(ctx, s);
  changes.push(
    saved >= amountUsd ? `Estimated saving: $${saved} (target $${amountUsd})` : `Estimated saving: $${Math.max(0, saved)}. That is the most we could cut without dropping below 2 nights and Budget style.`,
  );
  return { state: s, changes };
}

export function upgradeTrip(s0: TripState, ctx: OpContext): OpResult {
  const s = clone(s0);
  const changes: string[] = [];
  const idx = STYLES.indexOf(s.style);
  if (idx < STYLES.length - 1) {
    s.style = STYLES[idx + 1];
    s.days = repriceForStyle(s.days, ctx.dest, s.style);
    changes.push(`Upgraded travel style to ${LABEL[s.style]} (better rooms, dining and transport estimates)`);
  } else {
    changes.push("Already at Luxury style");
  }
  const spare = ctx.dest.activities.filter((a) => a.interests.includes("luxury") && !usedTitles(s.days).has(a.title));
  const day = s.days.find((d) => d.items.some((i) => i.title.startsWith("Free")));
  if (spare[0] && day) {
    day.items = [toItem(spare[0], s.style), ...day.items.filter((i) => !i.title.startsWith("Free"))];
    changes.push(`Day ${day.day}: added "${spare[0].title}"`);
  }
  if (!s.interests.includes("luxury")) s.interests = [...s.interests, "luxury"];
  return { state: s, changes };
}

function addByInterest(s0: TripState, ctx: OpContext, interest: InterestKey, max: number): OpResult {
  const s = clone(s0);
  const changes: string[] = [];
  const spare = ctx.dest.activities.filter((a) => a.interests.includes(interest) && !usedTitles(s.days).has(a.title) && a.category !== "restaurant");
  let added = 0;
  // Prefer replacing free days, then days with the fewest main items.
  const order = [...s.days].sort((a, b) => Number(b.items.some((i) => i.title.startsWith("Free"))) - Number(a.items.some((i) => i.title.startsWith("Free"))) || a.items.filter((i) => isMain(i.category)).length - b.items.filter((i) => isMain(i.category)).length);
  for (const d of order) {
    if (added >= max || spare.length === 0) break;
    const pick = spare.shift()!;
    d.items = [...d.items.filter((i) => !i.title.startsWith("Free")), toItem(pick, s.style)];
    changes.push(`Day ${d.day}: added "${pick.title}"`);
    added++;
  }
  if (added === 0) changes.push(`No more ${interest} activities in our ${ctx.dest.name} catalogue to add`);
  if (!s.interests.includes(interest)) s.interests = [...s.interests, interest];
  return { state: s, changes };
}

export const addBeachActivities = (s: TripState, ctx: OpContext) => addByInterest(s, ctx, "beach", 3);

export function makeFamilyFriendly(s0: TripState, ctx: OpContext): OpResult {
  const cat = new Map(ctx.dest.activities.map((a) => [a.title, a]));
  const s = clone(s0);
  const changes: string[] = [];
  for (const d of s.days) {
    d.items = d.items.filter((i) => {
      const a = cat.get(i.title);
      const adultOnly = a && a.interests.includes("nightlife") && !a.interests.includes("family");
      if (adultOnly && i.priceKind !== "USER") {
        changes.push(`Day ${d.day}: removed "${i.title}" (adult-focused)`);
        return false;
      }
      return true;
    });
    if (!d.items.some((i) => i.category !== "transport")) d.items.unshift({ title: "Free time: pool, park or playground", category: "activity", costUsd: 0, priceKind: "ESTIMATE" });
  }
  const r = addByInterest(s, ctx, "family", 3);
  return { state: r.state, changes: [...changes, ...r.changes] };
}

export function shortenTrip(s0: TripState, ctx: OpContext, by = 1): OpResult {
  void ctx;
  const s = clone(s0);
  const changes: string[] = [];
  for (let n = 0; n < by && s.days.length > 1; n++) {
    // Drop the lightest middle day; keep arrival and departure days.
    const candidates = s.days.slice(1, -1);
    const drop = candidates.length
      ? candidates.reduce((min, d) => (d.items.reduce((t, i) => t + i.costUsd, 0) < min.items.reduce((t, i) => t + i.costUsd, 0) ? d : min))
      : s.days[s.days.length - 2] ?? s.days[0];
    s.days = renumber(s.days.filter((d) => d !== drop));
    changes.push(`Removed day "${drop.title}" (one fewer night)`);
  }
  s.nights = s.days.length;
  return { state: s, changes };
}

export function extendTrip(s0: TripState, ctx: OpContext, by = 1): OpResult {
  const s = clone(s0);
  const changes: string[] = [];
  for (let n = 0; n < by && s.days.length < 30; n++) {
    const extra = generateItinerary(
      { ...ctx.dest, activities: ctx.dest.activities.filter((a) => !usedTitles(s.days).has(a.title)) },
      { days: 3, style: s.style, interests: s.interests, travellers: s.travellers },
    )[1]; // a "middle" day: full-length, not arrival/departure
    const last = s.days[s.days.length - 1];
    const newDay: ItineraryDay = { ...extra, day: last.day };
    s.days = renumber([...s.days.slice(0, -1), newDay, last]);
    changes.push(`Added a day: "${newDay.title}"`);
  }
  s.nights = s.days.length;
  return { state: s, changes };
}

export type OperationCall = { operation: OperationName; amountUsd?: number; days?: number };

export function runOperation(call: OperationCall, s: TripState, ctx: OpContext): OpResult {
  switch (call.operation) {
    case "reduceTripCost":
      return reduceTripCost(s, ctx, Math.max(1, Math.round(call.amountUsd ?? 200)));
    case "upgradeTrip":
      return upgradeTrip(s, ctx);
    case "makeFamilyFriendly":
      return makeFamilyFriendly(s, ctx);
    case "addBeachActivities":
      return addBeachActivities(s, ctx);
    case "removeExpensiveActivities":
      return removeExpensiveActivities(s, ctx);
    case "shortenTrip":
      return shortenTrip(s, ctx, Math.min(5, Math.max(1, call.days ?? 1)));
    case "extendTrip":
      return extendTrip(s, ctx, Math.min(5, Math.max(1, call.days ?? 1)));
  }
}

export const OPERATION_NAMES: OperationName[] = [
  "reduceTripCost",
  "upgradeTrip",
  "makeFamilyFriendly",
  "addBeachActivities",
  "removeExpensiveActivities",
  "shortenTrip",
  "extendTrip",
];

export { itineraryPerPersonCost };
