import { Link } from 'react-router-dom';
import { Card } from '../components/Card';
import { MetricCard } from '../components/MetricCard';
import { PageHeader } from '../components/PageHeader';
import { ProgressBar } from '../components/ProgressBar';
import { useTrainingData } from '../hooks/useTrainingData';
import { computeWeeklyStats } from '../lib/weeklyStats';
import { getWeekNumber, getWeekPlan } from '../lib/weekUtils';
import { isAiEnabled } from '../lib/storage';

const DISCIPLINES = [
  { key: 'swim', label: 'Swim', get: (s: ReturnType<typeof computeWeeklyStats>) => s.swimSessions },
  { key: 'bike', label: 'Bike', get: (s: ReturnType<typeof computeWeeklyStats>) => s.bikeSessions },
  { key: 'run', label: 'Run', get: (s: ReturnType<typeof computeWeeklyStats>) => s.runSessions },
  {
    key: 'strength',
    label: 'Strength',
    get: (s: ReturnType<typeof computeWeeklyStats>) => s.strengthSessions,
  },
] as const;

export function Week() {
  const { plan, workouts } = useTrainingData();

  if (!plan) return <p className="text-muted">Import a plan in Settings.</p>;

  const weekNum = getWeekNumber(plan);
  const weekPlan = getWeekPlan(plan, weekNum);
  const stats = computeWeeklyStats(plan, weekPlan, weekNum, workouts);

  const upcoming: string[] = [];
  if (weekPlan?.longRide) upcoming.push(`Long ride: ${weekPlan.longRide}`);
  if (weekPlan?.longRun) upcoming.push(`Long run: ${weekPlan.longRun}`);
  if (weekPlan?.longSwim) upcoming.push(`Long swim: ${weekPlan.longSwim}`);
  const onTrackLabel =
    stats.completionPct >= 80
      ? 'On track'
      : stats.completionPct >= 60
        ? 'Slightly behind'
        : 'Needs adjustment';

  return (
    <div className="space-y-5">
      <PageHeader
        title={`Week ${weekNum}`}
        subtitle={weekPlan?.keyFocus ?? 'Am I on track?'}
      />

      <Card className="space-y-4">
        <div className="flex items-end justify-between gap-3">
          <MetricCard label="Completion" value={`${stats.completionPct}%`} />
          <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-semibold text-foreground">
            {onTrackLabel}
          </span>
        </div>
        <ProgressBar
          pct={stats.completionPct}
          label={`${stats.completedHours} / ${stats.plannedHours} hrs`}
        />
      </Card>

      <section className="space-y-2">
        <p className="section-label">By discipline</p>
        <div className="grid grid-cols-4 gap-2">
          {DISCIPLINES.map(({ key, label, get }) => (
            <div
              key={key}
              className="flex flex-col items-center rounded-xl border border-border bg-surface px-2 py-3 text-center shadow-sm"
            >
              <span className="text-xs font-medium text-muted">{label}</span>
              <span className="mt-1 text-xl font-semibold tabular-nums text-foreground">
                {get(stats)}
              </span>
            </div>
          ))}
        </div>
      </section>

      {upcoming.length > 0 && (
        <section className="space-y-2">
          <p className="section-label">Key sessions</p>
          <Card>
            <ul className="space-y-2 text-sm text-foreground">
              {upcoming.map((u) => (
                <li key={u}>{u}</li>
              ))}
            </ul>
          </Card>
        </section>
      )}

      <Card>
        <p className="text-xs font-medium text-muted">Brick completed</p>
        <p className="mt-1 text-lg font-semibold text-foreground">
          {stats.brickCompleted ? 'Yes' : 'Not yet'}
        </p>
      </Card>

      {stats.missedSessions.length > 0 && (
        <Card className="border-amber-200 bg-amber-50/50">
          <p className="text-xs font-medium text-amber-800">Missed this week</p>
          <ul className="mt-2 space-y-1 text-sm text-amber-900/80">
            {stats.missedSessions.map((m) => (
              <li key={m}>· {m}</li>
            ))}
          </ul>
          <p className="mt-2 text-sm text-muted">No guilt — just adjust and move on.</p>
        </Card>
      )}

      {isAiEnabled() && stats.missedSessions.length > 0 && (
        <Link
          to="/coach"
          className="block rounded-xl border border-border bg-surface px-4 py-3 text-center text-sm font-semibold text-accent shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          Fix missed workouts in Coach →
        </Link>
      )}
    </div>
  );
}
