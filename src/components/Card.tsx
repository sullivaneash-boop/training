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
      className={`rounded-2xl border border-white/10 bg-white/5 p-4 ${className}`}
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
      <span className="text-xs uppercase tracking-wider text-zinc-500">{label}</span>
      <span className="text-2xl font-semibold tabular-nums text-white">{value}</span>
      {sub && <span className="text-xs text-zinc-400">{sub}</span>}
    </Card>
  );
}
