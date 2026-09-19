import Link from "next/link";
import { Money } from "@/components/currency/currency-provider";
import { CalendarCheck, Clock, Sparkles } from "lucide-react";
import { DestImage } from "./dest-image";
import { CostBreakdownList } from "./cost-breakdown";
import { buttonVariants } from "@/components/ui/button";
import type { DiscoverItem, ResolvedSearch } from "@/lib/travel/discover";
import { cn } from "@/lib/utils";

const SEASON_LABEL = { best: "Great time to go", shoulder: "Shoulder season", avoid: "Challenging weather" } as const;

export function plannerHref(slug: string, s: ResolvedSearch) {
  const q = new URLSearchParams({
    destination: slug,
    origin: s.origin,
    startDate: s.startDate,
    endDate: s.endDate,
    travellers: String(s.travellers),
    budget: String(s.budget),
    currency: "USD", // s.budget is the stored USD amount
    style: s.style,
  });
  if (s.interests.length) q.set("interests", s.interests.join(","));
  return `/trip-planner?${q.toString()}`;
}

export function DiscoverResultCard({ item, search, rank }: { item: DiscoverItem; search: ResolvedSearch; rank: number }) {
  const top = [...item.factors].filter((f) => f.id !== "cost").sort((a, b) => b.score * b.weight - a.score * a.weight).slice(0, 2);
  const budgetLeft = search.budget - item.cost.total;
  return (
    <article className="grid overflow-hidden rounded-2xl border bg-card shadow-sm md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
      <div className="relative min-h-52 md:min-h-full">
        <DestImage src={item.heroImage} alt={item.heroImageAlt} sizes="(min-width: 768px) 40vw, 100vw" priority={rank <= 2} />
        <span className="absolute left-3 top-3 rounded-full bg-background/90 px-2.5 py-1 text-xs font-semibold">#{rank}</span>
      </div>
      <div className="flex flex-col gap-4 p-5">
        <div>
          <h2 className="text-2xl font-bold">{item.name}</h2>
          <p className="text-sm text-muted-foreground">{item.country}</p>
          <p className="mt-2 text-sm">{item.tagline}</p>
        </div>
        <ul className="flex flex-wrap gap-2 text-xs">
          <li className="flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1">
            <CalendarCheck className="size-3.5" aria-hidden /> {SEASON_LABEL[item.seasonNote]}
          </li>
          <li className="flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1">
            <Clock className="size-3.5" aria-hidden /> ~{item.flightHours}h flight
          </li>
          {top.map((f) => (
            <li key={f.id} className="flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1">
              <Sparkles className="size-3.5" aria-hidden /> {f.reason}
            </li>
          ))}
        </ul>
        <CostBreakdownList cost={item.cost} compact />
        <p className={cn("text-sm", budgetLeft >= 0 ? "text-emerald-700" : "text-amber-700")}>
          {budgetLeft >= 0 ? <><Money usd={budgetLeft} /> under your budget</> : <><Money usd={-budgetLeft} /> over your budget</>}
        </p>
        <div className="mt-auto flex flex-wrap gap-3">
          <Link href={`/destinations/${item.slug}`} className={cn(buttonVariants({ size: "xl" }))}>
            Explore {item.name}
          </Link>
          <Link href={plannerHref(item.slug, search)} className={cn(buttonVariants({ size: "xl", variant: "outline" }))}>
            Plan this trip
          </Link>
        </div>
      </div>
    </article>
  );
}
