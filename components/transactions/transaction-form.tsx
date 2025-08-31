"use client";

import { useState } from "react";
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

export function TransactionForm() {
  const [meta, setMeta] = useState("{}");

  return (
    <form className="grid gap-4 md:grid-cols-2">
      {/* From account */}
      <div className="space-y-2">
        <Label htmlFor="fromAccount">From Account</Label>
        <Select>
          <SelectTrigger id="fromAccount" aria-label="From Account">
            <SelectValue placeholder="Select account" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="checking">Checking</SelectItem>
            <SelectItem value="credit-card">Credit Card</SelectItem>
            <SelectItem value="savings">Savings</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* To account */}
      <div className="space-y-2">
        <Label htmlFor="toAccount">To Account</Label>
        <Select>
          <SelectTrigger id="toAccount" aria-label="To Account">
            <SelectValue placeholder="Select account" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="savings">Savings</SelectItem>
            <SelectItem value="brokerage">Brokerage</SelectItem>
            <SelectItem value="wallet">Wallet</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Currency */}
      <div className="space-y-2">
        <Label htmlFor="currency">Currency</Label>
        <Select>
          <SelectTrigger id="currency" aria-label="Currency">
            <SelectValue placeholder="Select currency" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="USD">USD</SelectItem>
            <SelectItem value="INR">INR</SelectItem>
            <SelectItem value="EUR">EUR</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Amount - smaller width and no spinners */}
      <div className="space-y-2">
        <Label htmlFor="amount">Amount</Label>
        <Input
          id="amount"
          type="number"
          step="0.01"
          className="w-28 appearance-none [appearance:textfield] [-moz-appearance:textfield] [::-webkit-outer-spin-button]:appearance-none [::-webkit-inner-spin-button]:appearance-none"
          placeholder="0.00"
        />
      </div>

      {/* Kind */}
      <div className="space-y-2">
        <Label htmlFor="kind">Kind</Label>
        <Select>
          <SelectTrigger id="kind" aria-label="Kind">
            <SelectValue placeholder="Select kind" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="transfer">transfer</SelectItem>
            <SelectItem value="payment">payment</SelectItem>
            <SelectItem value="refund">refund</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Description */}
      <div className="md:col-span-2 space-y-2">
        <Label htmlFor="description">Description</Label>
        <Input id="description" placeholder="Add a description" />
      </div>

      {/* Meta JSON */}
      <div className="md:col-span-2 space-y-2">
        <Label htmlFor="meta">Meta JSON</Label>
        <Textarea
          id="meta"
          value={meta}
          onChange={(e) => setMeta(e.target.value)}
          rows={4}
          className="font-mono"
        />
      </div>

      <div className="md:col-span-2">
        <Button type="button">Create</Button>
      </div>
    </form>
  );
}
