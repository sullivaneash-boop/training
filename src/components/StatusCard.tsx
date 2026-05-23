import type { ReadinessResult } from '../lib/types';
import { statusBg, statusColor, statusLabel } from '../lib/readiness';

export function StatusCard({
  result,
  reason,
}: {
  result: ReadinessResult;
  reason: string;
}) {
  return (
    <div className={`rounded-xl border p-5 ${statusBg(result)}`}>
      <p className="text-xs font-medium text-muted">Today&apos;s call</p>
      <p className={`mt-1 text-4xl font-bold uppercase tracking-tight ${statusColor(result)}`}>
        {statusLabel(result)}
      </p>
      <p className="mt-3 text-sm leading-relaxed text-foreground/80">{reason}</p>
    </div>
  );
}
