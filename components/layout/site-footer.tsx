import Link from "next/link";
import { Compass } from "lucide-react";
import { PRICE_DISCLAIMER } from "@/lib/travel/price-kind";

const COLUMNS = [
  {
    title: "Plan",
    links: [
      ["Explore by budget", "/discover"],
      ["Trip planner", "/trip-planner"],
      ["Weekend getaways", "/weekend-getaways/sydney"],
      ["Travel budgets", "/travel-budget/1500"],
    ],
  },
  {
    title: "Book",
    links: [
      ["Flights", "/flights"],
      ["Hotels", "/hotels"],
      ["Activities", "/activities"],
      ["Car rental", "/cars"],
      ["Deals", "/deals"],
    ],
  },
  {
    title: "Inspire",
    links: [
      ["Destinations", "/destinations"],
      ["Guides", "/guides"],
      ["Itineraries", "/itineraries"],
      ["Newsletter", "/newsletter"],
    ],
  },
] as const;

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t bg-muted/40">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-4 lg:px-8">
        <div className="space-y-3">
          <Link href="/" className="flex items-center gap-2 text-lg font-bold">
            <Compass className="size-5 text-primary" aria-hidden /> Tripora
          </Link>
          <p className="text-sm text-muted-foreground">
            Discover where your budget can take you, estimate the cost and build the itinerary.
          </p>
        </div>
        {COLUMNS.map((col) => (
          <nav key={col.title} aria-label={col.title}>
            <h2 className="mb-3 text-sm font-semibold">{col.title}</h2>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {col.links.map(([label, href]) => (
                <li key={href}>
                  <Link href={href} className="hover:text-foreground hover:underline">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <div className="border-t">
        <div className="mx-auto max-w-7xl space-y-2 px-4 py-6 text-xs text-muted-foreground sm:px-6 lg:px-8">
          <p>
            <strong className="font-medium text-foreground">Estimated prices.</strong> {PRICE_DISCLAIMER}
          </p>
          <p>
            Tripora earns a commission when you book through some links, at no extra cost to you. ©{" "}
            {new Date().getFullYear()} Tripora.
          </p>
        </div>
      </div>
    </footer>
  );
}
