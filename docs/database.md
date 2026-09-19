# Database

PostgreSQL + Prisma 7 (`prisma/schema.prisma`, driver adapter `@prisma/adapter-pg`). Client is generated to `lib/db/generated` (git-ignored; `postinstall` runs `prisma generate`).

| Area | Models |
| --- | --- |
| Users | `User`, `UserPreference`, `AdminUser` (role: ADMIN/EDITOR/ANALYST), `SavedDestination`, `SavedItinerary`, `PriceAlert` |
| Geography | `Country`, `City`, `Airport`, `Destination`, `DestinationPrice`, `PriceSnapshot` |
| Search | `Search`, `SearchResult` (score + breakdown JSON) |
| Trips | `Trip`, `TripDay`, `TripItem` (budget lines), `TripActivity` (scheduled items) |
| Catalogue | `Flight`, `Hotel`, `Activity`, `CarRental` (cached provider or curated rows, each with a `PriceKind`) |
| Affiliate | `AffiliateProgram`, `AffiliateLink`, `AffiliateClick`, `Conversion` |
| Content | `TravelGuide`, `Itinerary`, `Deal` (status DRAFT/PUBLISHED/ARCHIVED, SEO fields) |
| Marketing | `NewsletterSubscriber`, `AnalyticsEvent` |

Conventions: UUID keys, `createdAt`/`updatedAt`, explicit indexes on destination slug, airport code, search origin/destination, affiliate provider and click time, SEO slugs, trip user, analytics timestamp. `Conversion.commission` is nullable (reports lag).

`AffiliateLink` stores **parameters, never a URL**. The provider builds the URL at click time.

## Commands

```bash
npm run db:migrate      # create/apply a dev migration
npm run db:deploy       # apply migrations (CI / production)
npm run db:seed         # idempotent upserts
npm run db:studio
```

Seed data lives in `content/` (typed TypeScript). Edit and re-run `db:seed`; copy edits made in `/admin` are overwritten for the fields the seed sets, so treat `content/` as the source for structural fields (costs, activities) and the admin for copy.
