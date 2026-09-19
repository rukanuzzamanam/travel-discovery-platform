import "server-only";
import { db } from "@/lib/db/client";
import { ApiError } from "@/lib/http/api";
import { cleanText } from "@/lib/security/sanitize";
import { estimateTripCost } from "./estimator";
import { generateItinerary, itineraryPerPersonCost } from "./itinerary";
import { itineraryDaysSchema } from "./itinerary-schema";
import { getAirport, getDestinationBySlug, getPublishedItineraries } from "./repository";
import { addDays, nightsBetween, type TripPlanInput } from "./schemas";
import { toEnum, fromEnum, type InterestKey } from "./interests";
import type { CostBreakdown, DestinationModel, ItineraryDay, TravelStyleKey } from "./types";

/** Everything needed to (re)compute a trip. The single source of truth the AI operations edit. */
export type TripState = {
  origin: string;
  destinationSlug: string;
  startDate: string; // ISO date
  nights: number;
  travellers: number;
  style: TravelStyleKey;
  interests: InterestKey[];
  budgetUsd?: number;
  days: ItineraryDay[];
};

export type TripTotals = CostBreakdown & { distanceKm: number };

/** Flights/hotel/food/transport come from the estimator; activities come from the (editable) itinerary. */
export function computeTotals(dest: DestinationModel, origin: { latitude: number; longitude: number; iata: string }, s: TripState): TripTotals {
  const month = new Date(`${s.startDate}T00:00:00Z`).getUTCMonth() + 1;
  const base = estimateTripCost(dest, origin, { origin: origin.iata, nights: s.nights, travellers: s.travellers, style: s.style, month });
  const activities = Math.round(itineraryPerPersonCost(s.days) * s.travellers);
  const activityItems = s.days.flatMap((d) => d.items).filter((i) => (i.category === "activity" || i.category === "attraction") && i.costUsd > 0);
  const userCount = activityItems.filter((i) => i.priceKind === "USER").length;
  const allUser = activityItems.length > 0 && userCount === activityItems.length;
  return {
    flight: base.flight,
    hotel: base.hotel,
    food: base.food,
    transport: base.transport,
    activities,
    total: base.flight + base.hotel + base.food + base.transport + activities,
    kind: "ESTIMATE",
    kinds: { ...base.kinds, activities: allUser ? "USER" : "ESTIMATE" },
    includesUserPrices: userCount > 0 && !allUser,
    distanceKm: base.distanceKm,
  };
}

export async function createTrip(input: TripPlanInput & { itinerarySlug?: string }, userId?: string) {
  const [dest, origin] = await Promise.all([getDestinationBySlug(input.destination), getAirport(input.origin)]);
  if (!dest) throw new ApiError("NOT_FOUND", "Destination not found");
  if (!origin) throw new ApiError("VALIDATION_ERROR", `Unknown origin airport: ${input.origin}`);
  const nights = nightsBetween(input.startDate, input.endDate);

  let days: ItineraryDay[];
  const template = input.itinerarySlug ? (await getPublishedItineraries()).find((i) => i.slug === input.itinerarySlug) : undefined;
  if (template && template.destination.slug === dest.slug) {
    days = itineraryDaysSchema.parse(template.days);
  } else {
    days = generateItinerary(dest, { days: nights, style: input.style, interests: input.interests, travellers: input.travellers });
  }

  const state: TripState = {
    origin: origin.iata,
    destinationSlug: dest.slug,
    startDate: input.startDate,
    nights: days.length === nights ? nights : Math.max(nights, days.length),
    travellers: input.travellers,
    style: input.style,
    interests: input.interests,
    budgetUsd: input.budget,
    days,
  };
  if (state.nights !== nights) state.nights = days.length;
  const totals = computeTotals(dest, origin, state);

  const trip = await db.trip.create({
    data: {
      userId,
      title: `${state.nights} nights in ${dest.name}`,
      origin: origin.iata,
      destinationId: dest.id,
      startDate: new Date(`${state.startDate}T00:00:00Z`),
      endDate: new Date(`${addDays(state.startDate, state.nights)}T00:00:00Z`),
      travellers: state.travellers,
      budgetUsd: state.budgetUsd,
      style: state.style,
      interests: state.interests.map(toEnum),
      totalEstimateUsd: totals.total,
    },
    select: { id: true, shareToken: true },
  });
  await writeTripBody(trip.id, state, totals);
  return { id: trip.id, token: trip.shareToken, state, totals, destination: dest };
}

function kindOf(type: "FLIGHT" | "HOTEL" | "FOOD" | "TRANSPORT" | "ACTIVITY", t: TripTotals) {
  const key = { FLIGHT: "flight", HOTEL: "hotel", FOOD: "food", TRANSPORT: "transport", ACTIVITY: "activities" } as const;
  return t.kinds[key[type]];
}

function itemRows(tripId: string, t: TripTotals) {
  return [
    { type: "FLIGHT" as const, label: "Flights", amountUsd: t.flight },
    { type: "HOTEL" as const, label: "Accommodation", amountUsd: t.hotel },
    { type: "FOOD" as const, label: "Food", amountUsd: t.food },
    { type: "TRANSPORT" as const, label: "Local transport", amountUsd: t.transport },
    { type: "ACTIVITY" as const, label: "Activities", amountUsd: t.activities },
  ].map((r) => ({ ...r, tripId, priceKind: kindOf(r.type, t) }));
}

/** Replace a trip's days/activities/budget lines with the given state (used on create and on every save). */
async function writeTripBody(tripId: string, state: TripState, totals: TripTotals) {
  await db.$transaction([
    db.tripItem.deleteMany({ where: { tripId } }),
    db.tripDay.deleteMany({ where: { tripId } }),
    db.tripItem.createMany({ data: itemRows(tripId, totals) }),
    ...state.days.map((d) =>
      db.tripDay.create({
        data: {
          tripId,
          dayNumber: d.day,
          title: cleanText(d.title, 120),
          notes: d.summary ? cleanText(d.summary, 400) : null,
          activities: {
            create: d.items.map((it, position) => ({
              position,
              title: cleanText(it.title, 160),
              category: it.category,
              durationMin: it.durationMin,
              costUsd: Math.round(it.costUsd),
              priceKind: it.priceKind,
              notes: it.notes ? cleanText(it.notes, 400) : null,
            })),
          },
        },
      }),
    ),
  ]);
}

export async function loadTrip(token: string) {
  const trip = await db.trip.findUnique({
    where: { shareToken: token },
    include: { destination: { select: { slug: true, name: true } }, days: { orderBy: { dayNumber: "asc" }, include: { activities: { orderBy: { position: "asc" } } } } },
  });
  if (!trip) return null;
  const nights = nightsBetween(trip.startDate.toISOString().slice(0, 10), trip.endDate.toISOString().slice(0, 10));
  const state: TripState = {
    origin: trip.origin,
    destinationSlug: trip.destination.slug,
    startDate: trip.startDate.toISOString().slice(0, 10),
    nights,
    travellers: trip.travellers,
    style: trip.style,
    interests: trip.interests.map(fromEnum),
    budgetUsd: trip.budgetUsd ?? undefined,
    days: trip.days.map((d) => ({
      day: d.dayNumber,
      title: d.title,
      summary: d.notes ?? undefined,
      items: d.activities.map((a) => ({
        title: a.title,
        category: a.category as ItineraryDay["items"][number]["category"],
        durationMin: a.durationMin ?? undefined,
        costUsd: a.costUsd,
        priceKind: a.priceKind,
        notes: a.notes ?? undefined,
      })),
    })),
  };
  return { id: trip.id, token: trip.shareToken, userId: trip.userId, title: trip.title, state, destinationName: trip.destination.name };
}

export async function saveTrip(token: string, next: TripState) {
  const existing = await db.trip.findUnique({ where: { shareToken: token }, select: { id: true } });
  if (!existing) throw new ApiError("NOT_FOUND", "Trip not found");
  const [dest, origin] = await Promise.all([getDestinationBySlug(next.destinationSlug), getAirport(next.origin)]);
  if (!dest || !origin) throw new ApiError("VALIDATION_ERROR", "Invalid trip");
  const state: TripState = { ...next, nights: Math.max(1, next.days.length) };
  const totals = computeTotals(dest, origin, state);
  await db.trip.update({
    where: { id: existing.id },
    data: {
      title: `${state.nights} nights in ${dest.name}`,
      style: state.style,
      travellers: state.travellers,
      interests: state.interests.map(toEnum),
      endDate: new Date(`${addDays(state.startDate, state.nights)}T00:00:00Z`),
      totalEstimateUsd: totals.total,
    },
  });
  await writeTripBody(existing.id, state, totals);
  return { state, totals, destination: dest };
}
