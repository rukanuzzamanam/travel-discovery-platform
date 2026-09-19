import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { getDestinations } from "@/lib/travel/repository";
import { createLink, withSource } from "@/lib/affiliate/links";

/** Shared body for /cars and /activities: one partner link per destination. */
export async function DestinationLinksPage({
  kind,
  title,
  intro,
  path,
  cta,
}: {
  kind: "CAR" | "ACTIVITY";
  title: string;
  intro: string;
  path: string;
  cta: string;
}) {
  const list = await getDestinations();
  const links = await Promise.all(
    list.map(async (d) => {
      const base = await createLink(kind, { destinationName: d.name }, { destinationId: d.id });
      return { d, href: withSource(base, { page: path, component: `${kind.toLowerCase()}-index` }) };
    }),
  );
  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <Breadcrumbs items={[{ name: "Home", path: "/" }, { name: title, path }]} />
      <h1 className="mt-4 text-3xl font-bold sm:text-4xl">{title}</h1>
      <p className="mt-2 max-w-2xl text-muted-foreground">{intro} We may earn a commission at no extra cost to you.</p>
      <ul className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {links.map(({ d, href }) => (
          <li key={d.slug} className="flex items-center justify-between gap-3 rounded-xl border bg-card p-4">
            <Link href={`/destinations/${d.slug}`} className="font-medium hover:underline">
              {d.name}
            </Link>
            <a href={href} target="_blank" rel="sponsored nofollow noopener noreferrer" className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
              {cta} <ExternalLink className="size-3.5" aria-hidden />
              <span className="sr-only"> for {d.name} (opens partner site)</span>
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
