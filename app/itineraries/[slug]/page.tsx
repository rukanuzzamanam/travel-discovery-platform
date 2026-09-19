import type { Metadata } from "next";
import { Money } from "@/components/currency/currency-provider";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { Faq } from "@/components/destination/faq";
import { JsonLd } from "@/components/seo/json-ld";
import { EstimateBadge } from "@/components/travel/estimate-badge";
import { BuildItineraryButton } from "@/components/planner/build-itinerary-button";
import { buildMetadata } from "@/lib/seo/metadata";
import { articleSchema } from "@/lib/seo/schema";
import { getPublishedItineraries } from "@/lib/travel/repository";
import { itineraryDaysSchema } from "@/lib/travel/itinerary-schema";
import { dayCost } from "@/lib/travel/itinerary";
import { addDays } from "@/lib/travel/schemas";
import { DEFAULT_ORIGIN } from "@/lib/site";

export const revalidate = 3600;

export async function generateStaticParams() {
  try {
    return (await getPublishedItineraries()).map((i) => ({ slug: i.slug }));
  } catch {
    return [];
  }
}

async function find(slug: string) {
  return (await getPublishedItineraries()).find((i) => i.slug === slug);
}

export async function generateMetadata({ params }: PageProps<"/itineraries/[slug]">): Promise<Metadata> {
  const i = await find((await params).slug);
  if (!i) return {};
  return buildMetadata({
    title: i.seoTitle ?? i.title,
    description: i.seoDescription ?? i.description,
    path: `/itineraries/${i.slug}`,
    image: i.heroImage,
    type: "article",
    publishedTime: i.createdAt,
    modifiedTime: i.updatedAt,
  });
}

export default async function ItineraryPage({ params }: PageProps<"/itineraries/[slug]">) {
  const i = await find((await params).slug);
  if (!i) notFound();
  const days = itineraryDaysSchema.parse(i.days);
  const faq = (i.faq as { q: string; a: string }[]) ?? [];
  const path = `/itineraries/${i.slug}`;
  const start = addDays(new Date().toISOString().slice(0, 10), 30);
  const perPerson = days.reduce((s, d) => s + dayCost(d), 0);

  return (
    <article className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      <JsonLd data={articleSchema({ title: i.title, description: i.description, path, image: i.heroImage, published: i.createdAt, modified: i.updatedAt })} />
      <Breadcrumbs
        items={[
          { name: "Home", path: "/" },
          { name: "Itineraries", path: "/itineraries" },
          { name: i.title, path },
        ]}
      />
      <h1 className="mt-4 text-3xl font-bold sm:text-4xl">{i.title}</h1>
      <p className="mt-2 text-lg text-muted-foreground">{i.description}</p>
      <p className="mt-3 flex flex-wrap items-center gap-2 text-sm">
        On-the-ground activities and meals: about <strong><Money usd={perPerson} /></strong> per person <EstimateBadge />
        <span className="text-muted-foreground">(excludes flights and hotel)</span>
      </p>

      <div className="mt-6">
        <BuildItineraryButton
          label="Customise this itinerary"
          payload={{
            origin: DEFAULT_ORIGIN,
            destination: i.destination.slug,
            startDate: start,
            endDate: addDays(start, days.length),
            travellers: 2,
            style: i.style,
            interests: [],
            itinerarySlug: i.slug,
          }}
        />
      </div>

      <ol className="mt-10 space-y-6">
        {days.map((d) => (
          <li key={d.day} className="rounded-2xl border bg-card p-5">
            <h2 className="text-xl font-semibold">
              Day {d.day}: {d.title}
            </h2>
            {d.summary && <p className="mt-1 text-sm text-muted-foreground">{d.summary}</p>}
            <ul className="mt-3 divide-y text-sm">
              {d.items.map((it) => (
                <li key={it.title} className="flex justify-between gap-4 py-2">
                  <div>
                    <p className="font-medium">{it.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {it.category}
                      {it.durationMin ? ` · ~${Math.round((it.durationMin / 60) * 10) / 10}h` : ""}
                      {it.notes ? ` · ${it.notes}` : ""}
                    </p>
                  </div>
                  <p className="shrink-0 font-medium tabular-nums">{it.costUsd === 0 ? "Free" : <>≈ <Money usd={it.costUsd} /></>}</p>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ol>

      <div className="mt-12 space-y-10">
        <Faq items={faq} />
        <p className="text-sm text-muted-foreground">
          More about the destination: <Link className="font-medium text-primary underline" href={`/destinations/${i.destination.slug}`}>{i.destination.name} travel guide</Link>
        </p>
      </div>
    </article>
  );
}
