"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Edit, Trash2 } from "lucide-react";
import type { Account } from "@/lib/types";
import { formatMoney } from "@/lib/money";

interface AccountCardProps {
  account: Account;
  onSetBalance: (account: Account) => void;
  onEdit: (account: Account) => void;
  onDelete: (account: Account) => void;
  overrideBalanceMinor?: number;
  overrideCurrency?: "INR" | "USD" | "CAD";
}

export function AccountCard({
  account,
  onSetBalance,
  onEdit,
  onDelete,
  overrideBalanceMinor,
  overrideCurrency,
}: AccountCardProps) {
  const [institutionName, setInstitutionName] = useState<string>("");
  const [institutionLogo, setInstitutionLogo] = useState<string>("");

  useEffect(() => {
    let abort = false;
    (async () => {
      if (!account.institution_id) return;
      try {
        const res = await fetch(`/api/institutions/${account.institution_id}`, {
          cache: "no-store",
        });
        if (!res.ok) return;
        const data = await res.json();
        if (!abort && data) {
          setInstitutionName(data.name || "");
          setInstitutionLogo(data.logo_url || "");
        }
      } catch {}
    })();
    return () => {
      abort = true;
    };
  }, [account.institution_id]);

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((word) => word[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getCurrencyColor = (currency: string) => {
    switch (currency) {
      case "USD":
        return "bg-green-100 text-green-800";
      case "INR":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          {/* Institution logo on the left */}
          <div className="flex-shrink-0">
            {institutionLogo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={institutionLogo}
                alt={institutionName || account.name}
                className="h-20 w-20 rounded object-contain bg-transparent"
              />
            ) : (
              <div className="h-20 w-20 rounded bg-muted flex items-center justify-center text-sm font-semibold text-foreground/70">
                {getInitials(account.name)}
              </div>
            )}
          </div>

          {/* Account Details */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-sm truncate">{account.name}</h3>
              <Badge
                variant="secondary"
                className={`text-xs ${getCurrencyColor(account.base_currency)}`}
              >
                {account.base_currency}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mb-1">
              {institutionName || "-"}
            </p>
            <p className="text-xs text-muted-foreground mb-1">{account.type}</p>
            <p className="text-xs text-muted-foreground font-mono">
              {account.number_masked}
            </p>
          </div>

          {/* Balance and Actions */}
          <div className="flex flex-col items-end gap-2">
            {(() => {
              const displayMinor = overrideBalanceMinor ?? account.balance_minor;
              const colorClass =
                account.kind === "liability"
                  ? displayMinor > 0
                    ? "text-red-600"
                    : "text-green-600"
                  : displayMinor < 0
                  ? "text-red-600"
                  : "text-green-600";
              return (
                <div className={`text-2xl font-bold mb-2 ${colorClass}`}>
                  {formatMoney(
                    displayMinor,
                    (overrideCurrency as any) ?? account.base_currency
                  )}
                </div>
              );
            })()}

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onEdit(account)}
              >
                <Edit className="mr-2 h-4 w-4" /> Edit
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => onDelete(account)}
              >
                <Trash2 className="mr-2 h-4 w-4" /> Delete
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
