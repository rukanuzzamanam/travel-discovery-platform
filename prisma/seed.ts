import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../lib/db/generated/client";
import { countries, cities, airports } from "../content/geo/geo";
import { destinations } from "../content/destinations/destinations";
import { guides } from "../content/guides/guides";
import { itineraries } from "../content/itineraries/itineraries";
import { estimateFlightUsd, haversineKm } from "../lib/travel/estimator";

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

const heroFor = (slug: string) => `/images/destinations/${slug}.svg`;

async function main() {
  // Countries
  const countryIds = new Map<string, string>();
  for (const c of countries) {
    const row = await db.country.upsert({
      where: { code: c.code },
      update: { name: c.name, currency: c.currency, region: c.region },
      create: { ...c, slug: c.name.toLowerCase().replace(/[^a-z0-9]+/g, "-") },
    });
    countryIds.set(c.code, row.id);
  }

  // Cities
  const cityIds = new Map<string, string>();
  for (const c of cities) {
    const data = { name: c.name, countryId: countryIds.get(c.country)!, latitude: c.lat, longitude: c.lng };
    const row = await db.city.upsert({ where: { slug: c.slug }, update: data, create: { slug: c.slug, ...data } });
    cityIds.set(c.slug, row.id);
  }

  // Airports
  for (const a of airports) {
    const data = { name: a.name, cityId: cityIds.get(a.city)!, latitude: a.lat, longitude: a.lng };
    await db.airport.upsert({ where: { iataCode: a.iata }, update: data, create: { iataCode: a.iata, ...data } });
  }

  // Destinations
  const destIds = new Map<string, string>();
  for (const d of destinations) {
    const data = {
      name: d.name,
      countryId: countryIds.get(d.countryCode)!,
      cityId: cityIds.get(d.citySlug)!,
      airportCode: d.airportCode,
      tagline: d.tagline,
      overview: d.overview,
      heroImage: heroFor(d.slug),
      heroImageAlt: `Illustration of ${d.name}`,
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
      transportTips: d.transportTips,
      foodHighlights: d.foodHighlights,
      travelTips: d.travelTips,
      faq: d.faq,
      relatedSlugs: d.related,
      seoTitle: `${d.name} Travel Guide: Costs, Best Time to Visit & Things to Do`,
      seoDescription: `${d.tagline} Estimated trip costs, best time to visit, activities and itineraries for ${d.name}.`,
    };
    const row = await db.destination.upsert({ where: { slug: d.slug }, update: data, create: { slug: d.slug, ...data } });
    destIds.set(d.slug, row.id);
  }

  // Estimated flight baselines per origin (ESTIMATE kind — never presented as live prices)
  const byIata = new Map<string, (typeof airports)[number]>(airports.map((a) => [a.iata, a]));
  const priceRows = [];
  for (const d of destinations) {
    const dest = byIata.get(d.airportCode)!;
    for (const o of airports) {
      if (o.iata === d.airportCode) continue;
      const km = haversineKm({ latitude: o.lat, longitude: o.lng }, { latitude: dest.lat, longitude: dest.lng });
      priceRows.push({
        destinationId: destIds.get(d.slug)!,
        origin: o.iata,
        kind: "ESTIMATE" as const,
        flightUsd: estimateFlightUsd(km),
      });
    }
  }
  await db.destinationPrice.deleteMany({ where: { kind: "ESTIMATE" } });
  await db.destinationPrice.createMany({ data: priceRows });

  // Guides
  for (const g of guides) {
    const data = {
      title: g.title,
      description: g.description,
      heroImage: heroFor(g.destinationSlug ?? "bali"),
      heroImageAlt: g.destinationSlug ? `Illustration of ${g.destinationSlug}` : "Travel planning illustration",
      content: g.content,
      faq: g.faq,
      seoTitle: g.seoTitle,
      seoDescription: g.seoDescription,
      destinationId: g.destinationSlug ? destIds.get(g.destinationSlug) : null,
    };
    await db.travelGuide.upsert({ where: { slug: g.slug }, update: data, create: { slug: g.slug, ...data } });
  }

  // Itineraries
  for (const i of itineraries) {
    const data = {
      title: i.title,
      description: i.description,
      heroImage: heroFor(i.destinationSlug),
      heroImageAlt: `Illustration of ${i.destinationSlug}`,
      destinationId: destIds.get(i.destinationSlug)!,
      durationDays: i.days.length,
      style: i.style,
      days: i.days,
      faq: i.faq,
      seoTitle: i.seoTitle,
      seoDescription: i.seoDescription,
    };
    await db.itinerary.upsert({ where: { slug: i.slug }, update: data, create: { slug: i.slug, ...data } });
  }

  // Deals: "from" prices come from our estimator and are flagged ESTIMATE.
  const dealDefs = [
    { slug: "sydney-to-bali", origin: "SYD", dest: "bali", type: "FLIGHT" as const, title: "Sydney to Bali flights" },
    { slug: "melbourne-to-tokyo", origin: "MEL", dest: "tokyo", type: "FLIGHT" as const, title: "Melbourne to Tokyo flights" },
    { slug: "brisbane-to-fiji", origin: "BNE", dest: "fiji", type: "FLIGHT" as const, title: "Brisbane to Fiji flights" },
    { slug: "sydney-to-queenstown", origin: "SYD", dest: "queenstown", type: "FLIGHT" as const, title: "Sydney to Queenstown flights" },
    { slug: "perth-to-singapore", origin: "PER", dest: "singapore", type: "FLIGHT" as const, title: "Perth to Singapore flights" },
    { slug: "sydney-to-phuket", origin: "SYD", dest: "phuket", type: "FLIGHT" as const, title: "Sydney to Phuket flights" },
  ];
  for (const d of dealDefs) {
    const price = priceRows.find((p) => p.destinationId === destIds.get(d.dest) && p.origin === d.origin);
    const data = {
      title: d.title,
      description: `Typical return fares from ${d.origin} are around US$${price?.flightUsd ?? "—"} (estimate). Check live fares before booking.`,
      heroImage: heroFor(d.dest),
      heroImageAlt: `Illustration of ${d.dest}`,
      destinationId: destIds.get(d.dest)!,
      productType: d.type,
      origin: d.origin,
      fromPriceUsd: price?.flightUsd,
      priceKind: "ESTIMATE" as const,
      seoTitle: `${d.title}: Typical Fares & How to Find Deals`,
      seoDescription: `Typical return fares from ${d.origin} and tips for finding cheaper flights.`,
    };
    await db.deal.upsert({ where: { slug: d.slug }, update: data, create: { slug: d.slug, ...data } });
  }

  // Affiliate program registry
  await db.affiliateProgram.upsert({
    where: { provider: "travelpayouts" },
    update: {},
    create: { provider: "travelpayouts", name: "Travelpayouts", productTypes: ["FLIGHT", "HOTEL", "ACTIVITY", "CAR"] },
  });

  console.log(
    `Seeded: ${countries.length} countries, ${cities.length} cities, ${airports.length} airports, ${destinations.length} destinations, ${guides.length} guides, ${itineraries.length} itineraries, ${dealDefs.length} deals.`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
