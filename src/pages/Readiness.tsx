import { useState } from 'react';
import { Button, Input, Label } from '../components/FormField';
import { Card } from '../components/Card';
import { CoachPanel, AskDeepSeekButton } from '../components/CoachPanel';
import { useTrainingData } from '../hooks/useTrainingData';
import { useDeepSeek } from '../hooks/useDeepSeek';
import { addReadiness, updateReadinessAiReason } from '../lib/storage';
import { evaluateReadiness, getTodayReadiness, statusBg, statusColor } from '../lib/readiness';
import { isAiEnabled } from '../lib/storage';

export function Readiness() {
  const { readiness, refresh, settings } = useTrainingData();
  const coach = useDeepSeek();
  const today = new Date().toISOString().slice(0, 10);
  const existing = getTodayReadiness(readiness, today);
  const [checkId, setCheckId] = useState<string | null>(existing?.id ?? null);
  const [result, setResult] = useState(existing?.result ?? null);
  const [reason, setReason] = useState(existing?.deterministicReason ?? '');

  const [form, setForm] = useState({
    sleepHours: existing?.sleepHours ?? 7,
    soreness: existing?.soreness ?? 3,
    motivation: existing?.motivation ?? 7,
    restingHr: '' as string | number,
    shoulderPain: existing?.shoulderPain ?? false,
    kneePain: existing?.kneePain ?? false,
    stress: existing?.stress ?? 5,
  });

  function handleCheck() {
    const input = {
      sleepHours: form.sleepHours,
      soreness: form.soreness,
      motivation: form.motivation,
      restingHr: form.restingHr ? Number(form.restingHr) : undefined,
      shoulderPain: form.shoulderPain,
      kneePain: form.kneePain,
      stress: form.stress,
    };
    const evalResult = evaluateReadiness(input);
    setResult(evalResult.result);
    setReason(evalResult.deterministicReason);
    const log = addReadiness({
      date: today,
      ...input,
      result: evalResult.result,
      deterministicReason: evalResult.deterministicReason,
    });
    setCheckId(log.id);
    refresh();
  }

  async function explainWithAi() {
    if (!result) return;
    const response = await coach.ask(
      'readiness_explain',
      {
        deterministicReadiness: { result, reason },
        userQuestion: `Deterministic: ${result}. ${reason}`,
      },
      { requestSummary: `readiness ${result}` },
    );
    if (response && checkId) {
      const aiText = `${response.summary} ${response.recommendedAction}`.trim();
      updateReadinessAiReason(checkId, aiText);
      refresh();
    }
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
            value={form.sleepHours}
            onChange={(e) => setForm({ ...form, sleepHours: +e.target.value })}
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
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Stress 1–10</Label>
            <Input
              type="number"
              min={1}
              max={10}
              value={form.stress}
              onChange={(e) => setForm({ ...form, stress: +e.target.value })}
            />
          </div>
          <div>
            <Label>Resting HR (+bpm)</Label>
            <Input
              type="number"
              min={0}
              placeholder="optional"
              value={form.restingHr}
              onChange={(e) => setForm({ ...form, restingHr: e.target.value })}
            />
          </div>
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
        <Card className={statusBg(result)}>
          <p className={`text-2xl font-bold uppercase ${statusColor(result)}`}>{result}</p>
          <p className="mt-2 text-sm leading-relaxed text-zinc-200">
            {result === 'green' && 'Train as planned.'}
            {result === 'yellow' && 'Reduce volume or intensity.'}
            {result === 'red' && 'Recovery / mobility only.'}
          </p>
          <p className="mt-3 text-sm text-zinc-400">Why: {reason}</p>
          {existing?.aiReason && (
            <p className="mt-2 text-sm text-zinc-300">Coach: {existing.aiReason}</p>
          )}
          {isAiEnabled() && (
            <div className="mt-3">
              <AskDeepSeekButton
                label="DeepSeek explain & adjust"
                loading={coach.loading}
                onClick={explainWithAi}
              />
            </div>
          )}
        </Card>
      )}

      <CoachPanel
        response={coach.response}
        loading={coach.loading}
        error={coach.error}
        rawJson={coach.rawJson}
        showDebug={settings.showJsonDebug}
        onDismiss={coach.clear}
      />
    </div>
  );
}
