import { addDays, format, subDays } from "date-fns";
import type {
  FinancialProvider,
  ProviderAccount,
  ProviderSnapshot,
  ProviderTransaction,
} from "./types";

// Deterministic PRNG (mulberry32) so generated data is stable across runs.
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const ACCOUNTS: ProviderAccount[] = [
  {
    externalId: "acc_checking",
    name: "Everyday Checking",
    officialName: "Premier Checking",
    institution: "Northbank",
    type: "checking",
    mask: "4821",
    currency: "USD",
    currentBalance: 6432.18,
    availableBalance: 6432.18,
  },
  {
    externalId: "acc_savings",
    name: "High-Yield Savings",
    officialName: "Growth Savings 4.25% APY",
    institution: "Northbank",
    type: "savings",
    mask: "9930",
    currency: "USD",
    currentBalance: 21850.0,
    availableBalance: 21850.0,
  },
  {
    externalId: "acc_card",
    name: "Travel Rewards Card",
    officialName: "Skyline Visa Signature",
    institution: "Skyline",
    type: "credit",
    mask: "1107",
    currency: "USD",
    currentBalance: 1284.55, // amount currently owed
    availableBalance: 8715.45,
  },
  {
    externalId: "acc_brokerage",
    name: "Brokerage",
    officialName: "Index Portfolio",
    institution: "Vanguard Peak",
    type: "investment",
    mask: "2048",
    currency: "USD",
    currentBalance: 48230.77,
  },
];

interface RecurringSpec {
  merchant: string;
  name: string;
  amount: number; // signed; negative = outflow
  account: string;
  dayOfMonth: number;
  jitterPct?: number; // amount variation, e.g. utilities
}

// Predictable monthly items the recurring detector should surface.
const MONTHLY: RecurringSpec[] = [
  { merchant: "Skyview Apartments", name: "Skyview Apartments Rent", amount: -2200, account: "acc_checking", dayOfMonth: 1 },
  { merchant: "City Power & Electric", name: "City Power & Electric", amount: -94, account: "acc_checking", dayOfMonth: 8, jitterPct: 0.25 },
  { merchant: "Comcast Xfinity", name: "Comcast Xfinity Internet", amount: -74.99, account: "acc_checking", dayOfMonth: 12 },
  { merchant: "Verizon Wireless", name: "Verizon Wireless", amount: -65.0, account: "acc_checking", dayOfMonth: 15 },
  { merchant: "Netflix", name: "Netflix.com", amount: -15.49, account: "acc_card", dayOfMonth: 4 },
  { merchant: "Spotify", name: "Spotify Premium", amount: -11.99, account: "acc_card", dayOfMonth: 6 },
  { merchant: "Iron Peak Fitness", name: "Iron Peak Fitness Gym", amount: -39.0, account: "acc_card", dayOfMonth: 2 },
  { merchant: "Apple iCloud", name: "Apple iCloud Storage", amount: -2.99, account: "acc_card", dayOfMonth: 18 },
  { merchant: "OpenAI", name: "OpenAI ChatGPT Plus", amount: -20.0, account: "acc_card", dayOfMonth: 21 },
  { merchant: "The NYTimes", name: "NYTimes Digital Subscription", amount: -17.0, account: "acc_card", dayOfMonth: 24 },
];

const GROCERS = ["Whole Foods Market", "Trader Joe's", "Safeway", "Costco Wholesale"];
const DINING = ["Starbucks", "Chipotle", "DoorDash", "Sweetgreen", "Blue Bottle Coffee", "Uber Eats"];
const TRANSPORT = ["Uber", "Lyft", "Shell Gas", "Chevron", "City Metro Transit"];
const SHOPPING = ["Amazon", "Target", "Best Buy", "Apple Store", "IKEA"];
const ENTERTAINMENT = ["Steam Games", "AMC Cinemas", "Ticketmaster"];

export class MockProvider implements FinancialProvider {
  readonly name = "mock";
  private readonly months: number;

  constructor(months = 7) {
    this.months = months;
  }

  async fetchSnapshot(): Promise<ProviderSnapshot> {
    const rand = rng(20260622);
    const today = new Date();
    const start = subDays(today, this.months * 30);
    const txns: ProviderTransaction[] = [];
    let counter = 0;

    const pick = <T>(arr: T[]) => arr[Math.floor(rand() * arr.length)];
    const between = (lo: number, hi: number) => lo + rand() * (hi - lo);
    const add = (t: Omit<ProviderTransaction, "externalId">) =>
      txns.push({ externalId: `txn_${counter++}`, ...t });

    // --- Recurring monthly items ---
    for (let m = 0; m <= this.months; m++) {
      const base = new Date(start.getFullYear(), start.getMonth() + m, 1);
      for (const spec of MONTHLY) {
        const date = new Date(base.getFullYear(), base.getMonth(), spec.dayOfMonth);
        if (date < start || date > today) continue;
        const jitter = spec.jitterPct ? 1 + (rand() - 0.5) * 2 * spec.jitterPct : 1;
        add({
          accountExternalId: spec.account,
          date: format(date, "yyyy-MM-dd"),
          amount: Math.round(spec.amount * jitter * 100) / 100,
          name: spec.name,
          merchant: spec.merchant,
        });
      }
    }

    // --- Biweekly salary (direct deposit) ---
    for (let d = new Date(start); d <= today; d = addDays(d, 14)) {
      add({
        accountExternalId: "acc_checking",
        date: format(d, "yyyy-MM-dd"),
        amount: 3200,
        name: "ACME CORP PAYROLL DIRECT DEP",
        merchant: "Acme Corp Payroll",
        categoryHint: "Income",
      });
    }

    // --- Monthly savings interest + checking->savings transfer ---
    for (let m = 0; m <= this.months; m++) {
      const day = new Date(start.getFullYear(), start.getMonth() + m, 28);
      if (day < start || day > today) continue;
      add({
        accountExternalId: "acc_savings",
        date: format(day, "yyyy-MM-dd"),
        amount: Math.round(between(70, 82) * 100) / 100,
        name: "Interest Paid",
        merchant: "Northbank Interest",
        categoryHint: "Income",
      });
      const tDay = new Date(start.getFullYear(), start.getMonth() + m, 16);
      if (tDay >= start && tDay <= today) {
        add({ accountExternalId: "acc_checking", date: format(tDay, "yyyy-MM-dd"), amount: -500, name: "Transfer to Savings", merchant: "Internal Transfer" });
        add({ accountExternalId: "acc_savings", date: format(tDay, "yyyy-MM-dd"), amount: 500, name: "Transfer from Checking", merchant: "Internal Transfer" });
      }
    }

    // --- Discretionary day-by-day spending ---
    for (let d = new Date(start); d <= today; d = addDays(d, 1)) {
      const iso = format(d, "yyyy-MM-dd");
      const weekend = d.getDay() === 0 || d.getDay() === 6;

      // Groceries ~twice a week
      if (rand() < 0.28) {
        add({ accountExternalId: rand() < 0.5 ? "acc_card" : "acc_checking", date: iso, amount: -Math.round(between(28, 145) * 100) / 100, name: pick(GROCERS), merchant: pick(GROCERS) });
      }
      // Dining (more on weekends)
      if (rand() < (weekend ? 0.75 : 0.45)) {
        const m = pick(DINING);
        add({ accountExternalId: "acc_card", date: iso, amount: -Math.round(between(6, 58) * 100) / 100, name: m, merchant: m });
      }
      // Transport
      if (rand() < 0.3) {
        const m = pick(TRANSPORT);
        add({ accountExternalId: "acc_card", date: iso, amount: -Math.round(between(9, 72) * 100) / 100, name: m, merchant: m });
      }
      // Shopping
      if (rand() < 0.18) {
        const m = pick(SHOPPING);
        add({ accountExternalId: "acc_card", date: iso, amount: -Math.round(between(12, 220) * 100) / 100, name: m, merchant: m });
      }
      // Entertainment (occasional)
      if (rand() < 0.06) {
        const m = pick(ENTERTAINMENT);
        add({ accountExternalId: "acc_card", date: iso, amount: -Math.round(between(11, 95) * 100) / 100, name: m, merchant: m });
      }
    }

    // --- A one-off trip (flight + hotel + rideshare) ~2 months ago ---
    const trip = subDays(today, 62);
    add({ accountExternalId: "acc_card", date: format(trip, "yyyy-MM-dd"), amount: -428.4, name: "Delta Air Lines", merchant: "Delta Airlines" });
    add({ accountExternalId: "acc_card", date: format(addDays(trip, 1), "yyyy-MM-dd"), amount: -612.0, name: "Marriott Hotels", merchant: "Marriott Hotels" });
    add({ accountExternalId: "acc_card", date: format(addDays(trip, 3), "yyyy-MM-dd"), amount: -58.75, name: "Lyft", merchant: "Lyft" });

    txns.sort((a, b) => (a.date < b.date ? 1 : -1));
    return { accounts: ACCOUNTS, transactions: txns };
  }
}
