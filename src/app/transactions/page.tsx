import { prisma } from "@/lib/db";
import { Card } from "@/components/Card";
import { CategoryBadge } from "@/components/CategoryBadge";
import { formatCurrency, formatDate } from "@/lib/format";
import { CATEGORIES } from "@/lib/categorize";
import Link from "next/link";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: { category?: string; q?: string };
}) {
  const { category, q } = searchParams;

  const where: Record<string, unknown> = {};
  if (category && category !== "All") where.category = category;
  if (q) where.merchant = { contains: q };

  const transactions = await prisma.transaction.findMany({
    where,
    orderBy: { date: "desc" },
    take: PAGE_SIZE,
    include: { account: { select: { name: true, mask: true } } },
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Transactions</h1>

      {/* Filters */}
      <form className="flex flex-wrap items-center gap-3">
        <input
          type="text"
          name="q"
          defaultValue={q}
          placeholder="Search merchant…"
          className="rounded-md border border-slate-300 px-3 py-1.5 text-sm"
        />
        <select
          name="category"
          defaultValue={category ?? "All"}
          className="rounded-md border border-slate-300 px-3 py-1.5 text-sm"
        >
          <option>All</option>
          {CATEGORIES.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
        <button className="rounded-md bg-ink px-3 py-1.5 text-sm font-medium text-white">
          Filter
        </button>
        {(category || q) && (
          <Link href="/transactions" className="text-sm text-muted hover:text-ink">
            Clear
          </Link>
        )}
      </form>

      <Card>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-xs uppercase text-muted">
              <th className="pb-2 font-medium">Date</th>
              <th className="pb-2 font-medium">Merchant</th>
              <th className="pb-2 font-medium">Category</th>
              <th className="pb-2 font-medium">Account</th>
              <th className="pb-2 text-right font-medium">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {transactions.map((t) => (
              <tr key={t.id}>
                <td className="py-2.5 whitespace-nowrap text-muted">{formatDate(t.date)}</td>
                <td className="py-2.5 font-medium">{t.merchant}</td>
                <td className="py-2.5">
                  <CategoryBadge category={t.category} />
                </td>
                <td className="py-2.5 text-muted">
                  {t.account.name} ··{t.account.mask}
                </td>
                <td
                  className={`py-2.5 text-right font-semibold ${
                    t.amount >= 0 ? "text-green-600" : "text-ink"
                  }`}
                >
                  {t.amount >= 0 ? "+" : ""}
                  {formatCurrency(t.amount)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {transactions.length === 0 && (
          <p className="py-8 text-center text-sm text-muted">No transactions match.</p>
        )}
        {transactions.length === PAGE_SIZE && (
          <p className="pt-4 text-center text-xs text-muted">
            Showing latest {PAGE_SIZE}. Refine with filters above.
          </p>
        )}
      </Card>
    </div>
  );
}
