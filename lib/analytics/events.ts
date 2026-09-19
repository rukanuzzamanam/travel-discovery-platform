import { z } from "zod";

export const EVENT_NAMES = [
  "page_view",
  "search_started",
  "search_completed",
  "destination_viewed",
  "trip_planner_started",
  "trip_created",
  "itinerary_generated",
  "flight_result_viewed",
  "flight_affiliate_click",
  "hotel_result_viewed",
  "hotel_affiliate_click",
  "activity_affiliate_click",
  "car_affiliate_click",
  "signup",
  "newsletter_signup",
] as const;

export type EventName = (typeof EVENT_NAMES)[number];

export const analyticsEventSchema = z.object({
  name: z.enum(EVENT_NAMES),
  path: z.string().max(500).optional(),
  destination: z.string().max(120).optional(),
  properties: z
    .record(z.string().max(60), z.union([z.string().max(300), z.number(), z.boolean(), z.null()]))
    .refine((o) => Object.keys(o).length <= 20, "Too many properties")
    .optional(),
});

export type AnalyticsEventInput = z.infer<typeof analyticsEventSchema>;
