import Link from "next/link";
import { Money } from "@/components/currency/currency-provider";
import { MapPin } from "lucide-react";
import { DestImage } from "@/components/travel/dest-image";
import { PriceKindBadge } from "@/components/travel/price-kind-badge";
import type { PriceKindKey } from "@/lib/travel/types";

export type DestinationCardData = {
  slug: string;
  name: string;
  country: string;
  tagline: string;
  heroImage: string;
  heroImageAlt: string;
};

export function DestinationCard({
  destination,
  fromUsd,
  fromLabel = "Flights from",
  priceKind = "ESTIMATE",
  priority,
}: {
  destination: DestinationCardData;
  fromUsd?: number;
  fromLabel?: string;
  /** Where the displayed price comes from. Estimated unless a provider supplied it. */
  priceKind?: PriceKindKey;
  priority?: boolean;
}) {
  return (
    <Link
      href={`/destinations/${destination.slug}`}
      className="group block overflow-hidden rounded-2xl border bg-card shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg focus-visible:outline-2"
    >
      <div className="relative aspect-[4/3] overflow-hidden">
        <DestImage
          src={destination.heroImage}
          alt={destination.heroImageAlt}
          priority={priority}
          className="transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-4 text-white">
          <h3 className="text-xl font-semibold drop-shadow">{destination.name}</h3>
          <p className="flex items-center gap-1 text-sm text-white/90">
            <MapPin className="size-3.5" aria-hidden /> {destination.country}
          </p>
        </div>
      </div>
      <div className="space-y-2 p-4">
        <p className="line-clamp-2 text-sm text-muted-foreground">{destination.tagline}</p>
        {fromUsd !== undefined && (
          <p className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">{fromLabel}</span>
            <span className="font-semibold"><Money usd={fromUsd} /></span>
            <PriceKindBadge kind={priceKind} variant="card" />
          </p>
        )}
      </div>
    </Link>
  );
}
