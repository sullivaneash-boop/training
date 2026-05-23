export function ProgressBar({ pct, label }: { pct: number; label?: string }) {
  return (
    <div className="space-y-2">
      {label && (
        <div className="flex justify-between text-sm text-muted">
          <span>{label}</span>
          <span className="tabular-nums font-medium text-foreground">{pct}%</span>
        </div>
      )}
      <div className="h-2.5 overflow-hidden rounded-full bg-neutral-200">
        <div
          className="h-full rounded-full bg-accent transition-all duration-500"
          style={{ width: `${Math.min(100, pct)}%` }}
        />
      </div>
    </div>
  );
}
