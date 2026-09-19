import { Info } from "lucide-react";
import { PRICE_KIND_HINT, componentLabel, priceKindLabel } from "@/lib/travel/price-kind";
import type { PriceKindKey } from "@/lib/travel/types";
import { cn } from "@/lib/utils";

const TONE: Record<PriceKindKey, string> = {
  ESTIMATE: "bg-secondary text-secondary-foreground",
  PROVIDER: "bg-emerald-100 text-emerald-900",
  USER: "bg-amber-100 text-amber-900",
};

/**
 * Says where a price comes from: Estimated, Provider price or User entered.
 * `variant="card"` uses the summary wording for cards ("Based on recent provider data").
 */
export function PriceKindBadge({
  kind,
  variant = "short",
  includesUser = false,
  label,
  className,
}: {
  kind: PriceKindKey;
  variant?: "short" | "card";
  includesUser?: boolean;
  label?: string;
  className?: string;
}) {
  const text = label ?? (includesUser ? componentLabel(kind, true) : priceKindLabel(kind, variant));
  return (
    <span
      title={PRICE_KIND_HINT[kind]}
      className={cn("inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-medium", TONE[kind], className)}
    >
      <Info className="size-3" aria-hidden />
      {text}
    </span>
  );
}
