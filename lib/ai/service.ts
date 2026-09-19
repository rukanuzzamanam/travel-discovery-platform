import "server-only";
import { ApiError } from "@/lib/http/api";
import { generateItinerary as generate } from "@/lib/travel/itinerary";
import { computeTotals, loadTrip, saveTrip, type TripState } from "@/lib/travel/trip";
import { getAirport, getDestinationBySlug } from "@/lib/travel/repository";
import { interpret } from "./interpreter";
import { formatCurrency, formatMoney, toBase, type Currency } from "@/lib/currency";
import { getRateTable } from "@/lib/currency/fx-provider";
import { runOperation, type OperationCall, type OperationName } from "./operations";

/**
 * Server-side AI travel assistant. Public functions mirror the product spec.
 * The API key is only read on the server (lib/ai/interpreter.ts); nothing here reaches the browser.
 */

async function context(state: TripState) {
  const [dest, origin] = await Promise.all([getDestinationBySlug(state.destinationSlug), getAirport(state.origin)]);
  if (!dest || !origin) throw new ApiError("VALIDATION_ERROR", "Trip references an unknown destination or airport");
  return { dest, origin };
}

export async function generateItinerary(input: { destinationSlug: string; days: number; style: TripState["style"]; interests: TripState["interests"]; travellers: number }) {
  const dest = await getDestinationBySlug(input.destinationSlug);
  if (!dest) throw new ApiError("NOT_FOUND", "Destination not found");
  return generate(dest, input);
}

export type AssistantResult = {
  state: TripState;
  totals: ReturnType<typeof computeTotals>;
  before: number;
  changes: string[];
  reply: string;
  via: "ai" | "rules" | "action";
};

function describe(state: TripState, call: OperationCall, changes: string[], before: number, after: number, fmt: (usd: number) => string): string {
  const delta = after - before;
  const head =
    delta === 0 ? "Your estimated total is unchanged" : delta < 0 ? `Your estimated total dropped by ${fmt(-delta)} to ${fmt(after)}` : `Your estimated total rose by ${fmt(delta)} to ${fmt(after)}`;
  void call;
  return `${head}. All figures are estimates. Check live prices before booking. ${changes.length ? "" : "No changes were needed."}`.trim();
}

/** Apply a named operation (quick-action buttons) or a free-text request (interpreted into one operation). */
export async function modifyItinerary(token: string, req: { message?: string; operation?: OperationName; amount?: number; amountUsd?: number; days?: number; currency?: Currency }, actorUserId?: string): Promise<AssistantResult> {
  const trip = await loadTrip(token);
  if (!trip) throw new ApiError("NOT_FOUND", "Trip not found");
  if (trip.userId && trip.userId !== actorUserId) throw new ApiError("FORBIDDEN", "You can't edit this trip");

  // Amounts the visitor types are in their currency (USD when omitted); operations always work in USD.
  const currency = req.currency ?? "USD";
  const table = await getRateTable();
  const fmt = (usd: number) => formatMoney(usd, currency, table);
  let call: OperationCall;
  let via: AssistantResult["via"] = "action";
  if (req.operation) {
    call = { operation: req.operation, amountUsd: req.amountUsd ?? (req.amount === undefined ? undefined : toBase(req.amount, currency, table)), days: req.days };
  } else if (req.message) {
    const r = await interpret(req.message);
    via = r.via;
    if (r.call.operation === "unsupported") {
      const { dest, origin } = await context(trip.state);
      const totals = computeTotals(dest, origin, trip.state);
      return {
        state: trip.state,
        totals,
        before: totals.total,
        changes: [],
        via,
        reply: "I can make the trip cheaper, upgrade it, make it family-friendly, add beach activities, remove expensive activities, or shorten/extend it. Try, for example, \"Make this trip " + formatCurrency(300, currency) + " cheaper\".",
      };
    }
    call = { operation: r.call.operation, amountUsd: r.call.amount === undefined ? undefined : toBase(r.call.amount, currency, table), days: r.call.days };
  } else {
    throw new ApiError("VALIDATION_ERROR", "Provide a message or an operation");
  }

  const ctx = { ...(await context(trip.state)), fmt };
  const before = computeTotals(ctx.dest, ctx.origin, trip.state).total;
  const result = runOperation(call, trip.state, ctx);
  const saved = await saveTrip(token, result.state);
  return {
    state: saved.state,
    totals: computeTotals(ctx.dest, ctx.origin, saved.state),
    before,
    changes: result.changes,
    via,
    reply: describe(saved.state, call, result.changes, before, saved.totals.total, fmt),
  };
}

export { reduceTripCost, upgradeTrip, makeFamilyFriendly, addBeachActivities, removeExpensiveActivities, shortenTrip, extendTrip } from "./operations";
