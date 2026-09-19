# Travelpayouts

All Travelpayouts logic is in `lib/affiliate/travelpayouts/` behind `AffiliateProvider` / `FlightPriceProvider`.

## What is implemented, and how sure we are

| Capability | Mechanism | Status |
| --- | --- | --- |
| Fare data | Data API `GET https://api.travelpayouts.com/v1/prices/cheap`, header `X-Access-Token` | Endpoint and auth confirmed in Travelpayouts' public API reference. Results are **cached** fares from recent searches, so the UI labels them "may have changed". |
| Affiliate links | `https://tp.media/r?marker=…&trs=…&p=<program>&u=<brand url>&sub_id=…` | Built only when you configure `TRAVELPOUTS_PROJECT_ID`, `TRAVELPOUTS_TRS` and the per-brand `TRAVELPOUTS_PROGRAM_*` ids. **Verify the parameter names against your dashboard's generated links before launch.** |
| Aviasales fallback | `https://www.aviasales.com/search/<ORIG><DDMM><DEST>[<DDMM>]<pax>?marker=<marker>.<subid>` | Used when no program id is set. **Verify** the `marker.subid` convention in your account. |
| White Label | `TRAVELPOUTS_WHITE_LABEL_URL` → `<url>/flights/?origin_iata=…&destination_iata=…&depart_date=…&return_date=…&adults=…` | **Verify** query names against your White Label settings. |
| Partner Links API | Travelpayouts documents an API that converts brand URLs to partner links (`trs`, `marker`, `shorten`, `links[].url`, `links[].sub_id`) | **Not implemented.** We could not confirm its exact endpoint path from reachable docs and we do not guess endpoints. Add it as another method on the provider once verified. |
| Hotel/activity/car deep links | Brand search URLs (Hotellook, GetYourGuide, EconomyBookings) wrapped via `tp.media` when program ids are set | **Verify** brand URL formats and which programs your account is approved for. |

Anything marked "Verify" is isolated in `links.ts`/`config.ts`; correcting it never touches the UI.

## Setup

1. Create a Travelpayouts account and a project. Note the **marker** → `TRAVELPOUTS_PROJECT_ID`, and the project id → `TRAVELPOUTS_TRS`.
2. Join the programs you want (flights, hotels, activities, cars) and copy each program id → `TRAVELPOUTS_PROGRAM_*`.
3. Copy your API token → `TRAVELPOUTS_API_TOKEN` (server-side only) to enable cached fares.
4. Click a booking button on a staging site and compare the outbound URL with a link from your dashboard.

## Redirect flow (`/go/{flight|hotel|activity|car}/{id}`)

1. Validate the type and that `id` is a UUID; rate-limit by IP.
2. Load the `AffiliateLink` (must match the product type). Its stored params are re-validated with Zod.
3. Generate a unique `subId`, build the URL through the provider, then `assertSafeRedirect` (https only, no credentials, host must be on the provider allow-list).
4. Record `AffiliateClick` (session, user, provider, product, destination, source page/component, campaign, URL, subId) and an analytics event.
5. `302` with `Cache-Control: no-store`. The target is never read from the request; `?from=` is accepted only as a same-site path.

## White Label

Set `TRAVELPOUTS_WHITE_LABEL_URL` to a search subdomain (e.g. `search.example.com`). Flight and hotel CTAs then link there. The main site's SEO never depends on it: no indexable page renders White Label results, and `/go/*` is disallowed in robots.txt.

## Adding another provider

Implement `AffiliateProvider` (link builders, `allowedHosts`) and optionally `FlightPriceProvider`, then append to `affiliateProviders` / `flightPriceProviders` in `affiliate-router.ts`. Routing prefers the provider stored on the link, then the first configured provider.
