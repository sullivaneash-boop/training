import { Link } from 'react-router-dom';
import { Card } from '../components/Card';
import { ActionLink } from '../components/ActionLink';
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
  const fallbackWorkout = 'No session listed for today in your plan.';

  function inferWorkoutParts() {
    const details = session?.details ?? sessionText ?? '';
    const lower = details.toLowerCase();
    const sport = (session?.type ?? 'session').replace(/^\w/, (c) => c.toUpperCase());
    const title = session?.title ?? details.split('+')[0]?.trim() ?? 'Training session';
    const durationMatch = details.match(
      /(\d+(?:\s*[-to]{1,3}\s*\d+)?\s*(?:min|mins|minutes|hr|hrs|hour|hours))/i,
    );
    const intensityMatch = (session?.intensity ?? details).match(
      /(easy|steady|tempo|threshold|recovery|endurance|zone\s*\d|z\d|race\s*pace|vo2)/i,
    );
    const brickNote = details.match(
      /(brick[^,.]*|jog off the bike[^,.]*|run off the bike[^,.]*)/i,
    );
    const focus = weekPlan?.keyFocus ?? getMicroCopy(weekPlan);
    const detailTail = lower.includes('+') ? details.split('+').slice(1).join('+').trim() : '';
    return {
      sport,
      title: title || fallbackWorkout,
      duration: durationMatch?.[1],
      intensity: intensityMatch?.[1],
      brickNote: brickNote?.[1] ?? (detailTail && detailTail.length < 70 ? detailTail : undefined),
      focus,
    };
  }

  const workout = inferWorkoutParts();
  const readinessSummary = needsCheckIn
    ? 'Ego check due'
    : `${statusLabel(todayReady!.result)} readiness`;
  const readinessDetail = needsCheckIn
    ? 'Check in before you train'
    : readinessAction(todayReady!.result);

  return (
    <div className="space-y-5 pb-2">
      {/* Context header */}
      <header className="space-y-3.5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-muted">{dayName}</p>
            <h1 className="text-[30px] font-semibold tracking-tight text-foreground">
              Week {weekNum}
              <span className="text-2xl font-normal text-muted"> / {totalWeeks}</span>
            </h1>
          </div>
          {daysLeft != null && daysLeft > 0 && (
            <div className="rounded-2xl border border-border bg-surface px-3 py-2 text-right shadow-[0_1px_2px_rgba(17,24,39,0.04)]">
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted">Race</p>
              <p className="text-xl font-semibold tabular-nums text-foreground">{daysLeft}</p>
              <p className="text-xs text-muted">days out</p>
            </div>
          )}
        </div>

        <Card className="space-y-3 !py-3.5">
          <p className="text-sm font-semibold text-foreground">{raceTitle}</p>
          <p className="text-sm text-muted">{formatRaceDate(plan.raceDate)}</p>
          <div className="grid grid-cols-3 gap-2.5">
            <div className="rounded-xl bg-background px-3 py-2">
              <p className="text-[11px] uppercase tracking-wide text-muted">Phase</p>
              <p className="mt-1 text-sm font-semibold text-foreground">{phase}</p>
            </div>
            <div
              className={`rounded-xl border px-3 py-2 ${
                needsCheckIn ? 'border-dashed border-accent/35 bg-teal-50/60' : statusBg(todayReady!.result)
              }`}
            >
              <p className="text-[11px] uppercase tracking-wide text-muted">Readiness</p>
              <p
                className={`mt-1 text-sm font-semibold ${
                  needsCheckIn ? 'text-accent' : statusColor(todayReady!.result)
                }`}
              >
                {readinessSummary}
              </p>
            </div>
            <div className="rounded-xl bg-background px-3 py-2">
              <p className="text-[11px] uppercase tracking-wide text-muted">Today focus</p>
              <p className="mt-1 text-sm font-semibold text-foreground">{getMicroCopy(weekPlan)}</p>
            </div>
          </div>
          {athleteGoal && <p className="text-xs text-muted">{athleteGoal}</p>}
        </Card>
      </header>

      {/* Hero workout */}
      <section className="space-y-3">
        <p className="section-label">Today&apos;s workout</p>
        <Card className="space-y-3 border-accent/20 p-[18px]">
          <div className="flex items-start justify-between gap-3">
            <span className="inline-flex rounded-full bg-teal-50 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-accent">
              {workout.sport}
            </span>
            {workout.duration && (
              <span className="rounded-full border border-border px-2.5 py-1 text-xs font-medium text-muted">
                {workout.duration}
              </span>
            )}
          </div>
          <p className="text-xl font-semibold leading-tight text-foreground">{workout.title}</p>
          <div className="space-y-1.5 text-sm">
            <p className="text-muted">
              <span className="font-medium text-foreground">Focus:</span> {workout.focus}
            </p>
            <p className="text-muted">
              <span className="font-medium text-foreground">Readiness:</span> {readinessDetail}
            </p>
            {workout.intensity && (
              <p className="text-muted">
                <span className="font-medium text-foreground">Intensity:</span> {workout.intensity}
              </p>
            )}
            {workout.brickNote && (
              <p className="text-muted">
                <span className="font-medium text-foreground">Brick note:</span> {workout.brickNote}
              </p>
            )}
          </div>
          {isDeloadWeek(weekPlan) && (
            <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-900">
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
      <section className="grid grid-cols-2 gap-2.5">
        <Link
          to="/readiness"
          className="rounded-2xl border border-border bg-surface px-4 py-3.5 shadow-[0_1px_2px_rgba(17,24,39,0.04)] transition-colors hover:border-neutral-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <p className="text-sm font-semibold text-foreground">Ego check</p>
          <p className="mt-0.5 text-xs text-muted">Update readiness</p>
          <p className="mt-2 text-sm font-medium text-accent">Open →</p>
        </Link>
        <Link
          to="/coach"
          className="rounded-2xl border border-border bg-surface px-4 py-3.5 shadow-[0_1px_2px_rgba(17,24,39,0.04)] transition-colors hover:border-neutral-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <p className="text-sm font-semibold text-foreground">Ask coach</p>
          <p className="mt-0.5 text-xs text-muted">Get today guidance</p>
          <p className="mt-2 text-sm font-medium text-accent">Open →</p>
        </Link>
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
          <Card className="space-y-2.5">
            {weekPlan.targetHours != null && (
              <p className="text-sm text-muted">
                Weekly target:{' '}
                <span className="font-semibold text-foreground">{weekPlan.targetHours} hrs</span>
              </p>
            )}
            {weekPlan.keyFocus && <p className="text-sm leading-snug text-foreground">{weekPlan.keyFocus}</p>}
            <div className="flex flex-wrap gap-2">
              {weekPlan.longRide && (
                <span className="rounded-full border border-border px-2.5 py-1 text-xs text-muted">
                  Long ride: {weekPlan.longRide}
                </span>
              )}
              {weekPlan.longRun && (
                <span className="rounded-full border border-border px-2.5 py-1 text-xs text-muted">
                  Long run: {weekPlan.longRun}
                </span>
              )}
              {weekPlan.longSwim && (
                <span className="rounded-full border border-border px-2.5 py-1 text-xs text-muted">
                  Long swim: {weekPlan.longSwim}
                </span>
              )}
            </div>
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
