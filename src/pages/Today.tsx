import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card } from '../components/Card';
import { ActionGrid, ActionLink } from '../components/ActionLink';
import { CoachPanel, AskDeepSeekButton } from '../components/CoachPanel';
import { Input, Label } from '../components/FormField';
import { usePlanAssistant } from '../context/PlanAssistantContext';
import { useTrainingData } from '../hooks/useTrainingData';
import { useDeepSeek } from '../hooks/useDeepSeek';
import { formatSession, getTodaySession, isDeloadWeek } from '../lib/planParser';
import {
  daysUntilRace,
  getMicroCopy,
  getPhaseLabel,
  getWeekNumber,
  getWeekPlan,
} from '../lib/weekUtils';
import { getTodayReadiness, statusBg, statusColor } from '../lib/readiness';
import { formatRaceDate, goalLabel, readinessAction } from '../lib/format';
import { isAiEnabled } from '../lib/storage';

function RaceHero({
  planName,
  raceName,
  raceDate,
  daysLeft,
  sports,
  goal,
}: {
  planName: string;
  raceName?: string;
  raceDate?: string;
  daysLeft: number | null;
  sports: string[];
  goal?: string;
}) {
  const title = raceName && raceName !== planName ? raceName : planName;

  return (
    <section className="overflow-hidden rounded-2xl border border-[#4a53ff]/40 bg-gradient-to-b from-[#4a53ff]/15 to-transparent p-5">
      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#8b92ff]">
        Training for
      </p>
      <h1 className="mt-1 text-2xl font-bold leading-tight tracking-tight text-white">{title}</h1>
      <p className="mt-2 text-sm text-zinc-300">{formatRaceDate(raceDate)}</p>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {daysLeft != null && daysLeft > 0 && (
          <span className="rounded-full bg-[#4a53ff] px-3 py-1 text-sm font-bold tabular-nums text-white">
            {daysLeft} days out
          </span>
        )}
        {daysLeft != null && daysLeft <= 0 && (
          <span className="rounded-full bg-white px-3 py-1 text-sm font-bold text-black">
            Race window
          </span>
        )}
        {goal && (
          <span className="rounded-full border border-white/20 px-3 py-1 text-xs text-zinc-300">
            Goal: {goal}
          </span>
        )}
        {sports.map((s) => (
          <span
            key={s}
            className="rounded-full bg-white/10 px-2.5 py-0.5 text-[11px] uppercase tracking-wide text-zinc-400"
          >
            {s}
          </span>
        ))}
      </div>
    </section>
  );
}

function WeekStrip({
  dayName,
  weekNum,
  totalWeeks,
  phase,
  micro,
}: {
  dayName: string;
  weekNum: number;
  totalWeeks: number;
  phase: string;
  micro: string;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="text-sm text-zinc-400">{dayName}</p>
        <p className="text-lg font-semibold text-white">
          Week {weekNum}
          <span className="font-normal text-zinc-500"> / {totalWeeks}</span>
        </p>
      </div>
      <div className="text-right">
        <span className="inline-block rounded-lg bg-white/10 px-2.5 py-1 text-xs font-medium text-white">
          {phase}
        </span>
        <p className="mt-2 max-w-[140px] text-right text-xs italic text-zinc-500">{micro}</p>
      </div>
    </div>
  );
}

export function Today() {
  const { plan, athlete, readiness, loading, settings } = useTrainingData();
  const planAssistant = usePlanAssistant();
  const coach = useDeepSeek();
  const [question, setQuestion] = useState('');
  const [showCoach, setShowCoach] = useState(false);
  const today = new Date();
  const dateStr = today.toISOString().slice(0, 10);
  const dayName = today.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <p className="text-zinc-500">Loading your plan…</p>
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="space-y-6 py-4">
        <div>
          <h1 className="text-2xl font-bold">Training Command Center</h1>
          <p className="mt-2 text-zinc-400">
            Import a race plan to see your countdown, daily workouts, and weekly targets.
          </p>
        </div>
        <ActionLink to="/settings" variant="primary">
          Import training plan
        </ActionLink>
        <ActionLink to="/settings" variant="outline" sub="Optional">
          Set up athlete profile
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
  const micro = getMicroCopy(weekPlan);
  const totalWeeks = plan.totalWeeks ?? plan.weeks.length;
  const athleteGoal = athlete?.goal && athlete.goal !== 'unknown' ? goalLabel(athlete.goal) : undefined;
  const needsCheckIn = !todayReady;

  return (
    <div className="space-y-6 pb-2">
      <RaceHero
        planName={plan.name}
        raceName={plan.raceName}
        raceDate={plan.raceDate}
        daysLeft={daysLeft}
        sports={plan.sportTypes}
        goal={athleteGoal ?? athlete?.currentRace}
      />

      <WeekStrip
        dayName={dayName}
        weekNum={weekNum}
        totalWeeks={totalWeeks}
        phase={getPhaseLabel(weekPlan?.phase)}
        micro={micro}
      />

      {/* Primary actions — what to do right now */}
      <section className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
          Start here
        </p>
        <ActionGrid>
          {needsCheckIn ? (
            <ActionLink to="/readiness" variant="accent" className="col-span-2">
              Morning check-in
              <span className="sr-only"> — not done yet</span>
            </ActionLink>
          ) : (
            <Link
              to="/readiness"
              className={`col-span-2 flex min-h-[52px] flex-col justify-center rounded-2xl border px-4 py-3 ${statusBg(todayReady!.result)}`}
            >
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-[11px] uppercase tracking-wider text-zinc-500">Readiness</p>
                  <p className={`text-lg font-bold uppercase ${statusColor(todayReady!.result)}`}>
                    {todayReady!.result}
                  </p>
                  <p className="text-xs text-zinc-400">{readinessAction(todayReady!.result)}</p>
                </div>
                <span className="text-xs text-[#4a53ff]">Update →</span>
              </div>
            </Link>
          )}
          <ActionLink to="/log" variant="primary">
            Log workout
          </ActionLink>
          <ActionLink to="/week" variant="secondary">
            Week view
          </ActionLink>
        </ActionGrid>
      </section>

      {/* Today's workout — the main content */}
      <section className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
          Today&apos;s workout
        </p>
        <Card className="border-[#4a53ff]/30 bg-[#4a53ff]/5 p-5">
          {session?.type && (
            <span className="mb-2 inline-block rounded-md bg-[#4a53ff]/30 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-[#b8bcff]">
              {session.type}
            </span>
          )}
          <p className="text-lg font-medium leading-relaxed text-white">
            {sessionText ?? 'No session listed for today in your plan.'}
          </p>
          {!sessionText && (
            <Link to="/coach" className="mt-3 inline-block text-sm font-medium text-[#4a53ff]">
              Ask coach what to do →
            </Link>
          )}
        </Card>
      </section>

      {/* Week context */}
      {weekPlan && (
        <section className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
            This week
          </p>
          {weekPlan.keyFocus && (
            <Card>
              <p className="text-xs text-zinc-500">Focus</p>
              <p className="mt-1 text-base leading-snug text-zinc-100">{weekPlan.keyFocus}</p>
              {isDeloadWeek(weekPlan) && (
                <p className="mt-2 text-sm font-medium text-amber-400">Deload — cut volume ~30%</p>
              )}
            </Card>
          )}
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-3">
              <p className="text-[10px] uppercase tracking-wider text-zinc-500">Hours target</p>
              <p className="mt-0.5 text-xl font-bold tabular-nums">
                {weekPlan.targetHours ?? '—'}
                {weekPlan.targetHours != null && (
                  <span className="text-sm font-normal text-zinc-500"> hrs</span>
                )}
              </p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-3">
              <p className="text-[10px] uppercase tracking-wider text-zinc-500">Long ride</p>
              <p className="mt-0.5 text-sm font-medium leading-snug text-white">
                {weekPlan.longRide ?? '—'}
              </p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-3">
              <p className="text-[10px] uppercase tracking-wider text-zinc-500">Long run</p>
              <p className="mt-0.5 text-sm font-medium leading-snug text-white">
                {weekPlan.longRun ?? '—'}
              </p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-3">
              <p className="text-[10px] uppercase tracking-wider text-zinc-500">Long swim</p>
              <p className="mt-0.5 text-sm font-medium leading-snug text-white">
                {weekPlan.longSwim ?? '—'}
              </p>
            </div>
          </div>
        </section>
      )}

      {/* Secondary actions */}
      <section className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">More</p>
        <ActionGrid>
          {isAiEnabled() && (
            <button
              type="button"
              onClick={planAssistant.open}
              className="col-span-2 flex min-h-[52px] flex-col items-center justify-center rounded-2xl border border-[#4a53ff]/50 bg-[#4a53ff]/15 px-4 py-3.5 text-center text-sm font-semibold text-white active:bg-[#4a53ff]/25"
            >
              Adapt my plan
              <span className="mt-0.5 text-[11px] font-normal text-zinc-400">
                Chat with plan assistant
              </span>
            </button>
          )}
          <ActionLink to="/coach" variant="outline">
            AI Coach
          </ActionLink>
          <ActionLink to="/settings" variant="outline">
            Settings
          </ActionLink>
        </ActionGrid>
      </section>

      {/* Coach — collapsed by default */}
      {isAiEnabled() && (
        <section className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.02] p-4">
          <button
            type="button"
            onClick={() => setShowCoach((v) => !v)}
            className="flex w-full items-center justify-between text-left"
          >
            <span className="text-sm font-semibold text-white">Ask DeepSeek</span>
            <span className="text-xs text-zinc-500">{showCoach ? 'Hide' : 'Show'}</span>
          </button>
          {showCoach && (
            <div className="space-y-3 pt-1">
              <Label>Your question (optional)</Label>
              <Input
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="e.g. Legs heavy — skip tempo?"
              />
              <AskDeepSeekButton
                label="What should I do today?"
                loading={coach.loading}
                onClick={() =>
                  coach.ask(
                    'today_coach',
                    { userQuestion: question },
                    { requestSummary: question || 'today' },
                  )
                }
              />
              <CoachPanel
                response={coach.response}
                loading={coach.loading}
                error={coach.error}
                rawJson={coach.rawJson}
                showDebug={settings.showJsonDebug}
                onDismiss={coach.clear}
              />
            </div>
          )}
        </section>
      )}
    </div>
  );
}
