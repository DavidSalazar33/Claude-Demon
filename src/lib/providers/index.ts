import type { FinancialProvider } from "./types";
import { MockProvider } from "./mockProvider";
import { PlaidProvider } from "./plaidProvider";
import { SimpleFinProvider } from "./simplefinProvider";

export * from "./types";

// Choose the active provider from env. Defaults to mock so the app runs with
// zero credentials. Set FINANCIAL_PROVIDER=simplefin (recommended for personal
// use) or =plaid once those providers are configured.
export function getProvider(): FinancialProvider {
  const choice = (process.env.FINANCIAL_PROVIDER ?? "mock").toLowerCase();
  switch (choice) {
    case "simplefin":
      return new SimpleFinProvider();
    case "plaid":
      return new PlaidProvider();
    case "mock":
    default:
      return new MockProvider();
  }
}
