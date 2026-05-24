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
    <div className={`rounded-2xl border p-5 ${statusBg(result)}`}>
      <p className="section-label">Today&apos;s call</p>
      <p className={`app-heading mt-1 text-4xl uppercase ${statusColor(result)}`}>
        {statusLabel(result)}
      </p>
      <p className="mt-3 text-sm leading-relaxed text-foreground/80">{reason}</p>
    </div>
  );
}
