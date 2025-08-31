"use client";

import type React from "react";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSetBalance } from "@/hooks/use-accounts";
import type { Account } from "@/lib/types";
import { formatMoney, parseMoney } from "@/lib/money";

interface SetBalanceDialogProps {
  account: Account | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SetBalanceDialog({
  account,
  open,
  onOpenChange,
}: SetBalanceDialogProps) {
  const [newBalance, setNewBalance] = useState("");
  const [error, setError] = useState("");

  const setBalanceMutation = useSetBalance();

  // Reset form when dialog opens/closes or account changes
  useEffect(() => {
    if (open && account) {
      // Convert current balance from minor units to display format
      const currentBalanceDisplay = Math.abs(account.balance_minor) / 100;
      setNewBalance(currentBalanceDisplay.toFixed(2));
      setError("");
    } else {
      setNewBalance("");
      setError("");
    }
  }, [open, account]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!account) return;

    // Validate input
    const balanceValue = Number.parseFloat(newBalance);
    if (isNaN(balanceValue)) {
      setError("Please enter a valid number");
      return;
    }

    if (balanceValue < 0) {
      setError("Balance cannot be negative");
      return;
    }

    try {
      // Convert to minor units and handle liability accounts (negative balances)
      let balance_minor = parseMoney(newBalance, account.base_currency);

      // For liability accounts, store as negative
      if (account.kind === "liability" && balance_minor > 0) {
        balance_minor = -balance_minor;
      }

      await setBalanceMutation.mutateAsync({
        accountId: account.id,
        balanceMinor: balance_minor,
      });

      onOpenChange(false);
    } catch (error) {
      // Error handling is done in the mutation hook
    }
  };

  const handleInputChange = (value: string) => {
    setNewBalance(value);
    if (error) {
      setError("");
    }
  };

  if (!account) return null;

  const currentBalanceFormatted = formatMoney(
    account.balance_minor,
    account.base_currency
  );
  const isLiability = account.kind === "liability";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Set Balance</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Account Info */}
          <div className="p-4 bg-muted rounded-lg">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-xs font-semibold text-gray-600">
                {account.name
                  .split(" ")
                  .map((word) => word[0])
                  .join("")
                  .toUpperCase()
                  .slice(0, 2)}
              </div>
              <div>
                <h3 className="font-semibold text-sm">{account.name}</h3>
                <p className="text-xs text-muted-foreground">
                  {account.institution_id}
                </p>
              </div>
            </div>
          </div>

          {/* Current Balance */}
          <div className="space-y-2">
            <Label>Current Balance</Label>
            <div
              className={`text-lg font-semibold ${
                account.balance_minor < 0 ? "text-red-600" : "text-green-600"
              }`}
            >
              {currentBalanceFormatted}
            </div>
          </div>

          {/* New Balance Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="newBalance">
                New Balance {isLiability ? "(amount owed)" : ""}
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">
                  {account.base_currency === "INR" ? "₹" : "$"}
                </span>
                <Input
                  id="newBalance"
                  type="number"
                  step="0.01"
                  min="0"
                  value={newBalance}
                  onChange={(e) => handleInputChange(e.target.value)}
                  placeholder="0.00"
                  className={`pl-8 ${error ? "border-red-500" : ""}`}
                />
                <div
                  className={`text-lg font-semibold ${
                    account.balance_minor < 0
                      ? "text-red-600"
                      : "text-green-600"
                  }`}
                >
                  {currentBalanceFormatted}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end space-x-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={setBalanceMutation.isPending}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={setBalanceMutation.isPending}>
                  {setBalanceMutation.isPending
                    ? "Updating..."
                    : "Update Balance"}
                </Button>
              </div>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
