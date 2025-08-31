import type { Account, CreateAccountData } from "./types";

// In-memory store that syncs with localStorage
class AccountsStore {
  private accounts: Account[] = [];
  private readonly STORAGE_KEY = "finance-app-accounts";

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage() {
    if (typeof window === "undefined") return;

    const stored = localStorage.getItem(this.STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        this.accounts = parsed.map((acc: any) => ({
          ...acc,
          createdAt: new Date(acc.createdAt),
        }));
      } catch (error) {
        console.error("Failed to load accounts from storage:", error);
        this.seedMockData();
      }
    } else {
      this.seedMockData();
    }
  }

  private saveToStorage() {
    if (typeof window === "undefined") return;
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.accounts));
  }

  private seedMockData() {
    this.accounts = [
      {
        id: "1",
        institution_id: "inst-1",
        name: "Primary Checking",
        kind: "asset",
        type: "bank",
        base_currency: "USD",
        number_full: "1234567890123456",
        number_masked: "****3456",
        credit_limit_minor: undefined,
        balance_minor: 250000,
        status: "active",
        meta: {},
        created_at: new Date("2024-01-15"),
        updated_at: new Date("2024-01-15"),
      },
      {
        id: "2",
        institution_id: "inst-2",
        name: "Savings Account",
        kind: "asset",
        type: "bank",
        base_currency: "INR",
        number_full: "9876543210987654",
        number_masked: "****7654",
        credit_limit_minor: undefined,
        balance_minor: 15000000,
        status: "active",
        meta: {},
        created_at: new Date("2024-02-01"),
        updated_at: new Date("2024-02-01"),
      },
      {
        id: "3",
        institution_id: "inst-3",
        name: "Credit Card",
        kind: "liability",
        type: "credit_card",
        base_currency: "INR",
        number_full: "4532123456789012",
        number_masked: "****9012",
        credit_limit_minor: 5000000,
        balance_minor: -2500000,
        status: "active",
        meta: {},
        created_at: new Date("2024-01-20"),
        updated_at: new Date("2024-01-20"),
      },
      {
        id: "4",
        institution_id: "inst-4",
        name: "Investment Account",
        kind: "asset",
        type: "mf",
        base_currency: "USD",
        number_full: "1111222233334444",
        number_masked: "****4444",
        credit_limit_minor: undefined,
        balance_minor: 750000,
        status: "active",
        meta: {},
        created_at: new Date("2024-03-01"),
        updated_at: new Date("2024-03-01"),
      },
      // (5) FIX: Remove EUR account, only use INR and USD
      {
        id: "6",
        institution_id: "inst-6",
        name: "Personal Loan",
        kind: "liability",
        type: "other",
        base_currency: "INR",
        number_full: "9999888877776666",
        number_masked: "****6666",
        credit_limit_minor: undefined,
        balance_minor: -50000000,
        status: "active",
        meta: {},
        created_at: new Date("2024-01-10"),
        updated_at: new Date("2024-01-10"),
      },
    ];
    this.saveToStorage();
  }

  async listAccounts(): Promise<Account[]> {
    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 300));
    return [...this.accounts];
  }

  async createAccount(data: CreateAccountData): Promise<Account> {
    await new Promise((resolve) => setTimeout(resolve, 500));

    // (5) FIX: Use correct field names for Account
    // (5) FIX: Ensure institution_id is string|null
    const newAccount: Account = {
      id: Date.now().toString(),
      ...data,
      institution_id: data.institution_id ?? null,
      number_masked: data.number_full
        ? this.maskAccountNumber(data.number_full)
        : undefined,
      balance_minor: data.balance_minor || 0,
      created_at: new Date(),
      updated_at: new Date(),
      meta: data.meta || {},
      status: data.status || "active",
    };

    this.accounts.push(newAccount);
    this.saveToStorage();
    return newAccount;
  }

  async setBalance(
    accountId: string,
    newBalanceMinor: number
  ): Promise<Account> {
    await new Promise((resolve) => setTimeout(resolve, 300));

    const accountIndex = this.accounts.findIndex((acc) => acc.id === accountId);
    if (accountIndex === -1) {
      throw new Error("Account not found");
    }

    this.accounts[accountIndex].balance_minor = newBalanceMinor;
    this.saveToStorage();
    return this.accounts[accountIndex];
  }

  async deleteAccount(accountId: string): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 300));

    this.accounts = this.accounts.filter((acc) => acc.id !== accountId);
    this.saveToStorage();
  }

  private maskAccountNumber(fullNumber: string): string {
    if (fullNumber.length < 4) return fullNumber;
    return "****" + fullNumber.slice(-4);
  }
}

// Singleton instance
export const accountsClient = new AccountsStore();
