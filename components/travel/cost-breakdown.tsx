import { Bus, Hotel, Plane, Ticket, Utensils } from "lucide-react";
import { Money } from "@/components/currency/currency-provider";
import type { CostBreakdown } from "@/lib/travel/types";
import { COMPONENT_LABEL, COST_COMPONENTS, type CostComponent } from "@/lib/travel/price-kind";
import { PriceKindBadge } from "./price-kind-badge";

const ICONS: Record<CostComponent, typeof Plane> = { flight: Plane, hotel: Hotel, food: Utensils, activities: Ticket, transport: Bus };

/**
 * Trip cost breakdown. The total is always presented as an estimated trip cost.
 * Each component says whether it is Estimated, a Provider price or User entered.
 * In the compact card layout, a single "Estimated" badge covers the card when every component is estimated.
 */
export function CostBreakdownList({ cost, compact = false }: { cost: CostBreakdown; compact?: boolean }) {
  const uniform = COST_COMPONENTS.every((c) => cost.kinds[c] === "ESTIMATE") && !cost.includesUserPrices;
  const perRow = !compact || !uniform;
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <div>
          <p className="text-xs text-muted-foreground">Estimated trip cost</p>
          <p className={compact ? "text-2xl font-bold" : "text-3xl font-bold"}><Money usd={cost.total} /></p>
        </div>
        <PriceKindBadge kind="ESTIMATE" />
      </div>
      <dl className={compact ? "mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm" : "mt-4 space-y-2 text-sm"}>
        {COST_COMPONENTS.map((key) => {
          const Icon = ICONS[key];
          return (
            <div key={key} className="flex items-center justify-between gap-2">
              <dt className="flex items-center gap-1.5 text-muted-foreground">
                <Icon className="size-3.5" aria-hidden /> {COMPONENT_LABEL[key]}
              </dt>
              <dd className="flex items-center gap-2 font-medium tabular-nums">
                <Money usd={cost[key]} />
                {perRow && <PriceKindBadge kind={cost.kinds[key]} includesUser={key === "activities" && !!cost.includesUserPrices} />}
              </dd>
            </div>
          );
        })}
      </dl>
      {compact && uniform && <p className="mt-2 text-xs text-muted-foreground">Every line above is estimated.</p>}
    </div>
  );
}
