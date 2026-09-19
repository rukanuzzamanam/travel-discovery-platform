import type { ItineraryDay, TravelStyleKey } from "@/lib/travel/types";

export type ItinerarySeed = {
  slug: string;
  title: string;
  description: string;
  destinationSlug: string;
  style: TravelStyleKey;
  seoTitle: string;
  seoDescription: string;
  days: ItineraryDay[];
  faq: { q: string; a: string }[];
};

type I = [string, "activity" | "attraction" | "restaurant" | "transport", number, number, string?];
const day = (n: number, title: string, summary: string, items: I[]): ItineraryDay => ({
  day: n,
  title,
  summary,
  items: items.map(([t, category, costUsd, durationMin, notes]) => ({
    title: t,
    category,
    costUsd,
    durationMin,
    priceKind: "ESTIMATE" as const,
    ...(notes ? { notes } : {}),
  })),
});

/** Item costs are per-person ESTIMATES excluding flights and accommodation. */
export const itineraries: ItinerarySeed[] = [
  {
    slug: "7-days-bali",
    title: "7 Days in Bali: Ubud, Nusa Penida and the Bukit Coast",
    description: "A balanced week mixing rice terraces, temples, an island day trip and beach time.",
    destinationSlug: "bali",
    style: "MID_RANGE",
    seoTitle: "7 Days in Bali Itinerary: Ubud, Nusa Penida & Uluwatu",
    seoDescription: "A practical 7-day Bali itinerary with day-by-day plans, estimated costs and tips for Ubud, Nusa Penida and the Bukit Peninsula.",
    days: [
      day(1, "Arrive and settle in Ubud", "Ease into the island with a gentle walk and warung dinner.", [
        ["Airport transfer to Ubud", "transport", 25, 90, "Pre-book a driver to avoid haggling."],
        ["Monkey Forest and Ubud Palace stroll", "attraction", 10, 150],
        ["Dinner at a local warung", "restaurant", 12, 90],
      ]),
      day(2, "Rice terraces and temples", "Early start to beat the crowds.", [
        ["Tegallalang rice terraces", "attraction", 8, 120, "Arrive before 9am."],
        ["Tirta Empul holy spring temple", "attraction", 6, 90, "Bring a change of clothes if you plan to bathe."],
        ["Cooking class with market visit", "restaurant", 35, 240],
      ]),
      day(3, "Mount Batur sunrise", "A pre-dawn trek followed by a hot-spring soak.", [
        ["Mount Batur sunrise trek", "activity", 45, 360, "Pick-up around 2–3am."],
        ["Afternoon spa and massage", "activity", 25, 120],
      ]),
      day(4, "Move to the coast", "Transfer to Uluwatu and watch the sunset from the cliffs.", [
        ["Transfer Ubud → Uluwatu", "transport", 30, 120],
        ["Uluwatu temple and Kecak dance", "attraction", 12, 180],
        ["Seafood dinner at Jimbaran", "restaurant", 25, 120],
      ]),
      day(5, "Nusa Penida day trip", "Cliffs and coves on Bali's dramatic sister island.", [
        ["Fast-boat + guided island tour", "activity", 60, 600, "Sea conditions can be rough — check the forecast."],
        ["Beach dinner on return", "restaurant", 15, 90],
      ]),
      day(6, "Beach day", "Slow day for surf, swimming and a beach club sunset.", [
        ["Surf lesson", "activity", 35, 150],
        ["Beach-club afternoon", "activity", 30, 240],
        ["Dinner in Seminyak", "restaurant", 25, 120],
      ]),
      day(7, "Last shopping and departure", "Pick up souvenirs before your flight.", [
        ["Souvenir shopping in Seminyak", "activity", 30, 150],
        ["Airport transfer", "transport", 15, 60],
      ]),
    ],
    faq: [
      { q: "Is 7 days enough for Bali?", a: "Seven days covers Ubud, the Bukit Peninsula and a day trip comfortably without rushing." },
      { q: "How much should I budget per day?", a: "Excluding flights and hotels, this itinerary averages roughly US$60–90 per person per day at mid-range comfort." },
    ],
  },
  {
    slug: "5-days-tokyo",
    title: "5 Days in Tokyo: Temples, Neon and Day-Trip Fuji",
    description: "Classic Tokyo highlights with a Fuji/Hakone day trip and plenty of food.",
    destinationSlug: "tokyo",
    style: "MID_RANGE",
    seoTitle: "5-Day Tokyo Itinerary: Highlights, Food & Mount Fuji Day Trip",
    seoDescription: "Plan 5 days in Tokyo with this itinerary covering Asakusa, Shibuya, Tsukiji, teamLab and a Hakone day trip, with estimated costs.",
    days: [
      day(1, "Asakusa and the old east", "Traditional Tokyo on day one.", [
        ["Senso-ji Temple and Nakamise street", "attraction", 0, 150],
        ["Sumida River cruise", "activity", 10, 60],
        ["Tempura or soba dinner", "restaurant", 25, 90],
      ]),
      day(2, "Harajuku, Meiji and Shibuya", "Youth culture and city views.", [
        ["Meiji Shrine", "attraction", 0, 90],
        ["Takeshita Street and Omotesando", "activity", 20, 150],
        ["Shibuya Sky at sunset", "attraction", 20, 90],
        ["Izakaya dinner", "restaurant", 30, 120],
      ]),
      day(3, "Day trip: Hakone and Mount Fuji views", "Nature reset outside the city.", [
        ["Hakone Free Pass loop (train, cable car, ropeway)", "activity", 60, 540, "Weather can hide Fuji — check the forecast."],
        ["Onsen soak", "activity", 20, 90],
      ]),
      day(4, "Markets, art and Akihabara", "Food-first day.", [
        ["Tsukiji Outer Market breakfast tour", "restaurant", 40, 150],
        ["teamLab digital art museum", "attraction", 30, 150, "Book timed tickets."],
        ["Akihabara arcades", "activity", 20, 150],
      ]),
      day(5, "Shinjuku and departure", "Last-minute shopping and a final ramen.", [
        ["Shinjuku Gyoen garden", "attraction", 3, 90],
        ["Ramen lunch", "restaurant", 12, 60],
        ["Airport train", "transport", 12, 60],
      ]),
    ],
    faq: [
      { q: "Do I need a rail pass for Tokyo?", a: "Not for Tokyo itself — an IC card is enough. Only buy a Japan Rail Pass if you plan multiple long-distance trips." },
    ],
  },
  {
    slug: "4-days-bangkok",
    title: "4 Days in Bangkok: Temples, Markets and Street Food",
    description: "Compact Bangkok itinerary balancing culture, shopping and night-time food.",
    destinationSlug: "bangkok",
    style: "BUDGET",
    seoTitle: "4-Day Bangkok Itinerary: Temples, Markets & Street Food",
    seoDescription: "A 4-day Bangkok itinerary covering the Grand Palace, Wat Pho, Chinatown food and Chatuchak, with estimated costs per person.",
    days: [
      day(1, "Royal Bangkok", "Historic core by river ferry.", [
        ["Grand Palace and Wat Phra Kaew", "attraction", 16, 180],
        ["Wat Pho reclining Buddha", "attraction", 10, 90],
        ["Wat Arun at sunset", "attraction", 5, 60],
        ["Riverside dinner", "restaurant", 15, 90],
      ]),
      day(2, "Markets and malls", "Weekend market and modern shopping.", [
        ["Chatuchak Weekend Market", "activity", 20, 240],
        ["Thai massage", "activity", 12, 90],
        ["Rooftop drinks", "activity", 25, 90],
      ]),
      day(3, "Floating market day trip", "Get out of town for the morning.", [
        ["Amphawa or Damnoen Saduak floating market", "activity", 40, 420],
        ["Chinatown street-food night", "restaurant", 18, 150],
      ]),
      day(4, "Cooking and departure", "Learn to cook what you've been eating.", [
        ["Thai cooking class", "restaurant", 35, 240],
        ["Airport transfer (Airport Rail Link)", "transport", 2, 45],
      ]),
    ],
    faq: [{ q: "Is 4 days enough for Bangkok?", a: "Yes for highlights. If you love food or markets, add a fifth day for slower exploring." }],
  },
  {
    slug: "3-days-singapore",
    title: "3 Days in Singapore: Gardens, Hawkers and Sentosa",
    description: "A family-friendly long weekend in the Lion City.",
    destinationSlug: "singapore",
    style: "MID_RANGE",
    seoTitle: "3-Day Singapore Itinerary for Families & First-Timers",
    seoDescription: "Three days in Singapore: Gardens by the Bay, hawker food, Sentosa and the Night Safari, with estimated costs.",
    days: [
      day(1, "Marina Bay and gardens", "Icons of the skyline.", [
        ["Gardens by the Bay and Cloud Forest", "attraction", 28, 180],
        ["Marina Bay light show", "attraction", 0, 30],
        ["Hawker centre dinner", "restaurant", 12, 90],
      ]),
      day(2, "Sentosa", "Beach and theme-park day.", [
        ["Sentosa beaches and attractions", "activity", 75, 480],
        ["Dinner in Chinatown", "restaurant", 18, 90],
      ]),
      day(3, "Wildlife and heritage", "Zoo by day, Little India by evening.", [
        ["Singapore Zoo or Night Safari", "attraction", 45, 240],
        ["Little India walk and dinner", "restaurant", 15, 120],
      ]),
    ],
    faq: [{ q: "What is the best way to get around Singapore?", a: "The MRT and buses with a contactless bank card or EZ-Link card cover almost everything." }],
  },
];
