"use client";

import { useId } from "react";
import { NativeSelect } from "@/components/ui/native-select";
import { CURRENCY_INFO, SUPPORTED_CURRENCIES, parseCurrency } from "@/lib/currency";
import { useCurrency } from "./currency-provider";
import { cn } from "@/lib/utils";

/** Lets the visitor choose the display currency. `compact` shows just the code (header). */
export function CurrencySelector({ compact = false, className }: { compact?: boolean; className?: string }) {
  const id = useId();
  const { currency, setCurrency, table } = useCurrency();
  return (
    <div className={className}>
      <label htmlFor={id} className={compact ? "sr-only" : "mb-1 block text-sm font-medium"}>
        Currency
      </label>
      <NativeSelect
        id={id}
        value={currency}
        onChange={(e) => setCurrency(parseCurrency(e.target.value))}
        title={table.live ? undefined : "Exchange rates are fixed approximations, not live rates."}
        className={cn(compact && "h-9 w-[5.25rem] pl-2.5 pr-7 text-sm")}
      >
        {SUPPORTED_CURRENCIES.map((c) => (
          <option key={c} value={c}>
            {compact ? c : `${c} · ${CURRENCY_INFO[c].name}`}
          </option>
        ))}
      </NativeSelect>
    </div>
  );
}
