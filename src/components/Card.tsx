export function Card({
  title,
  children,
  className = "",
}: {
  title?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-xl border border-slate-200 bg-white p-5 shadow-sm ${className}`}>
      {title && <h2 className="mb-4 text-sm font-semibold text-muted">{title}</h2>}
      {children}
    </div>
  );
}

export function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="text-sm text-muted">{label}</div>
      <div className="mt-1 text-2xl font-bold" style={accent ? { color: accent } : undefined}>
        {value}
      </div>
    </div>
  );
}
