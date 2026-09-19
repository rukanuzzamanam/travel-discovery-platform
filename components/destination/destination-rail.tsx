import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { DestinationCard, type DestinationCardData } from "./destination-card";

export type RailItem = { destination: DestinationCardData; fromUsd?: number; fromLabel?: string };

export function DestinationRail({
  id,
  title,
  subtitle,
  items,
  href,
  hrefLabel = "See all",
}: {
  id: string;
  title: string;
  subtitle?: string;
  items: RailItem[];
  href?: string;
  hrefLabel?: string;
}) {
  if (items.length === 0) return null;
  return (
    <section aria-labelledby={id}>
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 id={id} className="text-2xl font-bold sm:text-3xl">
            {title}
          </h2>
          {subtitle && <p className="mt-1 text-muted-foreground">{subtitle}</p>}
        </div>
        {href && (
          <Link href={href} className="hidden shrink-0 items-center gap-1 text-sm font-medium text-primary hover:underline sm:flex">
            {hrefLabel} <ArrowRight className="size-4" aria-hidden />
          </Link>
        )}
      </div>
      <ul className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((i) => (
          <li key={i.destination.slug}>
            <DestinationCard destination={i.destination} fromUsd={i.fromUsd} fromLabel={i.fromLabel} />
          </li>
        ))}
      </ul>
    </section>
  );
}
