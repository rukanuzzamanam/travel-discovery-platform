import { SITE, absoluteUrl } from "@/lib/site";

type Crumb = { name: string; path: string };

export function breadcrumbSchema(crumbs: Crumb[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.name,
      item: absoluteUrl(c.path),
    })),
  };
}

export function faqSchema(faq: { q: string; a: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faq.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };
}

export function articleSchema(a: { title: string; description: string; path: string; image: string; published: Date; modified: Date }) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: a.title,
    description: a.description,
    image: absoluteUrl(a.image),
    datePublished: a.published.toISOString(),
    dateModified: a.modified.toISOString(),
    mainEntityOfPage: absoluteUrl(a.path),
    author: { "@type": "Organization", name: SITE.name },
    publisher: { "@type": "Organization", name: SITE.name, logo: { "@type": "ImageObject", url: absoluteUrl("/icon.svg") } },
  };
}

export function destinationSchema(d: { name: string; description: string; path: string; image: string; country: string }) {
  return {
    "@context": "https://schema.org",
    "@type": "TouristDestination",
    name: d.name,
    description: d.description,
    url: absoluteUrl(d.path),
    image: absoluteUrl(d.image),
    containedInPlace: { "@type": "Country", name: d.country },
  };
}
