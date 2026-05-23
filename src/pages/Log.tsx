import { useState } from 'react';
import { Button, Input, Label, Select, Textarea } from '../components/FormField';
import { Card } from '../components/Card';
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

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-bold">Debrief</h1>
        <p className="text-sm text-zinc-400">Log it while it&apos;s fresh.</p>
      </header>

      <form onSubmit={handleSubmit} className="space-y-4">
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
          <Label>Workout type</Label>
          <Select
            value={form.type}
            onChange={(e) => setForm({ ...form, type: e.target.value as WorkoutType })}
          >
            {TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label>Duration (minutes)</Label>
          <Input
            type="number"
            min={0}
            value={form.durationMinutes}
            onChange={(e) => setForm({ ...form, durationMinutes: +e.target.value })}
            required
          />
        </div>
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
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>RPE 1–10</Label>
            <Input
              type="number"
              min={1}
              max={10}
              value={form.rpe}
              onChange={(e) => setForm({ ...form, rpe: +e.target.value })}
            />
          </div>
          <div>
            <Label>Soreness 1–10</Label>
            <Input
              type="number"
              min={1}
              max={10}
              value={form.soreness}
              onChange={(e) => setForm({ ...form, soreness: +e.target.value })}
            />
          </div>
        </div>
        <div>
          <Label>Sleep hours</Label>
          <Input
            type="number"
            step={0.5}
            min={0}
            max={14}
            value={form.sleepHours}
            onChange={(e) => setForm({ ...form, sleepHours: +e.target.value })}
          />
        </div>
        <div>
          <Label>Notes</Label>
          <Textarea
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            placeholder="How it felt, weather, fueling…"
          />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.completed}
            onChange={(e) => setForm({ ...form, completed: e.target.checked })}
            className="h-4 w-4 rounded"
          />
          Completed
        </label>
        <Button type="submit">{saved ? 'Saved ✓' : 'Save workout'}</Button>
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
        <p className="text-xs text-zinc-500">
          Shortcuts: /shortcut-log?type=run&duration=45&rpe=6 — see Settings.
        </p>
      </Card>
    </div>
  );
}
