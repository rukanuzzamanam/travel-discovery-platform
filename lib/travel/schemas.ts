import { z } from "zod";
import { INTERESTS } from "./interests";

const iata = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z]{3}$/, "Use a 3-letter airport code");

const isoDate = z.iso.date();

export const styleSchema = z.enum(["BUDGET", "MID_RANGE", "LUXURY"]);

export const discoverSchema = z
  .object({
    origin: iata,
    budget: z.coerce.number().int().min(100, "Budget must be at least $100").max(100_000),
    startDate: isoDate.optional(),
    endDate: isoDate.optional(),
    nights: z.coerce.number().int().min(1).max(30).optional(),
    travellers: z.coerce.number().int().min(1).max(9).default(2),
    interests: z.array(z.enum(INTERESTS)).max(10).default([]),
    style: styleSchema.default("MID_RANGE"),
  })
  .refine((v) => !v.startDate || !v.endDate || v.endDate > v.startDate, {
    message: "End date must be after start date",
    path: ["endDate"],
  });

export type DiscoverInput = z.infer<typeof discoverSchema>;

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
    interests: [sp.interests ?? []].flat().flatMap((v) => v.split(",")).filter(Boolean),
  };
}

export const tripPlanSchema = z
  .object({
    origin: iata,
    destination: z.string().trim().min(1).max(80), // slug
    startDate: isoDate,
    endDate: isoDate,
    travellers: z.coerce.number().int().min(1).max(9).default(2),
    budget: z.coerce.number().int().min(0).max(1_000_000).optional(),
    style: styleSchema.default("MID_RANGE"),
    interests: z.array(z.enum(INTERESTS)).max(10).default([]),
  })
  .refine((v) => v.endDate > v.startDate, { message: "End date must be after start date", path: ["endDate"] })
  .refine((v) => nightsBetween(v.startDate, v.endDate) <= 30, { message: "Trips are limited to 30 nights", path: ["endDate"] });

export type TripPlanInput = z.infer<typeof tripPlanSchema>;

export function nightsBetween(start: string, end: string) {
  return Math.round((Date.parse(end) - Date.parse(start)) / 86_400_000);
}

export function addDays(date: string, days: number) {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
