# Deployment

Cloudflare (DNS/CDN) → Vercel → Next.js → PostgreSQL.

## 1. Database

Use a managed PostgreSQL (Neon, Supabase, RDS, Vercel Postgres…). Use a **pooled** connection string for serverless if the provider offers one. Then, from a trusted machine or CI:

```bash
DATABASE_URL=… npx prisma migrate deploy
DATABASE_URL=… npm run db:seed        # first deploy only (idempotent)
```

## 2. Vercel

1. Import the GitHub repo. Framework: Next.js. Build command `npm run build`, install `npm ci`.
2. Environment variables (Production and Preview): `DATABASE_URL`, `AUTH_SECRET`, `NEXT_PUBLIC_SITE_URL` (`https://www.your-domain.com`), `ADMIN_BOOTSTRAP_EMAILS`, Travelpayouts vars, `AI_API_KEY`, `NEXT_PUBLIC_GA_ID`, `SENTRY_DSN`.
3. Because pages use `generateStaticParams`, the build needs `DATABASE_URL` reachable (or it renders on demand). Run migrations **before** the build.
4. Production cookies are `Secure` automatically (`NODE_ENV=production`); Vercel serves HTTPS.

## 3. Cloudflare

- Add the domain, point `www` (CNAME) to `cname.vercel-dns.com`, set SSL/TLS mode **Full (strict)**.
- Keep the proxy on, but do **not** cache `/go/*`, `/api/*`, `/admin*`, `/account*`, `/trips/*` (Cache Rule: bypass). Vercel already sends `no-store` on `/go`.
- Optional: White Label search on `search.your-domain.com` (Travelpayouts instructions) and set `TRAVELPOUTS_WHITE_LABEL_URL`.
- Canonical domain: redirect the apex to `www` (or vice versa) with a Cloudflare redirect rule and use that origin in `NEXT_PUBLIC_SITE_URL`.

## 4. Scaling notes

The in-memory cache and rate limiter are per instance. On Vercel (multiple instances) implement `CacheStore` with Redis/Upstash (`lib/cache/cache.ts`) so rate limits are global. Everything else is stateless.

## 5. GitHub

`main` = production, `develop` = integration. CI runs on both. Never commit `.env`; only `.env.example` is tracked.

## Checklist

- [ ] `AUTH_SECRET` is unique and ≥ 32 chars
- [ ] Migrations applied, seed run
- [ ] `NEXT_PUBLIC_SITE_URL` matches the live domain
- [ ] Travelpayouts marker/program ids set and one outbound link verified
- [ ] Real hero photography replaced the placeholders
- [ ] Sitemap submitted; Lighthouse run on production
