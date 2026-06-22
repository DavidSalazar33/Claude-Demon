import { subDays } from "date-fns";
import type {
  FinancialProvider,
  ProviderAccount,
  ProviderSnapshot,
  ProviderTransaction,
} from "./types";

// Real account aggregation via SimpleFIN (https://www.simplefin.org).
//
// SimpleFIN is a read-only, low-cost ($15/yr) protocol designed for personal
// finance apps. Flow:
//   1. Sign up at https://bridge.simplefin.org and create a "setup token".
//   2. Run `npm run simplefin:claim <setup-token>` once to exchange it for an
//      Access URL (contains embedded basic-auth credentials).
//   3. Put it in .env as SIMPLEFIN_ACCESS_URL and set FINANCIAL_PROVIDER=simplefin.
//
// Everything downstream (sync, categorization, recurring detection, UI) consumes
// the FinancialProvider interface, so no other code changes.

// SimpleFIN amount convention matches ours: outflows are negative, inflows
// positive — so no sign flip is needed (unlike Plaid).

interface SfinTransaction {
  id: string;
  posted: number; // unix seconds
  amount: string; // signed numeric string
  description?: string;
  payee?: string;
  memo?: string;
  pending?: boolean;
}

interface SfinOrg {
  domain?: string;
  name?: string;
  id?: string;
}

interface SfinAccount {
  id: string;
  name: string;
  currency?: string | { name?: string };
  balance: string;
  "available-balance"?: string;
  "balance-date"?: number;
  org?: SfinOrg;
  conn_id?: string;
  transactions?: SfinTransaction[];
}

interface SfinConnection {
  conn_id: string;
  name?: string;
  org_url?: string;
}

interface SfinAccountSet {
  errors?: string[];
  errlist?: string[];
  connections?: SfinConnection[];
  accounts: SfinAccount[];
}

// Node's fetch (undici) rejects URLs that embed credentials, so split the
// userinfo out into an Authorization header.
function parseAccessUrl(accessUrl: string): { base: string; auth?: string } {
  const u = new URL(accessUrl);
  let auth: string | undefined;
  if (u.username || u.password) {
    auth = "Basic " + Buffer.from(`${u.username}:${u.password}`).toString("base64");
    u.username = "";
    u.password = "";
  }
  return { base: u.toString().replace(/\/$/, ""), auth };
}

function inferType(name: string): ProviderAccount["type"] {
  const n = name.toLowerCase();
  if (/(credit|card|visa|mastercard|amex)/.test(n)) return "credit";
  if (/(saving|hysa)/.test(n)) return "savings";
  if (/(invest|broker|401|ira|portfolio)/.test(n)) return "investment";
  if (/(loan|mortgage)/.test(n)) return "loan";
  return "checking";
}

function currencyCode(c: SfinAccount["currency"]): string {
  if (!c) return "USD";
  return typeof c === "string" ? c : c.name ?? "USD";
}

export class SimpleFinProvider implements FinancialProvider {
  readonly name = "simplefin";
  private readonly months: number;

  constructor(months = 7) {
    this.months = months;
  }

  async fetchSnapshot(): Promise<ProviderSnapshot> {
    const accessUrl = process.env.SIMPLEFIN_ACCESS_URL;
    if (!accessUrl) {
      throw new Error(
        "SIMPLEFIN_ACCESS_URL is not set. Run `npm run simplefin:claim <setup-token>` " +
          "to obtain one, then add it to .env (see plaidProvider's sibling docs)."
      );
    }

    const { base, auth } = parseAccessUrl(accessUrl);
    const startDate = Math.floor(subDays(new Date(), this.months * 30).getTime() / 1000);
    const url = `${base}/accounts?start-date=${startDate}&pending=1`;

    const res = await fetch(url, {
      headers: auth ? { Authorization: auth } : {},
    });
    if (!res.ok) {
      throw new Error(`SimpleFIN request failed: ${res.status} ${res.statusText}`);
    }
    const data = (await res.json()) as SfinAccountSet;

    const errors = data.errors ?? data.errlist ?? [];
    if (errors.length) {
      // Non-fatal: SimpleFIN reports per-institution issues here.
      console.warn("SimpleFIN reported errors:", errors);
    }

    const connByConn = new Map<string, SfinConnection>();
    for (const c of data.connections ?? []) connByConn.set(c.conn_id, c);

    const accounts: ProviderAccount[] = [];
    const transactions: ProviderTransaction[] = [];

    for (const a of data.accounts ?? []) {
      const institution =
        a.org?.name ??
        a.org?.domain ??
        (a.conn_id ? connByConn.get(a.conn_id)?.name : undefined) ??
        "Unknown";

      accounts.push({
        externalId: a.id,
        name: a.name,
        institution,
        type: inferType(a.name),
        currency: currencyCode(a.currency),
        currentBalance: Number(a.balance),
        availableBalance:
          a["available-balance"] != null ? Number(a["available-balance"]) : undefined,
      });

      for (const t of a.transactions ?? []) {
        const amount = Number(t.amount);
        // Defensive: skip rows with unparseable amounts rather than crash sync.
        if (!Number.isFinite(amount)) {
          console.warn(`Skipping SimpleFIN txn ${t.id} with invalid amount "${t.amount}"`);
          continue;
        }
        const date = new Date(t.posted * 1000).toISOString().slice(0, 10);
        const merchant = (t.payee ?? t.description ?? "Unknown").trim();
        transactions.push({
          externalId: t.id,
          accountExternalId: a.id,
          date,
          amount,
          name: (t.description ?? t.payee ?? "Transaction").trim(),
          merchant,
          pending: t.pending ?? false,
        });
      }
    }

    return { accounts, transactions };
  }
}
