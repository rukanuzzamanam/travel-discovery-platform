import type { Metadata } from "next";
import { SITE, absoluteUrl } from "@/lib/site";

type Input = {
  title: string;
  description: string;
  path: string;
  image?: string;
  type?: "website" | "article";
  noindex?: boolean;
  publishedTime?: Date;
  modifiedTime?: Date;
};

/** Single place that builds canonical, Open Graph and Twitter metadata so every page is consistent. */
export function buildMetadata({ title, description, path, image, type = "website", noindex, publishedTime, modifiedTime }: Input): Metadata {
  const url = absoluteUrl(path);
  const images = image ? [{ url: absoluteUrl(image), alt: title }] : undefined;
  return {
    title,
    description,
    alternates: { canonical: url },
    robots: noindex ? { index: false, follow: true } : { index: true, follow: true },
    openGraph: {
      type,
      url,
      title,
      description,
      siteName: SITE.name,
      images,
      ...(type === "article" ? { publishedTime: publishedTime?.toISOString(), modifiedTime: modifiedTime?.toISOString() } : {}),
    },
    twitter: { card: "summary_large_image", title, description, images: images?.map((i) => i.url) },
  };
}
