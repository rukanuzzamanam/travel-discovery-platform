"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { buttonVariants } from "@/components/ui/button";
import { CostBreakdownList } from "@/components/travel/cost-breakdown";
import { estimateTripCost } from "@/lib/travel/estimator";
import type { DestinationModel, TravelStyleKey } from "@/lib/travel/types";
import { MONTH_NAMES } from "@/lib/utils/format";
import { cn } from "@/lib/utils";

type Airport = { iata: string; city: string; latitude: number; longitude: number };

/** Live, client-side estimate using the same pure model the server uses. Nothing here is a provider price. */
export function CostEstimator({
  destination,
  airports,
  defaultOrigin = "SYD",
}: {
  destination: Omit<DestinationModel, "activities">;
  airports: Airport[];
  defaultOrigin?: string;
}) {
  const [origin, setOrigin] = useState(defaultOrigin);
  const [nights, setNights] = useState(Math.round((destination.recommendedDaysMin + destination.recommendedDaysMax) / 2));
  const [travellers, setTravellers] = useState(2);
  const [style, setStyle] = useState<TravelStyleKey>("MID_RANGE");
  const [month, setMonth] = useState(destination.bestMonths[0] ?? 6);

  const cost = useMemo(() => {
    const o = airports.find((a) => a.iata === origin) ?? airports[0];
    return estimateTripCost({ ...destination, activities: [] }, o, { origin: o.iata, nights, travellers, style, month });
  }, [airports, destination, origin, nights, travellers, style, month]);

  const planHref = `/trip-planner?${new URLSearchParams({ destination: destination.slug, origin, travellers: String(travellers), style }).toString()}`;

  return (
    <div className="grid gap-6 rounded-2xl border bg-card p-5 sm:p-6 lg:grid-cols-[3fr_2fr]">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="ce-origin">Flying from</Label>
          <NativeSelect id="ce-origin" value={origin} onChange={(e) => setOrigin(e.target.value)}>
            {airports.filter((a) => a.iata !== destination.airportCode).map((a) => (
              <option key={a.iata} value={a.iata}>
                {a.city} ({a.iata})
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ce-month">Travel month</Label>
          <NativeSelect id="ce-month" value={month} onChange={(e) => setMonth(Number(e.target.value))}>
            {MONTH_NAMES.map((m, i) => (
              <option key={m} value={i + 1}>
                {m}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ce-nights">Nights</Label>
          <Input
            id="ce-nights"
            type="number"
            min={1}
            max={30}
            value={nights}
            onChange={(e) => setNights(Math.min(30, Math.max(1, Number(e.target.value) || 1)))}
            className="h-11 text-base md:text-sm"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ce-travellers">Travellers</Label>
          <Input
            id="ce-travellers"
            type="number"
            min={1}
            max={9}
            value={travellers}
            onChange={(e) => setTravellers(Math.min(9, Math.max(1, Number(e.target.value) || 1)))}
            className="h-11 text-base md:text-sm"
          />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="ce-style">Travel style</Label>
          <NativeSelect id="ce-style" value={style} onChange={(e) => setStyle(e.target.value as TravelStyleKey)}>
            <option value="BUDGET">Budget</option>
            <option value="MID_RANGE">Mid-range</option>
            <option value="LUXURY">Luxury</option>
          </NativeSelect>
        </div>
      </div>
      <div className="flex flex-col justify-between gap-4 rounded-xl bg-muted/60 p-4" aria-live="polite">
        <CostBreakdownList cost={cost} />
        <Link href={planHref} className={cn(buttonVariants({ size: "xl" }), "w-full")}>
          Build my itinerary
        </Link>
      </div>
    </div>
  );
}
