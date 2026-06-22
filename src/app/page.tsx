import { getDashboard } from "@/lib/analytics";
import { prisma } from "@/lib/db";
import { Card, StatCard } from "@/components/Card";
import { CategoryBadge } from "@/components/CategoryBadge";
import { SpendingByCategoryChart, SpendingTrendChart } from "@/components/Charts";
import { formatCurrency, formatSpend } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const count = await prisma.transaction.count();
  if (count === 0) return <EmptyState />;

  const data = await getDashboard();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Last 30 days</h1>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Spending" value={formatSpend(data.totalSpend30d)} accent="#ea580c" />
        <StatCard label="Income" value={formatCurrency(data.totalIncome30d)} accent="#16a34a" />
        <StatCard
          label="Net"
          value={`${data.net30d >= 0 ? "+" : ""}${formatCurrency(data.net30d)}`}
          accent={data.net30d >= 0 ? "#16a34a" : "#dc2626"}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Spending by category (30d)">
          <SpendingByCategoryChart data={data.byCategory} />
        </Card>
        <Card title="Income vs. spending (6 months)">
          <SpendingTrendChart data={data.monthly} />
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Top categories">
          <ul className="divide-y divide-slate-100">
            {data.byCategory.map((c) => (
              <li key={c.category} className="flex items-center justify-between py-2.5">
                <CategoryBadge category={c.category} />
                <span className="font-medium">{formatSpend(c.total)}</span>
              </li>
            ))}
          </ul>
        </Card>
        <Card title="Top merchants (30d)">
          <ul className="divide-y divide-slate-100">
            {data.topMerchants.map((m) => (
              <li key={m.merchant} className="flex items-center justify-between py-2.5">
                <span className="text-sm">{m.merchant}</span>
                <span className="font-medium">{formatSpend(m.total)}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center">
      <h1 className="text-xl font-bold">No data yet</h1>
      <p className="mt-2 text-muted">
        Run <code className="rounded bg-slate-100 px-1.5 py-0.5">npm run setup</code> or click{" "}
        <strong>Refresh</strong> to load accounts and transactions.
      </p>
    </div>
  );
}
