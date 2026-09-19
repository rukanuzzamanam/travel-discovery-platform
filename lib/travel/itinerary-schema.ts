import { z } from "zod";

export const itineraryItemSchema = z.object({
  title: z.string().trim().min(1).max(160),
  category: z.enum(["activity", "attraction", "restaurant", "transport"]),
  durationMin: z.number().int().min(0).max(1440).optional(),
  costUsd: z.number().min(0).max(100_000),
  priceKind: z.enum(["ESTIMATE", "PROVIDER", "USER"]),
  notes: z.string().trim().max(400).optional(),
});

export const itineraryDaySchema = z.object({
  day: z.number().int().min(1).max(31),
  title: z.string().trim().min(1).max(120),
  summary: z.string().trim().max(400).optional(),
  items: z.array(itineraryItemSchema).max(20),
});

export const itineraryDaysSchema = z.array(itineraryDaySchema).min(1).max(31);
