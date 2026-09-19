import { api, ok } from "@/lib/http/api";
import { getDestinations } from "@/lib/travel/repository";
import { fromEnum, INTERESTS } from "@/lib/travel/interests";

export const GET = api(async ({ req }) => {
  const q = req.nextUrl.searchParams.get("q")?.trim().toLowerCase();
  const interest = req.nextUrl.searchParams.get("interest")?.toLowerCase();
  let list = await getDestinations();
  if (q) list = list.filter((d) => d.name.toLowerCase().includes(q) || d.country.toLowerCase().includes(q));
  if (interest && (INTERESTS as readonly string[]).includes(interest)) {
    list = list.filter((d) => d.interestScores[fromEnum(interest)] >= 4);
  }
  return ok(
    list.map((d) => ({
      slug: d.slug,
      name: d.name,
      country: d.country,
      tagline: d.tagline,
      airportCode: d.airportCode,
      heroImage: d.heroImage,
      bestMonths: d.bestMonths,
      recommendedDays: [d.recommendedDaysMin, d.recommendedDaysMax],
    })),
    { headers: { "Cache-Control": "public, s-maxage=600, stale-while-revalidate=3600" } },
  );
});
