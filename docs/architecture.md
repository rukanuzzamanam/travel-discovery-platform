# Architecture

Modular monolith on Next.js (App Router). No microservices.

```
app/            Routes: pages (server components), route handlers (/api/v1, /go), proxy.ts
components/     ui (shadcn/Base UI), layout, travel, destination, planner, affiliate, analytics, admin
lib/
  db/           Prisma client (adapter-pg) + generated client
  travel/       estimator, scoring, discover, itinerary, trips, repository, products (application services)
  ai/           operations (pure), interpreter (LLM or rules), service
  affiliate/    affiliate-provider (interface), affiliate-router, links, travelpayouts/*
  auth/         session (JWT cookie), service (register/login)
  analytics/    event schema + server-side tracking
  cache/        CacheStore abstraction (in-memory now, Redis later)
  security/     rate-limit, sanitize
  http/         api() wrapper: request id, logging, rate limit, error envelope
  seo/          metadata builder, JSON-LD builders, programmatic-SEO guards
content/        Seed sources: geo, destinations, guides, itineraries
prisma/         schema, migrations, seed
tests/          unit, integration, e2e
```

## Layering rule

```
UI (pages/components) → application services (lib/travel/*, lib/ai/*) → provider interfaces (lib/affiliate/*) → Travelpayouts
```

- UI components render `/go/...` paths and estimates. They never import `lib/affiliate/travelpayouts`.
- The router (`affiliate-router.ts`) is the only place providers are registered. Adding Duffel, a hotel API or an activity API = implement `AffiliateProvider` (links) and/or `FlightPriceProvider` (fares), append to the registry.

## Price honesty

Every price carries a kind: `ESTIMATE` (our model), `PROVIDER` (a provider returned it, with timestamp) or `USER` (typed by the visitor). The UI labels estimates ("Estimate" badge) and provider fares ("may have changed"). Live flight/hotel prices are never invented; without a Travelpayouts token, only estimates are shown.

## Recommendation engine

`lib/travel/scoring.ts` is a list of independent scorers (cost, duration, interests, season, travellers, suitability), each returning 0..1 plus a reason, combined by weight. Add or re-weight in `SCORERS`. Costs come from `estimator.ts` (great-circle distance for flights, per-destination daily costs, seasonal multiplier). Search inputs and each result's score breakdown are stored in `Search` / `SearchResult`.

## AI assistant

The model (if `AI_API_KEY` is set) only **routes** a request to one of seven fixed operations and extracts a number. Operations are deterministic functions over structured trip data and the destination catalogue, so the assistant cannot invent prices or places. USER-priced items are never repriced or removed by automated cost cuts. Without a key, a regex interpreter is used.

## Caching

`CacheStore` (get/set/delete/incr). TTLs: static reference data 6h, content 10m, prices 15m, availability 5m. Pages use ISR (`revalidate`). The default store is in-process; implement `CacheStore` with Redis and assign it to `cache` to share state across instances (this also makes rate limiting global).

## Security

Zod on every input · rate limiting per IP · bcrypt (cost 12) · HS256 JWT in an httpOnly, SameSite=Lax, Secure (prod) cookie · optimistic gate in `proxy.ts` plus server-side checks in layouts and handlers · RBAC (`ANALYST < EDITOR < ADMIN`) · CSP/HSTS/X-Frame-Options/nosniff/Referrer/Permissions policies · redirect allow-list · structured logs · generic client errors.
