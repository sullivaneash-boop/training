import { Link } from 'react-router-dom';
import { Card } from '../components/Card';
import { ActionLink } from '../components/ActionLink';
import { usePlanAssistant } from '../context/PlanAssistantContext';
import { useTrainingData } from '../hooks/useTrainingData';
import { computeWeeklyStats } from '../lib/weeklyStats';
import { formatSession, getTodaySession, isDeloadWeek } from '../lib/planParser';
import {
  daysUntilRace,
  formatDateISO,
  getMicroCopy,
  getPhaseLabel,
  getWeekDateRange,
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
  const { plan, athlete, readiness, workouts, loading } = useTrainingData();
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
            Import your plan to generate a clear daily brief.
          </p>
        </div>
        <ActionLink to="/settings" variant="primary" className="col-span-2">
          Import your plan
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
  const weeklyStats = computeWeeklyStats(plan, weekPlan, weekNum, workouts);
  const weekRange = getWeekDateRange(plan, weekNum);
  const weekLogs = workouts.filter(
    (w) =>
      w.completed &&
      w.date >= formatDateISO(weekRange.start) &&
      w.date <= formatDateISO(weekRange.end),
  );
  const completedSessions = weekLogs.length;
  const plannedSessions =
    weekPlan?.plannedSessions?.filter((s) => (s.type ?? '').toLowerCase() !== 'rest').length ?? 0;
  const progressPct =
    weekPlan?.targetHours && weekPlan.targetHours > 0
      ? Math.min(100, Math.round((weeklyStats.completedHours / weekPlan.targetHours) * 100))
      : 0;

  function inferWorkoutParts() {
    const details = session?.details ?? sessionText ?? '';
    const lower = details.toLowerCase();
    const sport = (session?.type ?? 'session').replace(/^\w/, (c) => c.toUpperCase());
    const title = session?.title ?? details.split('+')[0]?.trim() ?? 'Tempo session';
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
    const goal =
      weekPlan?.keyFocus ??
      (isDeloadWeek(weekPlan)
        ? 'Absorb fitness and stay smooth.'
        : 'Build consistency without adding unnecessary fatigue.');
    const effort = intensityMatch?.[1]
      ? `${intensityMatch[1][0].toUpperCase()}${intensityMatch[1].slice(1)}`
      : 'Easy / conversational';
    const beforeStart = needsCheckIn
      ? 'Complete Readiness Check before training.'
      : `Readiness: ${statusLabel(todayReady!.result)} — ${readinessAction(todayReady!.result)}.`;
    const durationBits = Array.from(
      details.matchAll(/(\d+(?:\s*[-to]{1,3}\s*\d+)?\s*(?:min|mins|minutes|hr|hrs|hour|hours))/gi),
    ).map((m) => m[1]);
    const metaParts = [
      ...durationBits.slice(0, 2),
      effort.includes('/') ? 'Easy' : effort,
    ].filter(Boolean);

    return {
      sport,
      title: title || fallbackWorkout,
      duration: durationMatch?.[1],
      intensity: intensityMatch?.[1],
      brickNote: brickNote?.[1] ?? (detailTail && detailTail.length < 70 ? detailTail : undefined),
      focus,
      goal,
      effort,
      beforeStart,
      meta: metaParts.join(' · '),
    };
  }

  const workout = inferWorkoutParts();
  const readinessSummary = needsCheckIn
    ? 'Readiness Check required before training.'
    : `Readiness Check complete: ${statusLabel(todayReady!.result)}.`;
  const readinessDetail = needsCheckIn
    ? 'Check in before you train'
    : readinessAction(todayReady!.result);
  const primaryAction = needsCheckIn
    ? { to: '/readiness', label: 'Check readiness' }
    : { to: '/log', label: 'Log workout' };
  const weeklyKeyChips = [weekPlan?.longRide, weekPlan?.longRun, weekPlan?.longSwim].filter(
    Boolean,
  ) as string[];

  return (
    <div className="space-y-4.5 pb-2">
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
      </header>

      <section className="space-y-3">
        <p className="section-label">Today command</p>
        <Card className="space-y-3.5 border-accent/30 p-[18px] shadow-[0_12px_24px_rgba(46,142,109,0.09)]">
          <div className="flex items-start justify-between gap-3">
            <span className="inline-flex rounded-lg bg-[#e8f4ee] px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-accent">
              {workout.sport}
            </span>
            {workout.duration && (
              <span className="rounded-lg border border-border px-2.5 py-1 text-xs font-medium text-muted">
                {workout.duration}
              </span>
            )}
          </div>

          <div className="space-y-1.5">
            <p className="text-[25px] font-semibold leading-tight text-foreground">Today: {workout.title}</p>
            <p className="text-sm text-muted">{workout.focus}</p>
            {workout.meta && <p className="text-xs font-medium text-muted">{workout.meta}</p>}
          </div>

          <div className="space-y-1.5 rounded-xl bg-background p-3.5 text-sm">
            <p className="text-muted">
              <span className="font-semibold text-foreground">Goal:</span> {workout.goal}
            </p>
            <p className="text-muted">
              <span className="font-semibold text-foreground">Effort:</span> {workout.effort}
            </p>
            {workout.brickNote ? (
              <p className="text-muted">
                <span className="font-semibold text-foreground">After:</span> {workout.brickNote}
              </p>
            ) : (
              <p className="text-muted">
                <span className="font-semibold text-foreground">After:</span> Cool down and hydrate.
              </p>
            )}
            <p className="text-muted">
              <span className="font-semibold text-foreground">Before you start:</span> {workout.beforeStart}
            </p>
          </div>

          <p
            className={`rounded-lg border px-3 py-2 text-sm ${
              needsCheckIn ? 'border-dashed border-accent/35 bg-[#e8f4ee] text-accent' : statusBg(todayReady!.result)
            }`}
          >
            <span className={needsCheckIn ? 'font-semibold text-accent' : `font-semibold ${statusColor(todayReady!.result)}`}>
              Readiness Check:
            </span>{' '}
            {readinessSummary}
            {!needsCheckIn && <span className="ml-1 text-muted">({readinessDetail})</span>}
          </p>

          {isDeloadWeek(weekPlan) && (
            <p className="rounded-xl border border-[#efd7c3] bg-[#faf4ee] px-3 py-2 text-sm font-medium text-[#8a6545]">
              Deload week — respect the brick, cut volume ~30%.
            </p>
          )}

          <ActionLink to={primaryAction.to} variant="primary" className="w-full">
            {primaryAction.label}
          </ActionLink>
        </Card>
      </section>

      <section className="grid grid-cols-2 gap-2.5">
        <Link
          to="/readiness"
          className="rounded-2xl border border-border bg-surface px-4 py-3.5 shadow-[0_1px_2px_rgba(17,24,39,0.04)] transition-colors hover:border-neutral-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <p className="text-sm font-semibold text-foreground">Readiness Check</p>
          <p className="mt-0.5 text-xs text-muted">Quick daily state check</p>
          <p className="mt-2 text-sm font-medium text-accent">Open →</p>
        </Link>
        <Link
          to="/coach"
          className="rounded-2xl border border-border bg-surface px-4 py-3.5 shadow-[0_1px_2px_rgba(17,24,39,0.04)] transition-colors hover:border-neutral-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <p className="text-sm font-semibold text-foreground">Ask Coach</p>
          <p className="mt-0.5 text-xs text-muted">Get context-aware guidance</p>
          <p className="mt-2 text-sm font-medium text-accent">Open →</p>
        </Link>
      </section>

      {weekPlan && (
        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="section-label">This week</p>
            <Link to="/week" className="text-sm font-medium text-accent">
              See week →
            </Link>
          </div>
          <Card className="space-y-3">
            <div className="grid grid-cols-3 gap-2">
              <div>
                <p className="text-[11px] uppercase tracking-wide text-muted">Weekly target</p>
                <p className="mt-1 text-sm font-semibold text-foreground">{weekPlan.targetHours ?? 0} hrs</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wide text-muted">Completed</p>
                <p className="mt-1 text-sm font-semibold text-foreground">{weeklyStats.completedHours} hrs</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wide text-muted">Sessions</p>
                <p className="mt-1 text-sm font-semibold text-foreground">
                  {completedSessions}/{plannedSessions || '—'}
                </p>
              </div>
            </div>

            <div>
              <div className="mb-1.5 h-2 overflow-hidden rounded-full bg-background">
                <div
                  className="h-full rounded-full bg-accent transition-all"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
              <p className="text-xs text-muted">{progressPct}% of weekly target complete</p>
            </div>

            {weekPlan.targetHours != null && (
              <p className="text-sm text-muted">
                {weekPlan.keyFocus ?? 'Stay steady through the week.'}
              </p>
            )}
            <div className="flex flex-wrap gap-1.5">
              {weeklyKeyChips.length > 0 ? (
                weeklyKeyChips.map((chip) => (
                  <span key={chip} className="rounded-lg border border-border px-2.5 py-1 text-xs text-muted">
                    {chip}
                  </span>
                ))
              ) : (
                <span className="rounded-lg border border-border px-2.5 py-1 text-xs text-muted">
                  Key sessions load once the week is fully parsed.
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
          className="w-full rounded-2xl border border-border bg-surface px-4 py-3 text-left text-sm transition-colors hover:border-neutral-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent active:scale-[0.99]"
        >
          <div className="flex items-center justify-between gap-3">
            <div>
              <span className="font-semibold text-foreground">Adjust this week</span>
              <span className="mt-0.5 block text-muted">
                Move workouts around without breaking the plan.
              </span>
            </div>
            <span className="shrink-0 text-sm font-semibold text-accent">Adjust</span>
          </div>
        </button>
      )}

      {athleteGoal && (
        <p className="text-xs text-muted">
          Goal: {athleteGoal} · Race: {raceTitle} ({formatRaceDate(plan.raceDate)}) · Phase: {phase}
        </p>
      )}
    </div>
  );
}
