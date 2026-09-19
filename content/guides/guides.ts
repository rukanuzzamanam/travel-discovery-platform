export type GuideSeed = {
  slug: string;
  title: string;
  description: string;
  destinationSlug?: string;
  seoTitle: string;
  seoDescription: string;
  content: string; // Markdown
  faq: { q: string; a: string }[];
};

export const guides: GuideSeed[] = [
  {
    slug: "bali-travel-guide",
    title: "Bali Travel Guide: When to Go, Where to Stay and What It Costs",
    description: "Everything you need to plan a first trip to Bali, from choosing your base to budgeting.",
    destinationSlug: "bali",
    seoTitle: "Bali Travel Guide: Best Areas, Time to Visit & Costs",
    seoDescription: "Plan your Bali trip: best time to visit, which area to stay in, getting around and typical daily costs for budget, mid-range and luxury travellers.",
    content: `## Choosing your base

Bali is bigger than it looks and traffic is slow, so avoid changing hotels every night. Most first-timers split their stay between **Ubud** (culture, rice terraces, wellness) and a **coastal area**.

- **Ubud** — jungle, yoga, cafés and day trips to temples and terraces.
- **Canggu** — surf, brunch and a young, remote-worker crowd.
- **Seminyak** — restaurants, beach clubs and boutique shopping.
- **Uluwatu** — cliff-top villas, surf breaks and sunset views.
- **Sanur** — calm water and a slower pace; popular with families.

## Best time to visit

The dry season runs roughly April to October. July–August is peak season with higher prices. The wet season (November–March) is greener and cheaper but has heavy afternoon showers, particularly in January and February.

## Getting around

Ride-hailing apps work in many areas but some zones restrict pick-ups. Hiring a driver for the day is common and usually the easiest option for multi-stop days. If you ride a scooter, you need an appropriate licence and insurance.

## What does it cost?

On our estimates, a mid-range traveller should plan on roughly **US$95 per night** for a good room, **US$25 a day** for food, **US$15 for local transport** and **US$30 for activities**. Budget travellers can go much lower using guesthouses and warungs. These are estimates, not live prices — check current rates before booking.

## Practical tips

1. Carry a sarong for temples.
2. Use filtered water only.
3. Book Nusa Penida boat trips with reputable operators and check sea conditions.
4. Keep some cash for warungs and small entry fees.
`,
    faq: [
      { q: "What is the best area to stay in Bali for first-timers?", a: "Ubud plus a beach area (Seminyak, Canggu or Uluwatu) gives a good mix of culture and coast." },
    ],
  },
  {
    slug: "tokyo-travel-guide",
    title: "Tokyo Travel Guide: Neighbourhoods, Transport and Budget Tips",
    description: "A practical planning guide to Tokyo's neighbourhoods, trains and money-saving habits.",
    destinationSlug: "tokyo",
    seoTitle: "Tokyo Travel Guide: Where to Stay, Getting Around & Costs",
    seoDescription: "How to plan Tokyo: best neighbourhoods to stay, using trains and IC cards, when to visit and how to save money.",
    content: `## Where to stay

- **Shinjuku** — nightlife, huge transport hub, good for first-timers.
- **Asakusa** — traditional atmosphere and cheaper rooms.
- **Shibuya / Ebisu** — trendy, close to Harajuku and Daikanyama.
- **Tokyo Station / Ginza** — convenient for bullet trains and day trips.

## Getting around

Use the JR Yamanote Line and Tokyo Metro. A Suica or Pasmo IC card (or the mobile version) works on almost every train, bus and many vending machines. Trains stop around midnight, so check last services.

## Timing

Late March to early April (cherry blossom) and mid-November (autumn leaves) are popular and pricier. Summer is hot and humid; winters are dry and cold.

## Saving money

- Eat set lunches (teishoku) for a fraction of dinner prices.
- Use convenience stores for breakfast.
- Free viewpoints include the Tokyo Metropolitan Government Building.
- Book teamLab and other timed attractions in advance.

## Cash and etiquette

Carry some cash for small restaurants. Tipping is not expected. Keep quiet on trains and avoid eating while walking.
`,
    faq: [{ q: "Is Tokyo good for first-time visitors to Japan?", a: "Yes. It has the widest range of experiences and the easiest transport for newcomers." }],
  },
  {
    slug: "bangkok-travel-guide",
    title: "Bangkok Travel Guide: Temples, Street Food and How to Get Around",
    description: "A first-timer's guide to Bangkok's neighbourhoods, transport and eating.",
    destinationSlug: "bangkok",
    seoTitle: "Bangkok Travel Guide: Where to Stay, Eat & Get Around",
    seoDescription: "Plan Bangkok: best areas to stay, temple etiquette, BTS/MRT tips and how to eat well on a budget.",
    content: `## Neighbourhoods

- **Sukhumvit** — BTS access, restaurants, nightlife.
- **Silom / Sathorn** — business hotels, rooftop bars.
- **Riverside** — luxury hotels and ferry access to temples.
- **Old Town (Rattanakosin)** — palaces, temples and guesthouses.

## Getting around

The BTS Skytrain and MRT avoid road traffic. River boats are ideal for temples. Use ride-hailing apps or insist on the meter for taxis.

## Temple etiquette

Cover shoulders and knees, remove shoes where signs indicate, and never point your feet at Buddha images.

## Eating

Follow the crowds at street stalls, choose places with high turnover and try night markets such as Yaowarat in Chinatown.

## Best time

November to February is coolest and driest; April–May is very hot.
`,
    faq: [{ q: "How many days should I spend in Bangkok?", a: "Three to four days for highlights, longer if you're a food or markets fan." }],
  },
  {
    slug: "plan-a-trip-on-a-budget",
    title: "How to Plan a Trip on a Budget (and Estimate Your Real Costs)",
    description: "A step-by-step method to set a trip budget, split it across categories and avoid surprises.",
    seoTitle: "How to Plan a Trip on a Budget: Step-by-Step Cost Guide",
    seoDescription: "Learn how to build a realistic travel budget: flights, hotels, food, transport and activities, plus tips to save without spoiling your trip.",
    content: `## 1. Start with total budget, not destination

Decide what you can spend in total, then find where that goes furthest. Flights and accommodation are usually 60–70% of the cost.

## 2. Split the budget

A useful starting split for a mid-range trip:

| Category | Typical share |
| --- | --- |
| Flights | 30–40% |
| Accommodation | 25–30% |
| Food | 15–20% |
| Activities | 10–15% |
| Local transport | 5–10% |

## 3. Use estimates, then confirm

Estimated costs are a planning tool. Before booking, always check live prices with a provider.

## 4. Save smartly

- Travel in shoulder season.
- Be flexible by a day or two on dates.
- Stay slightly outside the busiest area and use public transport.
- Eat where locals eat.

## 5. Keep a buffer

Hold back 10% for unexpected costs.
`,
    faq: [{ q: "How accurate are trip cost estimates?", a: "They are good for comparing destinations, but real prices vary by season and demand. Always check live prices before booking." }],
  },
];
