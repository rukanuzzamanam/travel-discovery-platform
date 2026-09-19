export const INTERESTS = [
  "beach",
  "food",
  "nature",
  "adventure",
  "family",
  "luxury",
  "culture",
  "nightlife",
  "shopping",
  "relaxation",
] as const;

export type InterestKey = (typeof INTERESTS)[number];

export const INTEREST_LABELS: Record<InterestKey, string> = {
  beach: "Beach",
  food: "Food",
  nature: "Nature",
  adventure: "Adventure",
  family: "Family",
  luxury: "Luxury",
  culture: "Culture",
  nightlife: "Nightlife",
  shopping: "Shopping",
  relaxation: "Relaxation",
};

/** Prisma enum values are upper-case. */
export const toEnum = (i: InterestKey) => i.toUpperCase() as Uppercase<InterestKey>;
export const fromEnum = (i: string) => i.toLowerCase() as InterestKey;

/** Build an interest score map from an ordered array matching INTERESTS. */
export function scoreMap(values: readonly number[]): Record<InterestKey, number> {
  return Object.fromEntries(INTERESTS.map((k, i) => [k, values[i] ?? 0])) as Record<InterestKey, number>;
}
