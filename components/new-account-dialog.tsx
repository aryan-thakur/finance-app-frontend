"use client";

import type React from "react";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { PlusCircle } from "lucide-react";
import { useCreateAccount } from "@/hooks/use-accounts";
import type { Account, AccountKind, AccountType, Currency } from "@/lib/types";
import { parseMoney } from "@/lib/money";

interface NewAccountDialogProps {
  trigger?: React.ReactNode;
  mode?: "create" | "edit";
  initial?: Partial<Account> & { id?: string };
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onSaved?: () => void;
}

interface FormData {
  name: string;
  institution_id: string;
  kind: AccountKind | "";
  type: AccountType | "";
  base_currency: Currency | "";
  number_full: string;
  credit_limit: string; // major units string
  balance_minor: string;
  status: string;
  meta: string;
  startingBalance: string; // major units string, required
}

interface FormErrors {
  name?: string;
  institution_id?: string;
  kind?: string;
  type?: string;
  base_currency?: string;
  number_full?: string;
  number_masked?: string;
  credit_limit_minor?: string;
  balance_minor?: string;
  status?: string;
  meta?: string;
  startingBalance?: string;
}

export function NewAccountDialog({
  trigger,
  mode = "create",
  initial,
  open: controlledOpen,
  onOpenChange,
  onSaved,
}: NewAccountDialogProps) {
  const [open, setOpen] = useState(false);
  // (1) FIX: Add missing fields to initial state
  const [formData, setFormData] = useState<FormData>({
    name: "",
    institution_id: "",
    kind: "",
    type: "",
    base_currency: "",
    number_full: "",
    credit_limit: "",
    balance_minor: "",
    status: "active",
    meta: "{}",
    startingBalance: "",
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [numberMasked, setNumberMasked] = useState("");
  const [institutions, setInstitutions] = useState<
    Array<{ id: string; name: string }>
  >([]);
  const [institutionsLoading, setInstitutionsLoading] = useState(false);

  const createAccountMutation = useCreateAccount();

  const maskAccountNumber = (fullNumber: string): string => {
    if (fullNumber.length < 4) return fullNumber;
    return "****" + fullNumber.slice(-4);
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = "Account name is required";
    }

    // Institution is optional

    if (!formData.kind) {
      newErrors.kind = "Account kind is required";
    }

    if (!formData.base_currency) {
      newErrors.base_currency = "Currency is required";
    }

    if (!formData.number_full.trim()) {
      newErrors.number_full = "Account number is required";
    } else if (formData.number_full.length < 4) {
      newErrors.number_full = "Account number must be at least 4 digits";
    }

    // Starting balance required
    if (!formData.startingBalance.trim()) {
      newErrors.startingBalance = "Starting balance is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    const balance_minor = parseMoney(
      formData.startingBalance,
      formData.base_currency as Currency
    );
    const credit_limit_minor = formData.credit_limit
      ? parseMoney(formData.credit_limit, formData.base_currency as Currency)
      : undefined;

    try {
      const payload = {
        name: formData.name.trim() || undefined,
        institution_id: formData.institution_id.trim() || undefined,
        kind: formData.kind as AccountKind,
        type: formData.type || undefined,
        base_currency: formData.base_currency as Currency,
        number_full: formData.number_full.trim(),
        credit_limit_minor,
        balance_minor,
        status: formData.status || undefined,
        meta: formData.meta ? JSON.parse(formData.meta) : undefined,
      };

      if (mode === "edit" && initial?.id) {
        const res = await fetch(`/api/accounts/${initial.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data?.message || "Failed to update account");
        }
        onSaved?.();
      } else {
        const res = await fetch("/api/accounts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data?.message || "Failed to create account");
        }
        // Then: add to local store so UI updates immediately
        await createAccountMutation.mutateAsync({
          name: payload.name || "",
          institution_id: payload.institution_id,
          kind: payload.kind,
          type: payload.type as any,
          base_currency: payload.base_currency,
          number_full: payload.number_full,
          number_masked: maskAccountNumber(payload.number_full),
          credit_limit_minor: payload.credit_limit_minor,
          balance_minor: payload.balance_minor,
          status: (payload.status as any) || "active",
          meta: payload.meta || {},
        });
        onSaved?.();
      }

      // Reset form and close dialog
      setFormData({
        name: "",
        institution_id: "",
        kind: "",
        type: "",
        base_currency: "",
        number_full: "",
        credit_limit: "",
        balance_minor: "",
        status: "active",
        meta: "{}",
        startingBalance: "",
      });
      setNumberMasked("");
      setErrors({});
      setOpen(false);
    } catch (error) {
      // Show simple inline error
      setErrors((prev) => ({ ...prev, name: (error as Error).message }));
    }
  };

  const handleNumberBlur = () => {
    if (formData.number_full) {
      setNumberMasked(maskAccountNumber(formData.number_full));
    }
  };

  useEffect(() => {
    // Load institutions when dialog opens
    if (!open) return;
    (async () => {
      try {
        setInstitutionsLoading(true);
        const res = await fetch("/api/institutions", { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        const list = Array.isArray(data)
          ? data.map((i: any) => ({ id: i.id, name: i.name }))
          : [];
        setInstitutions(list);
      } finally {
        setInstitutionsLoading(false);
      }
    })();
  }, [open]);

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const defaultTrigger = (
    <Button>
      <PlusCircle className="mr-2 h-4 w-4" />
      New Account
    </Button>
  );

  const mergedOpen = controlledOpen ?? open;
  const handleOpenChange = (v: boolean) => {
    setOpen(v);
    onOpenChange?.(v);
  };

  // Seed fields on open for edit mode
  useEffect(() => {
    if (!mergedOpen || mode !== "edit" || !initial) return;
    const toMajor = (minor?: number, currency?: Currency) => {
      if (minor == null || !currency) return "";
      return (Number(minor) / 100).toFixed(2);
    };
    setFormData({
      name: initial.name || "",
      institution_id: (initial.institution_id as string) || "",
      kind: (initial.kind as any) || "",
      type: (initial.type as any) || "",
      base_currency: (initial.base_currency as any) || "",
      number_full: initial.number_full || "",
      credit_limit: toMajor(
        initial.credit_limit_minor as any,
        initial.base_currency as any
      ),
      balance_minor: "",
      status: (initial.status as any) || "active",
      meta: initial.meta ? JSON.stringify(initial.meta) : "{}",
      startingBalance: toMajor(
        initial.balance_minor as any,
        initial.base_currency as any
      ),
    });
    setNumberMasked(initial.number_masked || "");
  }, [mergedOpen, mode, initial]);

  return (
    <Dialog open={mergedOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{trigger || defaultTrigger}</DialogTrigger>
      <DialogContent className="sm:max-w-lg w-[95vw] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mode === "edit" ? "Edit Account" : "Add New Account"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Account Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Account Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleInputChange("name", e.target.value)}
              placeholder="e.g., Primary Checking"
              className={errors.name ? "border-red-500" : ""}
            />
            {errors.name && (
              <p className="text-sm text-red-500">{errors.name}</p>
            )}
          </div>

          {/* Institution (optional) */}
          <div className="space-y-2">
            <Label htmlFor="institution_id">Institution</Label>
            <Select
              value={formData.institution_id}
              onValueChange={(value: string) =>
                handleInputChange("institution_id", value)
              }
            >
              <SelectTrigger
                className={errors.institution_id ? "border-red-500" : ""}
              >
                <SelectValue
                  placeholder={
                    institutionsLoading
                      ? "Loading…"
                      : "Select institution (optional)"
                  }
                />
              </SelectTrigger>
              <SelectContent className="max-h-64 overflow-y-auto">
                <SelectItem value="None">None</SelectItem>
                {institutions.map((inst) => (
                  <SelectItem key={inst.id} value={inst.id}>
                    {inst.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.institution_id && (
              <p className="text-sm text-red-500">{errors.institution_id}</p>
            )}
          </div>

          {/* Account Kind */}
          <div className="space-y-2">
            <Label htmlFor="kind">Account Kind *</Label>
            <Select
              value={formData.kind}
              onValueChange={(value: AccountKind) =>
                handleInputChange("kind", value)
              }
            >
              <SelectTrigger className={errors.kind ? "border-red-500" : ""}>
                <SelectValue placeholder="Select account kind" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="asset">Asset</SelectItem>
                <SelectItem value="liability">Liability</SelectItem>
              </SelectContent>
            </Select>
            {errors.kind && (
              <p className="text-sm text-red-500">{errors.kind}</p>
            )}
          </div>

          {/* Type (dropdown) */}
          <div className="space-y-2">
            <Label htmlFor="type">Account Type</Label>
            <Select
              value={formData.type}
              onValueChange={(value: AccountType) =>
                handleInputChange("type", value)
              }
            >
              <SelectTrigger className={errors.type ? "border-red-500" : ""}>
                <SelectValue placeholder="Select account type (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="bank">Bank</SelectItem>
                <SelectItem value="credit card">Credit Card</SelectItem>
                <SelectItem value="fixed deposit">Fixed Deposit</SelectItem>
                <SelectItem value="mutual fund">Mutual Fund</SelectItem>
                <SelectItem value="other asset">Other Asset</SelectItem>
                <SelectItem value="other liability">Other Liability</SelectItem>
                <SelectItem value="other investment">
                  Other Investment
                </SelectItem>
              </SelectContent>
            </Select>
            {errors.type && (
              <p className="text-sm text-red-500">{errors.type}</p>
            )}
          </div>

          {/* Currency */}
          <div className="space-y-2">
            <Label htmlFor="base_currency">Currency *</Label>
            <Select
              value={formData.base_currency}
              onValueChange={(value: Currency) =>
                handleInputChange("base_currency", value)
              }
            >
              <SelectTrigger
                className={errors.base_currency ? "border-red-500" : ""}
              >
                <SelectValue placeholder="Select currency" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="INR">INR (₹)</SelectItem>
                <SelectItem value="USD">USD ($)</SelectItem>
                <SelectItem value="CAD">CAD (C$)</SelectItem>
              </SelectContent>
            </Select>
            {errors.base_currency && (
              <p className="text-sm text-red-500">{errors.base_currency}</p>
            )}
          </div>

          {/* Starting Balance (required at top) */}
          <div className="space-y-2">
            <Label htmlFor="startingBalance">Starting Balance *</Label>
            <Input
              id="startingBalance"
              type="text"
              inputMode="decimal"
              value={formData.startingBalance}
              onChange={(e) =>
                handleInputChange("startingBalance", e.target.value)
              }
              placeholder="0.00"
              className={errors.startingBalance ? "border-red-500" : ""}
            />
            {errors.startingBalance && (
              <p className="text-sm text-red-500">{errors.startingBalance}</p>
            )}
          </div>

          {/* Account Number */}
          <div className="space-y-2">
            <Label htmlFor="number_full">Account Number *</Label>
            <Input
              id="number_full"
              value={formData.number_full}
              onChange={(e) => handleInputChange("number_full", e.target.value)}
              onBlur={handleNumberBlur}
              placeholder="Enter full account number"
              className={errors.number_full ? "border-red-500" : ""}
            />
            {numberMasked && (
              <p className="text-sm text-muted-foreground">
                Preview: {numberMasked}
              </p>
            )}
            {errors.number_full && (
              <p className="text-sm text-red-500">{errors.number_full}</p>
            )}
          </div>
          {/* Credit Limit (optional) */}
          <div className="space-y-2">
            <Label htmlFor="credit_limit_minor">Credit Limit (optional)</Label>
            <Input
              id="credit_limit"
              type="text"
              inputMode="decimal"
              value={formData.credit_limit}
              onChange={(e) =>
                handleInputChange("credit_limit", e.target.value)
              }
              placeholder="0.00"
            />
            <p className="text-xs text-muted-foreground">
              Major units, e.g. 1000.00
            </p>
          </div>

          {/* Status (optional) */}
          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Input
              id="status"
              value={formData.status}
              onChange={(e) => handleInputChange("status", e.target.value)}
              placeholder="active"
            />
          </div>
          {/* Meta (optional) */}
          <div className="space-y-2">
            <Label htmlFor="meta">Meta (JSON)</Label>
            <Input
              id="meta"
              value={formData.meta}
              onChange={(e) => handleInputChange("meta", e.target.value)}
              placeholder="{}"
            />
            <p className="text-xs text-muted-foreground">
              Any extra metadata as JSON
            </p>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end space-x-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={createAccountMutation.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={createAccountMutation.isPending}>
              {createAccountMutation.isPending
                ? mode === "edit"
                  ? "Saving..."
                  : "Creating..."
                : mode === "edit"
                ? "Save Changes"
                : "Create Account"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
