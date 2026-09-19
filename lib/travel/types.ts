import type { InterestKey } from "./interests";

export type TravelStyleKey = "BUDGET" | "MID_RANGE" | "LUXURY";
export type PriceKindKey = "ESTIMATE" | "PROVIDER" | "USER";
export type ActivityCategory = "activity" | "attraction" | "restaurant";

export type DestinationActivity = {
  title: string;
  category: ActivityCategory;
  costUsd: number;
  durationMin: number;
  interests: InterestKey[];
};

export type Faq = { q: string; a: string };

/** Destination shape used by the scoring, budget and itinerary engines (framework-agnostic). */
export type DestinationModel = {
  id: string;
  slug: string;
  name: string;
  country: string;
  airportCode: string;
  tagline: string;
  overview: string;
  heroImage: string;
  heroImageAlt: string;
  bestMonths: number[];
  avoidMonths: number[];
  interestScores: Record<InterestKey, number>;
  familyScore: number;
  recommendedDaysMin: number;
  recommendedDaysMax: number;
  hotelNightBudget: number;
  hotelNightMid: number;
  hotelNightLuxury: number;
  dailyFood: number;
  dailyTransport: number;
  dailyActivities: number;
  activities: DestinationActivity[];
  latitude: number;
  longitude: number;
};

export type CostBreakdown = {
  flight: number;
  hotel: number;
  food: number;
  activities: number;
  transport: number;
  total: number;
  /** Every figure here comes from our estimation model, not a live provider quote. */
  kind: "ESTIMATE";
};

export type TripInput = {
  origin: string; // IATA
  nights: number;
  travellers: number;
  style: TravelStyleKey;
  month: number; // 1-12
};

/** Itinerary structures, shared by static itineraries, the generator and the AI editor. */
export type ItineraryItem = {
  title: string;
  category: "activity" | "attraction" | "restaurant" | "transport";
  durationMin?: number;
  costUsd: number;
  priceKind: PriceKindKey;
  notes?: string;
};

export type ItineraryDay = {
  day: number;
  title: string;
  summary?: string;
  items: ItineraryItem[];
};
