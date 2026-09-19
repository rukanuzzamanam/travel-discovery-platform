import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Plane } from "lucide-react";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { AffiliateLink } from "@/components/affiliate/affiliate-link";
import { EstimateBadge } from "@/components/travel/estimate-badge";
import { buildMetadata } from "@/lib/seo/metadata";
import { getActiveDeals } from "@/lib/travel/repository";
import { createLink, withSource } from "@/lib/affiliate/links";
import { formatUsd } from "@/lib/utils/format";

export const revalidate = 1800;

const find = async (slug: string) => (await getActiveDeals()).find((d) => d.slug === slug);

export async function generateMetadata({ params }: PageProps<"/deals/[slug]">): Promise<Metadata> {
  const d = await find((await params).slug);
  if (!d) return {};
  return buildMetadata({ title: d.seoTitle ?? d.title, description: d.seoDescription ?? d.description, path: `/deals/${d.slug}`, image: d.heroImage });
}

export default async function DealPage({ params }: PageProps<"/deals/[slug]">) {
  const d = await find((await params).slug);
  if (!d) notFound();
  const path = `/deals/${d.slug}`;
  const link =
    d.origin && d.productType === "FLIGHT"
      ? withSource(await createLink("FLIGHT", { origin: d.origin, destination: d.destination.airportCode, adults: 1 }, { destinationId: d.destinationId }), { page: path, component: "deal-cta" })
      : null;

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <Breadcrumbs items={[{ name: "Home", path: "/" }, { name: "Deals", path: "/deals" }, { name: d.title, path }]} />
      <h1 className="mt-4 text-3xl font-bold sm:text-4xl">{d.title}</h1>
      {d.fromPriceUsd && (
        <p className="mt-4 flex items-center gap-3">
          <span className="text-4xl font-bold">{formatUsd(d.fromPriceUsd)}</span>
          <EstimateBadge label="Typical return fare" />
        </p>
      )}
      <p className="mt-4 text-muted-foreground">{d.description}</p>
      <div className="mt-6 flex flex-wrap gap-3">
        {link && (
          <AffiliateLink href={link}>
            <Plane aria-hidden /> Check live fares
          </AffiliateLink>
        )}
        <Link href={`/destinations/${d.destination.slug}`} className="inline-flex h-12 items-center rounded-xl border px-6 font-medium hover:bg-muted">
          About {d.destination.name}
        </Link>
      </div>
      <p className="mt-6 text-sm text-muted-foreground">Fares vary by date and demand. The figure above is our estimate of a typical return economy fare, not an offer.</p>
    </div>
  );
}
