import { CATEGORY_COLORS, type Category } from "@/lib/categorize";

export function CategoryBadge({ category }: { category: string }) {
  const color = CATEGORY_COLORS[category as Category] ?? "#94a3b8";
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium"
      style={{ backgroundColor: `${color}1a`, color }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />
      {category}
    </span>
  );
}
