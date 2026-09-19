# Tripora

**Tell us your budget, dates and interests. We'll help you discover where to go, estimate the trip cost, build the itinerary and help you book.**

Tripora is a travel discovery and trip-planning platform built as a modular monolith on Next.js. Monetisation is affiliate-based (Travelpayouts first) behind a provider abstraction, so more providers can be added without touching the UI.

> Tripora is a standalone project. It shares nothing with FlyDealFinder.

## Features

- **Discovery** (`/discover`): budget + dates + interests → ranked destinations with estimated flight / hotel / food / activities / transport costs. Modular scoring (cost, flight time, interests, season, travellers, suitability). Inputs and result metadata are stored.
- **Destinations, guides, itineraries, deals**: DB-backed content with SEO metadata and JSON-LD.
- **Trip planner** (`/trip-planner`) and editable trips (`/trips/[token]`): generated itinerary, editable prices (marked "Your price"), server-side AI assistant ("Make this trip $300 cheaper").
- **Affiliate layer**: `/go/{flight|hotel|activity|car}/{id}` redirect, click + session + source attribution, conversions and commission tracking.
- **Accounts**: preferences, saved trips / destinations, price alerts. Anonymous use is fully supported.
- **Admin** (`/admin`): KPIs, traffic/clicks/revenue charts, content editing and publishing, searches, clicks, revenue attribution, users and roles (RBAC).
- **SEO**: metadata API, canonical URLs, Open Graph/Twitter, JSON-LD (WebSite, Organization, Breadcrumb, Article, FAQ, TouristDestination), dynamic sitemap, robots, thin-content guards.

## Architecture (short)

```
Browser → Next.js (RSC + route handlers) → application services (lib/travel, lib/ai)
                                         → provider interface (lib/affiliate) → Travelpayouts
                                         → Prisma → PostgreSQL
```

See [docs/architecture.md](docs/architecture.md). Key rule: **UI code never imports a provider.** It uses `/go/...` paths and services in `lib/travel/products.ts`.

## Local setup

Requirements: Node 20+ (tested on 24), npm, PostgreSQL 14+ (or use the bundled embedded Postgres).

```bash
npm install
cp .env.example .env          # then edit values (see below)

# Option A: you have PostgreSQL. Put its URL in DATABASE_URL.
# Option B: no Postgres/Docker? Start a local one (leave running in its own terminal):
npm run db:local              # postgresql://tripora:tripora@localhost:54329/tripora

npx prisma migrate deploy     # or: npm run db:migrate   (dev, creates new migrations)
npm run db:seed               # countries, cities, airports, 20 destinations, guides, itineraries, deals
npm run dev                   # http://localhost:3000
```

### Environment variables

| Variable | Required | Notes |
| --- | --- | --- |
| `DATABASE_URL` | yes | PostgreSQL connection string |
| `AUTH_SECRET` | yes | ≥ 32 random chars (`openssl rand -base64 48`). Signs session cookies |
| `NEXT_PUBLIC_SITE_URL` | yes (prod) | Canonical origin, e.g. `https://www.example.com` |
| `ADMIN_BOOTSTRAP_EMAILS` | first admin | Comma-separated. These emails become `ADMIN` when they register |
| `TRAVELPOUTS_PROJECT_ID` | for attribution | Your affiliate marker |
| `TRAVELPOUTS_API_TOKEN` | optional | Enables cached fare data (`/v1/prices/cheap`). Server-only |
| `TRAVELPOUTS_TRS`, `TRAVELPOUTS_PROGRAM_FLIGHTS/HOTELS/ACTIVITIES/CARS` | optional | Project id and program ids for `tp.media` partner links (copy from your dashboard) |
| `TRAVELPOUTS_WHITE_LABEL_URL` | optional | e.g. `https://search.example.com` |
| `AI_API_KEY`, `AI_MODEL` | optional | Server-only. Without a key the rule-based interpreter is used |
| `FX_RATES_JSON`, `FX_RATES_AS_OF` | optional | Override the static development exchange rates. **Not live rates.** See [docs/currency.md](docs/currency.md) |
| `NEXT_PUBLIC_GA_ID` | optional | `G-XXXXXXX` |
| `SENTRY_DSN` | optional | See `instrumentation.ts` for wiring |

Nothing secret is ever prefixed `NEXT_PUBLIC_`.

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` / `build` / `start` | Next.js |
| `npm run lint` / `typecheck` | ESLint / `tsc --noEmit` |
| `npm test` | Unit + integration tests (needs the database) |
| `npm run test:e2e` | HTTP end-to-end tests against a running server (`E2E_BASE_URL`, default `http://localhost:3000`) |
| `npm run db:migrate` / `db:deploy` / `db:seed` / `db:studio` | Prisma |
| `npm run db:local` | Embedded PostgreSQL for machines without Docker/Postgres |

### Testing

```bash
npm test                                   # 52 unit + integration tests
npm run build && npx next start -p 3100 &  # then:
E2E_BASE_URL=http://localhost:3100 npm run test:e2e   # 46 HTTP tests (SEO, redirects, RBAC, trip flow)
```

## Docs

- [Architecture](docs/architecture.md) · [Database](docs/database.md) · [Travelpayouts](docs/travelpayouts.md)
- [SEO](docs/seo.md) · [Deployment](docs/deployment.md) · [Revenue tracking](docs/revenue-tracking.md)
- [Currency](docs/currency.md) · [Development workflow and rollback](docs/development-workflow.md)

## Admin setup

1. Set `ADMIN_BOOTSTRAP_EMAILS=you@example.com`.
2. Register at `/register` with that email → you are `ADMIN`.
3. Open `/admin`. Grant other users `ANALYST` (view), `EDITOR` (content + conversions) or `ADMIN` (everything + roles) at `/admin/users`.

## Analytics setup

Set `NEXT_PUBLIC_GA_ID` for Google Analytics. Internal events are always collected at `POST /api/v1/analytics/events` (Zod-validated, rate-limited) and shown in `/admin/analytics`. If you serve EU/UK visitors, add a consent banner before enabling GA.

## Branching

`main` is production. Work on short-lived `feature/*`, `fix/*` or `chore/*` branches and merge via pull request (see [development workflow](docs/development-workflow.md)). CI (`.github/workflows/ci.yml`) runs install, migrate + seed, lint, typecheck, tests, build and e2e on every push and PR.
