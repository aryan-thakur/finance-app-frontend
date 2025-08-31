"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { Account, Transaction } from "../../lib/types";
import { useMemo, useState } from "react";

export function EditTransactionDialog({
  tx,
  open,
  onOpenChange,
  onSaved,
  accounts,
}: {
  tx: Transaction;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: () => void;
  accounts: Account[];
}) {
  const [meta, setMeta] = useState(
    tx.meta && Object.keys(tx.meta).length
      ? JSON.stringify(tx.meta, null, 2)
      : "{}"
  );
  const [amount, setAmount] = useState<number>(tx.amount ?? 0);
  const [kind, setKind] = useState<string>(tx.kind ?? "");
  const [description, setDescription] = useState<string>(tx.description ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>("");
  const [fromAccountId, setFromAccountId] = useState<string>("");
  const [toAccountId, setToAccountId] = useState<string>("");

  // Try to preselect based on names if we can match
  useMemo(() => {
    if (!fromAccountId && tx.fromAccountName) {
      const found = accounts.find((a) => a.name === tx.fromAccountName);
      if (found) setFromAccountId(found.id);
    }
    if (!toAccountId && tx.toAccountName) {
      const found = accounts.find((a) => a.name === tx.toAccountName);
      if (found) setToAccountId(found.id);
    }
  }, [accounts, tx.fromAccountName, tx.toAccountName]);

  const fromAccount = useMemo(
    () => accounts.find((a) => a.id === fromAccountId) || null,
    [accounts, fromAccountId]
  );
  const toAccount = useMemo(
    () => accounts.find((a) => a.id === toAccountId) || null,
    [accounts, toAccountId]
  );
  const hasCurrencyConflict = !!(
    fromAccount &&
    toAccount &&
    fromAccount.base_currency !== toAccount.base_currency
  );
  const resolvedCurrency = hasCurrencyConflict
    ? ""
    : fromAccount?.base_currency || toAccount?.base_currency || tx.currency;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit Transaction</DialogTitle>
        </DialogHeader>

        <form
          className="grid gap-4 md:grid-cols-2"
          onSubmit={async (e) => {
            e.preventDefault();
            setError("");
            let parsedMeta: any | undefined = undefined;
            if (meta && meta.trim()) {
              try {
                parsedMeta = JSON.parse(meta);
              } catch {
                setError("Meta must be valid JSON");
                return;
              }
            }
            // Normalize "None" selections (value "0") to empty
            const fromId =
              fromAccountId && fromAccountId !== "0" ? fromAccountId : "";
            const toId = toAccountId && toAccountId !== "0" ? toAccountId : "";
            // Require at least one side specified
            if (!fromId && !toId) {
              setError("Select at least one account (From or To)");
              return;
            }
            const payload: any = {
              kind: kind || undefined,
              description: description || undefined,
              meta: parsedMeta,
              amount_minor:
                Math.round((Number(amount) || 0) * 100) || undefined,
              account_from: fromId || undefined,
              account_to: toId || undefined,
            };
            console.log("Payload:", payload);
            try {
              setSaving(true);
              const res = await fetch(`/api/transactions/${tx.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
              });
              if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(
                  data?.message || data?.detail || "Failed to update"
                );
              }
              onSaved?.();
              onOpenChange(false);
            } catch (err) {
              setError((err as Error).message);
            } finally {
              setSaving(false);
            }
          }}
        >
          {/* From account (real) */}
          <div className="space-y-2">
            <Label htmlFor="editFromAccount">From Account</Label>
            <Select value={fromAccountId} onValueChange={setFromAccountId}>
              <SelectTrigger id="editFromAccount" aria-label="From Account">
                <SelectValue placeholder="Select account" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">None</SelectItem>
                {accounts.map((acc) => (
                  <SelectItem key={acc.id} value={acc.id}>
                    {acc.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* To account (real) */}
          <div className="space-y-2">
            <Label htmlFor="editToAccount">To Account</Label>
            <Select value={toAccountId} onValueChange={setToAccountId}>
              <SelectTrigger id="editToAccount" aria-label="To Account">
                <SelectValue placeholder="Select account" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">None</SelectItem>
                {accounts.map((acc) => (
                  <SelectItem key={acc.id} value={acc.id}>
                    {acc.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Currency inferred; show and validate conflict */}
          <div className="space-y-2 md:col-span-2">
            <Label>Currency</Label>
            <div
              className={
                hasCurrencyConflict
                  ? "text-red-600 font-medium"
                  : "text-muted-foreground"
              }
            >
              {hasCurrencyConflict
                ? "Currency mismatch between selected accounts"
                : resolvedCurrency}
            </div>
          </div>

          {/* Amount */}
          <div className="space-y-2">
            <Label htmlFor="editAmount">Amount</Label>
            <Input
              id="editAmount"
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              className="w-28 appearance-none [appearance:textfield] [-moz-appearance:textfield] [::-webkit-outer-spin-button]:appearance-none [::-webkit-inner-spin-button]:appearance-none"
            />
          </div>

          {/* Kind */}
          <div className="space-y-2">
            <Label htmlFor="editKind">Kind</Label>
            <Select value={kind} onValueChange={setKind}>
              <SelectTrigger id="editKind" aria-label="Kind">
                <SelectValue placeholder="Select kind" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="transfer">transfer</SelectItem>
                <SelectItem value="income">income</SelectItem>
                <SelectItem value="expense">expense</SelectItem>
                <SelectItem value="adjustment">adjustment</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Description */}
          <div className="md:col-span-2 space-y-2">
            <Label htmlFor="editDescription">Description</Label>
            <Input
              id="editDescription"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {/* Meta */}
          <div className="md:col-span-2 space-y-2">
            <Label htmlFor="editMeta">Meta JSON</Label>
            <Textarea
              id="editMeta"
              rows={4}
              className="font-mono"
              value={meta}
              onChange={(e) => setMeta(e.target.value)}
            />
          </div>
          <DialogFooter>
            {error && (
              <div className="text-red-600 text-sm mr-auto">{error}</div>
            )}
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={
                saving ||
                hasCurrencyConflict ||
                ((fromAccountId === "" || fromAccountId === "0") &&
                  (toAccountId === "" || toAccountId === "0"))
              }
              title={
                hasCurrencyConflict
                  ? "Resolve currency mismatch"
                  : (fromAccountId === "" || fromAccountId === "0") &&
                    (toAccountId === "" || toAccountId === "0")
                  ? "Select at least one account"
                  : undefined
              }
            >
              {saving ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
