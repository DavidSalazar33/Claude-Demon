import { prisma } from "./db";
import { format, subMonths } from "date-fns";
import type { Category } from "./categorize";

// Spending excludes income and internal transfers.
const EXCLUDED = ["Income", "Transfers"];

export interface CategoryTotal {
  category: Category;
  total: number; // positive magnitude of spend
}

export interface MonthlyPoint {
  month: string; // "YYYY-MM"
  spending: number;
  income: number;
}

export interface DashboardData {
  totalSpend30d: number;
  totalIncome30d: number;
  net30d: number;
  byCategory: CategoryTotal[];
  monthly: MonthlyPoint[];
  topMerchants: { merchant: string; total: number }[];
}

export async function getDashboard(): Promise<DashboardData> {
  const since30 = subMonths(new Date(), 1);
  const recent = await prisma.transaction.findMany({
    where: { date: { gte: since30 } },
  });

  let totalSpend30d = 0;
  let totalIncome30d = 0;
  for (const t of recent) {
    if (t.amount < 0 && !EXCLUDED.includes(t.category)) totalSpend30d += -t.amount;
    if (t.amount > 0 && t.category === "Income") totalIncome30d += t.amount;
  }

  // Spend by category (last 30 days).
  const catMap = new Map<string, number>();
  for (const t of recent) {
    if (t.amount < 0 && !EXCLUDED.includes(t.category)) {
      catMap.set(t.category, (catMap.get(t.category) ?? 0) + -t.amount);
    }
  }
  const byCategory: CategoryTotal[] = [...catMap.entries()]
    .map(([category, total]) => ({ category: category as Category, total: Math.round(total * 100) / 100 }))
    .sort((a, b) => b.total - a.total);

  // Monthly trend over the last 6 months.
  const since6 = subMonths(new Date(), 6);
  const months = await prisma.transaction.findMany({ where: { date: { gte: since6 } } });
  const monthMap = new Map<string, MonthlyPoint>();
  for (const t of months) {
    const key = format(t.date, "yyyy-MM");
    const pt = monthMap.get(key) ?? { month: key, spending: 0, income: 0 };
    if (t.amount < 0 && !EXCLUDED.includes(t.category)) pt.spending += -t.amount;
    if (t.amount > 0 && t.category === "Income") pt.income += t.amount;
    monthMap.set(key, pt);
  }
  const monthly = [...monthMap.values()]
    .map((p) => ({ ...p, spending: Math.round(p.spending * 100) / 100, income: Math.round(p.income * 100) / 100 }))
    .sort((a, b) => (a.month < b.month ? -1 : 1));

  // Top merchants by spend (last 30 days).
  const merchMap = new Map<string, number>();
  for (const t of recent) {
    if (t.amount < 0 && !EXCLUDED.includes(t.category)) {
      merchMap.set(t.merchant, (merchMap.get(t.merchant) ?? 0) + -t.amount);
    }
  }
  const topMerchants = [...merchMap.entries()]
    .map(([merchant, total]) => ({ merchant, total: Math.round(total * 100) / 100 }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 6);

  return {
    totalSpend30d: Math.round(totalSpend30d * 100) / 100,
    totalIncome30d: Math.round(totalIncome30d * 100) / 100,
    net30d: Math.round((totalIncome30d - totalSpend30d) * 100) / 100,
    byCategory,
    monthly,
    topMerchants,
  };
}
