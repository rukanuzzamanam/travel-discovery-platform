import type { PriceKindKey } from "./types";

/**
 * Single source of truth for how a price's origin is described to visitors.
 * Kinds come from the existing price-kind model (ESTIMATE / PROVIDER / USER), also stored in the database.
 */

export const COST_COMPONENTS = ["flight", "hotel", "food", "activities", "transport"] as const;
export type CostComponent = (typeof COST_COMPONENTS)[number];

export const COMPONENT_LABEL: Record<CostComponent, string> = {
  flight: "Flights",
  hotel: "Hotels",
  food: "Food",
  activities: "Activities",
  transport: "Transport",
};

const SHORT: Record<PriceKindKey, string> = {
  ESTIMATE: "Estimated",
  PROVIDER: "Provider price",
  USER: "User entered",
};

/** "card" wording is used where a whole card's price is summarised (discovery / destination cards). */
const CARD: Record<PriceKindKey, string> = {
  ESTIMATE: "Estimated",
  PROVIDER: "Based on recent provider data",
  USER: "User entered",
};

export const PRICE_KIND_HINT: Record<PriceKindKey, string> = {
  ESTIMATE: "Estimated from typical prices. It is not a quote and may differ from what a provider charges.",
  PROVIDER: "Returned by a travel provider. It may have changed since it was retrieved. Confirm with the provider.",
  USER: "A price you entered yourself. We have not verified it.",
};

export function priceKindLabel(kind: PriceKindKey, variant: "short" | "card" = "short"): string {
  return (variant === "card" ? CARD : SHORT)[kind];
}

/** The one standard disclaimer. Use it once per page or section, not next to every figure. */
export const PRICE_DISCLAIMER = "Prices are estimates and may change. Check the provider for current availability and final pricing.";

/** Label for a cost component. Activities can mix estimated catalogue prices with prices the user typed in. */
export function componentLabel(kind: PriceKindKey, includesUser = false): string {
  return includesUser && kind === "ESTIMATE" ? "Estimated + user entered" : priceKindLabel(kind);
}
