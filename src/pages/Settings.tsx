import { useRef, useState } from 'react';
import { Button, Label, Textarea } from '../components/FormField';
import { Card } from '../components/Card';
import { useTrainingData } from '../hooks/useTrainingData';
import { parseTrainingPlanMarkdown } from '../lib/planParser';
import {
  exportAllData,
  exportWorkoutsCsv,
  importAllData,
  savePlan,
} from '../lib/storage';
import type { AiCoachMode } from '../lib/types';

export function Settings() {
  const { plan, settings, updatePlan, updateSettings, refresh } = useTrainingData();
  const [pasteMd, setPasteMd] = useState('');
  const [warnings, setWarnings] = useState<string[]>([]);
  const [importMsg, setImportMsg] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  function handleFile(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      const md = reader.result as string;
      importPlan(md);
    };
    reader.readAsText(file);
  }

  function importPlan(md: string) {
    const { plan: parsed, warnings: w } = parseTrainingPlanMarkdown(md);
    savePlan(parsed);
    updatePlan(parsed);
    setWarnings(w);
    setPasteMd('');
    refresh();
  }

  function handleExportJson() {
    const blob = new Blob([exportAllData()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `training-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleExportCsv() {
    const blob = new Blob([exportWorkoutsCsv()], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `workouts-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleImportJson(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = importAllData(reader.result as string);
      setImportMsg(result.ok ? 'Import successful' : (result.error ?? 'Failed'));
      refresh();
    };
    reader.readAsText(file);
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Settings</h1>
      </header>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-500">
          Active plan
        </h2>
        {plan ? (
          <Card>
            <p className="font-medium">{plan.name}</p>
            <p className="text-sm text-zinc-400">
              Race: {plan.raceDate} · {plan.totalWeeks} weeks · {plan.weeks.length} parsed
            </p>
          </Card>
        ) : (
          <p className="text-sm text-zinc-400">No plan loaded.</p>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-500">
          Import training plan (.md)
        </h2>
        <input
          ref={fileRef}
          type="file"
          accept=".md,text/markdown"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
        />
        <Button type="button" variant="ghost" onClick={() => fileRef.current?.click()}>
          Upload .md file
        </Button>
        <div>
          <Label>Or paste markdown</Label>
          <Textarea
            value={pasteMd}
            onChange={(e) => setPasteMd(e.target.value)}
            placeholder="# My Race Plan…"
            className="min-h-[120px] font-mono text-xs"
          />
        </div>
        {pasteMd.trim() && (
          <Button type="button" onClick={() => importPlan(pasteMd)}>
            Parse &amp; save plan
          </Button>
        )}
        {warnings.length > 0 && (
          <ul className="text-sm text-amber-400">
            {warnings.map((w) => (
              <li key={w}>· {w}</li>
            ))}
          </ul>
        )}
        <p className="text-xs text-zinc-500">
          Workout logs stay separate when you switch plans. Parser looks for race date, phase
          table, weekly progression table, and phase week templates.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-500">
          AI Coach mode
        </h2>
        <select
          className="w-full rounded-xl border border-white/15 bg-black px-4 py-3 text-white"
          value={settings.aiCoachMode}
          onChange={(e) =>
            updateSettings({ aiCoachMode: e.target.value as AiCoachMode })
          }
        >
          <option value="off">Off</option>
          <option value="manual">Manual Export (default)</option>
          <option value="api">DeepSeek API</option>
        </select>
        <p className="text-xs text-zinc-500">
          DeepSeek requires DEEPSEEK_API_KEY on Vercel. Key never touches the browser.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-500">
          Backup &amp; restore
        </h2>
        <div className="flex flex-col gap-2">
          <Button type="button" variant="ghost" onClick={handleExportJson}>
            Export JSON (all data)
          </Button>
          <Button type="button" variant="ghost" onClick={handleExportCsv}>
            Export CSV (workouts)
          </Button>
          <label className="block">
            <span className="mb-1 block text-xs uppercase text-zinc-500">Import JSON</span>
            <input type="file" accept=".json" onChange={handleImportJson} className="text-sm" />
          </label>
          {importMsg && <p className="text-sm text-emerald-400">{importMsg}</p>}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-500">
          Apple Shortcuts URL logging
        </h2>
        <Card className="space-y-2 text-sm text-zinc-300">
          <p>
            After a workout, open this URL (replace YOUR_DOMAIN and values):
          </p>
          <code className="block break-all rounded-lg bg-black p-3 text-xs text-[#4a53ff]">
            {`https://YOUR_DOMAIN/shortcut-log?type=run&duration=45&rpe=6&soreness=3&notes=easy&completed=1`}
          </code>
          <p className="text-xs text-zinc-500">
            Params: type, duration, distance, rpe, soreness, sleep, notes, completed (0|1), date
            (YYYY-MM-DD optional)
          </p>
          <p className="font-medium text-white">iPhone Shortcut steps:</p>
          <ol className="list-decimal space-y-1 pl-4 text-xs">
            <li>Shortcuts → + → Add Action → &quot;Get Contents of URL&quot;</li>
            <li>Paste your shortcut-log URL with variables from Health/workout</li>
            <li>Optional: run at end of workout via Automation → Workout Ends</li>
            <li>Add to Home Screen or run manually post-session</li>
          </ol>
          <p className="text-xs italic text-zinc-500">
            Apple Health: use &quot;Find Health Samples&quot; for duration, then append to URL.
            Full HealthKit sync needs a native app — URL logging is the lightweight path.
          </p>
        </Card>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-500">
          Add to Home Screen (iPhone)
        </h2>
        <Card className="text-sm text-zinc-300">
          <ol className="list-decimal space-y-1 pl-4">
            <li>Deploy to Vercel (HTTPS required)</li>
            <li>Open in Safari → Share → Add to Home Screen</li>
            <li>Opens standalone like an app</li>
          </ol>
        </Card>
      </section>
    </div>
  );
}
