import "server-only";
import { db } from "@/lib/db/client";
import { ApiError } from "@/lib/http/api";
import { estimateTripCost, flightHours } from "./estimator";
import { getAirport, getDestinations } from "./repository";
import { scoreDestination, type FactorResult } from "./scoring";
import { addDays, nightsBetween, type DiscoverInput } from "./schemas";
import { toEnum, type InterestKey } from "./interests";
import type { CostBreakdown } from "./types";

export type ResolvedSearch = {
  origin: string;
  budget: number;
  startDate: string;
  endDate: string;
  nights: number;
  travellers: number;
  interests: InterestKey[];
  style: DiscoverInput["style"];
  month: number;
};

export type DiscoverItem = {
  slug: string;
  name: string;
  country: string;
  tagline: string;
  heroImage: string;
  heroImageAlt: string;
  airportCode: string;
  score: number;
  factors: FactorResult[];
  cost: CostBreakdown;
  withinBudget: boolean;
  flightHours: number;
  seasonNote: "best" | "shoulder" | "avoid";
};

export type DiscoverResult = { search: ResolvedSearch; items: DiscoverItem[]; originName: string };

const todayIso = () => new Date().toISOString().slice(0, 10);

export function resolveSearch(input: DiscoverInput): ResolvedSearch {
  const startDate = input.startDate ?? addDays(todayIso(), 30);
  const nights = input.endDate ? nightsBetween(startDate, input.endDate) : (input.nights ?? 7);
  if (nights < 1 || nights > 30) throw new ApiError("VALIDATION_ERROR", "Trips must be between 1 and 30 nights");
  const endDate = input.endDate ?? addDays(startDate, nights);
  return {
    origin: input.origin,
    budget: input.budget,
    startDate,
    endDate,
    nights,
    travellers: input.travellers,
    interests: input.interests,
    style: input.style,
    month: new Date(`${startDate}T00:00:00Z`).getUTCMonth() + 1,
  };
}

/** Ranks published destinations for a search. Pure with respect to the DB except for reading reference data. */
export async function discover(input: DiscoverInput, limit = 12): Promise<DiscoverResult> {
  const search = resolveSearch(input);
  const origin = await getAirport(search.origin);
  if (!origin) throw new ApiError("VALIDATION_ERROR", `Unknown origin airport: ${search.origin}`);

  const destinations = await getDestinations();
  const scored = destinations
    .filter((d) => d.airportCode !== origin.iata)
    .map((destination) => {
      const cost = estimateTripCost(destination, origin, {
        origin: origin.iata,
        nights: search.nights,
        travellers: search.travellers,
        style: search.style,
        month: search.month,
      });
      const { score, factors } = scoreDestination({
        destination,
        cost,
        budgetUsd: search.budget,
        nights: search.nights,
        travellers: search.travellers,
        month: search.month,
        interests: search.interests,
        style: search.style,
      });
      const withinBudget = cost.total <= search.budget;
      const item: DiscoverItem = {
        slug: destination.slug,
        name: destination.name,
        country: destination.country,
        tagline: destination.tagline,
        heroImage: destination.heroImage,
        heroImageAlt: destination.heroImageAlt,
        airportCode: destination.airportCode,
        score,
        factors,
        cost: { flight: cost.flight, hotel: cost.hotel, food: cost.food, activities: cost.activities, transport: cost.transport, total: cost.total, kind: "ESTIMATE", kinds: cost.kinds },
        withinBudget,
        flightHours: flightHours(cost.distanceKm),
        seasonNote: destination.bestMonths.includes(search.month) ? "best" : destination.avoidMonths.includes(search.month) ? "avoid" : "shoulder",
      };
      return item;
    });

  const ranked = scored.sort((a, b) => b.score - a.score || a.cost.total - b.cost.total);
  // Show what fits the budget (with a little tolerance). If almost nothing fits, fall back to the cheapest options.
  const fitting = ranked.filter((i) => i.cost.total <= search.budget * 1.25);
  const items = (fitting.length >= 3 ? fitting : [...ranked].sort((a, b) => a.cost.total - b.cost.total).slice(0, 6)).slice(0, limit);

  return { search, items, originName: `${origin.city} (${origin.iata})` };
}

/** Persists the inputs and result metadata so recommendations can be analysed and improved later. */
export async function recordSearch(result: DiscoverResult, ctx: { sessionId: string; userId?: string }) {
  const { search, items } = result;
  const destIds = new Map((await getDestinations()).map((d) => [d.slug, d.id]));
  return db.search.create({
    data: {
      sessionId: ctx.sessionId,
      userId: ctx.userId,
      kind: "DISCOVER",
      origin: search.origin,
      budgetUsd: search.budget,
      startDate: new Date(`${search.startDate}T00:00:00Z`),
      endDate: new Date(`${search.endDate}T00:00:00Z`),
      nights: search.nights,
      travellers: search.travellers,
      interests: search.interests.map(toEnum),
      params: search,
      resultCount: items.length,
      results: {
        create: items.map((item, i) => ({
          destinationId: destIds.get(item.slug)!,
          rank: i + 1,
          score: item.score,
          totalUsd: item.cost.total,
          metadata: { factors: item.factors, cost: item.cost, withinBudget: item.withinBudget },
        })),
      },
    },
    select: { id: true },
  });
}
