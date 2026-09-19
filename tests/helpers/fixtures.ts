import { airports } from "@/content/geo/geo";
import { destinations } from "@/content/destinations/destinations";
import type { DestinationModel } from "@/lib/travel/types";
import type { TripState } from "@/lib/travel/trip";
import { generateItinerary } from "@/lib/travel/itinerary";

export function model(slug: string): DestinationModel {
  const d = destinations.find((x) => x.slug === slug)!;
  const ap = airports.find((a) => a.iata === d.airportCode)!;
  return {
    id: `id-${slug}`,
    slug,
    name: d.name,
    country: d.countryCode,
    airportCode: d.airportCode,
    tagline: d.tagline,
    overview: d.overview,
    heroImage: "",
    heroImageAlt: "",
    bestMonths: d.bestMonths,
    avoidMonths: d.avoidMonths,
    interestScores: d.interestScores,
    familyScore: d.familyScore,
    recommendedDaysMin: d.days[0],
    recommendedDaysMax: d.days[1],
    hotelNightBudget: d.hotel[0],
    hotelNightMid: d.hotel[1],
    hotelNightLuxury: d.hotel[2],
    dailyFood: d.daily[0],
    dailyTransport: d.daily[1],
    dailyActivities: d.daily[2],
    activities: d.activities,
    latitude: ap.lat,
    longitude: ap.lng,
  };
}

export const SYDNEY = { iata: "SYD", latitude: -33.946, longitude: 151.177 };

export function tripState(slug = "bali", overrides: Partial<TripState> = {}): { dest: DestinationModel; state: TripState } {
  const dest = model(slug);
  const nights = overrides.nights ?? 7;
  const style = overrides.style ?? "MID_RANGE";
  const interests = overrides.interests ?? [];
  const travellers = overrides.travellers ?? 2;
  const state: TripState = {
    origin: "SYD",
    destinationSlug: slug,
    startDate: "2027-05-10",
    nights,
    travellers,
    style,
    interests,
    days: generateItinerary(dest, { days: nights, style, interests, travellers }),
    ...overrides,
  };
  return { dest, state };
}
