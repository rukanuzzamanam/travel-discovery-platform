import { flightHours } from "./estimator";
import { INTERESTS, type InterestKey } from "./interests";
import type { CostBreakdown, DestinationModel, TravelStyleKey } from "./types";

/**
 * Modular destination scoring. Each scorer is an independent unit returning 0..1 and a human-readable reason.
 * Add, remove or re-weight scorers in SCORERS without touching the ranking logic.
 */

export type ScoringContext = {
  destination: DestinationModel;
  cost: CostBreakdown & { distanceKm: number };
  budgetUsd: number;
  nights: number;
  travellers: number;
  month: number;
  interests: InterestKey[];
  style: TravelStyleKey;
};

export type FactorResult = { id: string; score: number; weight: number; reason: string };

type Scorer = { id: string; weight: number; score: (ctx: ScoringContext) => { score: number; reason: string } };

const clamp = (n: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, n));

export const costScorer: Scorer = {
  id: "cost",
  weight: 0.25,
  score: ({ cost, budgetUsd }) => {
    const ratio = cost.total / budgetUsd;
    if (ratio <= 1) return { score: 0.75 + 0.25 * (1 - ratio), reason: `Estimated at ${Math.round(ratio * 100)}% of your budget` };
    if (ratio <= 1.25) return { score: 0.5 * (1 - (ratio - 1) / 0.25), reason: `About ${Math.round((ratio - 1) * 100)}% over budget` };
    return { score: 0, reason: "Well over budget" };
  },
};

export const durationScorer: Scorer = {
  id: "duration",
  weight: 0.15,
  score: ({ destination, cost, nights }) => {
    const hours = flightHours(cost.distanceKm);
    const travelShare = (2 * hours) / (nights * 24);
    const travelScore = clamp(1 - (travelShare - 0.15) / 0.45);
    const min = destination.recommendedDaysMin;
    const max = destination.recommendedDaysMax;
    const fit = nights >= min && nights <= max ? 1 : nights < min ? clamp(1 - (min - nights) * 0.2) : clamp(1 - (nights - max) * 0.1);
    return {
      score: 0.6 * travelScore + 0.4 * fit,
      reason: `~${hours}h flight each way; ideal stay is ${min}–${max} nights`,
    };
  },
};

export const interestScorer: Scorer = {
  id: "interests",
  weight: 0.3,
  score: ({ destination, interests }) => {
    if (interests.length === 0) return { score: 0.6, reason: "No specific interests selected" };
    const per = interests.map((i) => (destination.interestScores[i] ?? 0) / 5);
    const mean = per.reduce((a, b) => a + b, 0) / per.length;
    const best = [...interests].sort((a, b) => (destination.interestScores[b] ?? 0) - (destination.interestScores[a] ?? 0))[0];
    return { score: mean, reason: `Strong match for ${best}` };
  },
};

export const seasonScorer: Scorer = {
  id: "season",
  weight: 0.15,
  score: ({ destination, month }) => {
    if (destination.bestMonths.includes(month)) return { score: 1, reason: "Great time of year to visit" };
    if (destination.avoidMonths.includes(month)) return { score: 0.15, reason: "Weather is challenging this month" };
    return { score: 0.6, reason: "Shoulder season" };
  },
};

export const travellerScorer: Scorer = {
  id: "travellers",
  weight: 0.075,
  score: ({ destination, travellers }) => {
    if (travellers >= 3) return { score: destination.familyScore / 5, reason: `Group-friendliness ${destination.familyScore}/5` };
    return { score: 0.75, reason: "Works well for solo travellers and couples" };
  },
};

export const suitabilityScorer: Scorer = {
  id: "suitability",
  weight: 0.075,
  score: ({ destination, style }) => {
    if (style === "LUXURY") return { score: (destination.interestScores.luxury ?? 0) / 5, reason: "Luxury offering" };
    if (style === "BUDGET") return { score: clamp(1 - destination.hotelNightBudget / 150), reason: "Low accommodation costs" };
    return { score: 0.7, reason: "Good mid-range options" };
  },
};

export const SCORERS: Scorer[] = [costScorer, durationScorer, interestScorer, seasonScorer, travellerScorer, suitabilityScorer];

export function scoreDestination(ctx: ScoringContext, scorers: Scorer[] = SCORERS) {
  const totalWeight = scorers.reduce((s, x) => s + x.weight, 0);
  const factors: FactorResult[] = scorers.map((s) => {
    const r = s.score(ctx);
    return { id: s.id, score: Math.round(clamp(r.score) * 1000) / 1000, weight: s.weight, reason: r.reason };
  });
  const score = factors.reduce((sum, f) => sum + f.score * f.weight, 0) / totalWeight;
  return { score: Math.round(score * 1000) / 1000, factors };
}

export const ALL_INTERESTS = INTERESTS;
