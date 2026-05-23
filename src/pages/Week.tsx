import { useState } from 'react';
import { Card, StatCard } from '../components/Card';
import { ProgressBar } from '../components/ProgressBar';
import { CoachPanel, AskDeepSeekButton } from '../components/CoachPanel';
import { useTrainingData } from '../hooks/useTrainingData';
import { useDeepSeek } from '../hooks/useDeepSeek';
import { computeWeeklyStats, getMissedSessionTypes } from '../lib/weeklyStats';
import { getWeekNumber, getWeekPlan } from '../lib/weekUtils';
import { isAiEnabled } from '../lib/storage';

export function Week() {
  const { plan, workouts, settings } = useTrainingData();
  const coach = useDeepSeek();
  const [selectedMissed, setSelectedMissed] = useState<string[]>([]);

  if (!plan) return <p className="text-zinc-400">Import a plan in Settings.</p>;

  const weekNum = getWeekNumber(plan);
  const weekPlan = getWeekPlan(plan, weekNum);
  const stats = computeWeeklyStats(plan, weekPlan, weekNum, workouts);
  const missedTypes = getMissedSessionTypes(stats);

  function toggleMissed(type: string) {
    setSelectedMissed((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type],
    );
  }

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

      {isAiEnabled() && (
        <div className="space-y-3">
          {missedTypes.length > 0 && (
            <div>
              <p className="mb-2 text-xs uppercase text-zinc-500">Select missed to fix</p>
              <div className="flex flex-wrap gap-2">
                {missedTypes.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => toggleMissed(t)}
                    className={`rounded-full px-3 py-1 text-xs ${
                      selectedMissed.includes(t)
                        ? 'bg-[#4a53ff] text-white'
                        : 'border border-white/20 text-zinc-400'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          )}
          <AskDeepSeekButton
            label="Weekly Review"
            loading={coach.loading}
            onClick={() => coach.ask('weekly_review', {}, { requestSummary: `week ${weekNum} review` })}
          />
          <AskDeepSeekButton
            label="Fix missed workouts"
            loading={coach.loading}
            disabled={selectedMissed.length === 0 && missedTypes.length > 0}
            onClick={() =>
              coach.ask(
                'missed_workout_fix',
                { missedSessionTypes: selectedMissed.length ? selectedMissed : missedTypes },
                { requestSummary: `missed: ${selectedMissed.join(', ') || missedTypes.join(', ')}` },
              )
            }
          />
          <AskDeepSeekButton
            label="Race Weakness Scan"
            loading={coach.loading}
            onClick={() => coach.ask('race_weakness_scan', {}, { requestSummary: 'weakness scan' })}
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
    </div>
  );
}
