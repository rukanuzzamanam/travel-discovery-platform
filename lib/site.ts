export const SITE = {
  name: "Tripora",
  tagline: "Where can your budget take you?",
  description:
    "Discover destinations, estimate your trip cost and build your perfect itinerary. Tripora turns your budget, dates and interests into trip ideas.",
  url: (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, ""),
} as const;

export const NAV = [
  { href: "/discover", label: "Explore" },
  { href: "/trip-planner", label: "Plan a Trip" },
  { href: "/flights", label: "Flights" },
  { href: "/hotels", label: "Hotels" },
  { href: "/deals", label: "Deals" },
  { href: "/destinations", label: "Destinations" },
  { href: "/guides", label: "Guides" },
] as const;

export const DEFAULT_ORIGIN = "SYD";

export const absoluteUrl = (path = "/") => `${SITE.url}${path.startsWith("/") ? path : `/${path}`}`;
