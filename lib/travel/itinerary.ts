import type { InterestKey } from "./interests";
import type { DestinationActivity, DestinationModel, ItineraryDay, ItineraryItem, TravelStyleKey } from "./types";

/**
 * Deterministic itinerary generator. It only ever schedules activities from the destination's catalogue,
 * and costs are catalogue estimates scaled by travel style. It never invents prices.
 */

export const STYLE_MULTIPLIER: Record<TravelStyleKey, number> = { BUDGET: 0.75, MID_RANGE: 1, LUXURY: 1.8 };

type Opts = { days: number; style: TravelStyleKey; interests: InterestKey[]; travellers: number };

const isMain = (a: DestinationActivity) => a.category !== "restaurant";

export function rankActivities(activities: DestinationActivity[], interests: InterestKey[], travellers: number) {
  const score = (a: DestinationActivity) => {
    const overlap = interests.length ? a.interests.filter((i) => interests.includes(i)).length / interests.length : 0.5;
    const family = travellers >= 3 && a.interests.includes("family") ? 0.25 : 0;
    return overlap + family;
  };
  return [...activities].map((a, i) => ({ a, s: score(a), i })).sort((x, y) => y.s - x.s || x.i - y.i).map((x) => x.a);
}

export function toItem(a: DestinationActivity, style: TravelStyleKey): ItineraryItem {
  return {
    title: a.title,
    category: a.category,
    durationMin: a.durationMin,
    costUsd: Math.round(a.costUsd * STYLE_MULTIPLIER[style]),
    priceKind: "ESTIMATE",
  };
}

export function transportItem(dest: Pick<DestinationModel, "dailyTransport">, style: TravelStyleKey): ItineraryItem {
  return {
    title: "Local transport",
    category: "transport",
    costUsd: Math.round(dest.dailyTransport * STYLE_MULTIPLIER[style]),
    priceKind: "ESTIMATE",
  };
}

export function generateItinerary(dest: DestinationModel, opts: Opts): ItineraryDay[] {
  const days = Math.max(1, Math.min(31, opts.days));
  const ranked = rankActivities(dest.activities, opts.interests, opts.travellers);
  const mains = ranked.filter(isMain);
  const meals = ranked.filter((a) => !isMain(a));
  let mi = 0;
  let ri = 0;
  const out: ItineraryDay[] = [];

  for (let d = 1; d <= days; d++) {
    const light = d === 1 || (d === days && days > 1);
    const budgetMin = light ? 240 : 540;
    const items: ItineraryItem[] = [];
    let used = 0;
    while (mi < mains.length && items.filter((i) => i.category !== "restaurant").length < 3) {
      const next = mains[mi];
      if (used > 0 && used + next.durationMin > budgetMin) break;
      if (used === 0 && light && next.durationMin > 300 && mi + 1 < mains.length) {
        // Keep arrival/departure days light: try a shorter option first.
        const alt = mains.findIndex((m, idx) => idx > mi && m.durationMin <= 240);
        if (alt > -1) [mains[mi], mains[alt]] = [mains[alt], mains[mi]];
      }
      const pick = mains[mi++];
      items.push(toItem(pick, opts.style));
      used += pick.durationMin;
      if (used >= budgetMin - 60) break;
    }
    if (meals.length && ri < meals.length) items.push(toItem(meals[ri++], opts.style));
    if (items.length === 0) {
      items.push({ title: "Free day: explore at your own pace", category: "activity", costUsd: 0, priceKind: "ESTIMATE", notes: "Flexible time for rest or a repeat favourite." });
    }
    items.push(transportItem(dest, opts.style));

    const firstMain = items.find((i) => i.category === "activity" || i.category === "attraction");
    const title =
      d === 1 ? "Arrive and get your bearings" : d === days && days > 1 ? "Final morning and departure" : (firstMain?.title.split(/ and |: /)[0] ?? `Day ${d}`);
    out.push({ day: d, title, items });
  }
  return out;
}

export function itineraryPerPersonCost(days: ItineraryDay[], categories: ItineraryItem["category"][] = ["activity", "attraction"]) {
  return days.reduce((sum, d) => sum + d.items.filter((i) => categories.includes(i.category)).reduce((s, i) => s + i.costUsd, 0), 0);
}

export function dayCost(day: ItineraryDay) {
  return day.items.reduce((s, i) => s + i.costUsd, 0);
}
