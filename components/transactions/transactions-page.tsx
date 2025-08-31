"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  ChevronLeft,
  ChevronRight,
  Edit3,
  Filter,
  MoreHorizontal,
  Trash2,
} from "lucide-react";
import { EditTransactionDialog } from "../transactions/edit-transaction-dialog";
import { ViewTransactionDialog } from "../transactions/view-transaction-dialog";
import type { Transaction, Account, Institution } from "../../lib/types";
import { formatMoney } from "../../lib/money";
export function TransactionsPage({
  lower,
  upper,
}: {
  lower: number;
  upper: number;
}) {
  const router = useRouter();
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [fromAccountId, setFromAccountId] = useState<string>("");
  const [toAccountId, setToAccountId] = useState<string>("");
  const [amountInput, setAmountInput] = useState<string>("");
  const [kindInput, setKindInput] = useState<string>("");
  const [descriptionInput, setDescriptionInput] = useState<string>("");
  const [metaInput, setMetaInput] = useState<string>("{}");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string>("");
  const [rows, setRows] = useState<Transaction[]>([]);
  const [loadingRows, setLoadingRows] = useState(true);
  const [loadError, setLoadError] = useState<string>("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [totalCount, setTotalCount] = useState<number | null>(null);
  // Filters
  const [selectedAccountIds, setSelectedAccountIds] = useState<Set<string>>(
    new Set()
  );
  const [selectedInstitutionIds, setSelectedInstitutionIds] = useState<
    Set<string>
  >(new Set());
  const [selectedOverall, setSelectedOverall] = useState<Set<string>>(
    new Set()
  ); // credit|debit|neutral
  const [selectedKinds, setSelectedKinds] = useState<Set<string>>(new Set());
  const [selectedCurrencies, setSelectedCurrencies] = useState<Set<string>>(
    new Set()
  );
  const [minAmount, setMinAmount] = useState("");
  const [maxAmount, setMaxAmount] = useState("");
  const [filtersApplied, setFiltersApplied] = useState(false);

  const toggleSet = (
    setter: (s: Set<string>) => void,
    current: Set<string>,
    value: string,
    checked: boolean
  ) => {
    const next = new Set(current);
    if (checked) next.add(value);
    else next.delete(value);
    setter(next);
  };

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
    : fromAccount?.base_currency || toAccount?.base_currency || "";

  // Preload accounts and institutions for reuse
  useEffect(() => {
    (async () => {
      try {
        const [accRes, instRes] = await Promise.all([
          fetch("/api/accounts", { cache: "no-store" }),
          fetch("/api/institutions", { cache: "no-store" }),
        ]);
        if (accRes.ok) {
          const accData = await accRes.json();
          const mapped: Account[] = (Array.isArray(accData) ? accData : []).map(
            (row: any) => ({
              id: row.id,
              institution_id: row.institution_id ?? null,
              name: row.name,
              kind: row.kind,
              type: row.type ?? undefined,
              base_currency: row.base_currency,
              number_full: row.number_full ?? undefined,
              number_masked: row.number_masked ?? undefined,
              credit_limit_minor:
                row.credit_limit_minor != null
                  ? Number(row.credit_limit_minor)
                  : undefined,
              balance_minor:
                row.computed_balance_minor != null
                  ? Number(row.computed_balance_minor)
                  : Number(row.balance_minor ?? 0),
              status: row.status ?? "active",
              meta: row.meta ?? {},
              created_at: row.created_at
                ? new Date(row.created_at)
                : new Date(),
              updated_at: row.updated_at
                ? new Date(row.updated_at)
                : new Date(),
            })
          );
          setAccounts(mapped);
        }
        if (instRes.ok) {
          const instData = await instRes.json();
          setInstitutions(Array.isArray(instData) ? instData : []);
        }
      } catch {}
    })();
  }, []);

  // Helper: transform backend rows into display rows with extra metadata
  const transformRows = (data: any[]): any[] => {
    return (Array.isArray(data) ? data : []).map((row: any) => {
      const lines: any[] = Array.isArray(row.lines) ? row.lines : [];
      const byAccount = new Map<string, number>();
      for (const ln of lines) {
        const minor = Number(ln.amount_minor);
        const signed = ln.direction === "credit" ? minor : -minor;
        byAccount.set(
          ln.account_id,
          (byAccount.get(ln.account_id) || 0) + signed
        );
      }
      let toId: string | null = null,
        toAmt = 0;
      let fromId: string | null = null,
        fromAmt = 0;
      for (const [accId, net] of byAccount.entries()) {
        if (net > 0 && net > toAmt) {
          toAmt = net;
          toId = accId;
        }
        if (net < 0 && net < fromAmt) {
          fromAmt = net;
          fromId = accId;
        }
      }
      const toAcc = accounts.find((a) => a.id === toId) || null;
      const fromAcc = accounts.find((a) => a.id === fromId) || null;
      const toInst =
        toAcc && institutions.find((i) => i.id === toAcc.institution_id);
      const fromInst =
        fromAcc && institutions.find((i) => i.id === fromAcc.institution_id);
      const currency = (toAcc?.base_currency ||
        fromAcc?.base_currency ||
        "INR") as any;
      const amountMajor = (toAmt !== 0 ? toAmt : Math.abs(fromAmt)) / 100;
      const overall = toAmt > 0 ? "credit" : fromAmt < 0 ? "debit" : "neutral";
      // compute pl kept from previous logic
      let pl = 0;
      if (!(fromAcc && toAcc)) {
        if (fromAcc) pl = fromAcc?.kind == "liability" ? 1 : -1;
        else pl = toAcc?.kind == "liability" ? -1 : 1;
      }
      return {
        id: row.id,
        fromAccountName: fromAcc?.name || "-",
        fromInstitution: fromInst?.name || "-",
        toAccountName: toAcc?.name || "-",
        toInstitution: toInst?.name || "-",
        currency,
        amount: amountMajor,
        kind: row.kind,
        description: row.description || "",
        timestamp: row.created_at || row.date,
        reversed: !!(row.reversal_of || row.reversed_by),
        meta: row.meta || {},
        pl,
        __fromAccountId: fromAcc?.id || null,
        __toAccountId: toAcc?.id || null,
        __fromInstitutionId: fromAcc?.institution_id || null,
        __toInstitutionId: toAcc?.institution_id || null,
        __overall: overall,
      } as any;
    });
  };

  // Load transactions (range) when no filters applied
  useEffect(() => {
    if (filtersApplied) return;
    (async () => {
      try {
        setLoadingRows(true);
        setLoadError("");
        // Call our Next.js API proxy so the HTTP-only auth cookie is forwarded
        // lower/upper come from page search params with defaults (1, 50)
        const res = await fetch(
          `/api/transactions?lower=${encodeURIComponent(
            String(lower)
          )}&upper=${encodeURIComponent(String(upper))}`,
          { cache: "no-store" }
        );
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data?.message || "Failed to load transactions");
        }
        const data = await res.json();
        const txs = transformRows(data);
        setRows(txs as any);
      } catch (e) {
        // Surface any fetch/transform errors to the UI
        setLoadError((e as Error).message);
        setRows([]);
      } finally {
        setLoadingRows(false);
      }
    })();
  }, [lower, upper, accounts, institutions, refreshKey, filtersApplied]);

  // Load ALL and apply filters when active
  useEffect(() => {
    if (!filtersApplied) return;
    (async () => {
      try {
        setLoadingRows(true);
        setLoadError("");
        const res = await fetch("/api/transactions/all", { cache: "no-store" });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data?.message || "Failed to load transactions");
        }
        const data = await res.json();
        let txs: any[] = transformRows(data);
        txs = txs.filter((r) => {
          if (selectedAccountIds.size > 0) {
            const ok =
              (r.__fromAccountId &&
                selectedAccountIds.has(r.__fromAccountId)) ||
              (r.__toAccountId && selectedAccountIds.has(r.__toAccountId));
            if (!ok) return false;
          }
          if (selectedInstitutionIds.size > 0) {
            const ok =
              (r.__fromInstitutionId &&
                selectedInstitutionIds.has(r.__fromInstitutionId)) ||
              (r.__toInstitutionId &&
                selectedInstitutionIds.has(r.__toInstitutionId));
            if (!ok) return false;
          }
          if (selectedOverall.size > 0 && !selectedOverall.has(r.__overall))
            return false;
          if (selectedKinds.size > 0 && !selectedKinds.has(r.kind))
            return false;
          if (
            selectedCurrencies.size > 0 &&
            !selectedCurrencies.has(r.currency)
          )
            return false;
          const amt = Number(r.amount);
          if (minAmount && !(amt >= Number(minAmount))) return false;
          if (maxAmount && !(amt <= Number(maxAmount))) return false;
          return true;
        });
        setRows(txs as any);
      } catch (e) {
        setLoadError((e as Error).message);
        setRows([]);
      } finally {
        setLoadingRows(false);
      }
    })();
  }, [
    filtersApplied,
    selectedAccountIds,
    selectedInstitutionIds,
    selectedOverall,
    selectedKinds,
    selectedCurrencies,
    minAmount,
    maxAmount,
    accounts,
    institutions,
    refreshKey,
  ]);

  // Load total count
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/transactions/count", {
          cache: "no-store",
        });
        if (!res.ok) return;
        const data = await res.json();
        if (typeof data?.total === "number") setTotalCount(data.total);
      } catch {}
    })();
  }, [refreshKey]);

  const pageSize = 50;
  const showingFrom = rows.length > 0 ? lower : 0;
  const showingTo = rows.length > 0 ? Math.min(upper, totalCount ?? upper) : 0;
  const canPrev = lower > 1;
  const canNext = totalCount != null ? upper < totalCount : true;

  const gotoRange = (newLower: number, newUpper: number) => {
    router.push(`/transactions?lower=${newLower}&upper=${newUpper}`);
  };
  const onPrev = () => {
    const newLower = Math.max(1, lower - pageSize);
    const newUpper = newLower + pageSize - 1;
    gotoRange(newLower, newUpper);
  };
  const onNext = () => {
    const newLower = upper + 1;
    const newUpper =
      totalCount != null
        ? Math.min(upper + pageSize, totalCount)
        : upper + pageSize;
    gotoRange(newLower, newUpper);
  };

  const institutionNameById = (id: string | null): string => {
    if (!id) return "";
    const inst = institutions.find((i) => i.id === id);
    return inst?.name ?? "";
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg md:text-xl">All Transactions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Header row with pagination and filter */}
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="text-sm text-muted-foreground">
            {totalCount != null
              ? `Showing ${showingFrom}-${showingTo} of ${totalCount}`
              : `Loading count…`}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={!canPrev}
              onClick={onPrev}
            >
              <ChevronLeft className="h-4 w-4" />
              <span className="sr-only">Previous page</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={!canNext}
              onClick={onNext}
            >
              <ChevronRight className="h-4 w-4" />
              <span className="sr-only">Next page</span>
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={() => setIsFilterOpen(true)}
            >
              <Filter className="h-4 w-4 mr-2" />
              Filter
            </Button>
          </div>
        </div>

        {/* Table */}
        <div className="rounded-md border">
          <div className="w-full overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[160px]">From Account</TableHead>
                  <TableHead className="min-w-[160px]">
                    From Institution
                  </TableHead>
                  <TableHead className="min-w-[160px]">To Account</TableHead>
                  <TableHead className="min-w-[160px]">
                    To Institution
                  </TableHead>
                  <TableHead className="min-w-[120px]">Amount</TableHead>
                  <TableHead className="min-w-[120px]">Kind</TableHead>
                  <TableHead className="min-w-[320px]">Description</TableHead>
                  <TableHead className="min-w-[180px]">Timestamp</TableHead>
                  <TableHead className="min-w-[90px] text-center">
                    Reversal
                  </TableHead>
                  <TableHead className="w-[96px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadError && (
                  <TableRow>
                    <TableCell colSpan={10} className="text-red-600">
                      {loadError}
                    </TableCell>
                  </TableRow>
                )}
                {(loadingRows ? [] : rows).map((tx) => (
                  <TableRow key={tx.id}>
                    <TableCell className="whitespace-nowrap">
                      {tx.fromAccountName}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {tx.fromInstitution}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {tx.toAccountName}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {tx.toInstitution}
                    </TableCell>
                    <TableCell className="whitespace-nowrap font-medium">
                      <span
                        className={
                          tx.reversed
                            ? undefined
                            : tx.pl > 0
                            ? "text-green-700"
                            : tx.pl < 0
                            ? "text-red-700"
                            : undefined
                        }
                      >
                        {formatMoney(Math.round(tx.amount * 100), tx.currency)}{" "}
                      </span>
                      <Badge variant="secondary" className="align-middle">
                        {tx.currency}
                      </Badge>
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      <Badge variant="outline">{tx.kind}</Badge>
                    </TableCell>
                    <TableCell className="max-w-[360px] truncate">
                      {tx.description}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {new Date(tx.timestamp).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-center">
                        <Checkbox
                          checked={tx.reversed}
                          aria-label="Reversal"
                          disabled
                        />
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label="Edit transaction"
                          onClick={() => {
                            setSelectedTx(tx);
                            setIsEditOpen(true);
                          }}
                          className={
                            tx.reversed ? "opacity-50 cursor-not-allowed" : ""
                          }
                          title={
                            tx.reversed
                              ? "Cannot edit a reversed transaction"
                              : undefined
                          }
                        >
                          <Edit3 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label="Delete transaction"
                          disabled={tx.reversed}
                          className={
                            tx.reversed ? "opacity-50 cursor-not-allowed" : ""
                          }
                          title={
                            tx.reversed
                              ? "Cannot delete a reversed transaction"
                              : undefined
                          }
                          onClick={() => {
                            if (tx.reversed) return;
                            setSelectedTx(tx);
                            setIsDeleteOpen(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label="View more"
                          onClick={() => {
                            setSelectedTx(tx);
                            setIsViewOpen(true);
                          }}
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>

        <Separator />

        {/* Create Transaction Form (UI-only) */}
        <Card className="border-0 shadow-none">
          <CardHeader className="px-0 pt-0">
            <CardTitle className="text-base md:text-lg">
              Create Transaction
            </CardTitle>
          </CardHeader>
          <CardContent className="px-0">
            <form
              className="grid gap-4 md:grid-cols-2"
              onSubmit={async (e) => {
                e.preventDefault();
                setSubmitError("");
                if (hasCurrencyConflict) return;
                const fromId =
                  fromAccountId && fromAccountId !== "0" ? fromAccountId : "";
                const toId =
                  toAccountId && toAccountId !== "0" ? toAccountId : "";
                if (!fromId && !toId) {
                  setSubmitError("Select at least one account (From or To)");
                  return;
                }
                const amt = parseFloat(amountInput);
                if (!Number.isFinite(amt) || amt === 0) {
                  setSubmitError("Enter a non-zero amount");
                  return;
                }
                if (!kindInput) {
                  setSubmitError("Select a kind");
                  return;
                }
                let meta: any | undefined = undefined;
                if (metaInput && metaInput.trim()) {
                  try {
                    meta = JSON.parse(metaInput);
                  } catch {
                    setSubmitError("Meta must be valid JSON");
                    return;
                  }
                }
                const amount_minor = Math.round(amt * 100);
                const payload: any = {
                  kind: kindInput,
                  description: descriptionInput || undefined,
                  meta,
                  account_from: fromId || undefined,
                  account_to: toId || undefined,
                  amount_minor,
                };
                try {
                  setSubmitting(true);
                  const res = await fetch("/api/transactions", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload),
                  });
                  if (!res.ok) {
                    const data = await res.json().catch(() => ({}));
                    throw new Error(
                      data?.message ||
                        data?.detail ||
                        "Failed to create transaction"
                    );
                  }
                  // Reset fields on success
                  setAmountInput("");
                  setDescriptionInput("");
                  setMetaInput("{}");
                  // Force refresh of table
                  setRefreshKey((k) => k + 1);
                } catch (err) {
                  setSubmitError((err as Error).message);
                } finally {
                  setSubmitting(false);
                }
              }}
            >
              {/* From Account */}
              <div className="grid gap-2">
                <Label htmlFor="fromAccount">From Account</Label>
                <Select value={fromAccountId} onValueChange={setFromAccountId}>
                  <SelectTrigger id="fromAccount" aria-label="From Account">
                    <SelectValue placeholder="Select account" />
                  </SelectTrigger>
                  <SelectContent className="max-h-72 overflow-y-auto">
                    <SelectItem value="0">
                      NA • <span className="text-muted-foreground">NA</span>
                    </SelectItem>
                    {accounts.map((acc) => (
                      <SelectItem key={acc.id} value={acc.id}>
                        {acc.name}
                        {acc.institution_id && (
                          <>
                            {" "}
                            •{" "}
                            <span className="text-muted-foreground">
                              {institutionNameById(acc.institution_id)}
                            </span>
                          </>
                        )}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* To Account */}
              <div className="grid gap-2">
                <Label htmlFor="toAccount">To Account</Label>
                <Select value={toAccountId} onValueChange={setToAccountId}>
                  <SelectTrigger id="toAccount" aria-label="To Account">
                    <SelectValue placeholder="Select account" />
                  </SelectTrigger>
                  <SelectContent className="max-h-72 overflow-y-auto">
                    <SelectItem value="0">
                      NA • <span className="text-muted-foreground">NA</span>
                    </SelectItem>
                    {accounts.map((acc) => (
                      <SelectItem key={acc.id} value={acc.id}>
                        {acc.name}
                        {acc.institution_id && (
                          <>
                            {" "}
                            •{" "}
                            <span className="text-muted-foreground">
                              {institutionNameById(acc.institution_id)}
                            </span>
                          </>
                        )}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Currency (auto-resolved from selected accounts) */}
              <div className="grid gap-2">
                <Label htmlFor="currency">Currency</Label>
                <div
                  id="currency"
                  className={
                    hasCurrencyConflict
                      ? "text-red-600 font-medium"
                      : "text-muted-foreground"
                  }
                >
                  {hasCurrencyConflict
                    ? "Currency mismatch between selected accounts"
                    : resolvedCurrency || "—"}
                </div>
              </div>

              {/* Amount */}
              <div className="grid gap-2">
                <Label htmlFor="amount">Amount</Label>
                <Input
                  id="amount"
                  type="number"
                  inputMode="decimal"
                  placeholder="0.00"
                  className="w-36 appearance-none [appearance:textfield] [-moz-appearance:textfield] [::-webkit-outer-spin-button]:appearance-none [::-webkit-inner-spin-button]:appearance-none"
                  value={amountInput}
                  onChange={(e) => setAmountInput(e.target.value)}
                />
              </div>

              {/* Kind */}
              <div className="grid gap-2">
                <Label htmlFor="kind">Kind</Label>
                <Select value={kindInput} onValueChange={setKindInput}>
                  <SelectTrigger id="kind" aria-label="Kind">
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
              <div className="grid gap-2 md:col-span-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Add a short description"
                  className="min-h-[60px]"
                  value={descriptionInput}
                  onChange={(e) => setDescriptionInput(e.target.value)}
                />
              </div>

              {/* Meta JSON */}
              <div className="grid gap-2 md:col-span-2">
                <Label htmlFor="meta">Meta (JSON)</Label>
                <Textarea
                  id="meta"
                  className="font-mono min-h-[60px]"
                  value={metaInput}
                  onChange={(e) => setMetaInput(e.target.value)}
                />
              </div>

              {/* Submit */}
              {/* Disabled when currency conflict exists */}
              <div className="md:col-span-2">
                {submitError && (
                  <div className="text-red-600 text-sm mb-2">{submitError}</div>
                )}
                <Button
                  type="submit"
                  disabled={hasCurrencyConflict || submitting}
                  title={
                    hasCurrencyConflict
                      ? "Resolve currency mismatch"
                      : undefined
                  }
                >
                  {submitting ? "Creating…" : "Create Transaction"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </CardContent>

      {/* Filter Modal (UI-only) */}
      <Dialog open={isFilterOpen} onOpenChange={setIsFilterOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Filter Transactions</DialogTitle>
          </DialogHeader>

          <div className="grid gap-6 md:grid-cols-3">
            {/* Accounts (real) */}
            <div className="space-y-3">
              <div className="font-medium">Accounts</div>
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {accounts.map((acc) => (
                  <label key={acc.id} className="flex items-center gap-2">
                    <Checkbox
                      checked={selectedAccountIds.has(acc.id)}
                      onCheckedChange={(c) =>
                        toggleSet(
                          setSelectedAccountIds,
                          selectedAccountIds,
                          acc.id,
                          c as boolean
                        )
                      }
                    />
                    <span className="text-sm">
                      {acc.name}
                      {acc.institution_id && (
                        <>
                          {" "}
                          •{" "}
                          <span className="text-muted-foreground">
                            {institutionNameById(acc.institution_id)}
                          </span>
                        </>
                      )}
                    </span>
                  </label>
                ))}
                {accounts.length === 0 && (
                  <div className="text-sm text-muted-foreground">
                    No accounts
                  </div>
                )}
              </div>
            </div>

            {/* Institutions (real) */}
            <div className="space-y-3">
              <div className="font-medium">Institution</div>
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {institutions.map((inst) => (
                  <label key={inst.id} className="flex items-center gap-2">
                    <Checkbox
                      checked={selectedInstitutionIds.has(inst.id)}
                      onCheckedChange={(c) =>
                        toggleSet(
                          setSelectedInstitutionIds,
                          selectedInstitutionIds,
                          inst.id,
                          c as boolean
                        )
                      }
                    />
                    <span className="text-sm">{inst.name}</span>
                  </label>
                ))}
                {institutions.length === 0 && (
                  <div className="text-sm text-muted-foreground">
                    No institutions
                  </div>
                )}
              </div>
            </div>

            {/* Overall */}
            <div className="space-y-3">
              <div className="font-medium">Overall</div>
              <div className="space-y-2">
                {["credit", "debit", "neutral"].map((k) => (
                  <label key={k} className="flex items-center gap-2 capitalize">
                    <Checkbox
                      checked={selectedOverall.has(k)}
                      onCheckedChange={(c) =>
                        toggleSet(
                          setSelectedOverall,
                          selectedOverall,
                          k,
                          c as boolean
                        )
                      }
                    />
                    <span className="text-sm">{k}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Kind */}
            <div className="space-y-3">
              <div className="font-medium">Kind</div>
              <div className="space-y-2">
                {[
                  "transfer",
                  "income",
                  "expense",
                  "adjustment",
                  "reversal",
                ].map((t) => (
                  <label key={t} className="flex items-center gap-2">
                    <Checkbox
                      checked={selectedKinds.has(t)}
                      onCheckedChange={(c) =>
                        toggleSet(
                          setSelectedKinds,
                          selectedKinds,
                          t,
                          c as boolean
                        )
                      }
                    />
                    <span className="text-sm">{t}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Currency (three checkboxes requested) */}
            <div className="space-y-3">
              <div className="font-medium">Currency</div>
              <div className="space-y-2">
                {["USD", "CAD", "INR"].map((c) => (
                  <label key={c} className="flex items-center gap-2">
                    <Checkbox
                      checked={selectedCurrencies.has(c)}
                      onCheckedChange={(v) =>
                        toggleSet(
                          setSelectedCurrencies,
                          selectedCurrencies,
                          c,
                          v as boolean
                        )
                      }
                    />
                    <span className="text-sm">{c}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Amount bounds */}
            <div className="space-y-3">
              <div className="font-medium">Amount bounds</div>
              <div className="grid gap-3">
                <div className="grid gap-2">
                  <Label htmlFor="min-amount">Lower</Label>
                  <Input
                    id="min-amount"
                    type="number"
                    placeholder="0.00"
                    inputMode="decimal"
                    className="w-full appearance-none [appearance:textfield] [-moz-appearance:textfield] [::-webkit-outer-spin-button]:appearance-none [::-webkit-inner-spin-button]:appearance-none"
                    value={minAmount}
                    onChange={(e) => setMinAmount(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="max-amount">Upper</Label>
                  <Input
                    id="max-amount"
                    type="number"
                    placeholder="1000.00"
                    inputMode="decimal"
                    className="w-full appearance-none [appearance:textfield] [-moz-appearance:textfield] [::-webkit-outer-spin-button]:appearance-none [::-webkit-inner-spin-button]:appearance-none"
                    value={maxAmount}
                    onChange={(e) => setMaxAmount(e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsFilterOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => {
                setFiltersApplied(true);
                setIsFilterOpen(false);
              }}
            >
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {selectedTx && (
        <>
          <EditTransactionDialog
            open={isEditOpen}
            onOpenChange={setIsEditOpen}
            accounts={accounts}
            // Map local Tx to dialog's expected shape; UI-only so casting is fine
            tx={
              {
                id: selectedTx.id,
                fromAccountName: selectedTx.fromAccountName,
                fromInstitution: selectedTx.fromInstitution,
                toAccountName: selectedTx.toAccountName,
                toInstitution: selectedTx.toInstitution,
                currency: selectedTx.currency,
                amount: selectedTx.amount,
                kind: selectedTx.kind,
                description: selectedTx.description,
                timestamp: selectedTx.timestamp,
                reversed: selectedTx.reversed,
                meta: {},
              } as any
            }
            onSaved={() => setRefreshKey((k) => k + 1)}
          />
          <ViewTransactionDialog
            open={isViewOpen}
            onOpenChange={setIsViewOpen}
            tx={
              {
                id: selectedTx.id,
                fromAccountName: selectedTx.fromAccountName,
                fromInstitution: selectedTx.fromInstitution,
                toAccountName: selectedTx.toAccountName,
                toInstitution: selectedTx.toInstitution,
                currency: selectedTx.currency,
                amount: selectedTx.amount,
                kind: selectedTx.kind,
                description: selectedTx.description,
                timestamp: selectedTx.timestamp,
                reversed: selectedTx.reversed,
                meta: {},
              } as any
            }
            accounts={accounts}
            institutions={institutions}
          />
          {/* Delete confirm */}
          <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
            <DialogContent className="max-w-sm">
              <DialogHeader>
                <DialogTitle>Delete Transaction</DialogTitle>
              </DialogHeader>
              <p className="text-sm text-muted-foreground">
                Are you sure you want to delete this transaction?
              </p>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsDeleteOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={async () => {
                    if (!selectedTx) return;
                    try {
                      const res = await fetch(
                        `/api/transactions/${selectedTx.id}`,
                        {
                          method: "DELETE",
                        }
                      );
                      if (!res.ok) {
                        // Optional: surface error
                        return;
                      }
                      setIsDeleteOpen(false);
                      setSelectedTx(null);
                      setRefreshKey((k) => k + 1);
                    } catch {}
                  }}
                >
                  Yes, delete
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </>
      )}
    </Card>
  );
}
