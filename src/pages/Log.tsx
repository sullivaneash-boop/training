import { useState } from 'react';
import { Button, Input, Label, Select, Textarea } from '../components/FormField';
import { Card } from '../components/Card';
import { useTrainingData } from '../hooks/useTrainingData';
import { addWorkout } from '../lib/storage';
import type { WorkoutType } from '../lib/types';

const TYPES: WorkoutType[] = ['swim', 'bike', 'run', 'strength', 'brick', 'mobility', 'rest', 'other'];

export function Log() {
  const { refresh } = useTrainingData();
  const [saved, setSaved] = useState(false);
  const today = new Date().toISOString().slice(0, 10);

  const [form, setForm] = useState({
    date: today,
    type: 'run' as WorkoutType,
    durationMinutes: 45,
    distance: '',
    rpe: 5,
    soreness: 3,
    sleepHours: 7,
    notes: '',
    completed: true,
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    addWorkout({
      ...form,
      distance: form.distance || undefined,
      source: 'manual',
    });
    setSaved(true);
    refresh();
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
        <div>
          <Label>Distance (optional)</Label>
          <Input
            placeholder="e.g. 5.2 mi, 2400 yd"
            value={form.distance}
            onChange={(e) => setForm({ ...form, distance: e.target.value })}
          />
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

      <Card>
        <p className="text-xs text-zinc-500">
          Tip: use Apple Shortcuts to log via URL — see Settings → Shortcuts guide.
        </p>
      </Card>
    </div>
  );
}
