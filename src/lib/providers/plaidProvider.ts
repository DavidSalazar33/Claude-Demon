import type { FinancialProvider, ProviderSnapshot } from "./types";

// Stub for real account aggregation via Plaid.
//
// To enable:
//   1. Sign up at https://dashboard.plaid.com (free sandbox + dev tier).
//   2. `npm install plaid`
//   3. Set PLAID_CLIENT_ID / PLAID_SECRET / PLAID_ENV and FINANCIAL_PROVIDER=plaid.
//   4. Implement Link (to obtain access_tokens) and store them, then fill in
//      fetchSnapshot() below using accountsGet + transactionsSync.
//
// Everything downstream (sync, categorization, recurring detection, UI) already
// consumes the FinancialProvider interface, so no other code needs to change.
export class PlaidProvider implements FinancialProvider {
  readonly name = "plaid";

  async fetchSnapshot(): Promise<ProviderSnapshot> {
    throw new Error(
      "PlaidProvider is not implemented yet. See src/lib/providers/plaidProvider.ts " +
        "for setup steps, or set FINANCIAL_PROVIDER=mock to use generated data."
    );

    // Reference implementation sketch:
    //
    // const client = new PlaidApi(new Configuration({
    //   basePath: PlaidEnvironments[process.env.PLAID_ENV ?? "sandbox"],
    //   baseOptions: { headers: {
    //     "PLAID-CLIENT-ID": process.env.PLAID_CLIENT_ID,
    //     "PLAID-SECRET": process.env.PLAID_SECRET,
    //   } },
    // }));
    //
    // For each stored access_token:
    //   const { data: acct } = await client.accountsGet({ access_token });
    //   const { data: txns } = await client.transactionsSync({ access_token });
    //   ...map into ProviderAccount[] / ProviderTransaction[] (Plaid amounts are
    //   positive for outflow, so negate: amount = -txn.amount).
  }
}
