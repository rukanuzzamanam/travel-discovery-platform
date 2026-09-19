/**
 * Central currency module. Pure and isomorphic (safe in server and client components).
 *
 * All stored and computed amounts in Tripora are USD (the BASE_CURRENCY). This module is the ONLY place that
 * converts and formats money for display. Components must not do their own conversion or call
 * Intl.NumberFormat with a currency.
 *
 * Exchange rates: see ./rates.ts. Unless a live FX provider is configured, rates are static development values.
 */

export const SUPPORTED_CURRENCIES = ["AUD", "USD", "EUR", "GBP", "NZD", "CAD", "SGD"] as const;
export type Currency = (typeof SUPPORTED_CURRENCIES)[number];

/** Currency shown when the visitor has not chosen one. */
export const DEFAULT_CURRENCY: Currency = "AUD";

/** All stored prices (DB, estimator, catalogue) are in this currency. */
export const BASE_CURRENCY: Currency = "USD";

type CurrencyInfo = { code: Currency; name: string; symbol: string };

/**
 * Symbols are explicit so no two currencies share an ambiguous "$":
 * A$ (AUD), US$ (USD), NZ$ (NZD), C$ (CAD), S$ (SGD). Fixed here rather than taken from ICU so output is
 * identical on every server and browser.
 */
export const CURRENCY_INFO: Record<Currency, CurrencyInfo> = {
  AUD: { code: "AUD", name: "Australian dollar", symbol: "A$" },
  USD: { code: "USD", name: "US dollar", symbol: "US$" },
  EUR: { code: "EUR", name: "Euro", symbol: "€" },
  GBP: { code: "GBP", name: "British pound", symbol: "£" },
  NZD: { code: "NZD", name: "New Zealand dollar", symbol: "NZ$" },
  CAD: { code: "CAD", name: "Canadian dollar", symbol: "C$" },
  SGD: { code: "SGD", name: "Singapore dollar", symbol: "S$" },
};

export class UnsupportedCurrencyError extends Error {
  constructor(public readonly value: unknown) {
    super(`Unsupported currency: ${String(value)}`);
    this.name = "UnsupportedCurrencyError";
  }
}

export function isSupportedCurrency(value: unknown): value is Currency {
  return typeof value === "string" && (SUPPORTED_CURRENCIES as readonly string[]).includes(value);
}

/** Throws UnsupportedCurrencyError for anything that is not a supported code (case-sensitive, upper-case). */
export function assertCurrency(value: unknown): Currency {
  if (!isSupportedCurrency(value)) throw new UnsupportedCurrencyError(value);
  return value;
}

/** Lenient parse for untrusted input (cookies, query strings): normalises case and falls back instead of throwing. */
export function parseCurrency(value: unknown, fallback: Currency = DEFAULT_CURRENCY): Currency {
  if (typeof value !== "string") return fallback;
  const upper = value.trim().toUpperCase();
  return isSupportedCurrency(upper) ? upper : fallback;
}

// ───────────────────────────── Rates ─────────────────────────────

/** How many units of each currency equal 1 unit of `base`. */
export type RateTable = {
  base: Currency;
  rates: Record<Currency, number>;
  /** True ONLY when the rates come from a real exchange-rate provider. The static table is never live. */
  live: boolean;
  /** Where the rates came from, e.g. "static-dev" or a provider id. */
  source: string;
  /** ISO date/time the rates were set or fetched. */
  asOf: string;
};

/**
 * STATIC DEVELOPMENT RATES. Approximate, hand-set, NOT live and NOT for settlement or advice.
 * Replace by plugging a real provider into lib/currency/fx-provider.ts (see docs/currency.md).
 * Values: units of currency per 1 USD.
 */
export const STATIC_RATE_TABLE: RateTable = {
  base: "USD",
  rates: { USD: 1, AUD: 1.5, EUR: 0.92, GBP: 0.79, NZD: 1.65, CAD: 1.37, SGD: 1.34 },
  live: false,
  source: "static-dev",
  asOf: "2026-09-19",
};

/**
 * Convert `amount` between supported currencies via the table's base currency.
 * Returns an unrounded number: round only when displaying. Throws UnsupportedCurrencyError for unknown codes.
 */
export function convertCurrency(amount: number, from: Currency, to: Currency, table: RateTable = STATIC_RATE_TABLE): number {
  assertCurrency(from);
  assertCurrency(to);
  if (!Number.isFinite(amount)) throw new RangeError("Amount must be a finite number");
  if (from === to) return amount;
  const perBaseFrom = table.rates[from];
  const perBaseTo = table.rates[to];
  if (!(perBaseFrom > 0) || !(perBaseTo > 0)) throw new RangeError(`No exchange rate available for ${from} → ${to}`);
  return (amount / perBaseFrom) * perBaseTo;
}

/** Convenience: stored USD → display currency. */
export const fromBase = (amountUsd: number, to: Currency, table: RateTable = STATIC_RATE_TABLE) => convertCurrency(amountUsd, BASE_CURRENCY, to, table);

/** Convenience: user-entered amount in their currency → stored USD (rounded to whole USD, the storage unit). */
export const toBase = (amount: number, from: Currency, table: RateTable = STATIC_RATE_TABLE) => Math.round(convertCurrency(amount, from, BASE_CURRENCY, table));

// ───────────────────────────── Formatting ─────────────────────────────

const grouping = (digits: number) => new Intl.NumberFormat("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits });
const G0 = grouping(0);
const G2 = grouping(2);

/**
 * Format an amount that is ALREADY in `currency` (no conversion): A$1,500 · US$1,500 · €1,500 · £1,500.
 * Whole units by default; pass fractionDigits: 2 for small amounts such as commissions.
 */
export function formatCurrency(amount: number, currency: Currency = DEFAULT_CURRENCY, opts: { fractionDigits?: 0 | 2 } = {}): string {
  const { symbol } = CURRENCY_INFO[assertCurrency(currency)];
  if (!Number.isFinite(amount)) throw new RangeError("Amount must be a finite number");
  const digits = opts.fractionDigits ?? 0;
  const rounded = Number(Math.abs(amount).toFixed(digits));
  const body = (digits === 0 ? G0 : G2).format(rounded);
  return `${amount < 0 && rounded !== 0 ? "-" : ""}${symbol}${body}`;
}

/** Stored USD amount → formatted string in `currency`. This is what `<Money>` uses. */
export function formatMoney(amountUsd: number, currency: Currency = DEFAULT_CURRENCY, table: RateTable = STATIC_RATE_TABLE, opts: { fractionDigits?: 0 | 2 } = {}): string {
  return formatCurrency(fromBase(amountUsd, currency, table), currency, opts);
}

// ───────────────────────────── Preference storage ─────────────────────────────

/** Cookie holding the visitor's chosen display currency. Not sensitive; readable by the client. */
export const CURRENCY_COOKIE = "tripora_currency";
