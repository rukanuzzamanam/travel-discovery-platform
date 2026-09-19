import Link from "next/link";
import { buildMetadata } from "@/lib/seo/metadata";
import { getPublishedGuides } from "@/lib/travel/repository";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";

export const revalidate = 3600;

export const metadata = buildMetadata({
  title: "Travel guides: plan smarter, spend less",
  description: "Practical destination guides and budget travel advice, with realistic cost estimates.",
  path: "/guides",
});

export default async function GuidesPage() {
  const guides = await getPublishedGuides();
  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <Breadcrumbs items={[{ name: "Home", path: "/" }, { name: "Guides", path: "/guides" }]} />
      <h1 className="mt-4 text-3xl font-bold sm:text-4xl">Travel guides</h1>
      <ul className="mt-8 grid gap-4 sm:grid-cols-2">
        {guides.map((g) => (
          <li key={g.slug}>
            <Link href={`/guides/${g.slug}`} className="block h-full rounded-2xl border bg-card p-5 transition-shadow hover:shadow-md">
              <h2 className="text-lg font-semibold">{g.title}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{g.description}</p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
