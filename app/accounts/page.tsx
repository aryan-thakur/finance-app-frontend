"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PlusCircle, Search } from "lucide-react";
import type { Account } from "@/lib/types";
import { KpiCards } from "@/components/kpi-cards";
import { AccountCard } from "@/components/account-card";
import { AccountSkeleton } from "@/components/account-skeleton";
import { EmptyState } from "@/components/empty-state";
import { NewAccountDialog } from "@/components/new-account-dialog";
import { SetBalanceDialog } from "@/components/set-balance-dialog";
import Link from "next/link";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<Account[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  // Added state for set balance dialog
  const [selectedAccountForBalance, setSelectedAccountForBalance] =
    useState<Account | null>(null);
  const [showSetBalanceDialog, setShowSetBalanceDialog] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState<Account | null>(null);
  const [viewCurrency, setViewCurrency] = useState<
    "base" | "INR" | "CAD" | "USD" | "GBP"
  >("base");
  const [rateUSD, setRateUSD] = useState<number>(0);
  const [rateCAD, setRateCAD] = useState<number>(0);
  const [rateGBP, setRateGBP] = useState<number>(0);

  const filteredAccounts =
    accounts?.filter((account) => {
      const matchesSearch =
        searchQuery === "" ||
        account.name.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesTab = activeTab === "all" || account.kind === activeTab;

      return matchesSearch && matchesTab;
    }) || [];

  const assets = filteredAccounts.filter((acc) => acc.kind === "asset");
  const liabilities = filteredAccounts.filter(
    (acc) => acc.kind === "liability"
  );

  // Updated handleSetBalance to open dialog
  const handleSetBalance = (account: Account) => {
    setSelectedAccountForBalance(account);
    setShowSetBalanceDialog(true);
  };

  const handleEdit = (account: Account) => {
    setEditingAccount(account);
    setEditOpen(true);
  };

  const handleDelete = (account: Account) => {
    setDeletingAccount(account);
    setDeleteOpen(true);
  };

  const handleCreateAccount = () => {
    // This is handled by the NewAccountDialog component
  };

  useEffect(() => {
    (async () => {
      try {
        setIsLoading(true);
        const res = await fetch("/api/accounts", { cache: "no-store" });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data?.message || "Failed to load accounts");
        }
        const data = await res.json();
        // Map API response to Account[] shape and coerce numeric fields
        const mapped: Account[] = (Array.isArray(data) ? data : []).map((row: any) => ({
          id: row.id,
          institution_id: row.institution_id ?? null,
          name: row.name,
          kind: row.kind,
          type: row.type ?? undefined,
          base_currency: row.base_currency,
          number_full: row.number_full ?? undefined,
          number_masked: row.number_masked ?? undefined,
          credit_limit_minor: row.credit_limit_minor != null ? Number(row.credit_limit_minor) : undefined,
          balance_minor: row.computed_balance_minor != null ? Number(row.computed_balance_minor) : Number(row.balance_minor ?? 0),
          status: row.status ?? "active",
          meta: row.meta ?? {},
          created_at: row.created_at ? new Date(row.created_at) : new Date(),
          updated_at: row.updated_at ? new Date(row.updated_at) : new Date(),
        }));
        setAccounts(mapped);
      } catch (e) {
        setError((e as Error).message);
        setAccounts([]);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  // Fetch INR-based rates for CAD and USD
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
          setRateGBP(typeof r.GBP === "number" ? r.GBP : 0);
        }
      } catch {}
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const convertToTarget = (
    amountMinor: number,
    baseCurrency: "INR" | "USD" | "CAD" | "GBP",
    target: "INR" | "USD" | "CAD" | "GBP"
  ) => {
    if (target === baseCurrency) return amountMinor;
    // convert to INR major first
    let inrMajor: number;
    if (baseCurrency === "INR") {
      inrMajor = amountMinor / 100;
    } else if (baseCurrency === "USD" && rateUSD > 0) {
      inrMajor = (amountMinor / 100) / rateUSD;
    } else if (baseCurrency === "CAD" && rateCAD > 0) {
      inrMajor = (amountMinor / 100) / rateCAD;
    } else if (baseCurrency === "GBP" && rateGBP > 0) {
      inrMajor = (amountMinor / 100) / rateGBP;
    } else {
      // no rates yet
      return amountMinor;
    }
    // then from INR to target
    let targetMajor = inrMajor;
    if (target === "USD" && rateUSD > 0) targetMajor = inrMajor * rateUSD;
    if (target === "CAD" && rateCAD > 0) targetMajor = inrMajor * rateCAD;
    if (target === "GBP" && rateGBP > 0) targetMajor = inrMajor * rateGBP;
    // target === INR keeps inrMajor
    return Math.round(targetMajor * 100);
  };

  if (isLoading) {
    return (
      <>
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <h1 className="text-3xl font-bold">Accounts</h1>
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search accounts..."
                className="pl-10 w-full sm:w-64"
                disabled
              />
            </div>
            <Button disabled>
              <PlusCircle className="mr-2 h-4 w-4" />
              New Account
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {[1, 2, 3].map((i) => (
            <AccountSkeleton key={i} />
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <AccountSkeleton key={i} />
          ))}
        </div>
      </div>

      {editingAccount && (
        <NewAccountDialog
          mode="edit"
          initial={editingAccount}
          open={editOpen}
          onOpenChange={(o) => {
            setEditOpen(o);
            if (!o) setEditingAccount(null);
          }}
          onSaved={async () => {
            const refreshed = await fetch("/api/accounts", { cache: "no-store" });
            if (refreshed.ok) {
              const data = await refreshed.json();
              const mapped: Account[] = (Array.isArray(data) ? data : []).map((row: any) => ({
                id: row.id,
                institution_id: row.institution_id ?? null,
                name: row.name,
                kind: row.kind,
                type: row.type ?? undefined,
                base_currency: row.base_currency,
                number_full: row.number_full ?? undefined,
                number_masked: row.number_masked ?? undefined,
                credit_limit_minor: row.credit_limit_minor != null ? Number(row.credit_limit_minor) : undefined,
                balance_minor: row.computed_balance_minor != null ? Number(row.computed_balance_minor) : Number(row.balance_minor ?? 0),
                status: row.status ?? "active",
                meta: row.meta ?? {},
                created_at: row.created_at ? new Date(row.created_at) : new Date(),
                updated_at: row.updated_at ? new Date(row.updated_at) : new Date(),
              }));
              setAccounts(mapped);
            }
            setEditOpen(false);
            setEditingAccount(null);
          }}
        />
      )}
      {/* Delete confirm */}
      {deletingAccount && (
        <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Delete Account</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">
              Are you sure you want to delete account "{deletingAccount.name}"?
            </p>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setDeleteOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={async () => {
                  if (!deletingAccount) return;
                  try {
                    const res = await fetch(`/api/accounts/${deletingAccount.id}`, { method: 'DELETE' });
                    if (res.ok) {
                      const refreshed = await fetch('/api/accounts', { cache: 'no-store' });
                      if (refreshed.ok) {
                        const data = await refreshed.json();
                        const mapped: Account[] = (Array.isArray(data) ? data : []).map((row: any) => ({
                          id: row.id,
                          institution_id: row.institution_id ?? null,
                          name: row.name,
                          kind: row.kind,
                          type: row.type ?? undefined,
                          base_currency: row.base_currency,
                          number_full: row.number_full ?? undefined,
                          number_masked: row.number_masked ?? undefined,
                          credit_limit_minor: row.credit_limit_minor != null ? Number(row.credit_limit_minor) : undefined,
                          balance_minor: row.computed_balance_minor != null ? Number(row.computed_balance_minor) : Number(row.balance_minor ?? 0),
                          status: row.status ?? 'active',
                          meta: row.meta ?? {},
                          created_at: row.created_at ? new Date(row.created_at) : new Date(),
                          updated_at: row.updated_at ? new Date(row.updated_at) : new Date(),
                        }));
                        setAccounts(mapped);
                      }
                    }
                  } catch {}
                  setDeleteOpen(false);
                  setDeletingAccount(null);
                }}
              >
                Yes, delete
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
      </>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h1 className="text-3xl font-bold">Accounts</h1>
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search accounts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 w-full sm:w-64"
            />
          </div>
          <NewAccountDialog
            trigger={
              <Button>
                <PlusCircle className="mr-2 h-4 w-4" />
                New Account
              </Button>
            }
          />
          <Button asChild variant="outline">
            <Link href="/institutions">Institutions</Link>
          </Button>
        </div>
      </div>

      {error && (
        <p className="text-red-600 mb-4" role="alert">{error}</p>
      )}

      {accounts && accounts.length === 0 ? (
        <EmptyState onCreateAccount={handleCreateAccount} />
      ) : (
        <>
          {accounts && <KpiCards accounts={accounts} viewCurrency={viewCurrency} />}

          <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-2">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList>
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="asset">Assets</TabsTrigger>
                <TabsTrigger value="liability">Liabilities</TabsTrigger>
              </TabsList>
            </Tabs>
            <Tabs
              value={viewCurrency}
              onValueChange={(v) =>
                setViewCurrency(
                  v as "base" | "INR" | "CAD" | "USD" | "GBP"
                )
              }
            >
              <TabsList className="opacity-80">
                <TabsTrigger value="base">Base</TabsTrigger>
                <TabsTrigger value="INR">INR</TabsTrigger>
                <TabsTrigger value="CAD">CAD</TabsTrigger>
                <TabsTrigger value="USD">USD</TabsTrigger>
                <TabsTrigger value="GBP">GBP</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <div className="space-y-8">
            {(activeTab === "all" || activeTab === "asset") &&
              assets.length > 0 && (
                <div>
                  <h2 className="text-xl font-semibold mb-4 text-green-700">
                    Assets
                  </h2>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {assets.map((account) => {
                      const override =
                        viewCurrency === "base"
                          ? undefined
                          : convertToTarget(
                              account.balance_minor,
                              account.base_currency as any,
                              viewCurrency
                            );
                      return (
                        <AccountCard
                          key={account.id}
                          account={account}
                          onSetBalance={handleSetBalance}
                          onEdit={handleEdit}
                          onDelete={handleDelete}
                          overrideBalanceMinor={override}
                          overrideCurrency={
                            viewCurrency === "base" ? undefined : (viewCurrency as any)
                          }
                        />
                      );
                    })}
                  </div>
                </div>
              )}

            {(activeTab === "all" || activeTab === "liability") &&
              liabilities.length > 0 && (
                <div>
                  <h2 className="text-xl font-semibold mb-4 text-red-700">
                    Liabilities
                  </h2>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {liabilities.map((account) => {
                      const override =
                        viewCurrency === "base"
                          ? undefined
                          : convertToTarget(
                              account.balance_minor,
                              account.base_currency as any,
                              viewCurrency
                            );
                      return (
                        <AccountCard
                          key={account.id}
                          account={account}
                          onSetBalance={handleSetBalance}
                          onEdit={handleEdit}
                          onDelete={handleDelete}
                          overrideBalanceMinor={override}
                          overrideCurrency={
                            viewCurrency === "base" ? undefined : (viewCurrency as any)
                          }
                        />
                      );
                    })}
                  </div>
                </div>
              )}

            {filteredAccounts.length === 0 && searchQuery && (
              <div className="text-center py-12">
                <p className="text-muted-foreground">
                  No accounts found matching "{searchQuery}"
                </p>
              </div>
            )}
          </div>
        </>
      )}

      {/* Added SetBalanceDialog component */}
      <SetBalanceDialog
        account={selectedAccountForBalance}
        open={showSetBalanceDialog}
        onOpenChange={(open) => {
          setShowSetBalanceDialog(open);
          if (!open) {
            setSelectedAccountForBalance(null);
          }
        }}
      />
      {editingAccount && (
        <NewAccountDialog
          mode="edit"
          initial={editingAccount}
          open={editOpen}
          onOpenChange={(o) => {
            setEditOpen(o);
            if (!o) setEditingAccount(null);
          }}
          onSaved={async () => {
            const refreshed = await fetch("/api/accounts", { cache: "no-store" });
            if (refreshed.ok) {
              const data = await refreshed.json();
              const mapped: Account[] = (Array.isArray(data) ? data : []).map((row: any) => ({
                id: row.id,
                institution_id: row.institution_id ?? null,
                name: row.name,
                kind: row.kind,
                type: row.type ?? undefined,
                base_currency: row.base_currency,
                number_full: row.number_full ?? undefined,
                number_masked: row.number_masked ?? undefined,
                credit_limit_minor: row.credit_limit_minor != null ? Number(row.credit_limit_minor) : undefined,
                balance_minor: row.computed_balance_minor != null ? Number(row.computed_balance_minor) : Number(row.balance_minor ?? 0),
                status: row.status ?? "active",
                meta: row.meta ?? {},
                created_at: row.created_at ? new Date(row.created_at) : new Date(),
                updated_at: row.updated_at ? new Date(row.updated_at) : new Date(),
              }));
              setAccounts(mapped);
            }
            setEditOpen(false);
            setEditingAccount(null);
          }}
        />
      )}
      {deletingAccount && (
        <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Delete Account</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">
              Are you sure you want to delete account "{deletingAccount.name}"?
            </p>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setDeleteOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={async () => {
                  if (!deletingAccount) return;
                  try {
                    const res = await fetch(`/api/accounts/${deletingAccount.id}`, { method: 'DELETE' });
                    if (res.ok) {
                      const refreshed = await fetch('/api/accounts', { cache: 'no-store' });
                      if (refreshed.ok) {
                        const data = await refreshed.json();
                        const mapped: Account[] = (Array.isArray(data) ? data : []).map((row: any) => ({
                          id: row.id,
                          institution_id: row.institution_id ?? null,
                          name: row.name,
                          kind: row.kind,
                          type: row.type ?? undefined,
                          base_currency: row.base_currency,
                          number_full: row.number_full ?? undefined,
                          number_masked: row.number_masked ?? undefined,
                          credit_limit_minor: row.credit_limit_minor != null ? Number(row.credit_limit_minor) : undefined,
                          balance_minor: row.computed_balance_minor != null ? Number(row.computed_balance_minor) : Number(row.balance_minor ?? 0),
                          status: row.status ?? 'active',
                          meta: row.meta ?? {},
                          created_at: row.created_at ? new Date(row.created_at) : new Date(),
                          updated_at: row.updated_at ? new Date(row.updated_at) : new Date(),
                        }));
                        setAccounts(mapped);
                      }
                    }
                  } catch {}
                  setDeleteOpen(false);
                  setDeletingAccount(null);
                }}
              >
                Yes, delete
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
