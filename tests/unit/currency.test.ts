import { afterEach, describe, expect, it } from "vitest";
import {
  BASE_CURRENCY,
  CURRENCY_INFO,
  DEFAULT_CURRENCY,
  STATIC_RATE_TABLE,
  SUPPORTED_CURRENCIES,
  UnsupportedCurrencyError,
  assertCurrency,
  convertCurrency,
  formatCurrency,
  formatMoney,
  fromBase,
  isSupportedCurrency,
  parseCurrency,
  toBase,
  type RateTable,
} from "@/lib/currency";
import { StaticFxRateProvider, getRateTable } from "@/lib/currency/fx-provider";

describe("supported currencies and default", () => {
  it("supports exactly AUD, USD, EUR, GBP, NZD, CAD and SGD", () => {
    expect([...SUPPORTED_CURRENCIES].sort()).toEqual(["AUD", "CAD", "EUR", "GBP", "NZD", "SGD", "USD"]);
  });

  it("defaults to AUD while storing amounts in USD", () => {
    expect(DEFAULT_CURRENCY).toBe("AUD");
    expect(BASE_CURRENCY).toBe("USD");
  });

  it("parseCurrency falls back to the default for missing or invalid input", () => {
    expect(parseCurrency(undefined)).toBe("AUD");
    expect(parseCurrency(null)).toBe("AUD");
    expect(parseCurrency("")).toBe("AUD");
    expect(parseCurrency("XYZ")).toBe("AUD");
    expect(parseCurrency(42)).toBe("AUD");
    expect(parseCurrency("XYZ", "USD")).toBe("USD");
  });

  it("parseCurrency normalises case and whitespace", () => {
    expect(parseCurrency("eur")).toBe("EUR");
    expect(parseCurrency(" gbp ")).toBe("GBP");
  });
});

describe("formatting", () => {
  it("formats AUD as A$ (never a bare $)", () => {
    expect(formatCurrency(1500, "AUD")).toBe("A$1,500");
    expect(formatCurrency(1500)).toBe("A$1,500"); // default currency
  });

  it("formats USD as US$", () => {
    expect(formatCurrency(1500, "USD")).toBe("US$1,500");
  });

  it("formats EUR and GBP with their symbols", () => {
    expect(formatCurrency(1500, "EUR")).toBe("€1,500");
    expect(formatCurrency(1234567, "GBP")).toBe("£1,234,567");
  });

  it("formats NZD, CAD and SGD unambiguously", () => {
    expect(formatCurrency(1500, "NZD")).toBe("NZ$1,500");
    expect(formatCurrency(1500, "CAD")).toBe("C$1,500");
    expect(formatCurrency(1500, "SGD")).toBe("S$1,500");
  });

  it("never produces an ambiguous leading '$'", () => {
    for (const c of SUPPORTED_CURRENCIES) expect(formatCurrency(10, c)).not.toMatch(/^-?\$/);
    expect(new Set(SUPPORTED_CURRENCIES.map((c) => CURRENCY_INFO[c].symbol)).size).toBe(SUPPORTED_CURRENCIES.length);
  });

  it("rounds to whole units by default and supports cents", () => {
    expect(formatCurrency(1499.6, "AUD")).toBe("A$1,500");
    expect(formatCurrency(12.5, "USD", { fractionDigits: 2 })).toBe("US$12.50");
    expect(formatCurrency(0, "AUD")).toBe("A$0");
  });

  it("puts the minus sign before the symbol and hides negative zero", () => {
    expect(formatCurrency(-250, "AUD")).toBe("-A$250");
    expect(formatCurrency(-0.2, "AUD")).toBe("A$0");
  });

  it("formatMoney converts stored USD then formats", () => {
    expect(formatMoney(1000, "AUD")).toBe("A$1,500");
    expect(formatMoney(1000, "USD")).toBe("US$1,000");
    expect(formatMoney(1000, "EUR")).toBe("€920");
  });
});

describe("conversion", () => {
  it("converts USD to AUD and back using the static table", () => {
    expect(convertCurrency(100, "USD", "AUD")).toBeCloseTo(150, 6);
    expect(convertCurrency(150, "AUD", "USD")).toBeCloseTo(100, 6);
  });

  it("converts between two non-base currencies through the base", () => {
    expect(convertCurrency(150, "AUD", "EUR")).toBeCloseTo(92, 6);
    expect(convertCurrency(92, "EUR", "GBP")).toBeCloseTo(79, 6);
  });

  it("is the identity for the same currency and for zero", () => {
    expect(convertCurrency(123.45, "AUD", "AUD")).toBe(123.45);
    expect(convertCurrency(0, "AUD", "EUR")).toBe(0);
  });

  it("round-trips within floating-point tolerance", () => {
    for (const a of SUPPORTED_CURRENCIES) for (const b of SUPPORTED_CURRENCIES) expect(convertCurrency(convertCurrency(1234, a, b), b, a)).toBeCloseTo(1234, 6);
  });

  it("accepts a custom rate table (how a live provider plugs in)", () => {
    const table: RateTable = { ...STATIC_RATE_TABLE, rates: { ...STATIC_RATE_TABLE.rates, AUD: 2 }, live: true, source: "test" };
    expect(convertCurrency(10, "USD", "AUD", table)).toBe(20);
    expect(formatMoney(10, "AUD", table)).toBe("A$20");
  });

  it("fromBase / toBase helpers use whole-dollar storage", () => {
    expect(fromBase(100, "AUD")).toBeCloseTo(150, 6);
    expect(toBase(1500, "AUD")).toBe(1000);
    expect(toBase(100, "AUD")).toBe(67);
  });

  it("rejects invalid currencies and amounts", () => {
    expect(() => convertCurrency(10, "USD", "XYZ" as never)).toThrow(UnsupportedCurrencyError);
    expect(() => convertCurrency(10, "abc" as never, "USD")).toThrow(UnsupportedCurrencyError);
    expect(() => formatCurrency(10, "BTC" as never)).toThrow(UnsupportedCurrencyError);
    expect(() => assertCurrency("aud")).toThrow(UnsupportedCurrencyError); // strict: exact upper-case code only
    expect(() => convertCurrency(Number.NaN, "USD", "AUD")).toThrow(RangeError);
    expect(() => formatCurrency(Number.POSITIVE_INFINITY, "AUD")).toThrow(RangeError);
    expect(isSupportedCurrency("AUD")).toBe(true);
    expect(isSupportedCurrency("aud")).toBe(false);
    expect(isSupportedCurrency(undefined)).toBe(false);
  });

  it("refuses to convert when a rate is missing or zero", () => {
    const broken: RateTable = { ...STATIC_RATE_TABLE, rates: { ...STATIC_RATE_TABLE.rates, EUR: 0 } };
    expect(() => convertCurrency(10, "USD", "EUR", broken)).toThrow(RangeError);
  });
});

describe("FX rate provider (static development rates)", () => {
  const saved = process.env.FX_RATES_JSON;
  afterEach(() => {
    if (saved === undefined) delete process.env.FX_RATES_JSON;
    else process.env.FX_RATES_JSON = saved;
  });

  it("never claims to be live", async () => {
    delete process.env.FX_RATES_JSON;
    const t = await getRateTable();
    expect(t.live).toBe(false);
    expect(t.source).toBe("static-dev");
    expect(t.base).toBe("USD");
    expect(t.rates.USD).toBe(1);
  });

  it("supports a configurable override but still reports not-live", async () => {
    process.env.FX_RATES_JSON = JSON.stringify({ AUD: 1.6, EUR: 0.9, USD: 5, XYZ: 3 });
    const t = await new StaticFxRateProvider().getRates();
    expect(t.rates.AUD).toBe(1.6);
    expect(t.rates.EUR).toBe(0.9);
    expect(t.rates.USD).toBe(1); // the base rate can't be overridden
    expect(t.live).toBe(false);
    expect(t.source).toBe("static-env");
  });

  it("ignores invalid override JSON", async () => {
    process.env.FX_RATES_JSON = "{not json";
    expect((await getRateTable()).rates.AUD).toBe(STATIC_RATE_TABLE.rates.AUD);
    process.env.FX_RATES_JSON = JSON.stringify({ AUD: -1 });
    expect((await getRateTable()).rates.AUD).toBe(STATIC_RATE_TABLE.rates.AUD);
  });
});
