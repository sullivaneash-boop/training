import { useState } from 'react';
import { Label, Textarea } from '../components/FormField';
import { Card } from '../components/Card';
import { CoachPanel, AskDeepSeekButton } from '../components/CoachPanel';
import { useTrainingData } from '../hooks/useTrainingData';
import { useDeepSeek } from '../hooks/useDeepSeek';
import type { DeepSeekMode } from '../lib/types';
import { isAiEnabled } from '../lib/storage';

const MODES: { id: DeepSeekMode; label: string; desc: string }[] = [
  { id: 'today_coach', label: 'What should I do today?', desc: 'Plan + logs + readiness' },
  { id: 'daily_debrief', label: 'Daily debrief', desc: 'Latest workout analysis' },
  { id: 'weekly_review', label: 'Weekly review', desc: 'Week vs plan' },
  { id: 'missed_workout_fix', label: 'Fix missed workouts', desc: 'Reshuffle without cramming' },
  { id: 'race_weakness_scan', label: 'Race weakness scan', desc: 'What would expose you race day' },
  { id: 'readiness_explain', label: 'Readiness explain', desc: "Today's check-in" },
];

export function Coach() {
  const { plan, insights, settings } = useTrainingData();
  const coach = useDeepSeek();
  const [mode, setMode] = useState<DeepSeekMode>('today_coach');
  const [notes, setNotes] = useState('');

  if (!plan) {
    return <p className="text-zinc-400">Load a training plan in Settings first.</p>;
  }

  if (!isAiEnabled()) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">AI Coach</h1>
        <Card>
          <p className="text-sm text-zinc-400">
            AI is disabled. Enable <strong>on-demand</strong> or <strong>auto after workout</strong>{' '}
            in Settings.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-bold">AI Coach</h1>
        <p className="text-sm text-zinc-400">
          DeepSeek · {settings.deepseekModel} · {settings.aiSafetyMode.replace(/_/g, ' ')}
        </p>
      </header>

      <div>
        <Label>Mode</Label>
        <select
          className="w-full rounded-xl border border-white/15 bg-black px-4 py-3 text-white"
          value={mode}
          onChange={(e) => setMode(e.target.value as DeepSeekMode)}
        >
          {MODES.map((m) => (
            <option key={m.id} value={m.id}>
              {m.label}
            </option>
          ))}
        </select>
        <p className="mt-1 text-xs text-zinc-500">
          {MODES.find((m) => m.id === mode)?.desc}
        </p>
      </div>

      <div>
        <Label>Notes / question</Label>
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Skipped Thursday swim, shoulder tight…"
        />
      </div>

      <AskDeepSeekButton
        label="Ask DeepSeek"
        loading={coach.loading}
        onClick={() => coach.ask(mode, { userQuestion: notes }, { requestSummary: `${mode}: ${notes.slice(0, 80)}` })}
      />

      <CoachPanel
        response={coach.response}
        loading={coach.loading}
        error={coach.error}
        rawJson={coach.rawJson}
        showDebug={settings.showJsonDebug}
        onDismiss={coach.clear}
      />

      {insights.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs uppercase text-zinc-500">Saved insights</p>
          {insights.slice(0, 5).map((ins) => (
            <Card key={ins.id} className="text-sm">
              <p className="text-xs text-zinc-500">
                {ins.date} · {ins.mode}
              </p>
              <p className="mt-1 line-clamp-2 text-zinc-300">{ins.response.summary}</p>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
