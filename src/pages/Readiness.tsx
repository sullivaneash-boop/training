import { useState } from 'react';
import { Card } from '../components/Card';
import { PageHeader } from '../components/PageHeader';
import { PrimaryButton } from '../components/PrimaryButton';
import { StatusCard } from '../components/StatusCard';
import { CoachPanel, AskDeepSeekButton } from '../components/CoachPanel';
import { Input, Label, RangeField } from '../components/FormField';
import { useTrainingData } from '../hooks/useTrainingData';
import { useDeepSeek } from '../hooks/useDeepSeek';
import { addReadiness, updateReadinessAiReason } from '../lib/storage';
import { evaluateReadiness, getTodayReadiness } from '../lib/readiness';
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
      <PageHeader
        title="Readiness"
        subtitle="This is an ego check, not a diagnosis."
      />

      {result && (
        <StatusCard result={result} reason={reason} />
      )}

      <div className="space-y-4">
        <RangeField
          label="Sleep (hours)"
          min={0}
          max={14}
          step={0.5}
          value={form.sleepHours}
          onChange={(sleepHours) => setForm({ ...form, sleepHours })}
        />
        <RangeField
          label="Soreness 1–10"
          min={1}
          max={10}
          value={form.soreness}
          onChange={(soreness) => setForm({ ...form, soreness })}
        />
        <RangeField
          label="Motivation 1–10"
          min={1}
          max={10}
          value={form.motivation}
          onChange={(motivation) => setForm({ ...form, motivation })}
        />
        <RangeField
          label="Stress 1–10"
          min={1}
          max={10}
          value={form.stress}
          onChange={(stress) => setForm({ ...form, stress })}
        />
        <div>
          <Label>Resting HR (+bpm above baseline)</Label>
          <Input
            type="number"
            min={0}
            placeholder="optional"
            value={form.restingHr}
            onChange={(e) => setForm({ ...form, restingHr: e.target.value })}
          />
        </div>
        <label className="flex min-h-[44px] items-center gap-3 text-base">
          <input
            type="checkbox"
            checked={form.shoulderPain}
            onChange={(e) => setForm({ ...form, shoulderPain: e.target.checked })}
            className="h-5 w-5 rounded accent-accent"
          />
          Shoulder pain
        </label>
        <label className="flex min-h-[44px] items-center gap-3 text-base">
          <input
            type="checkbox"
            checked={form.kneePain}
            onChange={(e) => setForm({ ...form, kneePain: e.target.checked })}
            className="h-5 w-5 rounded accent-accent"
          />
          Knee / run pain
        </label>
        <PrimaryButton type="button" onClick={handleCheck}>
          Get readiness
        </PrimaryButton>
      </div>

      {result && existing?.aiReason && (
        <Card>
          <p className="text-xs font-medium text-muted">Coach note</p>
          <p className="mt-1 text-sm text-foreground">{existing.aiReason}</p>
        </Card>
      )}

      {result && isAiEnabled() && (
        <AskDeepSeekButton
          label="Explain with coach"
          loading={coach.loading}
          onClick={explainWithAi}
        />
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
