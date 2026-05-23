export function MetricCard({
  label,
  value,
  sub,
  className = '',
}: {
  label: string;
  value: string | number;
  sub?: string;
  className?: string;
}) {
  return (
    <div className={`flex flex-col gap-0.5 ${className}`}>
      <span className="text-xs font-medium text-muted">{label}</span>
      <span className="text-3xl font-semibold tabular-nums tracking-tight text-foreground">{value}</span>
      {sub && <span className="text-sm text-muted">{sub}</span>}
    </div>
  );
}
