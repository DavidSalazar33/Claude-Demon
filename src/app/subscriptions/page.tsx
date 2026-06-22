import { prisma } from "@/lib/db";
import { Card, StatCard } from "@/components/Card";
import { CategoryBadge } from "@/components/CategoryBadge";
import { formatSpend, formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

const CADENCE_LABEL: Record<string, string> = {
  weekly: "Weekly",
  biweekly: "Every 2 weeks",
  monthly: "Monthly",
  quarterly: "Quarterly",
  yearly: "Yearly",
};

// Normalize a recurring charge to an estimated monthly cost.
const MONTHLY_FACTOR: Record<string, number> = {
  weekly: 52 / 12,
  biweekly: 26 / 12,
  monthly: 1,
  quarterly: 1 / 3,
  yearly: 1 / 12,
};

export default async function SubscriptionsPage() {
  const series = await prisma.recurringSeries.findMany({
    orderBy: { averageAmount: "asc" }, // most negative (biggest spend) first
  });

  const subscriptions = series.filter((s) => s.isSubscription);
  const otherRecurring = series.filter((s) => !s.isSubscription && s.averageAmount < 0);

  const monthlySubCost = subscriptions.reduce(
    (sum, s) => sum + Math.abs(s.averageAmount) * (MONTHLY_FACTOR[s.cadence] ?? 1),
    0
  );

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Recurring & subscriptions</h1>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Active subscriptions" value={String(subscriptions.length)} />
        <StatCard label="Est. monthly cost" value={formatSpend(monthlySubCost)} accent="#9333ea" />
        <StatCard label="Est. yearly cost" value={formatSpend(monthlySubCost * 12)} accent="#9333ea" />
      </div>

      <Card title="Subscriptions">
        <RecurringTable rows={subscriptions} emptyText="No subscriptions detected yet." />
      </Card>

      <Card title="Other recurring bills (rent, utilities, …)">
        <RecurringTable rows={otherRecurring} emptyText="No recurring bills detected yet." />
      </Card>
    </div>
  );
}

function RecurringTable({
  rows,
  emptyText,
}: {
  rows: {
    id: string;
    merchant: string;
    category: string;
    cadence: string;
    averageAmount: number;
    occurrences: number;
    nextExpected: Date | null;
  }[];
  emptyText: string;
}) {
  if (rows.length === 0) {
    return <p className="py-6 text-center text-sm text-muted">{emptyText}</p>;
  }
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-slate-200 text-left text-xs uppercase text-muted">
          <th className="pb-2 font-medium">Merchant</th>
          <th className="pb-2 font-medium">Category</th>
          <th className="pb-2 font-medium">Frequency</th>
          <th className="pb-2 font-medium">Next charge</th>
          <th className="pb-2 text-right font-medium">Amount</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100">
        {rows.map((s) => (
          <tr key={s.id}>
            <td className="py-2.5 font-medium">{s.merchant}</td>
            <td className="py-2.5">
              <CategoryBadge category={s.category} />
            </td>
            <td className="py-2.5 text-muted">{CADENCE_LABEL[s.cadence] ?? s.cadence}</td>
            <td className="py-2.5 text-muted">
              {s.nextExpected ? formatDate(s.nextExpected) : "—"}
            </td>
            <td className="py-2.5 text-right font-semibold">{formatSpend(s.averageAmount)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
