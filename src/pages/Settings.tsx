import { useRef, useState } from 'react';
import { Button, Input, Label, Select, Textarea } from '../components/FormField';
import { Card } from '../components/Card';
import { PageHeader } from '../components/PageHeader';
import { CoachPanel } from '../components/CoachPanel';
import { useTrainingData } from '../hooks/useTrainingData';
import { useDeepSeek } from '../hooks/useDeepSeek';
import { parseTrainingPlanMarkdown, validatePlan } from '../lib/planParser';
import { normalizePlanWithAi } from '../lib/deepseek';
import { logout } from '../lib/auth';
import {
  exportAllData,
  exportWorkoutsCsv,
  importAllData,
  savePlan,
} from '../lib/storage';
import { useNavigate } from 'react-router-dom';
import type { AiSafetyMode, AthleteGoal, AthleteProfile, DeepSeekModel, Discipline } from '../lib/types';

export function Settings() {
  const navigate = useNavigate();
  const { plan, athlete, settings, updatePlan, updateAthlete, updateSettings, refresh } =
    useTrainingData();
  const coach = useDeepSeek();
  const [pasteMd, setPasteMd] = useState('');
  const [warnings, setWarnings] = useState<string[]>([]);
  const [importMsg, setImportMsg] = useState('');
  const [normalizing, setNormalizing] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const [profile, setProfile] = useState<AthleteProfile>(
    athlete ?? { id: 'athlete-1', goal: 'unknown' },
  );

  function handleFile(file: File) {
    const reader = new FileReader();
    reader.onload = () => importPlanLocal(reader.result as string);
    reader.readAsText(file);
  }

  function importPlanLocal(md: string) {
    const { plan: parsed, warnings: w } = parseTrainingPlanMarkdown(md);
    const errors = validatePlan(parsed);
    savePlan(parsed);
    updatePlan(parsed);
    setWarnings([...w, ...errors.map((e) => `Validation: ${e}`)]);
    setPasteMd('');
    refresh();
  }

  async function importWithDeepSeek(md: string) {
    setNormalizing(true);
    setWarnings([]);
    try {
      const { plan: aiPlan, coach: coachResp } = await normalizePlanWithAi(
        md,
        settings.deepseekModel,
        profile,
      );
      const errors = validatePlan(aiPlan);
      if (errors.length) {
        setWarnings(errors.map((e) => `AI plan validation: ${e}`));
      }
      savePlan({ ...aiPlan, rawMarkdown: md, createdAt: new Date().toISOString() });
      updatePlan(aiPlan);
      coach.clear();
      setImportMsg(coachResp.summary || 'Plan normalized with DeepSeek');
      setPasteMd('');
      refresh();
    } catch (e) {
      setImportMsg(e instanceof Error ? e.message : 'DeepSeek normalize failed');
      importPlanLocal(md);
      setImportMsg((prev) => `${prev} — fell back to local parser`);
    } finally {
      setNormalizing(false);
    }
  }

  function saveProfile() {
    updateAthlete(profile);
    setImportMsg('Profile saved');
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" subtitle="Profile, plan, AI, and backups." />

      <section className="space-y-3">
        <h2 className="section-label">Athlete profile</h2>
        <Input
          placeholder="Name"
          value={profile.name ?? ''}
          onChange={(e) => setProfile({ ...profile, name: e.target.value })}
        />
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Goal</Label>
            <Select
              value={profile.goal}
              onChange={(e) => setProfile({ ...profile, goal: e.target.value as AthleteGoal })}
            >
              <option value="unknown">Unknown</option>
              <option value="finish">Finish</option>
              <option value="finish_strong">Finish strong</option>
              <option value="pr">PR</option>
            </Select>
          </div>
          <div>
            <Label>Weakest discipline</Label>
            <Select
              value={profile.weakestDiscipline ?? 'unknown'}
              onChange={(e) =>
                setProfile({ ...profile, weakestDiscipline: e.target.value as Discipline })
              }
            >
              <option value="unknown">Unknown</option>
              <option value="swim">Swim</option>
              <option value="bike">Bike</option>
              <option value="run">Run</option>
              <option value="strength">Strength</option>
            </Select>
          </div>
        </div>
        <Input
          placeholder="Weekly hours available"
          type="number"
          value={profile.weeklyHoursAvailable ?? ''}
          onChange={(e) =>
            setProfile({ ...profile, weeklyHoursAvailable: +e.target.value || undefined })
          }
        />
        <Textarea
          placeholder="Injury notes"
          value={profile.injuryNotes ?? ''}
          onChange={(e) => setProfile({ ...profile, injuryNotes: e.target.value })}
        />
        <Button type="button" variant="ghost" onClick={saveProfile}>
          Save profile
        </Button>
      </section>

      <section className="space-y-3">
        <h2 className="section-label">AI settings</h2>
        <div>
          <Label>Cost safety</Label>
          <Select
            value={settings.aiSafetyMode}
            onChange={(e) =>
              updateSettings({ ...settings, aiSafetyMode: e.target.value as AiSafetyMode })
            }
          >
            <option value="disabled">AI disabled</option>
            <option value="on_demand">On-demand only (default)</option>
            <option value="auto_after_workout">Auto after workout log</option>
          </Select>
        </div>
        <div>
          <Label>DeepSeek model</Label>
          <Select
            value={settings.deepseekModel}
            onChange={(e) =>
              updateSettings({ ...settings, deepseekModel: e.target.value as DeepSeekModel })
            }
          >
            <option value="deepseek-v4-flash">deepseek-v4-flash</option>
            <option value="deepseek-v4-pro">deepseek-v4-pro</option>
          </Select>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={settings.showJsonDebug}
            onChange={(e) => updateSettings({ ...settings, showJsonDebug: e.target.checked })}
          />
          Show raw JSON debug on coach responses
        </label>
      </section>

      <section className="space-y-3">
        <h2 className="section-label">Active plan</h2>
        {plan ? (
          <Card>
            <p className="font-medium">{plan.name}</p>
            <p className="text-sm text-muted">
              Race: {plan.raceDate ?? '—'} · {plan.totalWeeks ?? plan.weeks.length} weeks ·{' '}
              {plan.weeks.length} parsed
            </p>
          </Card>
        ) : (
          <p className="text-sm text-muted">No plan loaded.</p>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="section-label">Import training plan (.md)</h2>
        <input
          ref={fileRef}
          type="file"
          accept=".md,text/markdown"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
        />
        <Button type="button" variant="ghost" onClick={() => fileRef.current?.click()}>
          Upload .md (local parser)
        </Button>
        <div>
          <Label>Paste markdown</Label>
          <Textarea
            value={pasteMd}
            onChange={(e) => setPasteMd(e.target.value)}
            placeholder="# My Race Plan…"
            className="min-h-[120px] font-mono text-xs"
          />
        </div>
        {pasteMd.trim() && (
          <div className="flex flex-col gap-2">
            <Button type="button" onClick={() => importPlanLocal(pasteMd)}>
              Parse locally &amp; save
            </Button>
            <Button
              type="button"
              variant="ghost"
              disabled={normalizing || settings.aiSafetyMode === 'disabled'}
              onClick={() => importWithDeepSeek(pasteMd)}
            >
              {normalizing ? 'DeepSeek normalizing…' : 'Normalize with DeepSeek & save'}
            </Button>
          </div>
        )}
        {warnings.map((w) => (
          <p key={w} className="text-sm text-amber-700">
            · {w}
          </p>
        ))}
        {importMsg && <p className="text-sm text-emerald-700">{importMsg}</p>}
        <p className="text-xs text-muted">
          Workout logs stay separate when you switch plans. Sample plan in public/ is test input only.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="section-label">Backup &amp; restore</h2>
        <Button type="button" variant="ghost" onClick={() => {
          const blob = new Blob([exportAllData()], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `training-backup-${new Date().toISOString().slice(0, 10)}.json`;
          a.click();
          URL.revokeObjectURL(url);
        }}>
          Export JSON
        </Button>
        <Button type="button" variant="ghost" onClick={() => {
          const blob = new Blob([exportWorkoutsCsv()], { type: 'text/csv' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `workouts-${new Date().toISOString().slice(0, 10)}.csv`;
          a.click();
          URL.revokeObjectURL(url);
        }}>
          Export CSV
        </Button>
        <label className="block text-sm">
          Import JSON
          <input
            type="file"
            accept=".json"
            className="mt-1 block w-full"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              const reader = new FileReader();
              reader.onload = () => {
                const result = importAllData(reader.result as string);
                setImportMsg(result.ok ? 'Restored' : (result.error ?? 'Failed'));
                refresh();
              };
              reader.readAsText(file);
            }}
          />
        </label>
      </section>

      <section className="space-y-3">
        <h2 className="section-label">Account</h2>
        <Button
          type="button"
          variant="ghost"
          onClick={async () => {
            await logout();
            navigate('/login', { replace: true });
          }}
        >
          Sign out
        </Button>
      </section>

      <section className="space-y-3">
        <h2 className="section-label">Apple Shortcuts</h2>
        <Card className="text-sm text-foreground">
          <code className="block break-all text-xs text-accent">
            {`${window.location.origin}/shortcut-log?type=run&duration=45&rpe=6&soreness=3&completed=1`}
          </code>
          <p className="mt-2 text-xs text-muted">
            Params: type, duration, distance, distanceUnit, rpe, soreness, sleep, notes, completed,
            date
          </p>
        </Card>
      </section>

      {coach.response && (
        <CoachPanel
          response={coach.response}
          loading={coach.loading}
          error={coach.error}
          rawJson={coach.rawJson}
          showDebug={settings.showJsonDebug}
        />
      )}
    </div>
  );
}
