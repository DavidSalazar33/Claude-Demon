import { addDays, differenceInCalendarDays } from "date-fns";

// Detects recurring series (subscriptions, rent, utilities, salary) from a flat
// list of transactions. Pure function over plain data so it can run during sync
// or be unit-tested in isolation.

export interface TxnLike {
  externalId: string;
  merchant: string;
  date: string | Date;
  amount: number;
  category: string;
}

export type Cadence =
  | "weekly"
  | "biweekly"
  | "monthly"
  | "quarterly"
  | "yearly"
  | "irregular";

export interface DetectedSeries {
  merchant: string;
  category: string;
  cadence: Cadence;
  averageAmount: number;
  occurrences: number;
  firstDate: Date;
  lastDate: Date;
  nextExpected: Date | null;
  isSubscription: boolean;
  memberTxnIds: string[];
}

const CADENCE_DAYS: Record<Exclude<Cadence, "irregular">, number> = {
  weekly: 7,
  biweekly: 14,
  monthly: 30,
  quarterly: 91,
  yearly: 365,
};

function classifyCadence(medianGap: number): Cadence {
  const candidates = Object.entries(CADENCE_DAYS) as [
    Exclude<Cadence, "irregular">,
    number
  ][];
  for (const [name, days] of candidates) {
    // Accept within ~25% of the canonical gap.
    if (Math.abs(medianGap - days) <= days * 0.25) return name;
  }
  return "irregular";
}

function median(nums: number[]): number {
  const s = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

function normalizeMerchant(m: string): string {
  return m.trim().toLowerCase().replace(/\s+/g, " ");
}

const SUBSCRIPTION_CATEGORIES = new Set(["Subscriptions", "Entertainment"]);
const NON_SUBSCRIPTION = new Set(["Income", "Transfers", "Rent & Mortgage", "Utilities"]);

export function detectRecurring(txns: TxnLike[]): DetectedSeries[] {
  // Group by normalized merchant.
  const groups = new Map<string, TxnLike[]>();
  for (const t of txns) {
    const key = normalizeMerchant(t.merchant);
    (groups.get(key) ?? groups.set(key, []).get(key)!).push(t);
  }

  const series: DetectedSeries[] = [];

  for (const group of groups.values()) {
    if (group.length < 3) continue; // need a few hits to call it recurring

    const sorted = [...group].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    const gaps: number[] = [];
    for (let i = 1; i < sorted.length; i++) {
      gaps.push(differenceInCalendarDays(new Date(sorted[i].date), new Date(sorted[i - 1].date)));
    }
    const medianGap = median(gaps);
    if (medianGap <= 0) continue;

    const cadence = classifyCadence(medianGap);
    if (cadence === "irregular") continue;
    const cadenceDays = CADENCE_DAYS[cadence];

    // Gate 1 — spacing regularity. A real recurring charge arrives on a steady
    // rhythm; a merchant you happen to buy from a lot (Amazon, coffee) has
    // erratic gaps. Reject when the gaps themselves vary too much.
    const gapMean = gaps.reduce((a, b) => a + b, 0) / gaps.length;
    const gapVar = gaps.reduce((a, b) => a + (b - gapMean) ** 2, 0) / gaps.length;
    const gapCV = gapMean !== 0 ? Math.sqrt(gapVar) / gapMean : 1;
    if (gapCV > 0.35) continue;

    // Gate 2 — most gaps must actually land on the inferred cadence (not just
    // the median). Catches bursts of activity that fake a periodic median.
    const onCadence = gaps.filter((g) => Math.abs(g - cadenceDays) <= cadenceDays * 0.35).length;
    if (onCadence / gaps.length < 0.6) continue;

    // Gate 3 — amount consistency. Bills (utilities) drift a little; pure
    // subscriptions barely move. Anything wilder isn't a recurring charge.
    const amounts = sorted.map((t) => t.amount);
    const mean = amounts.reduce((a, b) => a + b, 0) / amounts.length;
    const variance =
      amounts.reduce((a, b) => a + (b - mean) ** 2, 0) / amounts.length;
    const cv = mean !== 0 ? Math.sqrt(variance) / Math.abs(mean) : 1;
    if (cv > 0.4) continue;

    const first = new Date(sorted[0].date);
    const last = new Date(sorted[sorted.length - 1].date);
    const category = sorted[sorted.length - 1].category;
    const isOutflow = mean < 0;

    // A subscription is a stable-amount discretionary outflow. Bills
    // (rent/utilities) and income/transfers are recurring but not subscriptions.
    const STABLE_AMOUNT = 0.15;
    const isSubscription =
      isOutflow &&
      !NON_SUBSCRIPTION.has(category) &&
      (SUBSCRIPTION_CATEGORIES.has(category) ||
        ((cadence === "monthly" || cadence === "yearly") &&
          Math.abs(mean) < 100 &&
          cv <= STABLE_AMOUNT));

    series.push({
      merchant: sorted[sorted.length - 1].merchant,
      category,
      cadence,
      averageAmount: Math.round(mean * 100) / 100,
      occurrences: sorted.length,
      firstDate: first,
      lastDate: last,
      nextExpected: addDays(last, CADENCE_DAYS[cadence]),
      isSubscription,
      memberTxnIds: sorted.map((t) => t.externalId),
    });
  }

  // Most "expensive" recurring first (by monthly-normalized magnitude).
  return series.sort(
    (a, b) => Math.abs(b.averageAmount) - Math.abs(a.averageAmount)
  );
}
