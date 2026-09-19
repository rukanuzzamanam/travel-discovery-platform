import "server-only";
import { ApiError } from "@/lib/http/api";
import { generateItinerary as generate } from "@/lib/travel/itinerary";
import { computeTotals, loadTrip, saveTrip, type TripState } from "@/lib/travel/trip";
import { getAirport, getDestinationBySlug } from "@/lib/travel/repository";
import { interpret } from "./interpreter";
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

function describe(state: TripState, call: OperationCall, changes: string[], before: number, after: number): string {
  const delta = after - before;
  const head =
    delta === 0 ? "Your estimated total is unchanged" : delta < 0 ? `Your estimated total dropped by $${-delta} to $${after}` : `Your estimated total rose by $${delta} to $${after}`;
  void call;
  return `${head}. All figures are estimates. Check live prices before booking. ${changes.length ? "" : "No changes were needed."}`.trim();
}

/** Apply a named operation (quick-action buttons) or a free-text request (interpreted into one operation). */
export async function modifyItinerary(token: string, req: { message?: string; operation?: OperationName; amountUsd?: number; days?: number }, actorUserId?: string): Promise<AssistantResult> {
  const trip = await loadTrip(token);
  if (!trip) throw new ApiError("NOT_FOUND", "Trip not found");
  if (trip.userId && trip.userId !== actorUserId) throw new ApiError("FORBIDDEN", "You can't edit this trip");

  let call: OperationCall;
  let via: AssistantResult["via"] = "action";
  if (req.operation) {
    call = { operation: req.operation, amountUsd: req.amountUsd, days: req.days };
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
        reply: "I can make the trip cheaper, upgrade it, make it family-friendly, add beach activities, remove expensive activities, or shorten/extend it. Try, for example, \"Make this trip $300 cheaper\".",
      };
    }
    call = r.call;
  } else {
    throw new ApiError("VALIDATION_ERROR", "Provide a message or an operation");
  }

  const ctx = await context(trip.state);
  const before = computeTotals(ctx.dest, ctx.origin, trip.state).total;
  const result = runOperation(call, trip.state, ctx);
  const saved = await saveTrip(token, result.state);
  return {
    state: saved.state,
    totals: computeTotals(ctx.dest, ctx.origin, saved.state),
    before,
    changes: result.changes,
    via,
    reply: describe(saved.state, call, result.changes, before, saved.totals.total),
  };
}

export { reduceTripCost, upgradeTrip, makeFamilyFriendly, addBeachActivities, removeExpensiveActivities, shortenTrip, extendTrip } from "./operations";
