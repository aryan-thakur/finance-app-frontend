"use client";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatMoney } from "@/lib/money";

export function TransactionLineCard({
  logoAlt,
  institutionName,
  accountName,
  accountNumber,
  logoUrl,
  currency,
  direction, // "credit" | "debit"
  accountKind,
  amountMinor,
  note,
  timestamp,
}: {
  logoAlt: string;
  institutionName: string;
  accountName: string;
  accountNumber: string;
  logoUrl?: string | null;
  currency: string;
  direction: "credit" | "debit";
  accountKind: "asset" | "liability";
  amountMinor: number;
  note: string;
  timestamp: string;
}) {
  const colorClass = (() => {
    // Asset: credit green, debit red
    // Liability: credit red, debit green
    const isGreen = direction === "credit";
    return isGreen
      ? "bg-green-100 text-green-700 border-green-200"
      : "bg-red-100 text-red-700 border-red-200";
  })();
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          {/* Institution logo or initials */}
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logoUrl}
              alt={logoAlt}
              className="h-10 w-10 rounded object-contain bg-transparent"
            />
          ) : (
            <div className="h-10 w-10 rounded bg-muted flex items-center justify-center text-sm font-medium">
              {institutionName.slice(0, 2).toUpperCase()}
            </div>
          )}
          <div>
            <div className="text-sm font-medium">{institutionName}</div>
            <div className="text-xs text-muted-foreground">
              {accountName} · {accountNumber} · {currency}
            </div>
          </div>
        </div>

        <div className="flex-1" />

        <div className="flex items-center gap-3">
          <Badge className={colorClass}>{direction}</Badge>
          <div className="text-sm font-semibold">
            {formatMoney(Math.round(Math.abs(amountMinor)), currency as any)}
          </div>
          <div className="text-xs text-muted-foreground">{timestamp}</div>
        </div>
      </div>

      <div className="mt-3 text-sm">{note}</div>
    </Card>
  );
}
