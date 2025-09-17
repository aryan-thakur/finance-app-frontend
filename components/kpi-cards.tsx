"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import type { Account, Currency } from "@/lib/types";
import { formatMoney } from "@/lib/money";

interface KpiCardsProps {
  accounts: Account[];
  viewCurrency: "base" | Currency;
}

export function KpiCards({ accounts, viewCurrency }: KpiCardsProps) {
  const SUPPORTED_CURRENCIES: Currency[] = ["INR", "USD", "CAD", "GBP"];
  const MINOR_FACTOR: Record<Currency, number> = {
    INR: 100,
    USD: 100,
    CAD: 100,
    GBP: 100,
  };

  const [targetCurrency, setTargetCurrency] = useState<Currency | null>(null);
  const [targetLoading, setTargetLoading] = useState(true);
  const [targetError, setTargetError] = useState(false);

  const [rates, setRates] = useState<Record<string, number> | null>(null);
  const [ratesLoading, setRatesLoading] = useState(false);
  const [ratesError, setRatesError] = useState(false);

  const assets = accounts.filter((acc) => acc.kind === "asset");
  const liabilities = accounts.filter((acc) => acc.kind === "liability");
  const investments = accounts.filter(
    (acc) =>
      acc.type !== undefined &&
      (acc.type === "fixed deposit" ||
        acc.type === "mutual fund" ||
        acc.type === "other investment")
  );

  useEffect(() => {
    let cancelled = false;

    if (viewCurrency === "base") {
      setRates(null);
      setRatesError(false);
      setRatesLoading(true);
      setTargetLoading(true);
      setTargetError(false);

      (async () => {
        try {
          const res = await fetch("/api/profile", { cache: "no-store" });
          if (!res.ok) throw new Error("Failed to load profile");
          const data = await res.json();
          const raw =
            typeof data?.base_currency === "string"
              ? data.base_currency.trim().toUpperCase()
              : "";
          if (!SUPPORTED_CURRENCIES.includes(raw as Currency)) {
            throw new Error("Unsupported base currency");
          }
          if (!cancelled) setTargetCurrency(raw as Currency);
        } catch (e) {
          if (!cancelled) {
            setTargetCurrency(null);
            setTargetError(true);
            setRatesLoading(false);
          }
        }
        if (!cancelled) setTargetLoading(false);
      })();
    } else {
      setTargetLoading(false);
      setTargetError(false);

      if (targetCurrency !== viewCurrency) {
        setRates(null);
        setRatesError(false);
        setRatesLoading(true);
        setTargetCurrency(viewCurrency);
      } else {
        setRatesLoading(false);
      }
    }

    return () => {
      cancelled = true;
    };
  }, [viewCurrency]);

  useEffect(() => {
    if (!targetCurrency) {
      setRates(null);
      setRatesLoading(false);
      return;
    }

    let cancelled = false;
    setRatesLoading(true);
    setRatesError(false);
    setRates(null);

    (async () => {
      try {
        const res = await fetch(
          `https://open.er-api.com/v6/latest/${targetCurrency}`
        );
        if (!res.ok) throw new Error("Failed to load rates");
        const data = await res.json();
        const r = data?.rates;
        if (!r || typeof r !== "object") {
          throw new Error("Invalid rates response");
        }
        if (!cancelled) {
          const map = { ...r };
          map[targetCurrency] = 1;
          setRates(map);
        }
      } catch (e) {
        if (!cancelled) {
          setRates(null);
          setRatesError(true);
        }
      }
      if (!cancelled) setRatesLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [targetCurrency]);

  const convertToTargetMinor = (
    amountMinor: number,
    currency: Currency
  ): number | null => {
    if (!targetCurrency) return null;
    if (currency === targetCurrency) return amountMinor;
    if (!rates) return null;
    const rate = rates[currency];
    if (typeof rate !== "number" || rate <= 0) return null;
    const fromFactor = MINOR_FACTOR[currency];
    const targetFactor = MINOR_FACTOR[targetCurrency];
    const fromMajor = amountMinor / fromFactor;
    const targetMajor = fromMajor / rate;
    return Math.round(targetMajor * targetFactor);
  };

  let conversionFailed = false;

  const sumConverted = (
    list: Account[],
    transform: (value: number) => number
  ): number => {
    return list.reduce((acc, account) => {
      const converted = convertToTargetMinor(
        account.balance_minor,
        account.base_currency
      );
      if (converted === null) {
        conversionFailed = true;
        return acc;
      }
      return acc + transform(converted);
    }, 0);
  };

  const totalAssetsMinor = sumConverted(assets, (value) => value);
  const totalLiabilitiesMinor = sumConverted(liabilities, (value) => Math.abs(value));
  const totalInvestmentsMinor = sumConverted(investments, (value) => value);
  const totalLiquidityMinor =
    totalAssetsMinor - totalInvestmentsMinor - totalLiabilitiesMinor;
  const netWorthMinor = totalAssetsMinor - totalLiabilitiesMinor;

  const shouldShowFallback =
    targetError ||
    !targetCurrency ||
    ratesError ||
    !rates ||
    conversionFailed;

  if (targetLoading || ratesLoading) {
    return null;
  }

  if (shouldShowFallback) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="p-4 text-muted-foreground">
            select base currency
          </CardContent>
        </Card>
      </div>
    );
  }

  const displayCurrency = targetCurrency as Currency;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      <Card>
        <CardContent className="p-4">
          <div className="text-md font-medium text-muted-foreground">
            Total Assets
          </div>
          <div className="text-2xl font-bold text-green-600">
            {formatMoney(totalAssetsMinor, displayCurrency)}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="text-md font-medium text-muted-foreground">
            Total Liabilities
          </div>
          <div className="text-2xl font-bold text-red-600">
            {formatMoney(totalLiabilitiesMinor, displayCurrency)}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="text-md font-medium text-muted-foreground">
            Net Worth
          </div>
          <div
            className={`text-2xl font-bold ${
              netWorthMinor >= 0 ? "text-green-600" : "text-red-600"
            }`}
          >
            {formatMoney(netWorthMinor, displayCurrency)}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="text-md font-medium text-muted-foreground">
            Total Investments
          </div>
          <div className="text-2xl font-bold text-muted-foreground">
            {formatMoney(totalInvestmentsMinor, displayCurrency)}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="text-md font-medium text-muted-foreground">
            Total Liquidity
          </div>
          <div className="text-2xl font-bold text-muted-foreground">
            {formatMoney(totalLiquidityMinor, displayCurrency)}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
