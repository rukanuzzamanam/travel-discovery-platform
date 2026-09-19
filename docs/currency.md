# Currency

Supported: **AUD, USD, EUR, GBP, NZD, CAD, SGD**. Default: **AUD**.

## Architecture

```
                 stored / computed amounts are always USD (the base currency)
                                   │
   visitor types a budget ──► convertCurrency(amount, their currency → USD) ──► services (estimator, scoring…) unchanged
   visitor reads a price  ◄── formatMoney(usd → their currency)  ◄── <Money usd={…} />
```

| Piece | Where | Notes |
| --- | --- | --- |
| Config, `convertCurrency`, `formatCurrency`, `formatMoney`, `parseCurrency` | `lib/currency/index.ts` | Pure and isomorphic. **The only place money is converted or formatted.** |
| Rate provider abstraction | `lib/currency/fx-provider.ts` | `FxRateProvider` interface, `StaticFxRateProvider` (today), `getRateTable()`. Server only. |
| Provider + `<Money>` + hooks | `components/currency/currency-provider.tsx` | Client context. `<Money usd={n} />` renders a stored USD amount in the visitor's currency. |
| Selector | `components/currency/currency-selector.tsx` | In the header and the mobile menu. |

Rules for contributors:

- Show a price with `<Money usd={…} />` (or `useMoneyFormatter()` inside a client component). Never call `Intl.NumberFormat` with a currency or multiply by a rate in a component. A test enforces this.
- Amounts in the database, estimator, scoring and catalogue stay **USD**. The DB fields are named `…Usd` for that reason. No schema change was needed.
- Formats: `A$1,500`, `US$1,500`, `€1,500`, `£1,500`, `NZ$1,500`, `C$1,500`, `S$1,500`. No two currencies share a bare `$`. Symbols are fixed in code, so output is identical on every server and browser.

## Choosing and remembering a currency

1. The selector writes the `tripora_currency` cookie (1 year, `SameSite=Lax`, not sensitive).
2. Signed-in users also save it to the **existing** `UserPreference.currency` field (`PUT /api/v1/account/preferences`). New accounts start with the cookie value (else AUD). After sign-in the saved value is applied.
3. Server-rendered and cached pages always render the default currency. The visitor's choice is applied right after the page loads, so pages stay cacheable. A visitor who chose another currency may see the default for a moment first.

## Budgets typed by visitors

A budget is interpreted in the visitor's currency and converted to USD once, at the boundary:

- `/discover`, `/trip-planner` and the public API take a `currency` parameter (case-insensitive, must be supported; **default AUD**). `budget=1500` with no currency means A$1,500.
- Internal service schemas (`discoverSchema`, `tripPlanSchema`) default to **USD**, so existing internal callers (SEO landing pages, sitemap, tests) are unchanged. Boundary schemas are `discoverRequestSchema` and `tripPlanRequestSchema`.
- The AI assistant treats an amount such as "Make this trip $300 cheaper" as being in the visitor's currency and replies in it.
- Search rows keep `budgetUsd`; trips keep `budgetUsd`. Price alerts keep `maxPriceUsd`.

## Exchange rates: NOT live

There is **no live exchange-rate provider** yet. `STATIC_RATE_TABLE` in `lib/currency/index.ts` holds approximate, hand-set development rates (units per 1 USD):

`USD 1 · AUD 1.50 · EUR 0.92 · GBP 0.79 · NZD 1.65 · CAD 1.37 · SGD 1.34` (as of 2026-09-19)

- The table is marked `live: false` and the UI says so (footer and selector tooltip): *"Amounts in other currencies use fixed, approximate exchange rates. They are not live rates."*
- Override for local testing: `FX_RATES_JSON='{"AUD":1.52,"EUR":0.93}'` (units per USD, positive numbers; USD cannot be overridden) and optionally `FX_RATES_AS_OF=2026-09-19`. Still reported as not live: an environment variable is not a market feed.
- Do not use these rates for pricing you will charge, settlement, or financial advice. Provider prices at checkout are set by the provider in the provider's currency.

### Adding a real FX provider

1. Implement `FxRateProvider` in `lib/currency/fx-provider.ts` (fetch rates, cache with `lib/cache`, return a `RateTable` with `live: true`, `source`, `asOf`).
2. Add it to `fxProviders` before the static provider (the first configured one wins; the static table remains the fallback if a provider fails).
3. Nothing else changes: the root layout passes the table to the client, and server code uses `getRateTable()`. The "not live" note disappears automatically when `live` is true.

## Known limitations

- Each displayed amount is rounded to whole units independently, so a line-by-line sum can differ from a displayed total by a unit.
- Prices you type into the trip editor are stored in whole USD, so an amount can drift by about one unit of your currency when it is shown again after you leave the field.
- Admin figures (commissions, revenue) are USD and are labelled `US$`.
- `/travel-budget/[amount]` landing pages are defined in USD and labelled `US$`.
- Currency is a display and input layer. It does not change which provider currency a booking partner uses.
