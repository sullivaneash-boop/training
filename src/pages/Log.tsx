import { useState } from 'react';
import { Input, Label, RangeField, Select, Textarea } from '../components/FormField';
import { Card } from '../components/Card';
import { PageHeader } from '../components/PageHeader';
import { PrimaryButton } from '../components/PrimaryButton';
import { CoachPanel, AskDeepSeekButton } from '../components/CoachPanel';
import { useTrainingData } from '../hooks/useTrainingData';
import { useDeepSeek } from '../hooks/useDeepSeek';
import { addWorkout } from '../lib/storage';
import type { DistanceUnit, WorkoutType } from '../lib/types';
import { getWeekNumber } from '../lib/weekUtils';
import { isAiEnabled } from '../lib/storage';

const TYPES: WorkoutType[] = [
  'swim',
  'bike',
  'run',
  'strength',
  'brick',
  'mobility',
  'rest',
  'other',
];

export function Log() {
  const { plan, refresh, settings } = useTrainingData();
  const coach = useDeepSeek();
  const [saved, setSaved] = useState(false);
  const [lastWorkoutId, setLastWorkoutId] = useState<string | null>(null);
  const today = new Date().toISOString().slice(0, 10);

  const [form, setForm] = useState({
    date: today,
    type: 'run' as WorkoutType,
    durationMinutes: 45,
    distance: '',
    distanceUnit: 'mi' as DistanceUnit,
    rpe: 5,
    soreness: 3,
    sleepHours: 7,
    notes: '',
    completed: true,
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const entry = addWorkout({
      date: form.date,
      type: form.type,
      planId: plan?.id,
      weekNumber: plan ? getWeekNumber(plan, new Date(form.date + 'T12:00:00')) : undefined,
      durationMinutes: form.durationMinutes,
      distance: form.distance ? parseFloat(form.distance) : undefined,
      distanceUnit: form.distance ? form.distanceUnit : undefined,
      rpe: form.rpe,
      soreness: form.soreness,
      sleepHours: form.sleepHours,
      notes: form.notes || undefined,
      completed: form.completed,
      source: 'manual',
    });
    setLastWorkoutId(entry.id);
    setSaved(true);
    refresh();

    if (settings.aiSafetyMode === 'auto_after_workout' && isAiEnabled()) {
      coach.ask(
        'daily_debrief',
        { latestWorkoutId: entry.id },
        { requestSummary: `auto debrief ${form.type} ${form.durationMinutes}m` },
      );
    }

    setTimeout(() => setSaved(false), 2000);
  }

  function adjustDuration(delta: number) {
    setForm((f) => ({
      ...f,
      durationMinutes: Math.max(0, f.durationMinutes + delta),
    }));
  }

  return (
    <div className="space-y-5">
      <PageHeader title="Log" subtitle="Log it and move on." />

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <Label>Workout type</Label>
          <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
            {TYPES.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setForm({ ...form, type: t })}
                className={`shrink-0 rounded-full px-4 py-2.5 text-sm font-medium capitalize transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                  form.type === t
                    ? 'bg-accent text-white'
                    : 'border border-border bg-surface text-foreground'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <div>
          <Label>Date</Label>
          <Input
            type="date"
            value={form.date}
            onChange={(e) => setForm({ ...form, date: e.target.value })}
            required
          />
        </div>

        <div>
          <Label>Duration (minutes)</Label>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => adjustDuration(-5)}
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-border bg-surface text-lg font-semibold text-foreground active:bg-neutral-100"
              aria-label="Decrease 5 minutes"
            >
              −
            </button>
            <Input
              type="number"
              min={0}
              value={form.durationMinutes}
              onChange={(e) => setForm({ ...form, durationMinutes: +e.target.value })}
              className="!text-center !text-2xl !font-semibold"
              required
            />
            <button
              type="button"
              onClick={() => adjustDuration(5)}
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-border bg-surface text-lg font-semibold text-foreground active:bg-neutral-100"
              aria-label="Increase 5 minutes"
            >
              +
            </button>
          </div>
        </div>

        <RangeField
          label="RPE 1–10"
          min={1}
          max={10}
          value={form.rpe}
          onChange={(rpe) => setForm({ ...form, rpe })}
        />

        <RangeField
          label="Soreness 1–10"
          min={1}
          max={10}
          value={form.soreness}
          onChange={(soreness) => setForm({ ...form, soreness })}
        />

        <RangeField
          label="Sleep (hours)"
          min={0}
          max={14}
          step={0.5}
          value={form.sleepHours}
          onChange={(sleepHours) => setForm({ ...form, sleepHours })}
        />

        <details className="rounded-xl border border-border bg-surface">
          <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-foreground">
            More details
          </summary>
          <div className="space-y-4 border-t border-border px-4 py-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Distance</Label>
                <Input
                  type="number"
                  step="0.1"
                  placeholder="optional"
                  value={form.distance}
                  onChange={(e) => setForm({ ...form, distance: e.target.value })}
                />
              </div>
              <div>
                <Label>Unit</Label>
                <Select
                  value={form.distanceUnit}
                  onChange={(e) =>
                    setForm({ ...form, distanceUnit: e.target.value as DistanceUnit })
                  }
                >
                  <option value="mi">mi</option>
                  <option value="km">km</option>
                  <option value="yd">yd</option>
                  <option value="m">m</option>
                </Select>
              </div>
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="How it felt, weather, fueling…"
              />
            </div>
          </div>
        </details>

        <label className="flex min-h-[44px] items-center gap-3 text-base">
          <input
            type="checkbox"
            checked={form.completed}
            onChange={(e) => setForm({ ...form, completed: e.target.checked })}
            className="h-5 w-5 rounded border-border accent-accent"
          />
          Completed as planned
        </label>

        <PrimaryButton type="submit">
          {saved ? 'Saved ✓' : 'Save workout'}
        </PrimaryButton>
      </form>

      {isAiEnabled() && lastWorkoutId && (
        <div className="space-y-2">
          <AskDeepSeekButton
            label="Analyze this workout"
            loading={coach.loading}
            onClick={() =>
              coach.ask(
                'daily_debrief',
                { latestWorkoutId: lastWorkoutId },
                { requestSummary: `debrief ${form.type}` },
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

      <Card>
        <p className="text-sm text-muted">
          Shortcuts: /shortcut-log?type=run&duration=45&rpe=6 — see Settings.
        </p>
      </Card>
    </div>
  );
}
