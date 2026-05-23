import { useState } from 'react';
import { Button, Label, Textarea } from '../components/FormField';
import { Card } from '../components/Card';
import { useTrainingData } from '../hooks/useTrainingData';
import { buildCoachPrompt } from '../lib/coachExport';
import { getWeekNumber, getWeekPlan } from '../lib/weekUtils';
import type { CoachApiRequest, CoachApiResponse } from '../lib/types';

const AI_MODES = [
  { id: 'debrief_summary', label: 'Daily debrief summary' },
  { id: 'weekly_review', label: 'Weekly coach review' },
  { id: 'reshuffle_missed', label: 'Reshuffle missed workouts' },
  { id: 'readiness_explain', label: 'Readiness explanation' },
  { id: 'weakness_detection', label: 'Race weakness detection' },
] as const;

export function Coach() {
  const { plan, workouts, readiness, settings } = useTrainingData();
  const [notes, setNotes] = useState('');
  const [copied, setCopied] = useState(false);
  const [apiMode, setApiMode] = useState<CoachApiRequest['mode']>('weekly_review');
  const [apiResult, setApiResult] = useState<CoachApiResponse | null>(null);
  const [apiLoading, setApiLoading] = useState(false);
  const [apiError, setApiError] = useState('');

  if (!plan) {
    return <p className="text-zinc-400">Load a training plan first.</p>;
  }

  const weekNum = getWeekNumber(plan);
  const weekPlan = getWeekPlan(plan, weekNum);
  const prompt = buildCoachPrompt(plan, weekPlan, weekNum, workouts, readiness, notes);

  async function copyPrompt() {
    await navigator.clipboard.writeText(prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function callDeepSeek() {
    if (!plan) return;
    setApiLoading(true);
    setApiError('');
    setApiResult(null);
    try {
      const activePlan = plan;
      const res = await fetch('/api/coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: apiMode,
          planSummary: `${activePlan.name} — race ${activePlan.raceDate}, week ${weekNum}`,
          currentWeek: weekPlan,
          workoutLogs: workouts.filter((w) => {
            const start = new Date(activePlan.planStartDate);
            start.setDate(start.getDate() + (weekNum - 1) * 7);
            const end = new Date(start);
            end.setDate(end.getDate() + 6);
            return w.date >= start.toISOString().slice(0, 10) && w.date <= end.toISOString().slice(0, 10);
          }),
          readinessLogs: readiness.slice(-14),
          userNotes: notes,
        } satisfies CoachApiRequest),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'API failed');
      setApiResult(data);
    } catch (e) {
      setApiError(e instanceof Error ? e.message : 'Request failed');
    } finally {
      setApiLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-bold">Coach</h1>
        <p className="text-sm text-zinc-400">
          Mode:{' '}
          {settings.aiCoachMode === 'manual'
            ? 'Manual export (copy to Claude/ChatGPT)'
            : settings.aiCoachMode === 'api'
              ? 'DeepSeek API'
              : 'Off'}
        </p>
      </header>

      <div>
        <Label>Your notes for the coach</Label>
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Shoulder felt tight, skipped Thursday swim…"
        />
      </div>

      {settings.aiCoachMode === 'manual' && (
        <>
          <Card>
            <p className="text-xs uppercase text-zinc-500">Export prompt</p>
            <pre className="mt-2 max-h-48 overflow-y-auto whitespace-pre-wrap text-xs text-zinc-300">
              {prompt.slice(0, 800)}
              {prompt.length > 800 ? '…' : ''}
            </pre>
          </Card>
          <Button type="button" onClick={copyPrompt}>
            {copied ? 'Copied ✓' : 'Copy full prompt'}
          </Button>
        </>
      )}

      {settings.aiCoachMode === 'api' && (
        <>
          <div>
            <Label>AI task</Label>
            <select
              className="w-full rounded-xl border border-white/15 bg-black px-4 py-3 text-white"
              value={apiMode}
              onChange={(e) => setApiMode(e.target.value as CoachApiRequest['mode'])}
            >
              {AI_MODES.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>
          <Button type="button" onClick={callDeepSeek} disabled={apiLoading}>
            {apiLoading ? 'Thinking…' : 'Ask DeepSeek'}
          </Button>
          {apiError && <p className="text-sm text-red-400">{apiError}</p>}
          {apiResult && (
            <Card className="space-y-3">
              <div>
                <p className="text-xs text-zinc-500">Summary</p>
                <p className="text-sm">{apiResult.summary}</p>
              </div>
              <div>
                <p className="text-xs text-zinc-500">Adjustment</p>
                <p className="text-sm">{apiResult.suggestedAdjustment}</p>
              </div>
              {apiResult.warningFlags?.length > 0 && (
                <div>
                  <p className="text-xs text-zinc-500">Flags</p>
                  <ul className="text-sm text-amber-400">
                    {apiResult.warningFlags.map((f) => (
                      <li key={f}>· {f}</li>
                    ))}
                  </ul>
                </div>
              )}
              <div>
                <p className="text-xs text-zinc-500">Next action</p>
                <p className="text-sm font-medium text-[#4a53ff]">{apiResult.nextAction}</p>
              </div>
            </Card>
          )}
        </>
      )}

      {settings.aiCoachMode === 'off' && (
        <Card>
          <p className="text-sm text-zinc-400">
            AI Coach is off. Enable Manual Export or DeepSeek API in Settings.
          </p>
        </Card>
      )}
    </div>
  );
}
