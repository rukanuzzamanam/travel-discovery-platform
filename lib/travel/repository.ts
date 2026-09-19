import "server-only";
import { db } from "@/lib/db/client";
import { cached, TTL } from "@/lib/cache/cache";
import type { DestinationActivity, DestinationModel, Faq } from "./types";
import type { InterestKey } from "./interests";

export type AirportRef = { iata: string; name: string; city: string; latitude: number; longitude: number };

export type DestinationDetail = DestinationModel & {
  countryCode: string;
  transportTips: string;
  foodHighlights: string;
  travelTips: string[];
  faq: Faq[];
  relatedSlugs: string[];
  seoTitle: string | null;
  seoDescription: string | null;
  updatedAt: Date;
};

export function getAirports(): Promise<AirportRef[]> {
  return cached("airports:all", TTL.static, async () => {
    const rows = await db.airport.findMany({ include: { city: true }, orderBy: { iataCode: "asc" } });
    return rows.map((a) => ({
      iata: a.iataCode,
      name: a.name,
      city: a.city.name,
      latitude: a.latitude,
      longitude: a.longitude,
    }));
  });
}

export async function getAirport(iata: string): Promise<AirportRef | undefined> {
  const code = iata.toUpperCase();
  return (await getAirports()).find((a) => a.iata === code);
}

export function getDestinations(): Promise<DestinationDetail[]> {
  return cached("destinations:all", TTL.static, async () => {
    const [rows, airports] = await Promise.all([
      db.destination.findMany({ where: { status: "PUBLISHED" }, include: { country: true }, orderBy: { name: "asc" } }),
      getAirports(),
    ]);
    const byIata = new Map(airports.map((a) => [a.iata, a]));
    return rows.map((d): DestinationDetail => {
      const ap = byIata.get(d.airportCode);
      return {
        id: d.id,
        slug: d.slug,
        name: d.name,
        country: d.country.name,
        countryCode: d.country.code,
        airportCode: d.airportCode,
        tagline: d.tagline,
        overview: d.overview,
        heroImage: d.heroImage,
        heroImageAlt: d.heroImageAlt,
        bestMonths: d.bestMonths,
        avoidMonths: d.avoidMonths,
        interestScores: d.interestScores as Record<InterestKey, number>,
        familyScore: d.familyScore,
        recommendedDaysMin: d.recommendedDaysMin,
        recommendedDaysMax: d.recommendedDaysMax,
        hotelNightBudget: d.hotelNightBudget,
        hotelNightMid: d.hotelNightMid,
        hotelNightLuxury: d.hotelNightLuxury,
        dailyFood: d.dailyFood,
        dailyTransport: d.dailyTransport,
        dailyActivities: d.dailyActivities,
        activities: d.activities as DestinationActivity[],
        latitude: ap?.latitude ?? 0,
        longitude: ap?.longitude ?? 0,
        transportTips: d.transportTips,
        foodHighlights: d.foodHighlights,
        travelTips: d.travelTips as string[],
        faq: d.faq as Faq[],
        relatedSlugs: d.relatedSlugs,
        seoTitle: d.seoTitle,
        seoDescription: d.seoDescription,
        updatedAt: d.updatedAt,
      };
    });
  });
}

export async function getDestinationBySlug(slug: string) {
  return (await getDestinations()).find((d) => d.slug === slug);
}

export function getPublishedGuides() {
  return cached("guides:all", TTL.content, () =>
    db.travelGuide.findMany({ where: { status: "PUBLISHED" }, include: { destination: { select: { slug: true, name: true } } }, orderBy: { updatedAt: "desc" } }),
  );
}

export function getPublishedItineraries() {
  return cached("itineraries:all", TTL.content, () =>
    db.itinerary.findMany({ where: { status: "PUBLISHED" }, include: { destination: { select: { slug: true, name: true } } }, orderBy: { durationDays: "asc" } }),
  );
}

export function getActiveDeals() {
  return cached("deals:active", TTL.content, () =>
    db.deal.findMany({
      where: { status: "PUBLISHED", OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] },
      include: { destination: { select: { slug: true, name: true, airportCode: true } } },
      orderBy: { fromPriceUsd: "asc" },
    }),
  );
}
