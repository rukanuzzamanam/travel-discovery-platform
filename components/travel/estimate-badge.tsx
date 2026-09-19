import { PriceKindBadge } from "./price-kind-badge";

/** Marks a figure as an estimate. Kept as a thin wrapper so existing call sites share the same wording. */
export function EstimateBadge({ className, label }: { className?: string; label?: string }) {
  return <PriceKindBadge kind="ESTIMATE" label={label} className={className} />;
}
