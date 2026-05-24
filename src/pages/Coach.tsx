import { useState } from 'react';
import { ActionCard } from '../components/ActionCard';
import { Card } from '../components/Card';
import { MoodBoostPanel } from '../components/MoodBoostPanel';
import { PageHeader } from '../components/PageHeader';
import { PrimaryButton } from '../components/PrimaryButton';
import { CoachPanel } from '../components/CoachPanel';
import { Label, Textarea } from '../components/FormField';
import { usePlanAssistant } from '../context/PlanAssistantContext';
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

function ModeIcon({ mode }: { mode: DeepSeekMode }) {
  const common = 'h-[18px] w-[18px] text-muted';
  if (mode === 'today_coach') {
    return (
      <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M4 12h16M12 4v16" strokeLinecap="round" />
      </svg>
    );
  }
  if (mode === 'daily_debrief') {
    return (
      <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M4 19h16M7 15l3-3 3 2 4-5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (mode === 'missed_workout_fix') {
    return (
      <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M5 12h7M5 7h14M5 17h10" strokeLinecap="round" />
      </svg>
    );
  }
  if (mode === 'weekly_review') {
    return (
      <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M5 19V9M11 19V5M17 19v-7" strokeLinecap="round" />
      </svg>
    );
  }
  if (mode === 'race_weakness_scan') {
    return (
      <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <circle cx="11" cy="11" r="6" />
        <path d="M20 20l-4.2-4.2" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M12 3l2.4 4.8L20 9l-4 3.9L16.8 19 12 16.5 7.2 19 8 12.9 4 9l5.6-1.2L12 3z" />
    </svg>
  );
}

export function Coach() {
  const { plan, insights, settings } = useTrainingData();
  const coach = useDeepSeek();
  const planAssistant = usePlanAssistant();
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
    <div className="space-y-6">
      <PageHeader
        title="Coach"
        subtitle="Choose a focused action. Get clear guidance in one pass."
      />

      <div className="space-y-2.5">
        {MODES.map((m) => (
          <ActionCard
            key={m.id}
            icon={<ModeIcon mode={m.id} />}
            title={m.title}
            description={m.description}
            selected={mode === m.id}
            actionLabel={mode === m.id ? 'Selected' : 'Run'}
            onClick={() => {
              setMode(m.id);
              coach.clear();
            }}
          />
        ))}
        <ActionCard
          icon={
            <svg
              className="h-[18px] w-[18px] text-muted"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
            >
              <path
                d="M4 12c0-4.4 3.6-8 8-8s8 3.6 8 8-3.6 8-8 8c-1.2 0-2.3-.3-3.4-.8L4 20l1-4.1C4.4 14.8 4 13.4 4 12z"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          }
          title="Tempo Assistant"
          description="Shift dates, adjust volume, and preview changes before saving."
          actionLabel="Open"
          onClick={planAssistant.open}
        />
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
