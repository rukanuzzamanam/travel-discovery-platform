import type { CostBreakdown, DestinationModel, TravelStyleKey, TripInput } from "./types";

/**
 * Trip cost ESTIMATION model.
 * Everything returned here is an estimate derived from distance and typical daily costs.
 * It is never a live provider price and must always be presented as an estimate.
 */

export type LatLng = { latitude: number; longitude: number };

export function haversineKm(a: LatLng, b: LatLng): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLng = toRad(b.longitude - a.longitude);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

const FLIGHT_STYLE: Record<TravelStyleKey, number> = { BUDGET: 0.9, MID_RANGE: 1, LUXURY: 1.6 };
const DAILY_STYLE: Record<TravelStyleKey, number> = { BUDGET: 0.75, MID_RANGE: 1, LUXURY: 1.8 };

/** Seasonal price pressure: 1.1 in peak season, 0.9 in low season, +8% in common holiday months. */
export function seasonMultiplier(dest: Pick<DestinationModel, "bestMonths" | "avoidMonths">, month: number): number {
  let m = 1;
  if (dest.bestMonths.includes(month)) m = 1.1;
  else if (dest.avoidMonths.includes(month)) m = 0.9;
  if ([12, 1, 7].includes(month)) m += 0.08;
  return m;
}

/** Round-trip economy fare per person, in USD, from great-circle distance. */
export function estimateFlightUsd(distanceKm: number, style: TravelStyleKey = "MID_RANGE"): number {
  const base = 90 + 0.075 * distanceKm;
  return Math.round((base * FLIGHT_STYLE[style]) / 5) * 5;
}

export function roomsFor(travellers: number) {
  return Math.max(1, Math.ceil(travellers / 2));
}

export function hotelNightly(dest: DestinationModel, style: TravelStyleKey): number {
  return style === "BUDGET" ? dest.hotelNightBudget : style === "LUXURY" ? dest.hotelNightLuxury : dest.hotelNightMid;
}

export function estimateTripCost(
  dest: DestinationModel,
  origin: LatLng,
  input: TripInput,
): CostBreakdown & { distanceKm: number; nights: number } {
  const distanceKm = haversineKm(origin, dest);
  const season = seasonMultiplier(dest, input.month);
  const nights = Math.max(1, input.nights);
  const daily = DAILY_STYLE[input.style];

  const flight = Math.round(estimateFlightUsd(distanceKm, input.style) * season) * input.travellers;
  const hotel = Math.round(hotelNightly(dest, input.style) * season * nights * roomsFor(input.travellers));
  const food = Math.round(dest.dailyFood * daily * nights * input.travellers);
  const activities = Math.round(dest.dailyActivities * daily * nights * input.travellers);
  const transport = Math.round(dest.dailyTransport * daily * nights * input.travellers);

  return {
    flight,
    hotel,
    food,
    activities,
    transport,
    total: flight + hotel + food + activities + transport,
    kind: "ESTIMATE",
    distanceKm: Math.round(distanceKm),
    nights,
  };
}

/** Approximate one-way flight time in hours (used for the "travel duration" scoring factor). */
export function flightHours(distanceKm: number): number {
  return Math.round((distanceKm / 800 + 0.75) * 10) / 10;
}
