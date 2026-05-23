import type { AppSettings, ReadinessLog, TrainingPlan, WorkoutLog } from './types';
import { parseTrainingPlanMarkdown } from './planParser';

const KEYS = {
  plan: 'training-plan-active',
  workouts: 'training-workouts',
  readiness: 'training-readiness',
  settings: 'training-settings',
} as const;

const DEFAULT_SETTINGS: AppSettings = { aiCoachMode: 'manual' };

export function loadPlan(): TrainingPlan | null {
  try {
    const raw = localStorage.getItem(KEYS.plan);
    return raw ? (JSON.parse(raw) as TrainingPlan) : null;
  } catch {
    return null;
  }
}

export function savePlan(plan: TrainingPlan): void {
  localStorage.setItem(KEYS.plan, JSON.stringify(plan));
}

export function clearPlan(): void {
  localStorage.removeItem(KEYS.plan);
}

export function loadWorkouts(): WorkoutLog[] {
  try {
    const raw = localStorage.getItem(KEYS.workouts);
    return raw ? (JSON.parse(raw) as WorkoutLog[]) : [];
  } catch {
    return [];
  }
}

export function saveWorkouts(logs: WorkoutLog[]): void {
  localStorage.setItem(KEYS.workouts, JSON.stringify(logs));
}

export function addWorkout(log: Omit<WorkoutLog, 'id' | 'createdAt'>): WorkoutLog {
  const entry: WorkoutLog = {
    ...log,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  };
  const all = [...loadWorkouts(), entry];
  saveWorkouts(all);
  return entry;
}

export function loadReadiness(): ReadinessLog[] {
  try {
    const raw = localStorage.getItem(KEYS.readiness);
    return raw ? (JSON.parse(raw) as ReadinessLog[]) : [];
  } catch {
    return [];
  }
}

export function saveReadiness(logs: ReadinessLog[]): void {
  localStorage.setItem(KEYS.readiness, JSON.stringify(logs));
}

export function addReadiness(
  entry: Omit<ReadinessLog, 'id' | 'createdAt' | 'status' | 'why'>,
  status: ReadinessLog['status'],
  why: string,
): ReadinessLog {
  const log: ReadinessLog = {
    ...entry,
    status,
    why,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  };
  const all = [...loadReadiness(), log];
  saveReadiness(all);
  return log;
}

export function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(KEYS.settings);
    return raw ? { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as AppSettings) } : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: AppSettings): void {
  localStorage.setItem(KEYS.settings, JSON.stringify(settings));
}

export function exportAllData(): string {
  return JSON.stringify(
    {
      exportedAt: new Date().toISOString(),
      plan: loadPlan(),
      workouts: loadWorkouts(),
      readiness: loadReadiness(),
      settings: loadSettings(),
    },
    null,
    2,
  );
}

export function importAllData(json: string): { ok: boolean; error?: string } {
  try {
    const data = JSON.parse(json) as {
      plan?: TrainingPlan;
      workouts?: WorkoutLog[];
      readiness?: ReadinessLog[];
      settings?: AppSettings;
    };
    if (data.plan) savePlan(data.plan);
    if (data.workouts) saveWorkouts(data.workouts);
    if (data.readiness) saveReadiness(data.readiness);
    if (data.settings) saveSettings(data.settings);
    return { ok: true };
  } catch {
    return { ok: false, error: 'Invalid JSON file' };
  }
}

export function exportWorkoutsCsv(): string {
  const logs = loadWorkouts();
  const headers = [
    'date',
    'type',
    'durationMinutes',
    'distance',
    'rpe',
    'soreness',
    'sleepHours',
    'completed',
    'notes',
    'source',
  ];
  const rows = logs.map((l) =>
    [
      l.date,
      l.type,
      l.durationMinutes,
      l.distance ?? '',
      l.rpe ?? '',
      l.soreness ?? '',
      l.sleepHours ?? '',
      l.completed,
      `"${(l.notes ?? '').replace(/"/g, '""')}"`,
      l.source,
    ].join(','),
  );
  return [headers.join(','), ...rows].join('\n');
}

export async function loadDefaultPlan(): Promise<TrainingPlan | null> {
  try {
    const res = await fetch('/default-training-plan.md');
    if (!res.ok) return null;
    const md = await res.text();
    return parseTrainingPlanMarkdown(md, 'default-im703').plan;
  } catch {
    return null;
  }
}

export function ensurePlan(): TrainingPlan | null {
  return loadPlan();
}
