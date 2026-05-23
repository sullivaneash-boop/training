export function ProgressBar({ pct, label }: { pct: number; label?: string }) {
  return (
    <div className="space-y-1">
      {label && (
        <div className="flex justify-between text-xs text-zinc-400">
          <span>{label}</span>
          <span className="tabular-nums">{pct}%</span>
        </div>
      )}
      <div className="h-2 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-[#4a53ff] transition-all duration-500"
          style={{ width: `${Math.min(100, pct)}%` }}
        />
      </div>
    </div>
  );
}
