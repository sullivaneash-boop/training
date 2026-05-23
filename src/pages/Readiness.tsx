import { useState } from 'react';
import { Button, Input, Label } from '../components/FormField';
import { Card } from '../components/Card';
import { useTrainingData } from '../hooks/useTrainingData';
import { addReadiness } from '../lib/storage';
import { evaluateReadiness, statusBg, statusColor } from '../lib/readiness';
import { getTodayReadiness } from '../lib/readiness';

export function Readiness() {
  const { readiness, refresh, settings } = useTrainingData();
  const today = new Date().toISOString().slice(0, 10);
  const existing = getTodayReadiness(readiness, today);
  const [result, setResult] = useState<{ status: 'green' | 'yellow' | 'red'; why: string } | null>(
    existing ? { status: existing.status, why: existing.why } : null,
  );
  const [aiLoading, setAiLoading] = useState(false);

  const [form, setForm] = useState({
    sleep: 7,
    soreness: 3,
    motivation: 7,
    restingHr: '' as string | number,
    shoulderPain: false,
    kneePain: false,
  });

  function handleCheck() {
    const input = {
      sleep: form.sleep,
      soreness: form.soreness,
      motivation: form.motivation,
      restingHr: form.restingHr ? Number(form.restingHr) : undefined,
      shoulderPain: form.shoulderPain,
      kneePain: form.kneePain,
    };
    const evalResult = evaluateReadiness(input);
    setResult(evalResult);
    addReadiness(
      {
        date: today,
        ...input,
        restingHr: input.restingHr,
      },
      evalResult.status,
      evalResult.why,
    );
    refresh();
  }

  async function explainWithAi() {
    if (settings.aiCoachMode !== 'api' || !result) return;
    setAiLoading(true);
    try {
      const res = await fetch('/api/coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'readiness_explain',
          planSummary: 'Readiness check-in',
          currentWeek: null,
          workoutLogs: [],
          readinessLogs: loadRecent(),
          userNotes: JSON.stringify(form),
        }),
      });
      const data = await res.json();
      if (data.summary) setResult({ status: result.status, why: data.summary });
    } catch {
      /* keep deterministic result */
    } finally {
      setAiLoading(false);
    }
  }

  function loadRecent() {
    return readiness.slice(-5);
  }

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-bold">Don&apos;t Be Stupid Today</h1>
        <p className="text-sm text-zinc-400">Morning check-in. Honest inputs only.</p>
      </header>

      <div className="space-y-4">
        <div>
          <Label>Sleep (hours)</Label>
          <Input
            type="number"
            step={0.5}
            min={0}
            max={14}
            value={form.sleep}
            onChange={(e) => setForm({ ...form, sleep: +e.target.value })}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
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
          <div>
            <Label>Motivation 1–10</Label>
            <Input
              type="number"
              min={1}
              max={10}
              value={form.motivation}
              onChange={(e) => setForm({ ...form, motivation: +e.target.value })}
            />
          </div>
        </div>
        <div>
          <Label>Resting HR (optional, +bpm above baseline)</Label>
          <Input
            type="number"
            min={0}
            placeholder="e.g. 5 if +5 bpm"
            value={form.restingHr}
            onChange={(e) => setForm({ ...form, restingHr: e.target.value })}
          />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.shoulderPain}
            onChange={(e) => setForm({ ...form, shoulderPain: e.target.checked })}
          />
          Shoulder pain
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.kneePain}
            onChange={(e) => setForm({ ...form, kneePain: e.target.checked })}
          />
          Knee / run pain
        </label>
        <Button type="button" onClick={handleCheck}>
          Get readiness
        </Button>
      </div>

      {result && (
        <Card className={statusBg(result.status)}>
          <p className={`text-2xl font-bold uppercase ${statusColor(result.status)}`}>
            {result.status}
          </p>
          <p className="mt-2 text-sm leading-relaxed text-zinc-200">
            {result.status === 'green' && 'Train as planned.'}
            {result.status === 'yellow' && 'Reduce volume or intensity.'}
            {result.status === 'red' && 'Recovery / mobility only.'}
          </p>
          <p className="mt-3 text-sm text-zinc-400">Why: {result.why}</p>
          {settings.aiCoachMode === 'api' && (
            <button
              type="button"
              onClick={explainWithAi}
              disabled={aiLoading}
              className="mt-3 text-xs text-[#4a53ff] underline"
            >
              {aiLoading ? 'Asking coach…' : 'DeepSeek deeper explanation'}
            </button>
          )}
        </Card>
      )}
    </div>
  );
}
