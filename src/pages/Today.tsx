import { Link } from 'react-router-dom';
import { Card } from '../components/Card';
import { ActionLink } from '../components/ActionLink';
import { MetricCard } from '../components/MetricCard';
import { usePlanAssistant } from '../context/PlanAssistantContext';
import { useTrainingData } from '../hooks/useTrainingData';
import { formatSession, getTodaySession, isDeloadWeek } from '../lib/planParser';
import {
  daysUntilRace,
  getMicroCopy,
  getPhaseLabel,
  getWeekNumber,
  getWeekPlan,
} from '../lib/weekUtils';
import {
  getTodayReadiness,
  statusBg,
  statusColor,
  statusLabel,
} from '../lib/readiness';
import { formatRaceDate, goalLabel, readinessAction } from '../lib/format';
import { isAiEnabled } from '../lib/storage';

export function Today() {
  const { plan, athlete, readiness, loading } = useTrainingData();
  const planAssistant = usePlanAssistant();
  const today = new Date();
  const dateStr = today.toISOString().slice(0, 10);
  const dayName = today.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <p className="text-muted">Loading your plan…</p>
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="space-y-6 py-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Today</h1>
          <p className="mt-2 text-sm text-muted">
            Import your plan to start. Do the boring work.
          </p>
        </div>
        <ActionLink to="/settings" variant="primary" className="col-span-2">
          Import training plan
        </ActionLink>
      </div>
    );
  }

  const weekNum = getWeekNumber(plan, today);
  const weekPlan = getWeekPlan(plan, weekNum);
  const session = getTodaySession(plan, weekNum, today.getDay());
  const sessionText = formatSession(session);
  const daysLeft = daysUntilRace(plan, today);
  const todayReady = getTodayReadiness(readiness, dateStr);
  const totalWeeks = plan.totalWeeks ?? plan.weeks.length;
  const athleteGoal =
    athlete?.goal && athlete.goal !== 'unknown' ? goalLabel(athlete.goal) : undefined;
  const raceTitle =
    plan.raceName && plan.raceName !== plan.name ? plan.raceName : plan.name;
  const phase = getPhaseLabel(weekPlan?.phase);
  const needsCheckIn = !todayReady;

  return (
    <div className="space-y-5 pb-2">
      {/* Context header */}
      <header className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm text-muted">{dayName}</p>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              Week {weekNum}
              <span className="font-normal text-muted"> / {totalWeeks}</span>
            </h1>
          </div>
          {daysLeft != null && daysLeft > 0 && (
            <MetricCard
              label="Race"
              value={daysLeft}
              sub="days out"
              className="text-right"
            />
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-lg bg-neutral-100 px-2.5 py-1 text-xs font-medium text-foreground">
            {phase}
          </span>
          {athleteGoal && (
            <span className="rounded-lg border border-border px-2.5 py-1 text-xs text-muted">
              {athleteGoal}
            </span>
          )}
          {plan.sportTypes.map((s) => (
            <span
              key={s}
              className="rounded-lg bg-neutral-100 px-2 py-0.5 text-xs capitalize text-muted"
            >
              {s}
            </span>
          ))}
        </div>

        <Card className="!py-3">
          <p className="text-sm font-medium text-foreground">{raceTitle}</p>
          <p className="text-sm text-muted">{formatRaceDate(plan.raceDate)}</p>
          {weekPlan?.keyFocus && (
            <p className="mt-2 text-sm italic text-muted">{getMicroCopy(weekPlan)}</p>
          )}
        </Card>

        {needsCheckIn ? (
          <Link
            to="/readiness"
            className="flex min-h-[48px] items-center justify-between rounded-xl border border-dashed border-accent/40 bg-teal-50/50 px-4 py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <div>
              <p className="text-sm font-semibold text-accent">Ego check</p>
              <p className="text-sm text-muted">How are you really feeling?</p>
            </div>
            <span className="text-sm font-medium text-accent">Start →</span>
          </Link>
        ) : (
          <Link
            to="/readiness"
            className={`flex min-h-[48px] items-center justify-between rounded-xl border px-4 py-3 ${statusBg(todayReady!.result)}`}
          >
            <div>
              <p className="text-xs font-medium text-muted">Readiness</p>
              <p className={`text-lg font-bold ${statusColor(todayReady!.result)}`}>
                {statusLabel(todayReady!.result)}
              </p>
              <p className="text-sm text-muted">{readinessAction(todayReady!.result)}</p>
            </div>
            <span className="text-sm text-accent">Update →</span>
          </Link>
        )}
      </header>

      {/* Hero workout */}
      <section className="space-y-3">
        <p className="section-label">Today&apos;s workout</p>
        <Card className="border-accent/20 p-5">
          {session?.type && (
            <span className="mb-2 inline-block rounded-md bg-teal-50 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-accent">
              {session.type}
            </span>
          )}
          <p className="text-lg font-medium leading-relaxed text-foreground">
            {sessionText ?? 'No session listed for today in your plan.'}
          </p>
          {isDeloadWeek(weekPlan) && (
            <p className="mt-2 text-sm font-medium text-amber-700">
              Deload week — respect the brick, cut volume ~30%.
            </p>
          )}
          {!sessionText && (
            <Link to="/coach" className="mt-3 inline-block text-sm font-medium text-accent">
              Ask coach what to do →
            </Link>
          )}
        </Card>
        <ActionLink to="/log" variant="primary" className="w-full">
          Log workout
        </ActionLink>
      </section>

      {/* Secondary actions */}
      <section className="flex flex-col gap-2">
        <ActionLink to="/readiness" variant="outline" className="!flex-row !justify-between !px-4">
          <span>Ego check</span>
          <span className="text-muted">→</span>
        </ActionLink>
        <ActionLink to="/coach" variant="outline" className="!flex-row !justify-between !px-4">
          <span>Ask coach</span>
          <span className="text-muted">→</span>
        </ActionLink>
      </section>

      {/* Week snapshot */}
      {weekPlan && (
        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="section-label">This week</p>
            <Link to="/week" className="text-sm font-medium text-accent">
              See week →
            </Link>
          </div>
          <Card>
            {weekPlan.keyFocus && (
              <p className="text-sm leading-snug text-foreground">{weekPlan.keyFocus}</p>
            )}
            {weekPlan.targetHours != null && (
              <p className="mt-2 text-sm text-muted">
                Target: <span className="font-semibold text-foreground">{weekPlan.targetHours}</span> hrs
              </p>
            )}
          </Card>
        </section>
      )}

      {isAiEnabled() && (
        <button
          type="button"
          onClick={planAssistant.open}
          className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-left text-sm transition-colors hover:border-neutral-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent active:scale-[0.99]"
        >
          <span className="font-semibold text-foreground">Adapt my plan</span>
          <span className="mt-0.5 block text-muted">Shift dates, volume, or schedule</span>
        </button>
      )}
    </div>
  );
}
