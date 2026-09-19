"use client";

import { useId } from "react";
import { Shuffle, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { INTERESTS, INTEREST_LABELS, type InterestKey } from "@/lib/travel/interests";
import { trackEvent } from "@/components/analytics/tracker";
import { useAmountConverters } from "@/components/currency/currency-provider";
import { CURRENCY_INFO, parseCurrency } from "@/lib/currency";
import { cn } from "@/lib/utils";

export type FormDefaults = {
  origin?: string;
  budget?: string | number;
  /** Currency the `budget` value is expressed in (from the URL). */
  currency?: string;
  startDate?: string;
  nights?: string | number;
  travellers?: string | number;
  interests?: InterestKey[];
};

/**
 * Plain GET form: works without JavaScript, results are shareable URLs, and the browser's native
 * date/number/select controls give excellent mobile UX.
 */
export function DiscoveryForm({
  airports,
  defaults = {},
  className,
}: {
  airports: { iata: string; city: string }[];
  defaults?: FormDefaults;
  className?: string;
}) {
  const uid = useId();
  const id = (n: string) => `${uid}-${n}`;
  const selected = new Set(defaults.interests ?? []);
  const { currency, convert } = useAmountConverters();
  // A shared link may carry a budget in another currency: show it in the visitor's own currency.
  const defaultBudget = defaults.budget ? Math.round(convert(Number(defaults.budget), parseCurrency(defaults.currency), currency)) : 1500;

  return (
    <form
      action="/discover"
      method="get"
      onSubmit={() => trackEvent("search_started")}
      className={cn("rounded-2xl border bg-card p-4 shadow-xl sm:p-6", className)}
      aria-label="Trip discovery"
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
        <div className="space-y-1.5 lg:col-span-2">
          <Label htmlFor={id("origin")}>Flying from</Label>
          <NativeSelect id={id("origin")} name="origin" defaultValue={defaults.origin ?? "SYD"} required>
            {airports.map((a) => (
              <option key={a.iata} value={a.iata}>
                {a.city} ({a.iata})
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={id("budget")}>Total budget ({currency})</Label>
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" aria-hidden>
              {CURRENCY_INFO[currency].symbol}
            </span>
            <Input
              id={id("budget")}
              name="budget"
              type="number"
              inputMode="numeric"
              min={100}
              max={100000}
              step={50}
              required
              key={currency}
              defaultValue={defaultBudget}
              className="h-11 pl-11 text-base md:text-sm"
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={id("start")}>Depart (optional)</Label>
          <Input id={id("start")} name="startDate" type="date" defaultValue={defaults.startDate} className="h-11 text-base md:text-sm" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={id("nights")}>Nights</Label>
          <NativeSelect id={id("nights")} name="nights" defaultValue={String(defaults.nights ?? 7)}>
            {[2, 3, 4, 5, 6, 7, 8, 10, 12, 14, 21].map((n) => (
              <option key={n} value={n}>
                {n} nights
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={id("travellers")}>Travellers</Label>
          <NativeSelect id={id("travellers")} name="travellers" defaultValue={String(defaults.travellers ?? 2)}>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
              <option key={n} value={n}>
                {n} {n === 1 ? "traveller" : "travellers"}
              </option>
            ))}
          </NativeSelect>
        </div>
      </div>

      <input type="hidden" name="currency" value={currency} />

      <fieldset className="mt-5">
        <legend className="mb-2 text-sm font-medium">What are you into?</legend>
        <div className="flex flex-wrap gap-2">
          {INTERESTS.map((i) => (
            <label key={i} className="cursor-pointer">
              <input type="checkbox" name="interests" value={i} defaultChecked={selected.has(i)} className="peer sr-only" />
              <span className="inline-flex min-h-10 items-center rounded-full border bg-background px-4 text-sm font-medium transition-colors hover:bg-muted peer-checked:border-primary peer-checked:bg-primary peer-checked:text-primary-foreground peer-focus-visible:ring-3 peer-focus-visible:ring-ring/50">
                {INTEREST_LABELS[i]}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <Button type="submit" size="xl" className="sm:min-w-44">
          <Search aria-hidden /> Explore Trips
        </Button>
        <Button type="submit" name="surprise" value="1" size="xl" variant="outline">
          <Shuffle aria-hidden /> Surprise Me
        </Button>
      </div>
    </form>
  );
}
