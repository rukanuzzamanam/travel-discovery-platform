# SEO

## Implemented

- Next.js Metadata API via `lib/seo/metadata.ts` (title, description, canonical, Open Graph, Twitter, robots). Root layout sets `metadataBase`.
- JSON-LD: `WebSite` + `Organization` (layout), `BreadcrumbList` (all content pages), `FAQPage` (destinations, itineraries, guides, cheap-flights), `Article` (guides, itineraries), `TouristDestination` (destinations). Output is escaped so content can't close the script tag.
- `app/robots.ts` and `app/sitemap.ts` (dynamic, DB-backed, lastModified from `updatedAt`).
- ISR (`revalidate` 30–60 min) with `generateStaticParams`; builds without a DB fall back to on-demand rendering.

## URL structure

`/destinations/bali` · `/guides/bali-travel-guide` · `/itineraries/7-days-bali` · `/cheap-flights/sydney-to-bali` · `/hotels/bali` · `/travel-from/sydney` · `/travel-budget/1500` · `/weekend-getaways/sydney`

## No thin or infinite pages

- `cheap-flights/*` exists only for routes with a published `Deal` record.
- `travel-from`, `weekend-getaways`: curated origin list (`HUB_ORIGINS`) and the page 404s if fewer than 3 real results exist.
- `travel-budget`: curated amounts (`BUDGET_PAGES`), 404 if fewer than 2 destinations fit.
- The sitemap applies the same checks, so it never lists a 404.

## noindex / disallowed

`/discover`, `/trip-planner`, `/trips/*`, `/account/*`, `/admin/*`, `/login`, `/register`, `/api/*`, `/go/*` are disallowed in robots.txt; the pages also set `noindex`, and `/flights` result variants (query string) are `noindex` with canonical `/flights`. `/destinations?interest=…` canonicalises to `/destinations`.

## Before launch

- Replace the generated SVG hero placeholders (`public/images/destinations`) with licensed photography and update `heroImage`/`heroImageAlt` (next/image will then optimise them).
- Set `NEXT_PUBLIC_SITE_URL` to the production origin, submit `/sitemap.xml` in Search Console.
- Run Lighthouse on production (mobile). Performance/SEO/accessibility scores have **not** been measured in this repository yet.
