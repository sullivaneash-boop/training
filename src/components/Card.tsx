import type { ReactNode } from 'react';

export function Card({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl border border-border/90 bg-surface p-4 shadow-[0_1px_2px_rgba(17,24,39,0.05),0_8px_24px_rgba(17,24,39,0.04)] ${className}`}
    >
      {children}
    </div>
  );
}

export function StatCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string | number;
  sub?: string;
}) {
  return (
    <Card className="flex flex-col gap-1">
      <span className="text-xs font-medium text-muted">{label}</span>
      <span className="text-2xl font-semibold tabular-nums text-foreground">{value}</span>
      {sub && <span className="text-xs text-muted">{sub}</span>}
    </Card>
  );
}
