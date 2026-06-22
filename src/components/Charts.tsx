"use client";

import {
  Bar,
  BarChart,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CATEGORY_COLORS, type Category } from "@/lib/categorize";

const money = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);

export function SpendingByCategoryChart({
  data,
}: {
  data: { category: string; total: number }[];
}) {
  if (data.length === 0) return <Empty />;
  return (
    <ResponsiveContainer width="100%" height={280}>
      <PieChart>
        <Pie
          data={data}
          dataKey="total"
          nameKey="category"
          innerRadius={60}
          outerRadius={100}
          paddingAngle={2}
        >
          {data.map((d) => (
            <Cell key={d.category} fill={CATEGORY_COLORS[d.category as Category] ?? "#94a3b8"} />
          ))}
        </Pie>
        <Tooltip formatter={(v: number) => money(v)} />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function SpendingTrendChart({
  data,
}: {
  data: { month: string; spending: number; income: number }[];
}) {
  if (data.length === 0) return <Empty />;
  const labeled = data.map((d) => {
    const [y, m] = d.month.split("-").map(Number);
    return { ...d, label: new Date(y, m - 1, 1).toLocaleDateString("en-US", { month: "short" }) };
  });
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={labeled}>
        <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} />
        <YAxis tickFormatter={(v) => money(v)} tickLine={false} axisLine={false} fontSize={12} width={70} />
        <Tooltip formatter={(v: number) => money(v)} />
        <Legend />
        <Bar dataKey="income" name="Income" fill="#16a34a" radius={[4, 4, 0, 0]} />
        <Bar dataKey="spending" name="Spending" fill="#ea580c" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

function Empty() {
  return (
    <div className="flex h-[280px] items-center justify-center text-sm text-muted">
      No data yet — hit Refresh.
    </div>
  );
}
