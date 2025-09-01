"use client";

import type React from "react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Transaction, Account, Institution } from "../../lib/types";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { TransactionLineCard } from "../transactions/transaction-line-card";
import { useEffect, useMemo, useState } from "react";

export function ViewTransactionDialog({
  tx,
  open,
  onOpenChange,
  accounts,
  institutions,
}: {
  tx: Transaction;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accounts: Account[];
  institutions: Institution[];
}) {
  const hasMeta = tx.meta && Object.keys(tx.meta).length > 0;
  const [lines, setLines] = useState<any[]>([]);

  useEffect(() => {
    if (!open) return;
    (async () => {
      try {
        const res = await fetch(`/api/transactions/${tx.id}`, { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        setLines(Array.isArray(data?.lines) ? data.lines : []);
      } catch {}
    })();
  }, [open, tx.id]);

  const accountById = useMemo(() => {
    const m = new Map<string, Account>();
    accounts.forEach((a) => m.set(a.id, a));
    return (id: string) => m.get(id);
  }, [accounts]);

  const institutionNameById = useMemo(() => {
    const m = new Map<string, string>();
    institutions.forEach((i) => m.set(i.id, i.name));
    return (id: string | null) => (id ? m.get(id) || "" : "");
  }, [institutions]);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Transaction Details</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid grid-cols-2 gap-4">
            <Detail
              label="Timestamp"
              value={new Date(tx.timestamp).toLocaleString()}
            />
            <Detail label="Kind" value={tx.kind} />
            <Detail
              label="Description"
              value={tx.description}
              className="col-span-2"
            />
            {hasMeta && (
              <Detail
                label="Meta"
                value={
                  <pre className="text-xs p-2 rounded bg-muted overflow-auto">
                    {JSON.stringify(tx.meta, null, 2)}
                  </pre>
                }
                className="col-span-2"
              />
            )}
            {tx.reversed && (
              <div className="col-span-2 flex items-center gap-2">
                <Badge variant="default">Reversed</Badge>
              </div>
            )}
          </div>

          <Separator />

          <div className="space-y-3">
            <div className="text-sm font-medium">Transaction Lines</div>
            {lines.length === 0 ? (
              <div className="text-sm text-muted-foreground">No lines</div>
            ) : (
              lines.map((ln) => {
                const acc = accountById(ln.account_id);
                const instName = institutionNameById(acc?.institution_id ?? null);
                const inst = acc ? institutions.find(i => i.id === acc.institution_id) : null;
                const numberMasked = acc?.number_masked || (acc?.number_full ? `•••• ${acc.number_full.slice(-4)}` : "");
                return (
                  <TransactionLineCard
                    key={ln.id}
                    logoAlt={instName || "Institution"}
                    institutionName={instName || ""}
                    accountName={acc?.name || ln.account_id}
                    accountNumber={numberMasked}
                    currency={(acc?.base_currency as any) || "INR"}
                    logoUrl={inst?.logo_url as any}
                    accountKind={(acc?.kind as any) || "asset"}
                    amountMinor={Number(ln.amount_minor)}
                    direction={ln.direction}
                    note={ln.note || ""}
                    timestamp={new Date(ln.created_at || tx.timestamp).toLocaleString()}
                  />
                );
              })
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Detail({
  label,
  value,
  className,
}: {
  label: string;
  value: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-sm">{value}</div>
    </div>
  );
}
