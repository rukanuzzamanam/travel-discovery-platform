import type { Metadata, Viewport } from "next";
import { Geist_Mono, Geist } from "next/font/google";
import "./globals.css";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { GoogleAnalytics } from "@/components/analytics/google-analytics";
import { PageViewTracker } from "@/components/analytics/tracker";
import { JsonLd } from "@/components/seo/json-ld";
import { SITE, absoluteUrl } from "@/lib/site";
import { CurrencyProvider } from "@/components/currency/currency-provider";
import { getRateTable } from "@/lib/currency/fx-provider";

const sans = Geist({ variable: "--font-sans", subsets: ["latin"], display: "swap" });
const mono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: { default: `${SITE.name} — ${SITE.tagline}`, template: `%s | ${SITE.name}` },
  description: SITE.description,
  applicationName: SITE.name,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: SITE.name,
    title: `${SITE.name} — ${SITE.tagline}`,
    description: SITE.description,
    url: SITE.url,
  },
  twitter: { card: "summary_large_image", title: `${SITE.name} — ${SITE.tagline}`, description: SITE.description },
};

export const viewport: Viewport = {
  themeColor: "#1d5f8a",
  width: "device-width",
  initialScale: 1,
};

const siteSchemas = [
  {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE.name,
    url: SITE.url,
    description: SITE.description,
    potentialAction: {
      "@type": "SearchAction",
      target: { "@type": "EntryPoint", urlTemplate: absoluteUrl("/destinations?q={search_term_string}") },
      "query-input": "required name=search_term_string",
    },
  },
  {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE.name,
    url: SITE.url,
    logo: absoluteUrl("/icon.svg"),
  },
];

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const rates = await getRateTable();
  return (
    <html lang="en" className={`${sans.variable} ${mono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
        >
          Skip to content
        </a>
        <CurrencyProvider table={rates}>
          <SiteHeader />
          <main id="main" className="flex-1">
            {children}
          </main>
          <SiteFooter />
        </CurrencyProvider>
        <PageViewTracker />
        <GoogleAnalytics id={process.env.NEXT_PUBLIC_GA_ID} />
        <JsonLd data={siteSchemas} />
      </body>
    </html>
  );
}
