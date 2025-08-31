"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import type { Account, Currency } from "@/lib/types";
import { formatMoney } from "@/lib/money";

interface KpiCardsProps {
  accounts: Account[];
}

export function KpiCards({ accounts }: KpiCardsProps) {
  const assets = accounts.filter((acc) => acc.kind === "asset");
  const liabilities = accounts.filter((acc) => acc.kind === "liability");
  const investments = accounts.filter(
    (acc) =>
      acc.type !== undefined &&
      (acc.type === "fixed deposit" ||
        acc.type === "mutual fund" ||
        acc.type === "other investment")
  );

  // Exchange rates: base INR -> quote currencies
  const [rateUSD, setRateUSD] = useState<number>(0);
  const [rateCAD, setRateCAD] = useState<number>(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("https://open.er-api.com/v6/latest/INR");
        if (!res.ok) return;
        const data = await res.json();
        const r = data?.rates || {};
        if (!cancelled) {
          setRateUSD(typeof r.USD === "number" ? r.USD : 0);
          setRateCAD(typeof r.CAD === "number" ? r.CAD : 0);
        }
      } catch (e) {
        // ignore – show only INR if rates unavailable
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const toInrMinor = (amountMinor: number, currency: Currency): number => {
    if (currency === "INR") return amountMinor;
    if (currency === "USD" && rateUSD > 0) {
      const usdMajor = amountMinor / 100;
      const inrMajor = usdMajor / rateUSD; // since rateUSD = USD per 1 INR
      return Math.round(inrMajor * 100);
    }
    if (currency === "CAD" && rateCAD > 0) {
      const cadMajor = amountMinor / 100;
      const inrMajor = cadMajor / rateCAD;
      return Math.round(inrMajor * 100);
    }
    // Fallback: if no rate, treat as INR to avoid NaN
    return amountMinor;
  };

  const totalAssetsInrMinor = assets.reduce(
    (sum, acc) => sum + toInrMinor(acc.balance_minor, acc.base_currency),
    0
  );

  const totalLiabilitiesInrMinor = liabilities.reduce(
    (sum, acc) =>
      sum + Math.abs(toInrMinor(acc.balance_minor, acc.base_currency)),
    0
  );

  const totalInvestmentsInrMinor = investments.reduce(
    (sum, acc) => sum + toInrMinor(acc.balance_minor, acc.base_currency),
    0
  );

  const totalLiquidityInrMinor =
    totalAssetsInrMinor - totalInvestmentsInrMinor - totalLiabilitiesInrMinor;

  const netWorthInrMinor = totalAssetsInrMinor - totalLiabilitiesInrMinor;

  // Derive CAD/USD equivalents from INR using fetched rates
  const assetsCadMinor = Math.round(totalAssetsInrMinor * (rateCAD || 0));
  const assetsUsdMinor = Math.round(totalAssetsInrMinor * (rateUSD || 0));
  const liabilitiesCadMinor = Math.round(
    totalLiabilitiesInrMinor * (rateCAD || 0)
  );
  const liabilitiesUsdMinor = Math.round(
    totalLiabilitiesInrMinor * (rateUSD || 0)
  );
  const netWorthCadMinor = Math.round(netWorthInrMinor * (rateCAD || 0));
  const netWorthUsdMinor = Math.round(netWorthInrMinor * (rateUSD || 0));
  const investmentsCadMinor = Math.round(
    totalInvestmentsInrMinor * (rateCAD || 0)
  );
  const investmentsUsdMinor = Math.round(
    totalInvestmentsInrMinor * (rateUSD || 0)
  );
  const liquidityCadMinor = Math.round(totalLiquidityInrMinor * (rateCAD || 0));
  const liquidityUsdMinor = Math.round(totalLiquidityInrMinor * (rateUSD || 0));

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      <Card>
        <CardContent className="p-4">
          <div className="text-md font-medium text-muted-foreground">
            Total Assets
          </div>
          <div className="text-2xl font-bold text-green-600">
            {formatMoney(totalAssetsInrMinor, "INR")}
          </div>
          <div className="text-md text-muted-foreground">
            {formatMoney(assetsCadMinor, "CAD")} •{" "}
            {formatMoney(assetsUsdMinor, "USD")}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="text-md font-medium text-muted-foreground">
            Total Liabilities
          </div>
          <div className="text-2xl font-bold text-red-600">
            {formatMoney(totalLiabilitiesInrMinor, "INR")}
          </div>
          <div className="text-md text-muted-foreground">
            {formatMoney(liabilitiesCadMinor, "CAD")} •{" "}
            {formatMoney(liabilitiesUsdMinor, "USD")}
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
              netWorthInrMinor >= 0 ? "text-green-600" : "text-red-600"
            }`}
          >
            {formatMoney(netWorthInrMinor, "INR")}
          </div>
          <div className="text-md text-muted-foreground">
            {formatMoney(netWorthCadMinor, "CAD")} •{" "}
            {formatMoney(netWorthUsdMinor, "USD")}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="text-md font-medium text-muted-foreground">
            Total Investments
          </div>
          <div className="text-2xl font-bold text-muted-foreground">
            {formatMoney(totalInvestmentsInrMinor, "INR")}
          </div>
          <div className="text-md text-muted-foreground">
            {formatMoney(investmentsCadMinor, "CAD")} •{" "}
            {formatMoney(investmentsUsdMinor, "USD")}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="text-md font-medium text-muted-foreground">
            Total Liquidity
          </div>
          <div className="text-2xl font-bold text-muted-foreground">
            {formatMoney(totalLiquidityInrMinor, "INR")}
          </div>
          <div className="text-md text-muted-foreground">
            {formatMoney(liquidityCadMinor, "CAD")} •{" "}
            {formatMoney(liquidityUsdMinor, "USD")}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
