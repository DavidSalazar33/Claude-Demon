// The single seam between "where account data comes from" and the rest of the
// app. Swap the implementation (mock -> Plaid) without touching the UI, sync, or
// analytics code.

export interface ProviderAccount {
  externalId: string;
  name: string;
  officialName?: string;
  institution: string;
  type: "checking" | "savings" | "credit" | "investment" | "loan";
  mask?: string;
  currency: string;
  currentBalance: number;
  availableBalance?: number;
}

export interface ProviderTransaction {
  externalId: string;
  accountExternalId: string;
  date: string; // ISO date (YYYY-MM-DD)
  // Signed: negative = money out (spending), positive = money in (income).
  amount: number;
  name: string;
  merchant: string;
  pending?: boolean;
  // Optional category hint from the provider (e.g. Plaid). The app will still
  // run its own categorizer; this can be preferred when present.
  categoryHint?: string;
}

export interface ProviderSnapshot {
  accounts: ProviderAccount[];
  transactions: ProviderTransaction[];
}

export interface FinancialProvider {
  readonly name: string;
  /** Pull current accounts and recent transactions. */
  fetchSnapshot(): Promise<ProviderSnapshot>;
}
