export type Currency = "INR" | "USD" | "CAD" | "GBP";
export type AccountKind = "asset" | "liability";
export type AccountType =
  | "bank"
  | "credit card"
  | "fixed deposit"
  | "mutual fund"
  | "other investment"
  | "other asset"
  | "other liability";
export type AccountStatus = "active" | "inactive" | "closed";
export type InstitutionKind = "bank" | "broker" | "card" | "other";

export interface Account {
  id: string;
  institution_id: string | null;
  name: string;
  kind: AccountKind;
  type?: AccountType;
  base_currency: Currency;
  number_full?: string;
  number_masked?: string;
  credit_limit_minor?: number;
  balance_minor: number;
  status: AccountStatus;
  meta: Record<string, any>;
  created_at: Date;
  updated_at: Date;
}

export interface CreateAccountData {
  name: string;
  institution_id?: string;
  kind: AccountKind;
  type?: AccountType;
  base_currency: Currency;
  number_full?: string;
  number_masked?: string;
  credit_limit_minor?: number;
  balance_minor?: number;
  status?: AccountStatus;
  meta?: Record<string, any>;
}

export interface Institution {
  id: string;
  name: string;
  kind: InstitutionKind;
  logo_url?: string;
  created_at: Date;
}

export type Transaction = {
  id: string;
  fromAccountName: string;
  fromInstitution: string;
  toAccountName: string;
  toInstitution: string;
  currency: Currency;
  amount: number;
  kind: string;
  description: string;
  timestamp: string;
  reversed: boolean;
  meta?: Record<string, unknown>;
  pl: number; // 1 = positive, -1 = negative, 0 = neutral (transfer between own accounts)
};
