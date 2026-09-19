import { Info } from "lucide-react";
import { cn } from "@/lib/utils";

/** Marks a figure as an estimate. Use next to every price we derive ourselves. */
export function EstimateBadge({ className, label = "Estimate" }: { className?: string; label?: string }) {
  return (
    <span
      title="Estimated from typical prices. Not a live quote."
      className={cn(
        "inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-[11px] font-medium text-secondary-foreground",
        className,
      )}
    >
      <Info className="size-3" aria-hidden />
      {label}
    </span>
  );
}
