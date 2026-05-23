import { Card, StatCard } from '../components/Card';
import { ProgressBar } from '../components/ProgressBar';
import { useTrainingData } from '../hooks/useTrainingData';
import { computeWeeklyStats } from '../lib/weeklyStats';
import { getWeekNumber, getWeekPlan } from '../lib/weekUtils';

export function Week() {
  const { plan, workouts, loading } = useTrainingData();

  if (loading) return <p className="text-zinc-500">Loading…</p>;
  if (!plan) return <p className="text-zinc-400">Import a plan in Settings.</p>;

  const weekNum = getWeekNumber(plan);
  const weekPlan = getWeekPlan(plan, weekNum);
  const stats = computeWeeklyStats(plan, weekPlan, weekNum, workouts);

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-bold">Week {weekNum}</h1>
        <p className="text-sm text-zinc-400">{weekPlan?.keyFocus ?? 'No week data'}</p>
      </header>

      <Card>
        <ProgressBar
          pct={stats.completionPct}
          label={`${stats.completedHours} / ${stats.plannedHours} hrs`}
        />
      </Card>

      <div className="grid grid-cols-2 gap-3">
        <StatCard label="Planned hrs" value={stats.plannedHours} />
        <StatCard label="Completed hrs" value={stats.completedHours} />
        <StatCard label="Swim" value={stats.swimSessions} sub="sessions" />
        <StatCard label="Bike" value={stats.bikeSessions} sub="sessions" />
        <StatCard label="Run" value={stats.runSessions} sub="sessions" />
        <StatCard label="Strength" value={stats.strengthSessions} sub="sessions" />
        <StatCard
          label="Longest ride"
          value={stats.longestRideMinutes ? `${stats.longestRideMinutes}m` : '—'}
        />
        <StatCard
          label="Longest run"
          value={stats.longestRunMinutes ? `${stats.longestRunMinutes}m` : '—'}
        />
      </div>

      <Card>
        <p className="text-xs uppercase text-zinc-500">Brick completed</p>
        <p className="mt-1 text-lg font-semibold">{stats.brickCompleted ? 'Yes' : 'Not yet'}</p>
      </Card>

      {stats.missedSessions.length > 0 && (
        <Card className="border-amber-500/20">
          <p className="text-xs uppercase text-zinc-500">Signals (not guilt)</p>
          <ul className="mt-2 space-y-1 text-sm text-zinc-300">
            {stats.missedSessions.map((m) => (
              <li key={m}>· {m}</li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
