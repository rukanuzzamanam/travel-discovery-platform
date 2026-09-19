"use client";

import { useId } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { INTERESTS, INTEREST_LABELS, type InterestKey } from "@/lib/travel/interests";
import { trackEvent } from "@/components/analytics/tracker";
import { useAmountConverters } from "@/components/currency/currency-provider";
import { parseCurrency } from "@/lib/currency";

export type PlannerDefaults = {
  origin: string;
  destination: string;
  startDate: string;
  endDate: string;
  travellers: string;
  budget: string;
  /** Currency the `budget` value is expressed in (from the URL). */
  currency?: string;
  style: string;
  interests: InterestKey[];
};

export function PlannerForm({
  airports,
  destinations,
  defaults,
}: {
  airports: { iata: string; city: string }[];
  destinations: { slug: string; name: string }[];
  defaults: PlannerDefaults;
}) {
  const uid = useId();
  const { currency, convert } = useAmountConverters();
  const defaultBudget = defaults.budget ? String(Math.round(convert(Number(defaults.budget), parseCurrency(defaults.currency), currency))) : "";
  const id = (n: string) => `${uid}-${n}`;
  return (
    <form action="/trip-planner" method="get" onSubmit={() => trackEvent("trip_planner_started")} className="rounded-2xl border bg-card p-4 shadow-sm sm:p-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="space-y-1.5">
          <Label htmlFor={id("origin")}>Origin</Label>
          <NativeSelect id={id("origin")} name="origin" defaultValue={defaults.origin}>
            {airports.map((a) => (
              <option key={a.iata} value={a.iata}>
                {a.city} ({a.iata})
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={id("destination")}>Destination</Label>
          <NativeSelect id={id("destination")} name="destination" defaultValue={defaults.destination} required>
            <option value="" disabled>
              Choose a destination
            </option>
            {destinations.map((d) => (
              <option key={d.slug} value={d.slug}>
                {d.name}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={id("travellers")}>Travellers</Label>
          <Input id={id("travellers")} name="travellers" type="number" min={1} max={9} defaultValue={defaults.travellers} required className="h-11 text-base md:text-sm" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={id("start")}>Start date</Label>
          <Input id={id("start")} name="startDate" type="date" defaultValue={defaults.startDate} required className="h-11 text-base md:text-sm" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={id("end")}>End date</Label>
          <Input id={id("end")} name="endDate" type="date" defaultValue={defaults.endDate} required className="h-11 text-base md:text-sm" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={id("budget")}>Budget ({currency}, optional)</Label>
          <Input id={id("budget")} name="budget" type="number" inputMode="numeric" min={0} step={50} key={currency} defaultValue={defaultBudget} className="h-11 text-base md:text-sm" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={id("style")}>Travel style</Label>
          <NativeSelect id={id("style")} name="style" defaultValue={defaults.style}>
            <option value="BUDGET">Budget</option>
            <option value="MID_RANGE">Mid-range</option>
            <option value="LUXURY">Luxury</option>
          </NativeSelect>
        </div>
      </div>
      <input type="hidden" name="currency" value={currency} />

      <fieldset className="mt-5">
        <legend className="mb-2 text-sm font-medium">Interests</legend>
        <div className="flex flex-wrap gap-2">
          {INTERESTS.map((i) => (
            <label key={i} className="cursor-pointer">
              <input type="checkbox" name="interests" value={i} defaultChecked={defaults.interests.includes(i)} className="peer sr-only" />
              <span className="inline-flex min-h-10 items-center rounded-full border bg-background px-4 text-sm font-medium transition-colors hover:bg-muted peer-checked:border-primary peer-checked:bg-primary peer-checked:text-primary-foreground peer-focus-visible:ring-3 peer-focus-visible:ring-ring/50">
                {INTEREST_LABELS[i]}
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <Button type="submit" size="xl" className="mt-6">
        Estimate my trip
      </Button>
    </form>
  );
}
