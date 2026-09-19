import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { Faq } from "@/components/destination/faq";
import { JsonLd } from "@/components/seo/json-ld";
import { buildMetadata } from "@/lib/seo/metadata";
import { articleSchema } from "@/lib/seo/schema";
import { getPublishedGuides } from "@/lib/travel/repository";

export const revalidate = 3600;

export async function generateStaticParams() {
  try {
    return (await getPublishedGuides()).map((g) => ({ slug: g.slug }));
  } catch {
    return [];
  }
}

const find = async (slug: string) => (await getPublishedGuides()).find((g) => g.slug === slug);

export async function generateMetadata({ params }: PageProps<"/guides/[slug]">): Promise<Metadata> {
  const g = await find((await params).slug);
  if (!g) return {};
  return buildMetadata({
    title: g.seoTitle ?? g.title,
    description: g.seoDescription ?? g.description,
    path: `/guides/${g.slug}`,
    image: g.heroImage,
    type: "article",
    publishedTime: g.createdAt,
    modifiedTime: g.updatedAt,
  });
}

export default async function GuidePage({ params }: PageProps<"/guides/[slug]">) {
  const g = await find((await params).slug);
  if (!g) notFound();
  const path = `/guides/${g.slug}`;
  return (
    <article className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <JsonLd data={articleSchema({ title: g.title, description: g.description, path, image: g.heroImage, published: g.createdAt, modified: g.updatedAt })} />
      <Breadcrumbs items={[{ name: "Home", path: "/" }, { name: "Guides", path: "/guides" }, { name: g.title, path }]} />
      <h1 className="mt-4 text-3xl font-bold sm:text-4xl">{g.title}</h1>
      <p className="mt-2 text-lg text-muted-foreground">{g.description}</p>
      <p className="mt-2 text-xs text-muted-foreground">Updated {g.updatedAt.toISOString().slice(0, 10)}</p>
      {/* Markdown is rendered without raw HTML, so admin-authored content can't inject markup. */}
      <div className="prose-content mt-8 space-y-4 leading-relaxed [&_a]:text-primary [&_a]:underline [&_h2]:mt-8 [&_h2]:text-2xl [&_h2]:font-bold [&_li]:ml-5 [&_ol]:list-decimal [&_table]:w-full [&_table]:text-sm [&_td]:border [&_td]:p-2 [&_th]:border [&_th]:bg-muted [&_th]:p-2 [&_th]:text-left [&_ul]:list-disc">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{g.content}</ReactMarkdown>
      </div>
      {g.destination && (
        <p className="mt-8">
          <Link href={`/destinations/${g.destination.slug}`} className="font-medium text-primary underline">
            Explore {g.destination.name}: costs, itineraries and live prices
          </Link>
        </p>
      )}
      <div className="mt-10">
        <Faq items={(g.faq as { q: string; a: string }[]) ?? []} />
      </div>
    </article>
  );
}
