import { prisma } from "@/lib/db";
import { Card, StatCard } from "@/components/Card";
import { formatCurrency } from "@/lib/format";

export const dynamic = "force-dynamic";

const TYPE_LABEL: Record<string, string> = {
  checking: "Checking",
  savings: "Savings",
  credit: "Credit card",
  investment: "Investment",
  loan: "Loan",
};

// Liabilities reduce net worth.
const LIABILITY_TYPES = new Set(["credit", "loan"]);

export default async function AccountsPage() {
  const accounts = await prisma.account.findMany({
    orderBy: { currentBalance: "desc" },
    include: { _count: { select: { transactions: true } } },
  });

  const assets = accounts
    .filter((a) => !LIABILITY_TYPES.has(a.type))
    .reduce((s, a) => s + a.currentBalance, 0);
  const liabilities = accounts
    .filter((a) => LIABILITY_TYPES.has(a.type))
    .reduce((s, a) => s + a.currentBalance, 0);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Accounts</h1>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Assets" value={formatCurrency(assets)} accent="#16a34a" />
        <StatCard label="Liabilities" value={formatCurrency(liabilities)} accent="#dc2626" />
        <StatCard label="Net worth" value={formatCurrency(assets - liabilities)} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {accounts.map((a) => {
          const liability = LIABILITY_TYPES.has(a.type);
          return (
            <Card key={a.id}>
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-semibold">{a.name}</div>
                  <div className="text-sm text-muted">
                    {a.institution} · {TYPE_LABEL[a.type] ?? a.type} ··{a.mask}
                  </div>
                </div>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-muted">
                  {a._count.transactions} txns
                </span>
              </div>
              <div className="mt-4 flex items-end justify-between">
                <div>
                  <div className="text-xs text-muted">
                    {liability ? "Balance owed" : "Current balance"}
                  </div>
                  <div
                    className="text-2xl font-bold"
                    style={{ color: liability ? "#dc2626" : "#0f172a" }}
                  >
                    {formatCurrency(a.currentBalance)}
                  </div>
                </div>
                {a.availableBalance != null && (
                  <div className="text-right text-sm text-muted">
                    {liability ? "Available credit" : "Available"}
                    <div className="font-medium text-ink">
                      {formatCurrency(a.availableBalance)}
                    </div>
                  </div>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
