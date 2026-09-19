import { Bus, Hotel, Plane, Ticket, Utensils } from "lucide-react";
import type { CostBreakdown } from "@/lib/travel/types";
import { formatUsd } from "@/lib/utils/format";
import { EstimateBadge } from "./estimate-badge";

const LINES = [
  { key: "flight", label: "Flights", icon: Plane },
  { key: "hotel", label: "Hotel", icon: Hotel },
  { key: "food", label: "Food", icon: Utensils },
  { key: "activities", label: "Activities", icon: Ticket },
  { key: "transport", label: "Transport", icon: Bus },
] as const;

export function CostBreakdownList({ cost, compact = false }: { cost: CostBreakdown; compact?: boolean }) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <div>
          <p className="text-xs text-muted-foreground">Estimated trip</p>
          <p className={compact ? "text-2xl font-bold" : "text-3xl font-bold"}>{formatUsd(cost.total)}</p>
        </div>
        <EstimateBadge />
      </div>
      <dl className={compact ? "mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm" : "mt-4 space-y-2 text-sm"}>
        {LINES.map(({ key, label, icon: Icon }) => (
          <div key={key} className="flex items-center justify-between gap-2">
            <dt className="flex items-center gap-1.5 text-muted-foreground">
              <Icon className="size-3.5" aria-hidden /> {label}
            </dt>
            <dd className="font-medium tabular-nums">{formatUsd(cost[key])}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
