import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card } from '../components/Card';
import { CoachPanel, AskDeepSeekButton } from '../components/CoachPanel';
import { Input, Label } from '../components/FormField';
import { useTrainingData } from '../hooks/useTrainingData';
import { useDeepSeek } from '../hooks/useDeepSeek';
import { formatSession, getTodaySession } from '../lib/planParser';
import {
  daysUntilRace,
  getMicroCopy,
  getPhaseLabel,
  getWeekNumber,
  getWeekPlan,
} from '../lib/weekUtils';
import { getTodayReadiness, statusBg, statusColor } from '../lib/readiness';
import { isAiEnabled } from '../lib/storage';

export function Today() {
  const { plan, readiness, loading, settings } = useTrainingData();
  const coach = useDeepSeek();
  const [question, setQuestion] = useState('');
  const today = new Date();
  const dateStr = today.toISOString().slice(0, 10);
  const dayName = today.toLocaleDateString('en-US', { weekday: 'long' });

  if (loading) return <p className="text-zinc-500">Loading…</p>;
  if (!plan) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Training Command Center</h1>
        <p className="text-zinc-400">No plan loaded.</p>
        <Link to="/settings" className="text-[#4a53ff] underline">
          Import a training plan →
        </Link>
      </div>
    );
  }

  const weekNum = getWeekNumber(plan, today);
  const weekPlan = getWeekPlan(plan, weekNum);
  const session = formatSession(getTodaySession(plan, weekNum, today.getDay()));
  const daysLeft = daysUntilRace(plan, today);
  const todayReady = getTodayReadiness(readiness, dateStr);
  const micro = getMicroCopy(weekPlan);

  return (
    <div className="space-y-5">
      <header>
        <p className="text-xs uppercase tracking-widest text-zinc-500">{dayName}</p>
        <h1 className="text-3xl font-bold tracking-tight">Week {weekNum}</h1>
        <p className="mt-1 text-sm text-zinc-400">
          {getPhaseLabel(weekPlan?.phase)} ·{' '}
          {daysLeft != null ? `${daysLeft} days to race` : 'Race date TBD'}
        </p>
        <p className="mt-2 text-sm italic text-zinc-500">{micro}</p>
      </header>

      {todayReady && (
        <Card className={statusBg(todayReady.result)}>
          <p className="text-xs uppercase text-zinc-500">Readiness</p>
          <p className={`text-lg font-bold uppercase ${statusColor(todayReady.result)}`}>
            {todayReady.result}
          </p>
          <p className="mt-1 text-sm text-zinc-300">{todayReady.deterministicReason}</p>
          {todayReady.aiReason && (
            <p className="mt-2 text-sm text-zinc-400">Coach: {todayReady.aiReason}</p>
          )}
        </Card>
      )}

      <Card>
        <p className="text-xs uppercase tracking-wider text-zinc-500">Today&apos;s session</p>
        <p className="mt-2 text-lg leading-snug text-white">
          {session ?? 'No session template — check plan or ask coach.'}
        </p>
      </Card>

      {weekPlan && (
        <>
          <Card>
            <p className="text-xs uppercase tracking-wider text-zinc-500">What matters this week</p>
            <p className="mt-2 text-base text-zinc-200">{weekPlan.keyFocus}</p>
          </Card>

          <div className="grid grid-cols-2 gap-3">
            <Card>
              <p className="text-xs text-zinc-500">Target hrs</p>
              <p className="text-xl font-semibold tabular-nums">{weekPlan.targetHours ?? '—'}</p>
            </Card>
            <Card>
              <p className="text-xs text-zinc-500">Long ride</p>
              <p className="text-sm font-medium">{weekPlan.longRide ?? '—'}</p>
            </Card>
            <Card>
              <p className="text-xs text-zinc-500">Long run</p>
              <p className="text-sm font-medium">{weekPlan.longRun ?? '—'}</p>
            </Card>
            <Card>
              <p className="text-xs text-zinc-500">Long swim</p>
              <p className="text-sm font-medium">{weekPlan.longSwim ?? '—'}</p>
            </Card>
          </div>
        </>
      )}

      {isAiEnabled() && (
        <div className="space-y-2">
          <Label>Question for coach (optional)</Label>
          <Input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Legs heavy — still do tempo?"
          />
          <AskDeepSeekButton
            label="Ask DeepSeek — what should I do today?"
            loading={coach.loading}
            onClick={() =>
              coach.ask('today_coach', { userQuestion: question }, { requestSummary: question || 'today' })
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

      <div className="flex gap-2">
        <Link
          to="/log"
          className="flex-1 rounded-2xl bg-[#4a53ff] py-3 text-center text-sm font-semibold"
        >
          Log workout
        </Link>
        <Link
          to="/readiness"
          className="flex-1 rounded-2xl border border-white/20 py-3 text-center text-sm font-semibold"
        >
          Check-in
        </Link>
      </div>
    </div>
  );
}
