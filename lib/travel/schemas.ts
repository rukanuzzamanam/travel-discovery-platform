import { z } from "zod";
import { INTERESTS } from "./interests";
import { DEFAULT_CURRENCY, SUPPORTED_CURRENCIES, type Currency } from "@/lib/currency";

const iata = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z]{3}$/, "Use a 3-letter airport code");

const isoDate = z.iso.date();

export const styleSchema = z.enum(["BUDGET", "MID_RANGE", "LUXURY"]);

/**
 * Currency a budget is expressed in. Case-insensitive, must be a supported code.
 * Two flavours of each request schema exist on purpose:
 *  - discoverSchema / tripPlanSchema: SERVICE level. Omitted currency means USD (the storage currency), so internal
 *    callers that pass USD numbers keep working unchanged.
 *  - discoverRequestSchema / tripPlanRequestSchema: BOUNDARY level (pages, public API). Omitted currency means the
 *    product default (AUD), i.e. what a visitor means when they type a number without choosing anything.
 */
const currencyField = (fallback: Currency) => z.string().trim().toUpperCase().pipe(z.enum(SUPPORTED_CURRENCIES)).default(fallback);

const discoverObject = (fallback: Currency) =>
  z.object({
    origin: iata,
    budget: z.coerce.number().int().min(100, "Budget must be at least 100").max(100_000),
    currency: currencyField(fallback),
    startDate: isoDate.optional(),
    endDate: isoDate.optional(),
    nights: z.coerce.number().int().min(1).max(30).optional(),
    travellers: z.coerce.number().int().min(1).max(9).default(2),
    interests: z.array(z.enum(INTERESTS)).max(10).default([]),
    style: styleSchema.default("MID_RANGE"),
  });

const discoverRules = <T extends { startDate?: string; endDate?: string }>(v: T) => !v.startDate || !v.endDate || v.endDate > v.startDate;
const discoverRuleMessage = { message: "End date must be after start date", path: ["endDate"] };

export const discoverSchema = discoverObject("USD").refine(discoverRules, discoverRuleMessage);
export const discoverRequestSchema = discoverObject(DEFAULT_CURRENCY).refine(discoverRules, discoverRuleMessage);

/** `budget` is in `currency` (USD when omitted). `currency` is optional so existing internal callers need no change. */
export type DiscoverInput = Omit<z.infer<typeof discoverSchema>, "currency"> & { currency?: Currency };

/** Convert URLSearchParams-like input (interests as comma list) into a discoverSchema-shaped object. */
export function paramsToObject(sp: Record<string, string | string[] | undefined>) {
  const first = (k: string) => (Array.isArray(sp[k]) ? sp[k]![0] : (sp[k] as string | undefined)) || undefined;
  return {
    origin: first("origin"),
    budget: first("budget"),
    startDate: first("startDate"),
    endDate: first("endDate"),
    nights: first("nights"),
    travellers: first("travellers"),
    style: first("style"),
    currency: first("currency"),
    interests: [sp.interests ?? []].flat().flatMap((v) => v.split(",")).filter(Boolean),
  };
}

const tripPlanObject = (fallback: Currency) =>
  z.object({
    origin: iata,
    destination: z.string().trim().min(1).max(80), // slug
    startDate: isoDate,
    endDate: isoDate,
    travellers: z.coerce.number().int().min(1).max(9).default(2),
    budget: z.coerce.number().int().min(0).max(1_000_000).optional(),
    currency: currencyField(fallback),
    style: styleSchema.default("MID_RANGE"),
    interests: z.array(z.enum(INTERESTS)).max(10).default([]),
  });

const tripRules = <T extends z.ZodType>(s: T) =>
  s
    .refine((v) => (v as { endDate: string; startDate: string }).endDate > (v as { startDate: string }).startDate, { message: "End date must be after start date", path: ["endDate"] })
    .refine((v) => nightsBetween((v as { startDate: string }).startDate, (v as { endDate: string }).endDate) <= 30, { message: "Trips are limited to 30 nights", path: ["endDate"] });

export const tripPlanSchema = tripRules(tripPlanObject("USD"));
export const tripPlanRequestSchema = tripRules(tripPlanObject(DEFAULT_CURRENCY));

/** `budget` is in `currency` (USD when omitted). */
export type TripPlanInput = Omit<z.infer<typeof tripPlanSchema>, "currency"> & { currency?: Currency };

export function nightsBetween(start: string, end: string) {
  return Math.round((Date.parse(end) - Date.parse(start)) / 86_400_000);
}

export function addDays(date: string, days: number) {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
