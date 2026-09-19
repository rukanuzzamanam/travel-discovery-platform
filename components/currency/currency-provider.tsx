"use client";

import { createContext, useCallback, useContext, useMemo, useSyncExternalStore } from "react";
import {
  CURRENCY_COOKIE,
  DEFAULT_CURRENCY,
  STATIC_RATE_TABLE,
  convertCurrency,
  formatMoney,
  fromBase,
  parseCurrency,
  toBase,
  type Currency,
  type RateTable,
} from "@/lib/currency";

/**
 * Client-side currency context. Stored amounts are USD; this only decides how they are shown.
 * The choice lives in a cookie (readable here) and, for signed-in users, in UserPreference.currency.
 *
 * Server-rendered HTML (and static/ISR pages) always render the default currency. After hydration the
 * visitor's saved choice is applied, so pages stay cacheable and there is no hydration mismatch.
 */

type Ctx = { currency: Currency; setCurrency: (c: Currency) => void; table: RateTable };

const FALLBACK: Ctx = { currency: DEFAULT_CURRENCY, setCurrency: () => {}, table: STATIC_RATE_TABLE };
const CurrencyContext = createContext<Ctx>(FALLBACK);

const EVENT = "tripora:currency";

function readCookie(): string {
  const hit = document.cookie.split("; ").find((c) => c.startsWith(`${CURRENCY_COOKIE}=`));
  return hit ? decodeURIComponent(hit.slice(CURRENCY_COOKIE.length + 1)) : "";
}

function subscribe(cb: () => void) {
  window.addEventListener(EVENT, cb);
  return () => window.removeEventListener(EVENT, cb);
}

export function writeCurrencyCookie(currency: Currency) {
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${CURRENCY_COOKIE}=${currency}; Path=/; Max-Age=31536000; SameSite=Lax${secure}`;
  window.dispatchEvent(new Event(EVENT));
}

/** After sign-in: adopt the currency saved on the account (if any). */
export async function syncCurrencyFromAccount() {
  try {
    const res = await fetch("/api/v1/account/preferences");
    const json = await res.json();
    const saved = json?.data?.currency;
    if (json?.success && typeof saved === "string") writeCurrencyCookie(parseCurrency(saved));
  } catch {
    /* preference sync is best-effort */
  }
}

export function CurrencyProvider({ table, children }: { table: RateTable; children: React.ReactNode }) {
  const raw = useSyncExternalStore(subscribe, readCookie, () => "");
  const currency = parseCurrency(raw);

  const setCurrency = useCallback((c: Currency) => {
    writeCurrencyCookie(c);
    // Persist for signed-in users; anonymous visitors get a harmless 401 which we ignore.
    void fetch("/api/v1/account/preferences", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currency: c }),
    }).catch(() => {});
  }, []);

  const value = useMemo(() => ({ currency, setCurrency, table }), [currency, setCurrency, table]);
  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
}

export const useCurrency = () => useContext(CurrencyContext);

/** Formatter for string contexts inside client components: format(usd) → "A$1,500". */
export function useMoneyFormatter() {
  const { currency, table } = useCurrency();
  return useCallback((usd: number, fractionDigits?: 0 | 2) => formatMoney(usd, currency, table, { fractionDigits }), [currency, table]);
}

/** Convert between stored USD and the amount the visitor sees/types. */
export function useAmountConverters() {
  const { currency, table } = useCurrency();
  return useMemo(
    () => ({
      currency,
      toDisplay: (usd: number) => Math.round(fromBase(usd, currency, table)),
      toStored: (amount: number) => toBase(amount, currency, table),
      convert: (amount: number, from: Currency, to: Currency) => convertCurrency(amount, from, to, table),
    }),
    [currency, table],
  );
}

/** Renders a stored USD amount in the visitor's currency. Use this instead of formatting money by hand. */
export function Money({ usd, fractionDigits, className }: { usd: number; fractionDigits?: 0 | 2; className?: string }) {
  const { currency, table } = useCurrency();
  return <span className={className}>{formatMoney(usd, currency, table, { fractionDigits })}</span>;
}

/** Explains that non-live rates are approximate. Renders nothing when rates are live. */
export function CurrencyNote({ className }: { className?: string }) {
  const { table } = useCurrency();
  if (table.live) return null;
  return <span className={className}>Amounts in other currencies use fixed, approximate exchange rates. They are not live rates.</span>;
}
