import { useState } from 'react';
import { ActionCard } from '../components/ActionCard';
import { Card } from '../components/Card';
import { MoodBoostPanel } from '../components/MoodBoostPanel';
import { PageHeader } from '../components/PageHeader';
import { PrimaryButton } from '../components/PrimaryButton';
import { CoachPanel } from '../components/CoachPanel';
import { Label, Textarea } from '../components/FormField';
import { useTrainingData } from '../hooks/useTrainingData';
import { useDeepSeek } from '../hooks/useDeepSeek';
import type { DeepSeekMode } from '../lib/types';
import { isAiEnabled } from '../lib/storage';

const MODES: { id: DeepSeekMode; title: string; description: string }[] = [
  { id: 'today_coach', title: 'Today Coach', description: 'Plan + readiness for what to do today.' },
  { id: 'mood_boost', title: 'Mood Boost', description: 'Check-in on how you feel — get videos, playlists, and quotes.' },
  { id: 'daily_debrief', title: 'Analyze Workout', description: 'Break down your latest logged session.' },
  { id: 'missed_workout_fix', title: 'Fix Missed Workouts', description: 'Reshuffle without cramming.' },
  { id: 'weekly_review', title: 'Weekly Review', description: 'Week vs plan — am I on track?' },
  { id: 'race_weakness_scan', title: 'Race Weakness Scan', description: 'What could expose you on race day.' },
];

export function Coach() {
  const { plan, insights, settings } = useTrainingData();
  const coach = useDeepSeek();
  const [mode, setMode] = useState<DeepSeekMode | null>(null);
  const [notes, setNotes] = useState('');

  if (!plan) {
    return <p className="text-muted">Load a training plan in Settings first.</p>;
  }

  if (!isAiEnabled()) {
    return (
      <div className="space-y-4">
        <PageHeader title="Coach" />
        <Card>
          <p className="text-sm text-muted">
            AI is off. Enable on-demand or auto-after-workout in Settings.
          </p>
        </Card>
      </div>
    );
  }

  const selected = MODES.find((m) => m.id === mode);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Coach"
        subtitle="Training decisions — not small talk."
      />

      <div className="space-y-2">
        {MODES.map((m) => (
          <ActionCard
            key={m.id}
            title={m.title}
            description={m.description}
            selected={mode === m.id}
            onClick={() => {
              setMode(m.id);
              coach.clear();
            }}
          />
        ))}
      </div>

      {mode === 'mood_boost' && <MoodBoostPanel />}

      {mode && mode !== 'mood_boost' && (
        <div className="space-y-4">
          <div>
            <Label>Notes for {selected?.title} (optional)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Skipped Thursday swim, shoulder tight…"
            />
          </div>
          <PrimaryButton
            type="button"
            disabled={coach.loading}
            onClick={() =>
              coach.ask(mode, { userQuestion: notes }, {
                requestSummary: `${mode}: ${notes.slice(0, 80)}`,
              })
            }
          >
            {coach.loading ? 'Thinking…' : 'Run'}
          </PrimaryButton>
        </div>
      )}

      {mode !== 'mood_boost' && (
        <CoachPanel
          response={coach.response}
          loading={coach.loading}
          error={coach.error}
          rawJson={coach.rawJson}
          showDebug={settings.showJsonDebug}
          onDismiss={coach.clear}
        />
      )}

      {insights.length > 0 && (
        <div className="space-y-2">
          <p className="section-label">Saved insights</p>
          {insights.slice(0, 5).map((ins) => (
            <Card key={ins.id} className="text-sm">
              <p className="text-xs text-muted">
                {ins.date} · {ins.mode.replace(/_/g, ' ')}
              </p>
              <p className="mt-1 line-clamp-2 text-foreground">{ins.response.summary}</p>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
