import type { FinancialProvider } from "./types";
import { MockProvider } from "./mockProvider";
import { PlaidProvider } from "./plaidProvider";

export * from "./types";

// Choose the active provider from env. Defaults to mock so the app runs with
// zero credentials. Set FINANCIAL_PROVIDER=plaid once plaidProvider is wired up.
export function getProvider(): FinancialProvider {
  const choice = (process.env.FINANCIAL_PROVIDER ?? "mock").toLowerCase();
  switch (choice) {
    case "plaid":
      return new PlaidProvider();
    case "mock":
    default:
      return new MockProvider();
  }
}
