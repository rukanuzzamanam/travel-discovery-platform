import { PRICE_DISCLAIMER } from "@/lib/travel/price-kind";
import { cn } from "@/lib/utils";

/** The standard price disclaimer. Use once per page or section; custom `children` for context-specific wording. */
export function PriceDisclaimer({ className, children }: { className?: string; children?: React.ReactNode }) {
  return <p className={cn("text-xs text-muted-foreground", className)}>{children ?? PRICE_DISCLAIMER}</p>;
}
