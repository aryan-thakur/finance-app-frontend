import type { Currency } from "./types";

const CURRENCY_SYMBOLS: Record<Currency, string> = {
  INR: "₹",
  USD: "$",
  CAD: "C$",
  GBP: "£",
};

const CURRENCY_DECIMALS: Record<Currency, number> = {
  INR: 100, // paise
  USD: 100, // cents
  CAD: 100, // cents
  GBP: 100, // pence
};

export function formatMoney(amountMinor: number, currency: Currency): string {
  const symbol = CURRENCY_SYMBOLS[currency];
  const decimals = CURRENCY_DECIMALS[currency];
  const amount = Math.abs(amountMinor) / decimals;

  // Format with appropriate locale
  let formatted: string;
  if (currency === "INR") {
    // Indian number formatting
    formatted = amount.toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  } else {
    formatted = amount.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  const sign = amountMinor < 0 ? "-" : "";
  return `${sign}${symbol}${formatted}`;
}

export function parseMoney(value: string, currency: Currency): number {
  const decimals = CURRENCY_DECIMALS[currency];
  const cleanValue = value.replace(/[^\d.-]/g, "");
  const amount = Number.parseFloat(cleanValue) || 0;
  return Math.round(amount * decimals);
}
